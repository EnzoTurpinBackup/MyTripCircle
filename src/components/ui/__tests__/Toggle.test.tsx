import "../../__tests__/support/nativeMocks";

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import Toggle from "../Toggle";
import { lightColors } from "../../../contexts/ThemeContext";

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe("Toggle", () => {
  it("should expose the switch role to assistive technologies", () => {
    render(<Toggle value={false} onToggle={jest.fn()} />);

    expect(screen.getByRole("switch")).toBeTruthy();
  });

  it("should forward accessibilityLabel to the interactive element when provided", () => {
    render(
      <Toggle value={false} onToggle={jest.fn()} accessibilityLabel="Mode sombre" />,
    );

    expect(screen.getByLabelText("Mode sombre")).toBeTruthy();
  });

  it("should report the checked state when value is true", () => {
    render(<Toggle value onToggle={jest.fn()} accessibilityLabel="Mode sombre" />);

    expect(screen.getByRole("switch").props.accessibilityState).toMatchObject({
      checked: true,
      disabled: false,
    });
  });

  it("should report the unchecked state when value is false", () => {
    render(<Toggle value={false} onToggle={jest.fn()} />);

    expect(screen.getByRole("switch").props.accessibilityState).toMatchObject({
      checked: false,
      disabled: false,
    });
  });

  it("should call onToggle with the negated value when pressed", () => {
    const onToggle = jest.fn();
    render(<Toggle value={false} onToggle={onToggle} />);

    fireEvent.press(screen.getByRole("switch"));

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("should call onToggle with false when pressed while already enabled", () => {
    const onToggle = jest.fn();
    render(<Toggle value onToggle={onToggle} />);

    fireEvent.press(screen.getByRole("switch"));

    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("should not call onToggle when pressed while disabled", () => {
    const onToggle = jest.fn();
    render(<Toggle value={false} onToggle={onToggle} disabled />);

    fireEvent.press(screen.getByRole("switch"));

    expect(onToggle).not.toHaveBeenCalled();
  });

  it("should report the disabled state when disabled", () => {
    render(<Toggle value={false} onToggle={jest.fn()} disabled />);

    expect(screen.getByRole("switch").props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it("should use the theme accent as track colour when enabled without trackColor", () => {
    render(<Toggle value onToggle={jest.fn()} />);

    expect(flatten(screen.getByRole("switch").props.style).backgroundColor).toBe(
      lightColors.terra,
    );
  });

  it("should use the provided trackColor over the theme accent when enabled", () => {
    render(<Toggle value onToggle={jest.fn()} trackColor="#123456" />);

    expect(flatten(screen.getByRole("switch").props.style).backgroundColor).toBe(
      "#123456",
    );
  });

  it("should use the border colour as track colour when disabled by value", () => {
    render(<Toggle value={false} onToggle={jest.fn()} trackColor="#123456" />);

    expect(flatten(screen.getByRole("switch").props.style).backgroundColor).toBe(
      lightColors.border,
    );
  });
});
