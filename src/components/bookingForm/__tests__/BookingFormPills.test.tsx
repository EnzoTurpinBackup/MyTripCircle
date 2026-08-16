import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { TypePill, StatusPillItem } from "../BookingFormPills";
import { getTypeColors, STATUS_COLORS } from "../bookingFormConstants";
import { lightColors } from "../../../contexts/ThemeContext";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const colors = lightColors;

describe("TypePill", () => {
  it("should paint the label with the type colour when the pill is selected", () => {
    // Arrange / Act
    render(
      <TypePill
        type="flight"
        isSelected
        label="Vol"
        colors={colors}
        isDark={false}
        onPress={() => {}}
      />
    );

    // Assert
    expect(screen.getByText("Vol")).toHaveStyle({ color: getTypeColors(false).flight.text });
    expect(screen.root).toHaveStyle({
      backgroundColor: getTypeColors(false).flight.bg,
      borderColor: getTypeColors(false).flight.border,
    });
  });

  it("should paint the label with the muted colour when the pill is not selected", () => {
    // Arrange / Act
    render(
      <TypePill
        type="flight"
        isSelected={false}
        label="Vol"
        colors={colors}
        isDark={false}
        onPress={() => {}}
      />
    );

    // Assert
    expect(screen.getByText("Vol")).toHaveStyle({ color: colors.textMid });
    expect(screen.root).toHaveStyle({ backgroundColor: colors.bgMid, borderColor: colors.border });
  });

  it("should use the dark palette background when dark mode is on", () => {
    // Arrange / Act
    render(
      <TypePill type="hotel" isSelected label="Hôtel" colors={colors} isDark onPress={() => {}} />
    );

    // Assert
    expect(screen.root).toHaveStyle({ backgroundColor: getTypeColors(true).hotel.bg });
  });

  it("should call onPress when the pill is tapped", () => {
    // Arrange
    const onPress = jest.fn();
    render(
      <TypePill
        type="train"
        isSelected={false}
        label="Train"
        colors={colors}
        isDark={false}
        onPress={onPress}
      />
    );

    // Act
    fireEvent.press(screen.getByText("Train"));

    // Assert
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("StatusPillItem", () => {
  it("should paint the label with the status colour when selected", () => {
    // Arrange / Act
    render(
      <StatusPillItem
        status="confirmed"
        label="Confirmé"
        isSelected
        colors={colors}
        onPress={() => {}}
      />
    );

    // Assert
    expect(screen.getByText("Confirmé")).toHaveStyle({ color: STATUS_COLORS.confirmed });
  });

  it("should paint the label with the muted colour when not selected", () => {
    // Arrange / Act
    render(
      <StatusPillItem
        status="cancelled"
        label="Annulé"
        isSelected={false}
        colors={colors}
        onPress={() => {}}
      />
    );

    // Assert
    expect(screen.getByText("Annulé")).toHaveStyle({ color: colors.textMid });
  });

  it("should fall back to the muted colour when the status has no dedicated colour", () => {
    // Arrange — un statut hors du référentiel doit rester lisible plutôt que transparent
    render(
      <StatusPillItem
        status={"archived" as never}
        label="Archivé"
        isSelected
        colors={colors}
        onPress={() => {}}
      />
    );

    // Assert
    expect(screen.getByText("Archivé")).toHaveStyle({ color: colors.textMid });
  });

  it("should call onPress when the status pill is tapped", () => {
    // Arrange
    const onPress = jest.fn();
    render(
      <StatusPillItem
        status="pending"
        label="En attente"
        isSelected={false}
        colors={colors}
        onPress={onPress}
      />
    );

    // Act
    fireEvent.press(screen.getByText("En attente"));

    // Assert
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
