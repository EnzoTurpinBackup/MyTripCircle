jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import React from "react";
import { render, screen } from "@testing-library/react-native";
import "../../__tests__/voyagesTestUtils";
import TripsScreenSkeleton from "../TripsScreenSkeleton";
import SkeletonBox from "../../SkeletonBox";

const boxes = () => screen.UNSAFE_getAllByType(SkeletonBox).map((b) => b.props);

describe("TripsScreenSkeleton", () => {
  it("should render one placeholder per block of the trips screen", () => {
    render(<TripsScreenSkeleton />);

    // 4 en-tête + 1 carte héros + 3 pastilles + 2 titre de section + 2 mini-cartes.
    expect(boxes()).toHaveLength(12);
  });

  it("should reserve the hero card area", () => {
    render(<TripsScreenSkeleton />);

    expect(boxes()).toContainEqual(
      expect.objectContaining({ width: "100%", height: 180, borderRadius: 18 }),
    );
  });

  it("should reserve two mini cards matching the real card size", () => {
    render(<TripsScreenSkeleton />);

    const miniCards = boxes().filter((b) => b.width === 190 && b.height === 176);

    expect(miniCards).toHaveLength(2);
  });

  it("should reserve three statistic pills", () => {
    render(<TripsScreenSkeleton />);

    const pills = boxes().filter((b) => b.height === 72 && b.borderRadius === 12);

    expect(pills).toHaveLength(3);
  });
});
