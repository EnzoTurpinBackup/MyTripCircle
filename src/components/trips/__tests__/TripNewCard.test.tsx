jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import "../../__tests__/voyagesTestUtils";
import TripNewCard from "../TripNewCard";

describe("TripNewCard", () => {
  it("should show the new trip label", () => {
    render(<TripNewCard onPress={jest.fn()} />);

    expect(screen.getByText("New")).toBeTruthy();
  });

  it("should start a trip creation when pressed", () => {
    const onPress = jest.fn();
    render(<TripNewCard onPress={onPress} />);

    fireEvent.press(screen.getByText("New"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("should ignore presses when disabled", () => {
    const onPress = jest.fn();
    render(<TripNewCard onPress={onPress} disabled />);

    fireEvent.press(screen.getByText("New"));

    expect(onPress).not.toHaveBeenCalled();
  });
});
