import { renderHook, act } from "@testing-library/react-native";
import { useTripsApi } from "../useTripsApi";
import ApiService from "../../services/ApiService";
import type { Address, Booking, Trip, TripInvitation } from "../../types";

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: {
    createTrip: jest.fn(),
    updateTrip: jest.fn(),
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
  },
}));

const mockApi = ApiService as unknown as Record<string, jest.Mock>;

function setup() {
  const setTrips = jest.fn();
  const setBookings = jest.fn();
  const setAddresses = jest.fn();
  const setInvitations = jest.fn();
  const refreshData = jest.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() =>
    useTripsApi({
      setTrips: setTrips as unknown as React.Dispatch<React.SetStateAction<Trip[]>>,
      setBookings: setBookings as unknown as React.Dispatch<React.SetStateAction<Booking[]>>,
      setAddresses: setAddresses as unknown as React.Dispatch<React.SetStateAction<Address[]>>,
      setInvitations: setInvitations as unknown as React.Dispatch<
        React.SetStateAction<TripInvitation[]>
      >,
      refreshData,
    }),
  );
  return { result, setTrips, setBookings, setAddresses, setInvitations, refreshData };
}

describe("useTripsApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should expose the handlers of every domain sub-hook", () => {
    // Arrange & Act
    const { result } = setup();

    // Assert
    expect(Object.keys(result.current).sort()).toEqual(
      [
        "cancelInvitation",
        "createAddress",
        "createBooking",
        "createInvitation",
        "createTrip",
        "deleteAddress",
        "deleteBooking",
        "deleteTrip",
        "getInvitationByToken",
        "getSentInvitations",
        "getTripInvitationLink",
        "getUserInvitations",
        "respondToInvitation",
        "updateAddress",
        "updateBooking",
        "updateTrip",
        "validateTrip",
      ].sort(),
    );
  });

  it("should route trip creation to the trips setter", async () => {
    // Arrange
    mockApi.createTrip.mockResolvedValue({ _id: "trip-1", title: "Tokyo" });
    const { result, setTrips, setBookings, setAddresses, setInvitations } = setup();

    // Act
    await act(async () => {
      await result.current.createTrip({} as Omit<Trip, "id" | "createdAt" | "updatedAt">);
    });

    // Assert
    expect(setTrips).toHaveBeenCalledTimes(1);
    expect(setBookings).not.toHaveBeenCalled();
    expect(setAddresses).not.toHaveBeenCalled();
    expect(setInvitations).not.toHaveBeenCalled();
  });

  it("should route booking creation to the bookings setter", async () => {
    // Arrange
    mockApi.createBooking.mockResolvedValue({ _id: "book-1" });
    const { result, setBookings, setTrips } = setup();

    // Act
    await act(async () => {
      await result.current.createBooking({} as Omit<Booking, "id" | "createdAt" | "updatedAt">);
    });

    // Assert
    expect(setBookings).toHaveBeenCalledTimes(1);
    expect(setTrips).not.toHaveBeenCalled();
  });

  it("should route address creation to the addresses setter", async () => {
    // Arrange
    mockApi.createAddress.mockResolvedValue({ _id: "addr-1" });
    const { result, setAddresses, setTrips } = setup();

    // Act
    await act(async () => {
      await result.current.createAddress({} as Omit<Address, "id" | "createdAt" | "updatedAt">);
    });

    // Assert
    expect(setAddresses).toHaveBeenCalledTimes(1);
    expect(setTrips).not.toHaveBeenCalled();
  });

  it("should route invitation creation to the invitations setter", async () => {
    // Arrange
    mockApi.createInvitation.mockResolvedValue({ _id: "inv-1" });
    const { result, setInvitations, setTrips } = setup();

    // Act
    await act(async () => {
      await result.current.createInvitation({ tripId: "trip-1" });
    });

    // Assert
    expect(setInvitations).toHaveBeenCalledTimes(1);
    expect(setTrips).not.toHaveBeenCalled();
  });

  it("should forward refreshData to the invitations sub-hook when an invitation is accepted", async () => {
    // Arrange
    mockApi.respondToInvitation.mockResolvedValue({ success: true, status: "accepted" });
    const { result, refreshData } = setup();

    // Act
    await act(async () => {
      await result.current.respondToInvitation("tok-1", "accept", "user-1");
    });

    // Assert
    expect(refreshData).toHaveBeenCalledTimes(1);
  });
});
