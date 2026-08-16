jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeTrip } from "../../__tests__/voyagesTestUtils";
import TripMiniCard from "../TripMiniCard";

describe("TripMiniCard", () => {
  it("should show the trip title", () => {
    render(<TripMiniCard trip={makeTrip()} photoUri="https://cdn/lima.jpg" onPress={jest.fn()} />);

    expect(screen.getByText("Pérou 2026")).toBeTruthy();
  });

  it("should show the short date range without the destination", () => {
    render(<TripMiniCard trip={makeTrip()} photoUri="https://cdn/lima.jpg" onPress={jest.fn()} />);

    expect(screen.getByText("15 Mar–25 Mar")).toBeTruthy();
    expect(screen.queryByText(/Lima/)).toBeNull();
  });

  it("should open the trip when the card is pressed", () => {
    const onPress = jest.fn();
    render(<TripMiniCard trip={makeTrip()} photoUri="https://cdn/lima.jpg" onPress={onPress} />);

    fireEvent.press(screen.getByText("Pérou 2026"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
