import { renderHook, act } from "@testing-library/react-native";
import { useTripsApiTrips } from "../useTripsApiTrips";
import ApiService from "../../services/ApiService";
import type { Trip, Booking } from "../../types";

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: {
    createTrip: jest.fn(),
    updateTrip: jest.fn(),
    deleteTrip: jest.fn(),
  },
}));

const mockApi = ApiService as unknown as {
  createTrip: jest.Mock;
  updateTrip: jest.Mock;
  deleteTrip: jest.Mock;
};

const RAW_TRIP = {
  _id: "trip-1",
  title: "Tokyo",
  destination: "Japon",
  ownerId: "owner-1",
  startDate: "2026-01-01T00:00:00.000Z",
  endDate: "2026-01-10T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

/** Rejoue l'updater passé au setter React sur un état initial donné. */
function applyUpdater<T>(setter: jest.Mock, previous: T[]): T[] {
  const updater = setter.mock.calls[0][0] as (prev: T[]) => T[];
  return updater(previous);
}

function setup() {
  const setTrips = jest.fn();
  const setBookings = jest.fn();
  const { result } = renderHook(() =>
    useTripsApiTrips({
      setTrips: setTrips as unknown as React.Dispatch<React.SetStateAction<Trip[]>>,
      setBookings: setBookings as unknown as React.Dispatch<React.SetStateAction<Booking[]>>,
    }),
  );
  return { result, setTrips, setBookings };
}

describe("useTripsApiTrips", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createTrip", () => {
    it("should return the mapped trip when the API call succeeds", async () => {
      // Arrange
      mockApi.createTrip.mockResolvedValue(RAW_TRIP);
      const { result } = setup();

      // Act
      let created: Trip | undefined;
      await act(async () => {
        created = await result.current.createTrip({} as Omit<Trip, "id" | "createdAt" | "updatedAt">);
      });

      // Assert
      expect(created).toMatchObject({ id: "trip-1", title: "Tokyo", status: "draft" });
    });

    it("should append the created trip to the existing list when the API call succeeds", async () => {
      // Arrange
      mockApi.createTrip.mockResolvedValue(RAW_TRIP);
      const { result, setTrips } = setup();
      const existing = [{ id: "trip-0" } as Trip];

      // Act
      await act(async () => {
        await result.current.createTrip({} as Omit<Trip, "id" | "createdAt" | "updatedAt">);
      });

      // Assert
      expect(applyUpdater(setTrips, existing).map((t) => t.id)).toEqual(["trip-0", "trip-1"]);
    });

    it("should rethrow and not touch the list when the API call fails", async () => {
      // Arrange
      mockApi.createTrip.mockRejectedValue(new Error("boom"));
      const { result, setTrips } = setup();

      // Act & Assert
      await expect(
        result.current.createTrip({} as Omit<Trip, "id" | "createdAt" | "updatedAt">),
      ).rejects.toThrow("boom");
      expect(setTrips).not.toHaveBeenCalled();
    });
  });

  describe("updateTrip", () => {
    it("should return the mapped trip when the API call succeeds", async () => {
      // Arrange
      mockApi.updateTrip.mockResolvedValue({ ...RAW_TRIP, title: "Kyoto" });
      const { result } = setup();

      // Act
      let updated: Trip | null | undefined;
      await act(async () => {
        updated = await result.current.updateTrip("trip-1", { title: "Kyoto" });
      });

      // Assert
      expect(updated).toMatchObject({ id: "trip-1", title: "Kyoto" });
    });

    it("should replace only the matching trip in the list when the API call succeeds", async () => {
      // Arrange
      mockApi.updateTrip.mockResolvedValue({ ...RAW_TRIP, title: "Kyoto" });
      const { result, setTrips } = setup();
      const existing = [{ id: "trip-0", title: "Paris" } as Trip, { id: "trip-1", title: "Tokyo" } as Trip];

      // Act
      await act(async () => {
        await result.current.updateTrip("trip-1", { title: "Kyoto" });
      });

      // Assert
      expect(applyUpdater(setTrips, existing).map((t) => t.title)).toEqual(["Paris", "Kyoto"]);
    });

    it("should rethrow when the API call fails", async () => {
      // Arrange
      mockApi.updateTrip.mockRejectedValue(new Error("update failed"));
      const { result } = setup();

      // Act & Assert
      await expect(result.current.updateTrip("trip-1", {})).rejects.toThrow("update failed");
    });
  });

  describe("validateTrip", () => {
    it("should update the trip status to validated when called", async () => {
      // Arrange
      mockApi.updateTrip.mockResolvedValue({ ...RAW_TRIP, status: "validated" });
      const { result } = setup();

      // Act
      let validated: Trip | null | undefined;
      await act(async () => {
        validated = await result.current.validateTrip("trip-1");
      });

      // Assert
      expect(mockApi.updateTrip).toHaveBeenCalledWith("trip-1", { status: "validated" });
      expect(validated).toMatchObject({ status: "validated" });
    });

    it("should rethrow when the underlying update fails", async () => {
      // Arrange
      mockApi.updateTrip.mockRejectedValue(new Error("nope"));
      const { result } = setup();

      // Act & Assert
      await expect(result.current.validateTrip("trip-1")).rejects.toThrow("nope");
    });
  });

  describe("deleteTrip", () => {
    it("should return true when the API call succeeds", async () => {
      // Arrange
      mockApi.deleteTrip.mockResolvedValue(undefined);
      const { result } = setup();

      // Act
      let deleted: boolean | undefined;
      await act(async () => {
        deleted = await result.current.deleteTrip("trip-1");
      });

      // Assert
      expect(deleted).toBe(true);
    });

    it("should remove the trip from the list when the API call succeeds", async () => {
      // Arrange
      mockApi.deleteTrip.mockResolvedValue(undefined);
      const { result, setTrips } = setup();
      const existing = [{ id: "trip-0" } as Trip, { id: "trip-1" } as Trip];

      // Act
      await act(async () => {
        await result.current.deleteTrip("trip-1");
      });

      // Assert
      expect(applyUpdater(setTrips, existing).map((t) => t.id)).toEqual(["trip-0"]);
    });

    it("should remove the bookings attached to the deleted trip when the API call succeeds", async () => {
      // Arrange
      mockApi.deleteTrip.mockResolvedValue(undefined);
      const { result, setBookings } = setup();
      const existing = [
        { id: "b-0", tripId: "trip-0" } as Booking,
        { id: "b-1", tripId: "trip-1" } as Booking,
      ];

      // Act
      await act(async () => {
        await result.current.deleteTrip("trip-1");
      });

      // Assert
      expect(applyUpdater(setBookings, existing).map((b) => b.id)).toEqual(["b-0"]);
    });

    it("should return false when the API call fails", async () => {
      // Arrange
      mockApi.deleteTrip.mockRejectedValue(new Error("delete failed"));
      const { result } = setup();

      // Act
      let deleted: boolean | undefined;
      await act(async () => {
        deleted = await result.current.deleteTrip("trip-1");
      });

      // Assert
      expect(deleted).toBe(false);
    });
  });
});
