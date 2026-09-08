import "./support/nativeMocks";

import React from "react";
import { Animated, View } from "react-native";
import { render, screen } from "@testing-library/react-native";
import SkeletonBox from "../SkeletonBox";
import { lightColors } from "../../contexts/ThemeContext";

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/**
 * `SkeletonBox` n'expose pas de testID : son rendu se résume à l'unique vue
 * animée, que l'on récupère donc par son type.
 */
const boxStyle = () => flatten(screen.UNSAFE_getByType(View).props.style);

describe("SkeletonBox", () => {
  let start: jest.Mock;
  let stop: jest.Mock;
  let loopSpy: jest.SpyInstance;

  beforeEach(() => {
    // La boucle de scintillement est neutralisée : elle n'influe pas sur les
    // styles mesurés et laisserait sinon des timers actifs après chaque test.
    start = jest.fn();
    stop = jest.fn();
    loopSpy = jest
      .spyOn(Animated, "loop")
      .mockReturnValue({ start, stop } as unknown as Animated.CompositeAnimation);
  });

  afterEach(() => {
    loopSpy.mockRestore();
  });

  it("should render with the default dimensions when no props are given", () => {
    render(<SkeletonBox />);

    const style = boxStyle();
    expect(style.width).toBe("100%");
    expect(style.height).toBe(16);
    expect(style.borderRadius).toBe(8);
  });

  it("should use the themed placeholder background", () => {
    render(<SkeletonBox />);

    expect(boxStyle().backgroundColor).toBe(lightColors.bgMid);
  });

  it("should apply the provided dimensions over the defaults", () => {
    render(<SkeletonBox width={120} height={40} borderRadius={20} />);

    const style = boxStyle();
    expect(style.width).toBe(120);
    expect(style.height).toBe(40);
    expect(style.borderRadius).toBe(20);
  });

  it("should merge the caller style over the computed style", () => {
    render(<SkeletonBox style={{ flex: 1 }} />);

    expect(boxStyle().flex).toBe(1);
  });

  it("should start the shimmer loop on mount", () => {
    render(<SkeletonBox />);

    expect(loopSpy).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("should stop the shimmer loop on unmount", () => {
    const { unmount } = render(<SkeletonBox />);

    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });

  describe("accessibility", () => {
    it("should hide the placeholder from assistive technologies", () => {
      render(<SkeletonBox />);

      expect(screen.UNSAFE_getByType(View).props).toMatchObject({
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: "no",
      });
    });

    it("should keep hiding the placeholder when a caller style is merged in", () => {
      render(<SkeletonBox style={{ flex: 1 }} />);

      expect(screen.UNSAFE_getByType(View).props.accessibilityElementsHidden).toBe(true);
    });
  });
});
