import "../../__tests__/support/nativeMocks";

import React from "react";
import { Animated, ScrollView, View } from "react-native";
import { render, screen } from "@testing-library/react-native";
import BookingDetailsSkeleton from "../BookingDetailsSkeleton";
import SkeletonBox from "../../SkeletonBox";
import { lightColors } from "../../../contexts/ThemeContext";

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe("BookingDetailsSkeleton", () => {
  let loopSpy: jest.SpyInstance;

  beforeEach(() => {
    loopSpy = jest.spyOn(Animated, "loop").mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    } as unknown as Animated.CompositeAnimation);
  });

  afterEach(() => {
    loopSpy.mockRestore();
  });

  it("should render placeholders while the booking details load", () => {
    render(<BookingDetailsSkeleton />);

    expect(screen.UNSAFE_getAllByType(SkeletonBox).length).toBeGreaterThan(0);
  });

  it("should paint the screen with the themed background", () => {
    render(<BookingDetailsSkeleton />);

    expect(flatten(screen.UNSAFE_getAllByType(View)[0].props.style).backgroundColor)
      .toBe(lightColors.bg);
  });

  it("should lock scrolling so the placeholder cannot be dragged", () => {
    render(<BookingDetailsSkeleton />);

    expect(screen.UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(false);
  });

  it("should lead with a full-width hero placeholder with square corners", () => {
    render(<BookingDetailsSkeleton />);

    const hero = screen.UNSAFE_getAllByType(SkeletonBox)[0];
    expect(hero.props.width).toBe("100%");
    expect(hero.props.height).toBe(200);
    expect(hero.props.borderRadius).toBe(0);
  });
});
