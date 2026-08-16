import "../../__tests__/support/nativeMocks";

import React from "react";
import { View } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import AddressCard from "../AddressCard";
import { lightColors } from "../../../contexts/ThemeContext";
import { SKY, SKY_LIGHT } from "../addressHelpers";
import type { Address } from "../../../types";

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

const makeAddress = (overrides: Partial<Address> = {}): Address =>
  ({
    id: "addr1",
    name: "Hôtel Sakura",
    city: "Kyoto",
    country: "Japon",
    type: "hotel",
    ...overrides,
  }) as Address;

const renderCard = (
  address: Address,
  { isDark = false, onPress = jest.fn() }: { isDark?: boolean; onPress?: jest.Mock } = {},
) =>
  render(
    <AddressCard
      item={address}
      colors={lightColors}
      isDark={isDark}
      t={(key: string) => key}
      onPress={onPress}
    />,
  );

const hasViewWithBackground = (color: string) =>
  screen
    .UNSAFE_getAllByType(View)
    .some((view) => flatten(view.props.style).backgroundColor === color);

describe("AddressCard", () => {
  it("should render the address name", () => {
    renderCard(makeAddress());

    expect(screen.getByText("Hôtel Sakura")).toBeTruthy();
  });

  it("should render the city and country on a single line", () => {
    renderCard(makeAddress());

    expect(screen.getByText("Kyoto, Japon")).toBeTruthy();
  });

  it("should render the translated type label in the tag pill", () => {
    renderCard(makeAddress());

    expect(screen.getByText("addresses.filters.hotel")).toBeTruthy();
  });

  it("should call onPress with the address when the card is pressed", () => {
    const onPress = jest.fn();
    const address = makeAddress();
    renderCard(address, { onPress });

    fireEvent.press(screen.getByText("Hôtel Sakura"));

    expect(onPress).toHaveBeenCalledWith(address);
  });

  it("should render the hotel icon for a hotel address", () => {
    renderCard(makeAddress());

    expect(screen.UNSAFE_getByProps({ name: "bed-outline" })).toBeTruthy();
  });

  it("should use the light hotel palette when the theme is light", () => {
    renderCard(makeAddress());

    expect(hasViewWithBackground(SKY_LIGHT)).toBe(true);
    expect(screen.UNSAFE_getByProps({ name: "bed-outline" }).props.color).toBe(SKY);
  });

  it("should default to the light palette when no theme flag is given", () => {
    render(
      <AddressCard
        item={makeAddress()}
        colors={lightColors}
        t={(key: string) => key}
        onPress={jest.fn()}
      />,
    );

    expect(hasViewWithBackground(SKY_LIGHT)).toBe(true);
  });

  it("should use the dark hotel palette when the theme is dark", () => {
    renderCard(makeAddress(), { isDark: true });

    expect(hasViewWithBackground("rgba(90,143,170,0.22)")).toBe(true);
  });

  it("should fall back to the neutral theme colours for an untyped palette", () => {
    renderCard(makeAddress({ type: "transport" }));

    expect(hasViewWithBackground(lightColors.bgDark)).toBe(true);
    expect(screen.UNSAFE_getByProps({ name: "car-outline" }).props.color).toBe(
      lightColors.textMid,
    );
  });

  it("should fall back to the neutral tag text colour for an untyped palette", () => {
    renderCard(makeAddress({ type: "other" }));

    expect(
      flatten(screen.getByText("addresses.filters.other").props.style).color,
    ).toBe(lightColors.textMid);
  });
});
