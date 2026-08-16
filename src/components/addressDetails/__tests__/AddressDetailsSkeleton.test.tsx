import "../../__tests__/support/nativeMocks";

import React from "react";
import { Animated, ScrollView, View } from "react-native";
import { render, screen } from "@testing-library/react-native";
import AddressDetailsSkeleton from "../AddressDetailsSkeleton";
import SkeletonBox from "../../SkeletonBox";
import { lightColors } from "../../../contexts/ThemeContext";

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe("AddressDetailsSkeleton", () => {
  let loopSpy: jest.SpyInstance;

  beforeEach(() => {
    // Neutralise la boucle de scintillement des placeholders, qui laisserait
    // sinon des timers actifs après chaque test.
    loopSpy = jest.spyOn(Animated, "loop").mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    } as unknown as Animated.CompositeAnimation);
  });

  afterEach(() => {
    loopSpy.mockRestore();
  });

  it("should render placeholders while the address details load", () => {
    render(<AddressDetailsSkeleton />);

    expect(screen.UNSAFE_getAllByType(SkeletonBox).length).toBeGreaterThan(0);
  });

  it("should paint the screen with the themed background", () => {
    render(<AddressDetailsSkeleton />);

    expect(flatten(screen.UNSAFE_getAllByType(View)[0].props.style).backgroundColor)
      .toBe(lightColors.bg);
  });

  it("should lock scrolling so the placeholder cannot be dragged", () => {
    render(<AddressDetailsSkeleton />);

    expect(screen.UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(false);
  });

  it("should lead with a full-width cover placeholder with square corners", () => {
    render(<AddressDetailsSkeleton />);

    const cover = screen.UNSAFE_getAllByType(SkeletonBox)[0];
    expect(cover.props.width).toBe("100%");
    expect(cover.props.height).toBe(270);
    expect(cover.props.borderRadius).toBe(0);
  });
});
