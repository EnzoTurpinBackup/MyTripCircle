jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { countIcons } from "../../__tests__/voyagesTestUtils";
import TripCoverHero from "../TripCoverHero";

const trip = {
  title: "Pérou 2026",
  destination: "Lima",
  startDate: "2026-03-15T12:00:00.000Z",
  endDate: "2026-03-25T12:00:00.000Z",
};

const renderHero = (props: Partial<React.ComponentProps<typeof TripCoverHero>> = {}) =>
  render(
    <TripCoverHero
      trip={trip}
      statusLabel="Upcoming"
      statusColor="#C4714A"
      statusBg="#F5E5DC"
      insetTop={44}
      onBack={jest.fn()}
      {...props}
    />,
  );

describe("TripCoverHero — contenu", () => {
  it("should show the trip title and its status", () => {
    renderHero();

    expect(screen.getByText("Pérou 2026")).toBeTruthy();
    expect(screen.getByText("Upcoming")).toBeTruthy();
  });

  it("should mark the trip as read only", () => {
    renderHero();

    expect(screen.getByText("Read only")).toBeTruthy();
  });

  it("should show the destination when the trip has one", () => {
    renderHero();

    expect(screen.getByText("Lima")).toBeTruthy();
  });

  it("should omit the destination line when the trip has none", () => {
    renderHero({ trip: { ...trip, destination: undefined } });

    expect(screen.queryByText("Lima")).toBeNull();
    expect(screen.getByText("Pérou 2026")).toBeTruthy();
  });

  it("should show the short start date and the long end date", () => {
    renderHero();

    expect(screen.getByText("Mar 15, 2026 – March 25, 2026")).toBeTruthy();
  });
});

describe("TripCoverHero — image de couverture", () => {
  it("should render the cover image when the trip has one", () => {
    renderHero({ trip: { ...trip, coverImage: "https://cdn/cover.jpg" } });

    expect(screen.getByText("Pérou 2026")).toBeTruthy();
  });

  it("should render a plain background when the trip has no cover image", () => {
    renderHero();

    expect(screen.getByText("Pérou 2026")).toBeTruthy();
  });
});

describe("TripCoverHero — actions", () => {
  it("should go back when the back button is pressed", () => {
    const onBack = jest.fn();
    renderHero({ onBack });

    fireEvent.press(screen.getByLabelText("Back"));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("should report the trip when the report button is pressed", () => {
    const onReport = jest.fn();
    renderHero({ onReport });

    fireEvent.press(screen.getByLabelText("Report this trip"));

    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it("should hide the report button when no handler is provided", () => {
    renderHero();

    expect(screen.queryByLabelText("Report this trip")).toBeNull();
    expect(countIcons("flag-outline")).toBe(0);
  });
});
