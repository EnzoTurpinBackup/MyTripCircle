jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("../../../utils/destinationPhoto", () => ({
  getSyncCachedPhoto: (...args: any[]) => mockGetSyncCachedPhoto(...args),
  getCachedDestinationPhoto: (...args: any[]) => mockGetCachedDestinationPhoto(...args),
}));

const mockNavigation = { goBack: jest.fn(), navigate: jest.fn() };
const mockGetSyncCachedPhoto = jest.fn();
const mockGetCachedDestinationPhoto = jest.fn();

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { makeTrip, pressIcon } from "../../__tests__/voyagesTestUtils";
import TripHero from "../TripHero";

const renderHero = (props: Partial<React.ComponentProps<typeof TripHero>> = {}) =>
  render(
    <TripHero
      trip={makeTrip()}
      tripId="t1"
      isOwner
      bookingsCount={3}
      addressesCount={2}
      {...props}
    />,
  );

beforeEach(() => {
  mockNavigation.goBack.mockClear();
  mockNavigation.navigate.mockClear();
  mockGetSyncCachedPhoto.mockReset().mockReturnValue(null);
  mockGetCachedDestinationPhoto.mockReset().mockResolvedValue(null);
});

describe("TripHero — contenu", () => {
  it("should show the trip title", () => {
    renderHero();

    expect(screen.getByText("Pérou 2026")).toBeTruthy();
  });

  it("should show the destination and the trip dates", () => {
    renderHero();

    expect(screen.getByText(/Lima/)).toBeTruthy();
    expect(screen.getByText(/Mar 15/)).toBeTruthy();
    expect(screen.getByText(/Mar 25, 2026/)).toBeTruthy();
  });

  it.each(["active", "validated", "draft"])(
    "should still render the hero for a %s trip",
    (status) => {
      renderHero({ trip: makeTrip({ status: status as any }) });

      expect(screen.getByText("Pérou 2026")).toBeTruthy();
    },
  );
});

describe("TripHero — image de couverture", () => {
  it("should not look up a photo when the trip already has a cover image", () => {
    renderHero({ trip: makeTrip({ coverImage: "https://cdn/cover.jpg" }) });

    expect(mockGetCachedDestinationPhoto).not.toHaveBeenCalled();
  });

  it("should look up a cached photo when the trip has no cover image", () => {
    renderHero();

    expect(mockGetSyncCachedPhoto).toHaveBeenCalledWith("Lima");
    expect(mockGetCachedDestinationPhoto).toHaveBeenCalledWith("Lima");
  });

  it("should use the synchronously cached photo when there is one", () => {
    mockGetSyncCachedPhoto.mockReturnValue("https://cdn/sync.jpg");

    renderHero();

    expect(screen.getByText("Pérou 2026")).toBeTruthy();
  });

  it("should adopt the photo resolved asynchronously", async () => {
    mockGetCachedDestinationPhoto.mockResolvedValue("https://cdn/async.jpg");

    renderHero();

    await waitFor(() => expect(mockGetCachedDestinationPhoto).toHaveBeenCalled());
    expect(screen.getByText("Pérou 2026")).toBeTruthy();
  });

  it("should keep the fallback photo when the lookup resolves to nothing", async () => {
    renderHero();

    await waitFor(() => expect(mockGetCachedDestinationPhoto).toHaveBeenCalled());
    expect(screen.getByText("Pérou 2026")).toBeTruthy();
  });

  it("should still pick a fallback photo when the trip id is empty", () => {
    renderHero({ tripId: "" });

    expect(screen.getByText("Pérou 2026")).toBeTruthy();
  });

  it("should skip the lookup when the trip has no destination", () => {
    renderHero({ trip: makeTrip({ destination: "" }) });

    expect(mockGetCachedDestinationPhoto).not.toHaveBeenCalled();
  });
});

describe("TripHero — navigation", () => {
  it("should go back when the back button is pressed", () => {
    renderHero();

    fireEvent.press(screen.getByLabelText("Back"));

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it("should open the trip actions screen for the owner", () => {
    renderHero();

    pressIcon("pencil");

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      "TripActions",
      expect.objectContaining({
        tripId: "t1",
        tripTitle: "Pérou 2026",
        destination: "Lima",
        startDate: "2026-03-15T12:00:00.000Z",
        endDate: "2026-03-25T12:00:00.000Z",
        totalBookings: 3,
        totalAddresses: 2,
        isOwner: true,
      }),
    );
  });

  it("should stringify dates that are not Date instances", () => {
    renderHero({
      trip: makeTrip({ startDate: "2026-04-01" as any, endDate: "2026-04-10" as any }),
    });

    pressIcon("pencil");

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      "TripActions",
      expect.objectContaining({ startDate: "2026-04-01", endDate: "2026-04-10" }),
    );
  });

  it("should show the edit button to a non-owner editor", () => {
    renderHero({ isOwner: false, canEdit: true });

    pressIcon("pencil");

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      "TripActions",
      expect.objectContaining({ isOwner: false }),
    );
  });

  it("should hide the edit button from a viewer", () => {
    renderHero({ isOwner: false, canEdit: false });

    expect(screen.queryByText("Pérou 2026")).toBeTruthy();
    expect(() => pressIcon("pencil")).toThrow();
  });
});
