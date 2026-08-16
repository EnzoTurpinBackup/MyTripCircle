import "../../__tests__/support/nativeMocks";

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import BackButton from "../BackButton";
import { lightColors } from "../../../contexts/ThemeContext";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe("BackButton", () => {
  it("should call onPress when the button is pressed", () => {
    const onPress = jest.fn();
    render(<BackButton onPress={onPress} />);

    fireEvent.press(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("should fall back to the translated back label when no accessibilityLabel is given", () => {
    render(<BackButton onPress={jest.fn()} />);

    expect(screen.getByLabelText("common.a11y.back")).toBeTruthy();
  });

  it("should use the provided accessibilityLabel over the default one", () => {
    render(<BackButton onPress={jest.fn()} accessibilityLabel="Revenir aux voyages" />);

    expect(screen.getByLabelText("Revenir aux voyages")).toBeTruthy();
  });

  it("should use the themed background colour for the default variant", () => {
    render(<BackButton onPress={jest.fn()} />);

    expect(flatten(screen.getByRole("button").props.style).backgroundColor).toBe(
      lightColors.bgMid,
    );
  });

  it("should use a translucent background for the overlay variant", () => {
    render(<BackButton onPress={jest.fn()} variant="overlay" />);

    expect(flatten(screen.getByRole("button").props.style).backgroundColor).toBe(
      "rgba(0,0,0,0.35)",
    );
  });

  it("should merge the caller style over the base style", () => {
    render(<BackButton onPress={jest.fn()} style={{ marginTop: 42 }} />);

    expect(flatten(screen.getByRole("button").props.style).marginTop).toBe(42);
  });

});
