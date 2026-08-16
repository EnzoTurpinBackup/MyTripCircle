import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import TripSection from "../TripSection";
import i18n from "../../../utils/i18n";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function renderSection(props: Partial<React.ComponentProps<typeof TripSection>> = {}) {
  const onPress = jest.fn();
  const utils = render(
    <TripSection
      title="TRIPS IN COMMON"
      marginTop={16}
      trips={[]}
      emptyIcon="airplane-outline"
      emptyText="No trips in common yet"
      bgMid="#EDE5D8"
      textLight="#B0A090"
      onPress={onPress}
      {...props}
    />
  );
  return { ...utils, onPress };
}

describe("TripSection", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should always render the section title", () => {
    // Arrange / Act
    renderSection();

    // Assert
    expect(screen.getByText("TRIPS IN COMMON")).toBeTruthy();
  });

  it("should show the empty text when the section has no trip", () => {
    // Arrange / Act
    renderSection({ trips: [] });

    // Assert
    expect(screen.getByText("No trips in common yet")).toBeTruthy();
  });

  it("should list the trips when the section has some", () => {
    // Arrange / Act
    renderSection({ trips: [{ _id: "t1", destination: "Kyoto" }, { _id: "t2", destination: "Oslo" }] });

    // Assert
    expect(screen.getByText("Kyoto")).toBeTruthy();
    expect(screen.getByText("Oslo")).toBeTruthy();
    expect(screen.queryByText("No trips in common yet")).toBeNull();
  });

  it("should call onPress with the trip id when a trip is pressed", () => {
    // Arrange
    const { onPress } = renderSection({ trips: [{ _id: "t1", destination: "Kyoto" }] });

    // Act
    fireEvent.press(screen.getByText("Kyoto"));

    // Assert
    expect(onPress).toHaveBeenCalledWith("t1");
  });

  it("should fall back to the plain id when the trip has no underscore id", () => {
    // Arrange
    const { onPress } = renderSection({ trips: [{ id: "t9", destination: "Oslo" }] });

    // Act
    fireEvent.press(screen.getByText("Oslo"));

    // Assert
    expect(onPress).toHaveBeenCalledWith("t9");
  });
});
