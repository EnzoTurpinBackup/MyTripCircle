import "./support/nativeMocks";

import React from "react";
import { View } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import ItemActionSheet from "../ItemActionSheet";
import { useTheme, lightColors, darkColors } from "../../contexts/ThemeContext";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../contexts/ThemeContext");
  return { ...actual, useTheme: jest.fn() };
});

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/** Ni la ligne « supprimer » ni le voile n'ont de testID : on les reconnaît à leur couleur de fond. */
const findViewWithBackground = (color: string) =>
  screen
    .UNSAFE_getAllByType(View)
    .find((view) => flatten(view.props.style).backgroundColor === color);

const hasViewWithBackground = (color: string) => !!findViewWithBackground(color);

const BACKDROP_COLOR = "rgba(42,35,24,0.45)";

const useThemeMock = useTheme as jest.MockedFunction<typeof useTheme>;

const setTheme = (isDark: boolean) =>
  useThemeMock.mockReturnValue({
    isDark,
    colors: isDark ? darkColors : lightColors,
    toggleTheme: jest.fn(),
    satelliteMap: false,
    toggleSatelliteMap: jest.fn(),
  });

const baseProps = {
  visible: true,
  title: "Hôtel Sakura",
  onClose: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
};

describe("ItemActionSheet", () => {
  beforeEach(() => {
    setTheme(false);
  });

  it("should render the item title when visible", () => {
    render(<ItemActionSheet {...baseProps} />);

    expect(screen.getByText("Hôtel Sakura")).toBeTruthy();
  });

  it("should not render its content when not visible", () => {
    render(<ItemActionSheet {...baseProps} visible={false} />);

    expect(screen.queryByText("Hôtel Sakura")).toBeNull();
  });

  it("should render the subtitle when one is given", () => {
    render(<ItemActionSheet {...baseProps} subtitle="Tokyo, Japon" />);

    expect(screen.getByText("Tokyo, Japon")).toBeTruthy();
  });

  it("should not render a subtitle when none is given", () => {
    render(<ItemActionSheet {...baseProps} />);

    expect(screen.queryByText("Tokyo, Japon")).toBeNull();
  });

  it("should offer the edit and delete actions by default", () => {
    render(<ItemActionSheet {...baseProps} />);

    expect(screen.getByText("common.edit")).toBeTruthy();
    expect(screen.getByText("common.delete")).toBeTruthy();
  });

  it("should hide the edit action when editing is not allowed", () => {
    render(<ItemActionSheet {...baseProps} canEdit={false} />);

    expect(screen.queryByText("common.edit")).toBeNull();
    expect(screen.getByText("common.delete")).toBeTruthy();
  });

  it("should hide the delete action when deleting is not allowed", () => {
    render(<ItemActionSheet {...baseProps} canDelete={false} />);

    expect(screen.queryByText("common.delete")).toBeNull();
    expect(screen.getByText("common.edit")).toBeTruthy();
  });

  it("should call onEdit when the edit row is pressed", () => {
    const onEdit = jest.fn();
    render(<ItemActionSheet {...baseProps} onEdit={onEdit} />);

    fireEvent.press(screen.getByText("common.edit"));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("should call onDelete when the delete row is pressed", () => {
    const onDelete = jest.fn();
    render(<ItemActionSheet {...baseProps} onDelete={onDelete} />);

    fireEvent.press(screen.getByText("common.delete"));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when the cancel button is pressed", () => {
    const onClose = jest.fn();
    render(<ItemActionSheet {...baseProps} onClose={onClose} />);

    fireEvent.press(screen.getByText("common.cancel"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should use the light edit icon background in light theme", () => {
    render(<ItemActionSheet {...baseProps} />);

    const iconWrap = screen.UNSAFE_getByProps({ name: "pencil-outline" }).parent;
    expect(flatten(iconWrap?.props.style).backgroundColor).toBe("#DCF0F5");
  });

  it("should use the dark edit icon background in dark theme", () => {
    setTheme(true);
    render(<ItemActionSheet {...baseProps} />);

    const iconWrap = screen.UNSAFE_getByProps({ name: "pencil-outline" }).parent;
    expect(flatten(iconWrap?.props.style).backgroundColor).toBe("#1A2E35");
  });

  it("should use the light danger row background in light theme", () => {
    render(<ItemActionSheet {...baseProps} />);

    expect(hasViewWithBackground("#FDEAEA")).toBe(true);
  });

  it("should use the dark danger row background in dark theme", () => {
    setTheme(true);
    render(<ItemActionSheet {...baseProps} />);

    expect(hasViewWithBackground("rgba(192,64,64,0.18)")).toBe(true);
  });

  describe("accessibility", () => {
    it("should announce the item title as a heading when visible", () => {
      render(<ItemActionSheet {...baseProps} />);

      expect(screen.getByRole("header").props.children).toBe("Hôtel Sakura");
    });

    it("should keep the screen reader inside the sheet when visible", () => {
      render(<ItemActionSheet {...baseProps} />);

      expect(screen.getByLabelText("common.a11y.actionsFor").props.accessibilityViewIsModal)
        .toBe(true);
    });

    it("should expose the edit row as a button when editing is allowed", () => {
      render(<ItemActionSheet {...baseProps} />);

      expect(screen.getByLabelText("common.a11y.editItem").props.accessibilityRole)
        .toBe("button");
    });

    it("should report the edit row as enabled when editing is allowed", () => {
      render(<ItemActionSheet {...baseProps} />);

      expect(screen.getByLabelText("common.a11y.editItem").props.accessibilityState)
        .toMatchObject({ disabled: false });
    });

    it("should expose no edit button when editing is not allowed", () => {
      render(<ItemActionSheet {...baseProps} canEdit={false} />);

      expect(screen.queryByLabelText("common.a11y.editItem")).toBeNull();
    });

    it("should expose the delete row as a button when deleting is allowed", () => {
      render(<ItemActionSheet {...baseProps} />);

      expect(screen.getByLabelText("common.a11y.deleteItem").props.accessibilityRole)
        .toBe("button");
    });

    it("should report the delete row as enabled when deleting is allowed", () => {
      render(<ItemActionSheet {...baseProps} />);

      expect(screen.getByLabelText("common.a11y.deleteItem").props.accessibilityState)
        .toMatchObject({ disabled: false });
    });

    it("should expose no delete button when deleting is not allowed", () => {
      render(<ItemActionSheet {...baseProps} canDelete={false} />);

      expect(screen.queryByLabelText("common.a11y.deleteItem")).toBeNull();
    });

    it("should expose the cancel action as a labelled button", () => {
      render(<ItemActionSheet {...baseProps} />);

      expect(screen.getByLabelText("common.cancel").props.accessibilityRole).toBe("button");
    });

    it("should hide the closing backdrop from assistive technologies", () => {
      render(<ItemActionSheet {...baseProps} />);

      expect(findViewWithBackground(BACKDROP_COLOR)?.props).toMatchObject({
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: "no",
      });
    });

    it("should still close the sheet when the backdrop is tapped", () => {
      const onClose = jest.fn();
      render(<ItemActionSheet {...baseProps} onClose={onClose} />);

      fireEvent.press(findViewWithBackground(BACKDROP_COLOR)!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
