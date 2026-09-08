import { renderHook, act } from "@testing-library/react-native";
import { useNavigation } from "@react-navigation/native";
import { Address } from "../../types";
import { useTrips } from "../../contexts/TripsContext";
import { useTheme } from "../../contexts/ThemeContext";
import { geocodeAddress, getCached, GeoCoords } from "../../utils/geocoding";
import { useCurrentLocation } from "../useCurrentLocation";
import { MapView, Marker, mapsAvailable, useAddresses } from "../useAddresses";

jest.mock("react-native-maps", () => ({
  __esModule: true,
  default: "MapViewStub",
  Marker: "MarkerStub",
}));

jest.mock("@react-navigation/native", () => {
  const { useEffect } = require("react");
  return {
    useNavigation: jest.fn(),
    // `useFocusEffect` rejoue son effet à chaque prise de focus : en test, un
    // simple `useEffect` reproduit fidèlement l'exécution au montage.
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: jest.fn((key: string) => key) }),
}));

jest.mock("../../contexts/TripsContext", () => ({
  useTrips: jest.fn(),
}));

jest.mock("../../contexts/ThemeContext", () => ({
  useTheme: jest.fn(),
}));

jest.mock("../../utils/geocoding", () => ({
  geocodeAddress: jest.fn(),
  getCached: jest.fn(),
}));

