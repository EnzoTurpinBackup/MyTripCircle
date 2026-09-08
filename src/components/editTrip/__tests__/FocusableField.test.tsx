import React from "react";
import { Animated, TextInput } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import FocusableField from "../FocusableField";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const renderField = () =>
  render(
    <FocusableField
      baseStyle={{ borderWidth: 1 }}
      render={({ onFocus, onBlur }) => (
        <TextInput accessibilityLabel="Destination" onFocus={onFocus} onBlur={onBlur} />
      )}
    />
  );

describe("FocusableField", () => {
  let timing: jest.SpyInstance;

  beforeEach(() => {
    // L'animation de bordure est le seul effet observable du focus : on
    // instrumente Animated.timing plutôt que d'inspecter la valeur interpolée.
    // Le pilote est neutralisé pour éviter des mises à jour hors act().
    timing = jest
      .spyOn(Animated, "timing")
      .mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() } as never);
  });

  afterEach(() => {
    timing.mockRestore();
  });

  it("should render whatever the parent passes through the render prop", () => {
    // Arrange / Act
    renderField();

    // Assert
    expect(screen.getByLabelText("Destination")).toBeTruthy();
  });

  it("should animate the border to its focused state when the field gains focus", () => {
    // Arrange
    renderField();
    timing.mockClear();

    // Act
    fireEvent(screen.getByLabelText("Destination"), "focus");

    // Assert
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0][1]).toMatchObject({
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    });
  });

  it("should animate the border back to its resting state when the field loses focus", () => {
    // Arrange
    renderField();
    timing.mockClear();

    // Act
    fireEvent(screen.getByLabelText("Destination"), "blur");

    // Assert
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0][1]).toMatchObject({
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    });
  });

  it("should keep the same handler identity across re-renders", () => {
    // Arrange — les handlers sont mémorisés dans des refs pour éviter de
    // re-rendre le champ à chaque frappe.
    const captured: Array<{ onFocus: () => void; onBlur: () => void }> = [];
    const { rerender } = render(
      <FocusableField
        baseStyle={{ borderWidth: 1 }}
        render={(handlers) => {
          captured.push(handlers);
          return <TextInput accessibilityLabel="Destination" />;
        }}
      />
    );

    // Act
    rerender(
      <FocusableField
        baseStyle={{ borderWidth: 2 }}
        render={(handlers) => {
          captured.push(handlers);
          return <TextInput accessibilityLabel="Destination" />;
        }}
      />
    );

    // Assert
    expect(captured.length).toBeGreaterThan(1);
    expect(captured[captured.length - 1].onFocus).toBe(captured[0].onFocus);
    expect(captured[captured.length - 1].onBlur).toBe(captured[0].onBlur);
  });
});
