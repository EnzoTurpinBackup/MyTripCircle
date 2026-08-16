jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import "../../__tests__/voyagesTestUtils";
import EditTripDangerZone from "../EditTripDangerZone";

const renderZone = (props: Partial<React.ComponentProps<typeof EditTripDangerZone>> = {}) =>
  render(
    <EditTripDangerZone
      dangerLight="#FDEAEA"
      sectionLabelColor="#B0A090"
      onDelete={jest.fn()}
      {...props}
    />,
  );

describe("EditTripDangerZone", () => {
  it("should show the danger zone heading and the deletion warning", () => {
    renderZone();

    expect(screen.getByText("Danger zone")).toBeTruthy();
    expect(screen.getByText("Delete trip")).toBeTruthy();
    expect(screen.getByText("All bookings and addresses will be deleted")).toBeTruthy();
  });

  it("should trigger the deletion when pressed", () => {
    const onDelete = jest.fn();
    renderZone({ onDelete });

    fireEvent.press(screen.getByText("Delete trip"));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("should ignore presses when disabled", () => {
    const onDelete = jest.fn();
    renderZone({ onDelete, disabled: true });

    fireEvent.press(screen.getByText("Delete trip"));

    expect(onDelete).not.toHaveBeenCalled();
  });
});
