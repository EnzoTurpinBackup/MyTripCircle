import "../../__tests__/support/nativeMocks";

import React from "react";
import { View } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import AddressFilterBar from "../AddressFilterBar";
import { lightColors } from "../../../contexts/ThemeContext";
import { SKY } from "../addressHelpers";

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

const renderBar = (
  selectedFilter: React.ComponentProps<typeof AddressFilterBar>["selectedFilter"],
  onSelectFilter = jest.fn(),
) =>
  render(
    <AddressFilterBar
      selectedFilter={selectedFilter}
      onSelectFilter={onSelectFilter}
      colors={lightColors}
      t={(key: string) => key}
    />,
  );

const hasViewWithBackground = (color: string) =>
  screen
    .UNSAFE_getAllByType(View)
    .some((view) => flatten(view.props.style).backgroundColor === color);

describe("AddressFilterBar", () => {
  it("should render one chip per supported filter", () => {
    renderBar("all");

    ["all", "hotel", "restaurant", "activity", "transport", "other"].forEach((filter) => {
      expect(screen.getByText(`addresses.filters.${filter}`)).toBeTruthy();
    });
  });

  it("should call onSelectFilter with the chosen filter when a chip is pressed", () => {
    const onSelectFilter = jest.fn();
    renderBar("all", onSelectFilter);

    fireEvent.press(screen.getByText("addresses.filters.hotel"));

    expect(onSelectFilter).toHaveBeenCalledWith("hotel");
  });

  it("should paint the selected chip with the accent colour", () => {
    renderBar("hotel");

    expect(hasViewWithBackground(lightColors.terra)).toBe(true);
  });

  it("should leave every chip on the neutral background when none is typed-selected", () => {
    renderBar("all");

    expect(hasViewWithBackground(lightColors.bgMid)).toBe(true);
  });

  it("should use white text on the selected chip", () => {
    renderBar("hotel");

    expect(
      flatten(screen.getByText("addresses.filters.hotel").props.style).color,
    ).toBe("#FFFFFF");
  });

  it("should use the muted text colour on unselected chips", () => {
    renderBar("all");

    expect(
      flatten(screen.getByText("addresses.filters.hotel").props.style).color,
    ).toBe(lightColors.textMid);
  });

  it("should show the coloured dot on an unselected typed chip", () => {
    renderBar("all");

    expect(hasViewWithBackground(SKY)).toBe(true);
  });

  it("should hide the coloured dot once that chip becomes selected", () => {
    renderBar("hotel");

    expect(hasViewWithBackground(SKY)).toBe(false);
  });
});
