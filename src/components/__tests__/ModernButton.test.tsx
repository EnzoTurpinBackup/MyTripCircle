import "./support/nativeMocks";

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ModernButton } from "../ModernButton";
import { COLORS, DISABLED_OPACITY } from "../../theme";
import { lightColors } from "../../contexts/ThemeContext";

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

const iconColorOf = (name: string) =>
  screen.UNSAFE_getByProps({ name }).props.color as string;

describe("ModernButton", () => {
  it("should render its title", () => {
    render(<ModernButton title="Réserver" />);

    expect(screen.getByText("Réserver")).toBeTruthy();
  });

  it("should expose the title as the accessibility label", () => {
    render(<ModernButton title="Réserver" />);

    expect(screen.getByLabelText("Réserver")).toBeTruthy();
  });

  it("should call onPress when pressed", () => {
    const onPress = jest.fn();
    render(<ModernButton title="Réserver" onPress={onPress} />);

    fireEvent.press(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("should not call onPress when disabled", () => {
    const onPress = jest.fn();
    render(<ModernButton title="Réserver" onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole("button"));

    expect(onPress).not.toHaveBeenCalled();
  });

  it("should not call onPress when loading", () => {
    const onPress = jest.fn();
    render(<ModernButton title="Réserver" onPress={onPress} loading />);

    fireEvent.press(screen.getByRole("button"));

    expect(onPress).not.toHaveBeenCalled();
  });

  it("should hide the title and show a spinner when loading", () => {
    render(<ModernButton title="Réserver" loading />);

    expect(screen.queryByText("Réserver")).toBeNull();
    expect(screen.UNSAFE_getByType(require("react-native").ActivityIndicator)).toBeTruthy();
  });

  it("should report busy and disabled accessibility state when loading", () => {
    render(<ModernButton title="Réserver" loading />);

    expect(screen.getByRole("button").props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
  });

  it("should report a non-busy enabled accessibility state by default", () => {
    render(<ModernButton title="Réserver" />);

    expect(screen.getByRole("button").props.accessibilityState).toMatchObject({
      busy: false,
      disabled: false,
    });
  });

  it("should dim the button when disabled", () => {
    render(<ModernButton title="Réserver" disabled />);

    expect(flatten(screen.getByRole("button").props.style).opacity).toBe(
      DISABLED_OPACITY,
    );
  });

  it("should stretch to the full width when fullWidth is set", () => {
    render(<ModernButton title="Réserver" fullWidth />);

    expect(flatten(screen.getByRole("button").props.style).width).toBe("100%");
  });

  it("should merge the caller style over the variant style", () => {
    render(<ModernButton title="Réserver" style={{ marginTop: 7 }} />);

    expect(flatten(screen.getByRole("button").props.style).marginTop).toBe(7);
  });

  it("should not render an icon when none is given", () => {
    render(<ModernButton title="Réserver" />);

    expect(screen.UNSAFE_queryByProps({ name: "arrow-forward" })).toBeNull();
  });

  it("should render a white icon for the primary variant", () => {
    render(<ModernButton title="Réserver" icon="arrow-forward" />);

    expect(iconColorOf("arrow-forward")).toBe("#FFFFFF");
  });

  it("should render an ink icon for the secondary variant", () => {
    render(<ModernButton title="Réserver" variant="secondary" icon="arrow-forward" />);

    expect(iconColorOf("arrow-forward")).toBe(COLORS.inkMid);
  });

  it("should render a danger icon for the danger variant", () => {
    render(<ModernButton title="Supprimer" variant="danger" icon="trash" />);

    expect(iconColorOf("trash")).toBe(COLORS.danger);
  });

  it("should render the themed accent icon for the outline variant", () => {
    render(<ModernButton title="Réserver" variant="outline" icon="arrow-forward" />);

    expect(iconColorOf("arrow-forward")).toBe(lightColors.terraDark);
  });

  it("should render the themed accent icon for the ghost variant", () => {
    render(<ModernButton title="Réserver" variant="ghost" icon="arrow-forward" />);

    expect(iconColorOf("arrow-forward")).toBe(lightColors.terraDark);
  });

  it("should colour the label with the themed accent for the outline variant", () => {
    render(<ModernButton title="Réserver" variant="outline" />);

    expect(flatten(screen.getByText("Réserver").props.style).color).toBe(
      lightColors.terraDark,
    );
  });

  it("should colour the label with the themed accent for the ghost variant", () => {
    render(<ModernButton title="Réserver" variant="ghost" />);

    expect(flatten(screen.getByText("Réserver").props.style).color).toBe(
      lightColors.terraDark,
    );
  });

  it("should keep the white label for the primary variant", () => {
    render(<ModernButton title="Réserver" />);

    expect(flatten(screen.getByText("Réserver").props.style).color).toBe("#FFFFFF");
  });

  it("should size the icon at 16 for the small size", () => {
    render(<ModernButton title="Réserver" size="small" icon="arrow-forward" />);

    expect(screen.UNSAFE_getByProps({ name: "arrow-forward" }).props.size).toBe(16);
  });

  it("should size the icon at 18 for the medium size", () => {
    render(<ModernButton title="Réserver" size="medium" icon="arrow-forward" />);

    expect(screen.UNSAFE_getByProps({ name: "arrow-forward" }).props.size).toBe(18);
  });

  it("should size the icon at 24 for the large size", () => {
    render(<ModernButton title="Réserver" size="large" icon="arrow-forward" />);

    expect(screen.UNSAFE_getByProps({ name: "arrow-forward" }).props.size).toBe(24);
  });

  it("should apply the small size padding to the button", () => {
    render(<ModernButton title="Réserver" size="small" />);

    expect(flatten(screen.getByRole("button").props.style).minHeight).toBe(36);
  });

  it("should apply the large size padding to the button", () => {
    render(<ModernButton title="Réserver" size="large" />);

    expect(flatten(screen.getByRole("button").props.style).minHeight).toBe(60);
  });

  it("should place the icon before the label when iconPosition is left", () => {
    render(<ModernButton title="Réserver" icon="arrow-forward" iconPosition="left" />);

    expect(
      flatten(screen.UNSAFE_getByProps({ name: "arrow-forward" }).props.style).marginRight,
    ).toBe(6);
  });

  it("should place the icon after the label when iconPosition is right", () => {
    render(<ModernButton title="Réserver" icon="arrow-forward" iconPosition="right" />);

    expect(
      flatten(screen.UNSAFE_getByProps({ name: "arrow-forward" }).props.style).marginLeft,
    ).toBe(6);
  });

  it("should ignore the deprecated gradient prop without rendering a gradient", () => {
    render(<ModernButton title="Réserver" gradient />);

    expect(screen.getByText("Réserver")).toBeTruthy();
  });
});
