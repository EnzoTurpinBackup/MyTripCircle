import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import DatePickerField from "../DatePickerField";
import { lightColors } from "../../../contexts/ThemeContext";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const renderField = (overrides: Partial<React.ComponentProps<typeof DatePickerField>> = {}) => {
  const onPress = jest.fn();
  render(
    <DatePickerField
      label="DÉPART"
      isActive={false}
      dateValue="12 mars 2026"
      onPress={onPress}
      {...overrides}
    />
  );
  return { onPress };
};

describe("DatePickerField", () => {
  it("should show the label untouched while the field is not being edited", () => {
    // Arrange / Act
    renderField();

    // Assert
    expect(screen.getByText("DÉPART")).toBeTruthy();
    expect(screen.queryByText("DÉPART ✎")).toBeNull();
  });

  it("should mark the label with a pencil while the field is being edited", () => {
    // Arrange / Act
    renderField({ isActive: true });

    // Assert
    expect(screen.getByText("DÉPART ✎")).toBeTruthy();
  });

  it("should paint the value with the neutral colour while the field is not being edited", () => {
    // Arrange / Act
    renderField();

    // Assert
    expect(screen.getByText("12 mars 2026")).toHaveStyle({ color: lightColors.text });
  });

  it("should highlight the value while the field is being edited", () => {
    // Arrange / Act
    renderField({ isActive: true });

    // Assert
    expect(screen.getByText("12 mars 2026")).toHaveStyle({ color: lightColors.terra });
  });

  it("should open the picker when the field is pressed", () => {
    // Arrange
    const { onPress } = renderField();

    // Act
    fireEvent.press(screen.getByText("12 mars 2026"));

    // Assert
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
