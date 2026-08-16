import { renderHook, act } from "@testing-library/react-native";
import { useTripsApiBookings } from "../useTripsApiBookings";
import ApiService from "../../services/ApiService";
import type { Booking } from "../../types";

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: {
    createBooking: jest.fn(),
    updateBooking: jest.fn(),
    deleteBooking: jest.fn(),
  },
}));

const mockApi = ApiService as unknown as {
  createBooking: jest.Mock;
  updateBooking: jest.Mock;
  deleteBooking: jest.Mock;
};

const RAW_BOOKING = {
  _id: "book-1",
  tripId: "trip-1",
  type: "flight",
  title: "Paris → Tokyo",
  date: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const FULL_INPUT = {
  tripId: "trip-1",
  type: "flight",
  title: "Paris → Tokyo",
  description: "Vol direct",
  date: new Date("2026-01-01T00:00:00.000Z"),
  endDate: new Date("2026-01-02T00:00:00.000Z"),
  time: "10:30",
  address: "CDG",
  confirmationNumber: "ABC123",
  price: 500,
  currency: "USD",
  status: "confirmed",
  attachments: ["file.pdf"],
} as unknown as Omit<Booking, "id" | "createdAt" | "updatedAt">;

/** Rejoue l'updater passé au setter React sur un état initial donné. */
function applyUpdater(setter: jest.Mock, previous: Booking[]): Booking[] {
  const updater = setter.mock.calls[0][0] as (prev: Booking[]) => Booking[];
  return updater(previous);
}

function setup() {
  const setBookings = jest.fn();
  const { result } = renderHook(() =>
    useTripsApiBookings({
      setBookings: setBookings as unknown as React.Dispatch<React.SetStateAction<Booking[]>>,
    }),
  );
  return { result, setBookings };
}

describe("useTripsApiBookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createBooking", () => {
    it("should forward every provided field to the API when the booking is complete", async () => {
      // Arrange
      mockApi.createBooking.mockResolvedValue(RAW_BOOKING);
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.createBooking(FULL_INPUT);
      });

      // Assert
      expect(mockApi.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: "trip-1",
          currency: "USD",
          status: "confirmed",
          attachments: ["file.pdf"],
        }),
      );
    });

    it("should fall back to empty tripId, EUR, pending and no attachment when fields are missing", async () => {
      // Arrange
      mockApi.createBooking.mockResolvedValue(RAW_BOOKING);
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.createBooking({
          type: "flight",
          title: "Sans détails",
        } as unknown as Omit<Booking, "id" | "createdAt" | "updatedAt">);
      });

      // Assert
      expect(mockApi.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: "",
          currency: "EUR",
          status: "pending",
          attachments: [],
        }),
      );
    });

    it("should return the mapped booking when the API call succeeds", async () => {
      // Arrange
      mockApi.createBooking.mockResolvedValue(RAW_BOOKING);
      const { result } = setup();

      // Act
      let created: Booking | undefined;
      await act(async () => {
        created = await result.current.createBooking(FULL_INPUT);
      });

      // Assert
      expect(created).toMatchObject({ id: "book-1", title: "Paris → Tokyo" });
    });

    it("should append the created booking to the existing list when the API call succeeds", async () => {
      // Arrange
      mockApi.createBooking.mockResolvedValue(RAW_BOOKING);
      const { result, setBookings } = setup();

      // Act
      await act(async () => {
        await result.current.createBooking(FULL_INPUT);
      });

      // Assert
      expect(applyUpdater(setBookings, [{ id: "book-0" } as Booking]).map((b) => b.id)).toEqual([
        "book-0",
        "book-1",
      ]);
    });

    it("should rethrow when the API call fails", async () => {
      // Arrange
      mockApi.createBooking.mockRejectedValue(new Error("create failed"));
      const { result } = setup();

      // Act & Assert
      await expect(result.current.createBooking(FULL_INPUT)).rejects.toThrow("create failed");
    });
  });

  describe("updateBooking", () => {
    it("should return the API payload when the call succeeds", async () => {
      // Arrange
      mockApi.updateBooking.mockResolvedValue({ id: "book-1", title: "Nouveau titre" });
      const { result } = setup();

      // Act
      let updated: Booking | null | undefined;
      await act(async () => {
        updated = await result.current.updateBooking("book-1", { title: "Nouveau titre" });
      });

      // Assert
      expect(updated).toEqual({ id: "book-1", title: "Nouveau titre" });
    });

    it("should merge the update into the booking matched by id", async () => {
      // Arrange
      mockApi.updateBooking.mockResolvedValue({ title: "Nouveau titre" });
      const { result, setBookings } = setup();
      const existing = [
        { id: "book-0", title: "Autre" } as Booking,
        { id: "book-1", title: "Ancien" } as Booking,
      ];

      // Act
      await act(async () => {
        await result.current.updateBooking("book-1", { title: "Nouveau titre" });
      });

      // Assert
      expect(applyUpdater(setBookings, existing).map((b) => b.title)).toEqual([
        "Autre",
        "Nouveau titre",
      ]);
    });

    it("should merge the update into the booking matched by its raw _id", async () => {
      // Arrange
      mockApi.updateBooking.mockResolvedValue({ title: "Nouveau titre" });
      const { result, setBookings } = setup();
      const existing = [
        { id: "local-1", _id: "book-1", title: "Ancien" } as Booking & { _id: string },
      ];

      // Act
      await act(async () => {
        await result.current.updateBooking("book-1", { title: "Nouveau titre" });
      });

      // Assert
      expect(applyUpdater(setBookings, existing).map((b) => b.title)).toEqual(["Nouveau titre"]);
    });

    it("should rethrow when the API call fails", async () => {
      // Arrange
      mockApi.updateBooking.mockRejectedValue(new Error("update failed"));
      const { result } = setup();

      // Act & Assert
      await expect(result.current.updateBooking("book-1", {})).rejects.toThrow("update failed");
    });
  });

  describe("deleteBooking", () => {
    it("should return true when the API call succeeds", async () => {
      // Arrange
      mockApi.deleteBooking.mockResolvedValue(undefined);
      const { result } = setup();

      // Act
      let deleted: boolean | undefined;
      await act(async () => {
        deleted = await result.current.deleteBooking("book-1");
      });

      // Assert
      expect(deleted).toBe(true);
    });

    it("should remove the booking from the list when the API call succeeds", async () => {
      // Arrange
      mockApi.deleteBooking.mockResolvedValue(undefined);
      const { result, setBookings } = setup();
      const existing = [{ id: "book-0" } as Booking, { id: "book-1" } as Booking];

      // Act
      await act(async () => {
        await result.current.deleteBooking("book-1");
      });

      // Assert
      expect(applyUpdater(setBookings, existing).map((b) => b.id)).toEqual(["book-0"]);
    });

    it("should return false when the API call fails", async () => {
      // Arrange
      mockApi.deleteBooking.mockRejectedValue(new Error("delete failed"));
      const { result } = setup();

      // Act
      let deleted: boolean | undefined;
      await act(async () => {
        deleted = await result.current.deleteBooking("book-1");
      });

      // Assert
      expect(deleted).toBe(false);
    });
  });
});
