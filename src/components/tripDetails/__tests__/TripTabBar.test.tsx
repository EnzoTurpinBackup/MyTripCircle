jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import "../../__tests__/voyagesTestUtils";
import TripTabBar from "../TripTabBar";

describe("TripTabBar", () => {
  it("should render the three tabs", () => {
    render(<TripTabBar activeTab="bookings" onTabChange={jest.fn()} />);

    expect(screen.getByText("Bookings")).toBeTruthy();
    expect(screen.getByText("Addresses")).toBeTruthy();
    expect(screen.getByText("Members")).toBeTruthy();
  });

  it.each(["bookings", "addresses", "members"] as const)(
    "should notify the parent when the %s tab is pressed",
    (tab) => {
      const labels = { bookings: "Bookings", addresses: "Addresses", members: "Members" };
      const onTabChange = jest.fn();
      render(<TripTabBar activeTab="bookings" onTabChange={onTabChange} />);

      fireEvent.press(screen.getByText(labels[tab]));

      expect(onTabChange).toHaveBeenCalledWith(tab);
    },
  );

  it("should highlight the active tab and only that one", () => {
    render(<TripTabBar activeTab="addresses" onTabChange={jest.fn()} />);

    const active = screen.getByText("Addresses");
    const inactive = screen.getByText("Bookings");

    expect(active.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#C4714A" })]),
    );
    expect(inactive.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#B0A090" })]),
    );
  });
});
