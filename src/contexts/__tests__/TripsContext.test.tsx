import React, { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react-native";
import { TripsProvider, useTrips } from "../TripsContext";
import { CACHE_KEYS, CACHE_TTL } from "../../utils/cacheManager";
import { mapTrip, mapBooking, mapAddress } from "../../utils/tripMappers";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("../../services/ApiService", () => {
  const api = {
    getTrips: jest.fn(),
    getBookings: jest.fn(),
    getAddresses: jest.fn(),
  };
  return { __esModule: true, default: api, ApiService: api };
});

jest.mock("../AuthContext", () => ({ useAuth: jest.fn() }));

jest.mock("../../hooks/useTripsApi", () => ({ useTripsApi: jest.fn() }));

jest.mock("../../utils/cacheManager", () => {
  const actual = jest.requireActual("../../utils/cacheManager");
  return {
    CACHE_KEYS: actual.CACHE_KEYS,
    CACHE_TTL: actual.CACHE_TTL,
    CacheManager: {
      get: jest.fn(),
      getStale: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
      clearAll: jest.fn(),
    },
  };
});

const mockApi = jest.requireMock("../../services/ApiService").default;
const mockUseAuth = jest.requireMock("../AuthContext").useAuth as jest.Mock;
const mockUseTripsApi = jest.requireMock("../../hooks/useTripsApi").useTripsApi as jest.Mock;
const mockCache = jest.requireMock("../../utils/cacheManager").CacheManager;

const NOW = new Date("2026-06-15T12:00:00.000Z");
const USER = { id: "user-1", name: "Ada", email: "ada@example.com", createdAt: NOW };
const OTHER_USER = { ...USER, id: "user-2" };

// Les horodatages sont explicites : sans eux les mappeurs retombent sur
// `new Date()`, ce qui rendrait les comparaisons non déterministes.
const TIMESTAMPS = {
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const RAW_TRIP = {
  _id: "trip-1",
  title: "Lisbonne",
  destination: "Portugal",
  ownerId: "user-1",
  startDate: "2026-07-01T00:00:00.000Z",
  endDate: "2026-07-10T00:00:00.000Z",
  ...TIMESTAMPS,
};

const RAW_BOOKING = {
  _id: "booking-1",
  tripId: "trip-1",
  type: "flight",
  title: "Vol aller",
  date: "2026-07-01T08:00:00.000Z",
  ...TIMESTAMPS,
};

const RAW_ADDRESS = {
  _id: "address-1",
  tripId: "trip-1",
  name: "Hôtel",
  address: "Rua Augusta",
  ...TIMESTAMPS,
};

const tripsApiHandlers = {
  createTrip: jest.fn(),
  updateTrip: jest.fn(),
  validateTrip: jest.fn(),
  deleteTrip: jest.fn(),
  createBooking: jest.fn(),
  updateBooking: jest.fn(),
  deleteBooking: jest.fn(),
  createAddress: jest.fn(),
  updateAddress: jest.fn(),
  deleteAddress: jest.fn(),
  createInvitation: jest.fn(),
  getUserInvitations: jest.fn(),
  getSentInvitations: jest.fn(),
  respondToInvitation: jest.fn(),
  getInvitationByToken: jest.fn(),
  getTripInvitationLink: jest.fn(),
  cancelInvitation: jest.fn(),
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <TripsProvider>{children}</TripsProvider>
);

const renderTrips = async () => {
  const rendered = renderHook(() => useTrips(), { wrapper });
  await act(async () => {});
  return rendered;
};

/** Alimente le cache local pour chaque clé, `null` valant « rien en cache ». */
const givenCache = (values: Record<string, unknown>) => {
  mockCache.getStale.mockImplementation((key: string) =>
    Promise.resolve(values[key] ?? null),
  );
};

describe("TripsContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    givenCache({});
    mockCache.set.mockResolvedValue(undefined);
    mockCache.invalidate.mockResolvedValue(undefined);
    mockApi.getTrips.mockResolvedValue([]);
    mockApi.getBookings.mockResolvedValue([]);
    mockApi.getAddresses.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: USER, loading: false });
    mockUseTripsApi.mockReturnValue(tripsApiHandlers);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("useTrips", () => {
    it("should throw when used outside of a TripsProvider", () => {
      // Arrange
      jest.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert
      expect(() => renderHook(() => useTrips())).toThrow(
        "useTrips must be used within a TripsProvider",
      );
    });
  });

  describe("chargement initial", () => {
    it("should not query anything while authentication is still resolving", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null, loading: true });

      // Act
      const { result } = await renderTrips();

      // Assert
      expect(mockApi.getTrips).not.toHaveBeenCalled();
      expect(mockCache.getStale).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(true);
    });

    it("should load and map trips, bookings and addresses when a user is signed in", async () => {
      // Arrange
      mockApi.getTrips.mockResolvedValue([RAW_TRIP]);
      mockApi.getBookings.mockResolvedValue([RAW_BOOKING]);
      mockApi.getAddresses.mockResolvedValue([RAW_ADDRESS]);

      // Act
      const { result } = await renderTrips();

      // Assert
      expect(result.current.trips).toEqual([mapTrip(RAW_TRIP)]);
      expect(result.current.bookings).toEqual([mapBooking(RAW_BOOKING)]);
      expect(result.current.addresses).toEqual([mapAddress(RAW_ADDRESS)]);
      expect(result.current.loading).toBe(false);
    });

    it("should keep the spinner up while the network answers when nothing is cached", async () => {
      // Arrange
      givenCache({});
      mockApi.getTrips.mockReturnValue(new Promise(() => {}));

      // Act
      const { result } = await renderTrips();

      // Assert
      expect(result.current.loading).toBe(true);
    });

    it("should show the cached data without a spinner while the network answers", async () => {
      // Arrange
      const cachedTrip = mapTrip(RAW_TRIP);
      const cachedBooking = mapBooking(RAW_BOOKING);
      const cachedAddress = mapAddress(RAW_ADDRESS);
      givenCache({
        [CACHE_KEYS.TRIPS]: [cachedTrip],
        [CACHE_KEYS.BOOKINGS]: [cachedBooking],
        [CACHE_KEYS.ADDRESSES]: [cachedAddress],
      });
      mockApi.getTrips.mockReturnValue(new Promise(() => {}));

      // Act
      const { result } = await renderTrips();

      // Assert
      expect(result.current.trips).toEqual([cachedTrip]);
      expect(result.current.bookings).toEqual([cachedBooking]);
      expect(result.current.addresses).toEqual([cachedAddress]);
      expect(result.current.loading).toBe(false);
    });

    it("should hydrate only the collections actually present in the cache", async () => {
      // Arrange
      const cachedTrip = mapTrip(RAW_TRIP);
      givenCache({ [CACHE_KEYS.TRIPS]: [cachedTrip] });
      mockApi.getTrips.mockReturnValue(new Promise(() => {}));

      // Act
      const { result } = await renderTrips();

      // Assert
      expect(result.current.trips).toEqual([cachedTrip]);
      expect(result.current.bookings).toEqual([]);
      expect(result.current.addresses).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it("should keep serving the cached data when the network request fails", async () => {
      // Arrange
      const cachedTrip = mapTrip(RAW_TRIP);
      givenCache({ [CACHE_KEYS.TRIPS]: [cachedTrip] });
      mockApi.getTrips.mockRejectedValue(new Error("hors ligne"));

      // Act
      const { result } = await renderTrips();

      // Assert
      expect(result.current.trips).toEqual([cachedTrip]);
      expect(result.current.loading).toBe(false);
      expect(console.error).toHaveBeenCalledWith("Error loading data:", expect.any(Error));
    });

    it("should stop loading with empty collections when the network fails and nothing is cached", async () => {
      // Arrange
      mockApi.getTrips.mockRejectedValue(new Error("hors ligne"));

      // Act
      const { result } = await renderTrips();

      // Assert
      expect(result.current.trips).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("déconnexion", () => {
    it("should clear every collection and invalidate the cache when no user is signed in", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null, loading: false });

      // Act
      const { result } = await renderTrips();

      // Assert
      expect(result.current.trips).toEqual([]);
      expect(result.current.bookings).toEqual([]);
      expect(result.current.addresses).toEqual([]);
      expect(result.current.invitations).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(mockCache.invalidate).toHaveBeenCalledWith(CACHE_KEYS.TRIPS);
      expect(mockCache.invalidate).toHaveBeenCalledWith(CACHE_KEYS.BOOKINGS);
      expect(mockCache.invalidate).toHaveBeenCalledWith(CACHE_KEYS.ADDRESSES);
      expect(mockApi.getTrips).not.toHaveBeenCalled();
    });

    it("should ignore a cache invalidation failure when no user is signed in", async () => {
      // Arrange
      mockUseAuth.mockReturnValue({ user: null, loading: false });
      mockCache.invalidate.mockRejectedValue(new Error("stockage indisponible"));

      // Act
      const { result } = await renderTrips();

      // Assert
      expect(result.current.trips).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("changement d'utilisateur", () => {
    it("should not reload the data when the same user is rendered again", async () => {
      // Arrange
      const { rerender } = await renderTrips();
      expect(mockApi.getTrips).toHaveBeenCalledTimes(1);

      // Act
      rerender({});
      await act(async () => {});

      // Assert
      expect(mockApi.getTrips).toHaveBeenCalledTimes(1);
    });

    it("should not reload the data when the user object is replaced but keeps the same identity", async () => {
      // Arrange
      const { rerender } = await renderTrips();
      expect(mockApi.getTrips).toHaveBeenCalledTimes(1);

      // Act
      mockUseAuth.mockReturnValue({ user: { ...USER }, loading: false });
      rerender({});
      await act(async () => {});

      // Assert
      expect(mockApi.getTrips).toHaveBeenCalledTimes(1);
    });

    it("should reload the data when another user signs in", async () => {
      // Arrange
      const { rerender } = await renderTrips();

      // Act
      mockUseAuth.mockReturnValue({ user: OTHER_USER, loading: false });
      rerender({});
      await act(async () => {});

      // Assert
      expect(mockApi.getTrips).toHaveBeenCalledTimes(2);
    });

    it("should clear the collections when the user changes while a load is still running", async () => {
      // Arrange
      const cachedTrip = mapTrip(RAW_TRIP);
      givenCache({ [CACHE_KEYS.TRIPS]: [cachedTrip] });
      mockApi.getTrips.mockReturnValue(new Promise(() => {}));
      const { result, rerender } = await renderTrips();
      expect(result.current.trips).toEqual([cachedTrip]);

      // Act
      mockUseAuth.mockReturnValue({ user: OTHER_USER, loading: false });
      rerender({});
      await act(async () => {});

      // Assert
      expect(result.current.trips).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(mockCache.invalidate).toHaveBeenCalledWith(CACHE_KEYS.TRIPS);
    });
  });

  describe("refreshData", () => {
    it("should query the API again when a refresh is requested", async () => {
      // Arrange
      const { result } = await renderTrips();
      mockApi.getTrips.mockResolvedValue([RAW_TRIP]);

      // Act
      await act(async () => {
        await result.current.refreshData();
      });

      // Assert
      expect(mockApi.getTrips).toHaveBeenCalledTimes(2);
      expect(result.current.trips).toEqual([mapTrip(RAW_TRIP)]);
    });

    it("should ignore a concurrent refresh while one is already running", async () => {
      // Arrange
      const { result } = await renderTrips();
      let resolveTrips: (value: unknown[]) => void = () => {};
      mockApi.getTrips.mockReturnValue(
        new Promise((resolve) => {
          resolveTrips = resolve;
        }),
      );

      // Act
      await act(async () => {
        const first = result.current.refreshData();
        const second = result.current.refreshData();
        resolveTrips([]);
        await Promise.all([first, second]);
      });

      // Assert
      expect(mockApi.getTrips).toHaveBeenCalledTimes(2);
    });

    it("should keep the previously loaded data when a refresh fails", async () => {
      // Arrange
      mockApi.getTrips.mockResolvedValue([RAW_TRIP]);
      const { result } = await renderTrips();
      mockApi.getTrips.mockRejectedValue(new Error("hors ligne"));

      // Act
      await act(async () => {
        await result.current.refreshData();
      });

      // Assert
      expect(result.current.trips).toEqual([mapTrip(RAW_TRIP)]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("synchronisation du cache", () => {
    it("should write every collection to the cache once the network data has been loaded", async () => {
      // Arrange
      mockApi.getTrips.mockResolvedValue([RAW_TRIP]);
      mockApi.getBookings.mockResolvedValue([RAW_BOOKING]);
      mockApi.getAddresses.mockResolvedValue([RAW_ADDRESS]);

      // Act
      await renderTrips();

      // Assert
      expect(mockCache.set).toHaveBeenCalledWith(
        CACHE_KEYS.TRIPS,
        [mapTrip(RAW_TRIP)],
        CACHE_TTL.TRIPS,
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        CACHE_KEYS.BOOKINGS,
        [mapBooking(RAW_BOOKING)],
        CACHE_TTL.BOOKINGS,
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        CACHE_KEYS.ADDRESSES,
        [mapAddress(RAW_ADDRESS)],
        CACHE_TTL.ADDRESSES,
      );
    });

    it("should keep the loaded data usable when writing to the cache fails", async () => {
      // Arrange
      mockCache.set.mockRejectedValue(new Error("stockage plein"));
      mockApi.getTrips.mockResolvedValue([RAW_TRIP]);

      // Act
      const { result } = await renderTrips();

      // Assert
      expect(result.current.trips).toEqual([mapTrip(RAW_TRIP)]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("sélecteurs", () => {
    it("should return the trip matching the given identifier", async () => {
      // Arrange
      mockApi.getTrips.mockResolvedValue([RAW_TRIP]);
      const { result } = await renderTrips();

      // Act
      const trip = result.current.getTripById("trip-1");

      // Assert
      expect(trip).toEqual(mapTrip(RAW_TRIP));
    });

    it("should return null when no trip matches the given identifier", async () => {
      // Arrange
      mockApi.getTrips.mockResolvedValue([RAW_TRIP]);
      const { result } = await renderTrips();

      // Act
      const trip = result.current.getTripById("trip-inconnu");

      // Assert
      expect(trip).toBeNull();
    });

    it("should return only the bookings attached to the given trip", async () => {
      // Arrange
      mockApi.getBookings.mockResolvedValue([
        RAW_BOOKING,
        { ...RAW_BOOKING, _id: "booking-2", tripId: "trip-2" },
      ]);
      const { result } = await renderTrips();

      // Act
      const bookings = result.current.getBookingsByTripId("trip-1");

      // Assert
      expect(bookings).toEqual([mapBooking(RAW_BOOKING)]);
    });

    it("should return only the addresses attached to the given trip", async () => {
      // Arrange
      mockApi.getAddresses.mockResolvedValue([
        RAW_ADDRESS,
        { ...RAW_ADDRESS, _id: "address-2", tripId: "trip-2" },
      ]);
      const { result } = await renderTrips();

      // Act
      const addresses = result.current.getAddressesByTripId("trip-1");

      // Assert
      expect(addresses).toEqual([mapAddress(RAW_ADDRESS)]);
    });
  });

  describe("délégation aux opérations d'API", () => {
    it("should expose the trip, booking, address and invitation operations", async () => {
      // Arrange & Act
      const { result } = await renderTrips();

      // Assert
      expect(result.current.createTrip).toBe(tripsApiHandlers.createTrip);
      expect(result.current.updateTrip).toBe(tripsApiHandlers.updateTrip);
      expect(result.current.validateTrip).toBe(tripsApiHandlers.validateTrip);
      expect(result.current.deleteTrip).toBe(tripsApiHandlers.deleteTrip);
      expect(result.current.createBooking).toBe(tripsApiHandlers.createBooking);
      expect(result.current.updateBooking).toBe(tripsApiHandlers.updateBooking);
      expect(result.current.deleteBooking).toBe(tripsApiHandlers.deleteBooking);
      expect(result.current.createAddress).toBe(tripsApiHandlers.createAddress);
      expect(result.current.updateAddress).toBe(tripsApiHandlers.updateAddress);
      expect(result.current.deleteAddress).toBe(tripsApiHandlers.deleteAddress);
      expect(result.current.createInvitation).toBe(tripsApiHandlers.createInvitation);
      expect(result.current.getUserInvitations).toBe(tripsApiHandlers.getUserInvitations);
      expect(result.current.getSentInvitations).toBe(tripsApiHandlers.getSentInvitations);
      expect(result.current.respondToInvitation).toBe(tripsApiHandlers.respondToInvitation);
      expect(result.current.getInvitationByToken).toBe(tripsApiHandlers.getInvitationByToken);
      expect(result.current.getTripInvitationLink).toBe(tripsApiHandlers.getTripInvitationLink);
      expect(result.current.cancelInvitation).toBe(tripsApiHandlers.cancelInvitation);
    });

    it("should let the API operations feed the shared collections", async () => {
      // Arrange
      const { result } = await renderTrips();
      const setters = mockUseTripsApi.mock.calls[0][0];

      // Act
      await act(async () => {
        setters.setInvitations([{ id: "invitation-1" }]);
      });

      // Assert
      expect(result.current.invitations).toEqual([{ id: "invitation-1" }]);
    });
  });
});