jest.mock("../useCurrentLocation", () => ({
  useCurrentLocation: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.Mock;
const mockUseTrips = useTrips as jest.Mock;
const mockUseTheme = useTheme as jest.Mock;
const mockGeocodeAddress = geocodeAddress as jest.Mock;
const mockGetCached = getCached as jest.Mock;
const mockUseCurrentLocation = useCurrentLocation as jest.Mock;

const PARIS: GeoCoords = { latitude: 48.8566, longitude: 2.3522 };
const LYON: GeoCoords = { latitude: 45.764, longitude: 4.8357 };

const COLORS = { background: "#fff" };

const navigate = jest.fn();
const deleteAddress = jest.fn();
const refreshData = jest.fn();

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

const useTripsState = (addresses: Address[] = [], loading = false) => {
  mockUseTrips.mockReturnValue({
    addresses,
    loading,
    deleteAddress,
    refreshData,
  });
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe("exports de react-native-maps", () => {
  it("should re-export the map components when the native module is available", () => {
    // Arrange & Act & Assert
    expect(mapsAvailable).toBe(true);
    expect(MapView).toBe("MapViewStub");
    expect(Marker).toBe("MarkerStub");
  });
});

describe("useAddresses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-20T10:00:00.000Z"));
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockUseNavigation.mockReturnValue({ navigate });
    mockUseTheme.mockReturnValue({ colors: COLORS, isDark: true });
    mockUseCurrentLocation.mockReturnValue(null);
    mockGetCached.mockReturnValue(undefined);
    mockGeocodeAddress.mockResolvedValue(null);
    deleteAddress.mockResolvedValue(true);
    refreshData.mockResolvedValue(undefined);
    useTripsState();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("données de l'écran", () => {
    it("should refresh the trip data when the screen gains focus", () => {
      // Arrange & Act
      renderHook(() => useAddresses());

      // Assert
      expect(refreshData).toHaveBeenCalledTimes(1);
    });

    it("should expose the current theme", () => {
      // Arrange & Act
      const { result } = renderHook(() => useAddresses());

      // Assert
      expect(result.current.colors).toBe(COLORS);
      expect(result.current.isDark).toBe(true);
    });

    it("should expose the loading state of the trips context", () => {
      // Arrange
      useTripsState([], true);

      // Act
      const { result } = renderHook(() => useAddresses());

      // Assert
      expect(result.current.loading).toBe(true);
    });

    it("should show every address when no filter is selected", () => {
      // Arrange
      const addresses = [
        makeAddress({ id: "a", type: "hotel" }),
        makeAddress({ id: "b", type: "restaurant" }),
      ];
      useTripsState(addresses);

      // Act
      const { result } = renderHook(() => useAddresses());

      // Assert
      expect(result.current.selectedFilter).toBe("all");
      expect(result.current.filteredAddresses).toEqual(addresses);
    });

    it("should keep only the addresses matching the selected filter", () => {
      // Arrange
      useTripsState([
        makeAddress({ id: "a", type: "hotel" }),
        makeAddress({ id: "b", type: "restaurant" }),
      ]);
      const { result } = renderHook(() => useAddresses());

      // Act
      act(() => result.current.setSelectedFilter("restaurant"));

      // Assert
      expect(result.current.filteredAddresses.map((a) => a.id)).toEqual(["b"]);
    });

    it("should label the list with the number of visible addresses", () => {
      // Arrange
      useTripsState([
        makeAddress({ id: "a" }),
        makeAddress({ id: "b", type: "restaurant" }),
      ]);

      // Act
      const { result } = renderHook(() => useAddresses());

      // Assert
      expect(result.current.t).toHaveBeenCalledWith("addresses.count", {
        count: 2,
      });
      expect(result.current.eyebrow).toBe("addresses.count");
    });
  });

  describe("région affichée par la carte", () => {
    it("should centre on the current location when it is known", () => {
      // Arrange
      mockUseCurrentLocation.mockReturnValue({ lat: 48.85, lng: 2.35 });

      // Act
      const { result } = renderHook(() => useAddresses());

      // Assert
      expect(result.current.widgetRegion).toEqual({
        latitude: 48.85,
        longitude: 2.35,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
    });

    it("should fall back to the world view when nothing has been geocoded", () => {
      // Arrange & Act
      const { result } = renderHook(() => useAddresses());

      // Assert
      expect(result.current.widgetRegion).toEqual({
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 20,
        longitudeDelta: 20,
      });
    });

    it("should frame every geocoded address when the location is unknown", async () => {
      // Arrange
      mockGetCached
        .mockReturnValueOnce({ latitude: 48, longitude: 2 })
        .mockReturnValueOnce({ latitude: 49, longitude: 3 });
      useTripsState([
        makeAddress({ id: "a" }),
        makeAddress({ id: "b", address: "2 rue de Lyon" }),
      ]);

      // Act
      const { result } = renderHook(() => useAddresses());
      await act(async () => {});

      // Assert
      expect(result.current.widgetRegion).toEqual({
        latitude: 48.5,
        longitude: 2.5,
        latitudeDelta: 1.05,
        longitudeDelta: 1.05,
      });
    });

    it("should keep a minimum zoom span when the addresses are close together", async () => {
      // Arrange
      mockGetCached
        .mockReturnValueOnce({ latitude: 48, longitude: 2 })
        .mockReturnValueOnce({ latitude: 48.01, longitude: 2.01 });
      useTripsState([
        makeAddress({ id: "a" }),
        makeAddress({ id: "b", address: "2 rue de Lyon" }),
      ]);

      // Act
      const { result } = renderHook(() => useAddresses());
      await act(async () => {});

      // Assert
      expect(result.current.widgetRegion.latitudeDelta).toBe(0.08);
      expect(result.current.widgetRegion.longitudeDelta).toBe(0.08);
    });

    it("should keep only the filtered addresses that carry coordinates", async () => {
      // Arrange
      mockGetCached.mockReturnValueOnce(PARIS).mockReturnValueOnce(null);
      useTripsState([
        makeAddress({ id: "a" }),
        makeAddress({ id: "b", address: "2 rue de Lyon" }),
      ]);

      // Act
      const { result } = renderHook(() => useAddresses());
      await act(async () => {});

      // Assert
      expect(result.current.filteredWithCoords.map((a) => a.id)).toEqual(["a"]);
    });
  });

  describe("actions", () => {
    it("should select the pressed address", () => {
      // Arrange
      const address = makeAddress();
      useTripsState([address]);
      const { result } = renderHook(() => useAddresses());

      // Act
      act(() => result.current.handleAddressPress(address));

      // Assert
      expect(result.current.actionAddress).toBe(address);
    });

    it("should do nothing when editing with no address selected", () => {
      // Arrange
      const { result } = renderHook(() => useAddresses());

      // Act
      act(() => result.current.handleEditAddress());

      // Assert
      expect(navigate).not.toHaveBeenCalled();
    });

    it("should open the form of the selected address when editing", () => {
      // Arrange
      const address = makeAddress({ id: "addr-7" });
      useTripsState([address]);
      const { result } = renderHook(() => useAddresses());
      act(() => result.current.handleAddressPress(address));

      // Act
      act(() => result.current.handleEditAddress());

      // Assert
      expect(navigate).toHaveBeenCalledWith("AddressForm", {
        addressId: "addr-7",
      });
      expect(result.current.actionAddress).toBeNull();
    });

    it("should delete the address and refresh the data", async () => {
      // Arrange
      const { result } = renderHook(() => useAddresses());
      refreshData.mockClear();

      // Act
      await act(async () => {
        await result.current.handleDeleteAddress("addr-7");
      });

      // Assert
      expect(deleteAddress).toHaveBeenCalledWith("addr-7");
      expect(refreshData).toHaveBeenCalledTimes(1);
    });

    it("should open an empty form when adding an address", () => {
      // Arrange
      const { result } = renderHook(() => useAddresses());

      // Act
      act(() => result.current.handleAddAddress());

      // Assert
      expect(navigate).toHaveBeenCalledWith("AddressForm", {});
    });

    it("should open the full map screen", () => {
      // Arrange
      const { result } = renderHook(() => useAddresses());

      // Act
      act(() => result.current.handleOpenFullMap());

      // Assert
      expect(navigate).toHaveBeenCalledWith("FullMap");
    });
  });

  describe("géocodage des adresses", () => {
    it("should stay idle when there is no address", async () => {
      // Arrange & Act
      const { result } = renderHook(() => useAddresses());
      await act(async () => {});

      // Assert
      expect(result.current.mapCoords).toEqual({});
      expect(result.current.isGeocoding).toBe(false);
      expect(mockGeocodeAddress).not.toHaveBeenCalled();
    });

    it("should reuse the cached coordinates without calling the network", async () => {
      // Arrange
      mockGetCached.mockReturnValue(PARIS);
      useTripsState([makeAddress({ id: "a" })]);

      // Act
      const { result } = renderHook(() => useAddresses());
      await act(async () => {});

      // Assert
      expect(result.current.mapCoords).toEqual({ a: PARIS });
      expect(mockGeocodeAddress).not.toHaveBeenCalled();
    });

    it("should skip an address already known to have no coordinates", async () => {
      // Arrange
      mockGetCached.mockReturnValue(null);
      useTripsState([makeAddress({ id: "a" })]);

      // Act
      const { result } = renderHook(() => useAddresses());
      await act(async () => {});

      // Assert
      expect(result.current.mapCoords).toEqual({});
      expect(mockGeocodeAddress).not.toHaveBeenCalled();
    });

    it("should geocode over the network when the address is not cached", async () => {
      // Arrange
      mockGeocodeAddress.mockResolvedValue(PARIS);
      useTripsState([makeAddress({ id: "a" })]);

      // Act
      const { result } = renderHook(() => useAddresses());
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
      useTripsState([makeAddress({ id: "a" })]);

      // Act
      const { result } = renderHook(() => useAddresses());
      await act(async () => {});

      // Assert
      expect(result.current.mapCoords).toEqual({});
      expect(result.current.isGeocoding).toBe(false);
    });

    it("should report the geocoding as in progress until it completes", async () => {
      // Arrange
      const pending = deferred<GeoCoords | null>();
      mockGeocodeAddress.mockReturnValue(pending.promise);
      useTripsState([makeAddress({ id: "a" })]);

      // Act
      const { result } = renderHook(() => useAddresses());

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
      useTripsState([
        makeAddress({ id: "a" }),
        makeAddress({ id: "b", address: "2 rue de Lyon" }),
      ]);

      // Act
      renderHook(() => useAddresses());
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
      useTripsState([
        makeAddress({ id: "a" }),
        makeAddress({ id: "b", address: "2 rue de Lyon" }),
      ]);

      // Act
      const { result } = renderHook(() => useAddresses());
      await act(async () => {});
      await act(async () => {
        jest.advanceTimersByTime(1100);
      });

      // Assert
      expect(result.current.mapCoords).toEqual({ a: PARIS, b: LYON });
    });

    it("should stop geocoding the remaining addresses when the screen unmounts", async () => {
      // Arrange
      mockGeocodeAddress.mockResolvedValue(PARIS);
      useTripsState([
        makeAddress({ id: "a" }),
        makeAddress({ id: "b" }),
        makeAddress({ id: "c" }),
      ]);
      const { unmount } = renderHook(() => useAddresses());
      await act(async () => {});

      // Act — démontage pendant la temporisation qui précède la 2e requête
      unmount();
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Assert
      expect(mockGeocodeAddress).toHaveBeenCalledTimes(1);
    });

    it("should discard coordinates that arrive after the screen unmounted", async () => {
      // Arrange
      const pending = deferred<GeoCoords | null>();
      mockGeocodeAddress.mockReturnValue(pending.promise);
      useTripsState([makeAddress({ id: "a" })]);
      const { result, unmount } = renderHook(() => useAddresses());

      // Act
      unmount();
      await act(async () => {
        pending.resolve(PARIS);
      });

      // Assert
      expect(result.current.mapCoords).toEqual({});
    });

    it("should log the failure and stop reporting progress when the pipeline throws", async () => {
      // Arrange
      const failure = new Error("network down");
      mockGeocodeAddress.mockRejectedValue(failure);
      useTripsState([makeAddress({ id: "a" })]);

      // Act
      const { result } = renderHook(() => useAddresses());
      await act(async () => {});

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        "[AddressesScreen] Erreur géocodage:",
        failure
      );
      expect(result.current.isGeocoding).toBe(false);
    });

    it("should leave the state untouched when the pipeline fails after unmount", async () => {
      // Arrange
      const pending = deferred<GeoCoords | null>();
      mockGeocodeAddress.mockReturnValue(
        pending.promise.then(() => {
          throw new Error("network down");
        })
      );
      useTripsState([makeAddress({ id: "a" })]);
      const { result, unmount } = renderHook(() => useAddresses());
      expect(result.current.isGeocoding).toBe(true);

      // Act
      unmount();
      await act(async () => {
        pending.resolve(null);
      });

      // Assert — aucune remise à false : le hook n'écrit plus après démontage
      expect(result.current.isGeocoding).toBe(true);
    });

    it("should not geocode an address twice across re-renders", async () => {
      // Arrange
      mockGeocodeAddress.mockResolvedValue(PARIS);
      useTripsState([makeAddress({ id: "a" })]);
      const { rerender } = renderHook(() => useAddresses());
      await act(async () => {});

      // Act
      rerender({});
      await act(async () => {});

      // Assert
      expect(mockGeocodeAddress).toHaveBeenCalledTimes(1);
    });

    it("should geocode only the newly added address when the list grows", async () => {
      // Arrange
      mockGeocodeAddress.mockResolvedValue(PARIS);
      const first = makeAddress({ id: "a" });
      const second = makeAddress({ id: "b", address: "2 rue de Lyon" });
      useTripsState([first]);
      const { rerender } = renderHook(() => useAddresses());
      await act(async () => {});
      mockGeocodeAddress.mockClear();

      // Act
      useTripsState([first, second]);
      rerender({});
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
});
