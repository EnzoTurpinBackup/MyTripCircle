import { renderHook, act } from "@testing-library/react-native";
import { Address } from "../../types";
import { geocodeAddress, getCached, GeoCoords } from "../../utils/geocoding";
import { useAddressGeocoding } from "../useAddressGeocoding";

jest.mock("../../utils/geocoding", () => ({
  geocodeAddress: jest.fn(),
  getCached: jest.fn(),
}));

const mockGeocodeAddress = geocodeAddress as jest.Mock;
const mockGetCached = getCached as jest.Mock;

const PARIS: GeoCoords = { latitude: 48.8566, longitude: 2.3522 };
const LYON: GeoCoords = { latitude: 45.764, longitude: 4.8357 };

const makeAddress = (overrides: Partial<Address> = {}): Address => ({
  id: "addr-1",
  type: "hotel",
  name: "Hôtel Central",
  address: "1 rue de Paris",
  city: "Paris",
  country: "France",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("useAddressGeocoding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-20T10:00:00.000Z"));
    mockGetCached.mockReturnValue(undefined);
    mockGeocodeAddress.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should stay idle when there is no address to geocode", async () => {
    // Arrange & Act
    const { result } = renderHook(() => useAddressGeocoding([]));
    await act(async () => {});

    // Assert
    expect(result.current.mapCoords).toEqual({});
    expect(result.current.isGeocoding).toBe(false);
    expect(mockGeocodeAddress).not.toHaveBeenCalled();
  });

  it("should reuse the cached coordinates without calling the network", async () => {
    // Arrange
    mockGetCached.mockReturnValue(PARIS);

    // Act
    const { result } = renderHook(() =>
      useAddressGeocoding([makeAddress({ id: "a" })])
    );
    await act(async () => {});

    // Assert
    expect(result.current.mapCoords).toEqual({ a: PARIS });
    expect(mockGeocodeAddress).not.toHaveBeenCalled();
  });

  it("should skip an address already known to have no coordinates", async () => {
    // Arrange — null en cache signifie « géocodage déjà tenté, sans résultat »
    mockGetCached.mockReturnValue(null);

    // Act
    const { result } = renderHook(() =>
      useAddressGeocoding([makeAddress({ id: "a" })])
    );
    await act(async () => {});

    // Assert
    expect(result.current.mapCoords).toEqual({});
    expect(mockGeocodeAddress).not.toHaveBeenCalled();
  });

  it("should geocode over the network when the address is not cached", async () => {
    // Arrange
    mockGeocodeAddress.mockResolvedValue(PARIS);

    // Act
    const { result } = renderHook(() =>
      useAddressGeocoding([makeAddress({ id: "a" })])
    );
    await act(async () => {});

    // Assert
    expect(mockGeocodeAddress).toHaveBeenCalledWith(
      "1 rue de Paris",
      "Paris",
      "France"
    );
    expect(result.current.mapCoords).toEqual({ a: PARIS });
  });

  it("should record no coordinates when the geocoder finds nothing", async () => {
    // Arrange
    mockGeocodeAddress.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() =>
      useAddressGeocoding([makeAddress({ id: "a" })])
    );
    await act(async () => {});

    // Assert
    expect(result.current.mapCoords).toEqual({});
    expect(result.current.isGeocoding).toBe(false);
  });

  it("should report the geocoding as in progress until it completes", async () => {
    // Arrange
    const pending = deferred<GeoCoords | null>();
    mockGeocodeAddress.mockReturnValue(pending.promise);

    // Act
    const { result } = renderHook(() =>
      useAddressGeocoding([makeAddress({ id: "a" })])
    );

    // Assert
    expect(result.current.isGeocoding).toBe(true);
    await act(async () => {
      pending.resolve(PARIS);
    });
    expect(result.current.isGeocoding).toBe(false);
  });

  it("should throttle the second network lookup by one second", async () => {
    // Arrange
    mockGeocodeAddress.mockResolvedValue(PARIS);
    const addresses = [
      makeAddress({ id: "a" }),
      makeAddress({ id: "b", address: "2 rue de Lyon", city: "Lyon" }),
    ];

    // Act
    renderHook(() => useAddressGeocoding(addresses));
    await act(async () => {});

    // Assert
    expect(mockGeocodeAddress).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(1100);
    });
    expect(mockGeocodeAddress).toHaveBeenCalledTimes(2);
  });

  it("should store the coordinates of every geocoded address", async () => {
    // Arrange
    mockGeocodeAddress.mockResolvedValueOnce(PARIS).mockResolvedValueOnce(LYON);
    const addresses = [
      makeAddress({ id: "a" }),
      makeAddress({ id: "b", address: "2 rue de Lyon", city: "Lyon" }),
    ];

    // Act
    const { result } = renderHook(() => useAddressGeocoding(addresses));
    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(1100);
    });

    // Assert
    expect(result.current.mapCoords).toEqual({ a: PARIS, b: LYON });
  });

  it("should stop geocoding the remaining addresses when the hook unmounts", async () => {
    // Arrange
    mockGeocodeAddress.mockResolvedValue(PARIS);
    const addresses = [
      makeAddress({ id: "a" }),
      makeAddress({ id: "b" }),
      makeAddress({ id: "c" }),
    ];
    const { unmount } = renderHook(() => useAddressGeocoding(addresses));
    await act(async () => {});

    // Act — démontage pendant la temporisation qui précède la 2e requête
    unmount();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    // Assert
    expect(mockGeocodeAddress).toHaveBeenCalledTimes(1);
  });

  it("should discard coordinates that arrive after the hook unmounted", async () => {
    // Arrange
    const pending = deferred<GeoCoords | null>();
    mockGeocodeAddress.mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() =>
      useAddressGeocoding([makeAddress({ id: "a" })])
    );

    // Act
    unmount();
    await act(async () => {
      pending.resolve(PARIS);
    });

    // Assert
    expect(result.current.mapCoords).toEqual({});
  });

  it("should stop reporting progress when the geocoding pipeline throws", async () => {
    // Arrange
    mockGeocodeAddress.mockRejectedValue(new Error("network down"));

    // Act
    const { result } = renderHook(() =>
      useAddressGeocoding([makeAddress({ id: "a" })])
    );
    await act(async () => {});

    // Assert
    expect(result.current.isGeocoding).toBe(false);
    expect(result.current.mapCoords).toEqual({});
  });

  it("should leave the state untouched when the pipeline fails after unmount", async () => {
    // Arrange
    const pending = deferred<GeoCoords | null>();
    mockGeocodeAddress.mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() =>
      useAddressGeocoding([makeAddress({ id: "a" })])
    );
    expect(result.current.isGeocoding).toBe(true);

    // Act
    unmount();
    await act(async () => {
      pending.reject(new Error("network down"));
    });

    // Assert — aucune remise à false : le hook n'écrit plus après démontage
    expect(result.current.isGeocoding).toBe(true);
  });

  it("should not geocode an address twice across re-renders", async () => {
    // Arrange
    mockGeocodeAddress.mockResolvedValue(PARIS);
    const addresses = [makeAddress({ id: "a" })];
    const { rerender } = renderHook(
      (props: Address[]) => useAddressGeocoding(props),
      { initialProps: addresses }
    );
    await act(async () => {});

    // Act
    rerender([...addresses]);
    await act(async () => {});

    // Assert
    expect(mockGeocodeAddress).toHaveBeenCalledTimes(1);
  });

  it("should geocode only the newly added address when the list grows", async () => {
    // Arrange
    mockGeocodeAddress.mockResolvedValue(PARIS);
    const first = makeAddress({ id: "a" });
    const second = makeAddress({ id: "b", address: "2 rue de Lyon" });
    const { rerender } = renderHook(
      (props: Address[]) => useAddressGeocoding(props),
      { initialProps: [first] }
    );
    await act(async () => {});
    mockGeocodeAddress.mockClear();

    // Act
    rerender([first, second]);
    await act(async () => {});

    // Assert
    expect(mockGeocodeAddress).toHaveBeenCalledTimes(1);
    expect(mockGeocodeAddress).toHaveBeenCalledWith(
      "2 rue de Lyon",
      "Paris",
      "France"
    );
  });
});
