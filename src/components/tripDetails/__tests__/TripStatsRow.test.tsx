jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import React from "react";
import { render, screen } from "@testing-library/react-native";
import "../../__tests__/voyagesTestUtils";
import TripStatsRow from "../TripStatsRow";

describe("TripStatsRow", () => {
  it("should show each count next to its label", () => {
    render(<TripStatsRow bookingsCount={4} addressesCount={7} totalMembers={2} />);

    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("Bookings")).toBeTruthy();
    expect(screen.getByText("Addresses")).toBeTruthy();
    expect(screen.getByText("Members")).toBeTruthy();
  });

  it("should render zeroes when the trip is empty", () => {
    render(<TripStatsRow bookingsCount={0} addressesCount={0} totalMembers={0} />);

    expect(screen.getAllByText("0")).toHaveLength(3);
  });
});
