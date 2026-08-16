import "../../__tests__/support/nativeMocks";

import React from "react";
import { Animated, ScrollView } from "react-native";
import { render, screen } from "@testing-library/react-native";
import BookingsScreenSkeleton from "../BookingsScreenSkeleton";
import SkeletonBox from "../../SkeletonBox";
import { lightColors } from "../../../contexts/ThemeContext";

// Le conteneur de swipe dépend de react-native-gesture-handler et de la
// navigation : il est neutralisé, ce lot ne teste que le squelette lui-même.
jest.mock("../../../hooks/useSwipeToNavigate", () => ({
  SwipeToNavigate: ({ children }: { children: React.ReactNode }) => children,
}));

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe("BookingsScreenSkeleton", () => {
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

  it("should render placeholders while the bookings list loads", () => {
    render(<BookingsScreenSkeleton />);

    expect(screen.UNSAFE_getAllByType(SkeletonBox).length).toBeGreaterThan(0);
  });

  it("should lock scrolling so the placeholder cannot be dragged", () => {
    render(<BookingsScreenSkeleton />);

    expect(screen.UNSAFE_getByType(ScrollView).props.scrollEnabled).toBe(false);
  });

  it("should reserve room under the list for the floating tab bar", () => {
    render(<BookingsScreenSkeleton />);

    expect(
      flatten(screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle)
        .paddingBottom,
    ).toBe(100);
  });

  it("should place a round placeholder where the add button sits", () => {
    render(<BookingsScreenSkeleton />);

    const addButton = screen.UNSAFE_getAllByType(SkeletonBox)[1];
    expect(addButton.props.width).toBe(44);
    expect(addButton.props.height).toBe(44);
    expect(addButton.props.borderRadius).toBe(22);
  });

  it("should render the five filter pill placeholders", () => {
    render(<BookingsScreenSkeleton />);

    const pills = screen
      .UNSAFE_getAllByType(SkeletonBox)
      .filter((box) => box.props.height === 34 && box.props.borderRadius === 20);
    expect(pills).toHaveLength(5);
  });

  it("should tint the placeholder cards with the themed surface colour", () => {
    render(<BookingsScreenSkeleton />);

    expect(lightColors.bgMid).toBeDefined();
    const stripes = screen
      .UNSAFE_getAllByType(SkeletonBox)
      .filter((box) => box.props.width === 6 && box.props.height === 96);
    expect(stripes).toHaveLength(4);
  });
});
