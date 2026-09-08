import React from "react";
import { Animated } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import AcceptedToast from "../AcceptedToast";
import i18n from "../../../utils/i18n";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function renderToast(props: Partial<React.ComponentProps<typeof AcceptedToast>> = {}) {
  const onView = jest.fn();
  const toastAnim = new Animated.Value(1);
  const utils = render(
    <AcceptedToast
      toastTrip={{ name: "Islande 2026", id: "trip-1" }}
      toastAnim={toastAnim}
      onView={onView}
      {...props}
    />
  );
  return { ...utils, onView, toastAnim };
}

describe("AcceptedToast", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should render nothing when there is no accepted trip to announce", () => {
    // Arrange / Act
    renderToast({ toastTrip: null });

    // Assert
    expect(screen.queryByText("View ›")).toBeNull();
  });

  it("should announce the joined trip by name when a trip is set", () => {
    // Arrange / Act
    renderToast();

    // Assert
    expect(screen.getByText("You joined Islande 2026!")).toBeTruthy();
    expect(screen.getByText("Trip added to My Trips")).toBeTruthy();
  });

  it("should call onView with the trip id when the view action is pressed", () => {
    // Arrange
    const { onView } = renderToast();

    // Act
    fireEvent.press(screen.getByText("View ›"));

    // Assert
    expect(onView).toHaveBeenCalledWith("trip-1");
  });

  it("should not call onView when the trip has no id", () => {
    // Arrange
    const { onView } = renderToast({ toastTrip: { name: "Islande 2026", id: "" } });

    // Act
    fireEvent.press(screen.getByText("View ›"));

    // Assert
    expect(onView).not.toHaveBeenCalled();
  });

  it("should animate the toast out when the view action is pressed", () => {
    // Arrange
    const timing = jest.spyOn(Animated, "timing");
    const { toastAnim } = renderToast();

    // Act
    fireEvent.press(screen.getByText("View ›"));

    // Assert
    expect(timing).toHaveBeenCalledWith(
      toastAnim,
      expect.objectContaining({ toValue: 0, duration: 200, useNativeDriver: true })
    );
    timing.mockRestore();
  });
});
