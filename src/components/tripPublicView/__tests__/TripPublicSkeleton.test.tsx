jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import React from "react";
import { render, screen } from "@testing-library/react-native";
import "../../__tests__/voyagesTestUtils";
import TripPublicSkeleton from "../TripPublicSkeleton";
import SkeletonBox from "../../SkeletonBox";

const boxes = () => screen.UNSAFE_getAllByType(SkeletonBox).map((b) => b.props);

describe("TripPublicSkeleton", () => {
  it("should render one placeholder per block of the public trip page", () => {
    render(<TripPublicSkeleton />);

    // 1 couverture + 2 titres + 3 statistiques + 1 libellé + 3 avatars
    // + 1 libellé + 3 lignes × 3 blocs.
    expect(boxes()).toHaveLength(20);
  });

  it("should reserve the cover area at the real cover height", () => {
    render(<TripPublicSkeleton />);

    expect(boxes()).toContainEqual(
      expect.objectContaining({ width: "100%", height: 280, borderRadius: 0 }),
    );
  });

  it("should reserve three round member avatars", () => {
    render(<TripPublicSkeleton />);

    const avatars = boxes().filter(
      (b) => b.width === 40 && b.height === 40 && b.borderRadius === 20,
    );

    expect(avatars).toHaveLength(3);
  });

  it("should reserve three statistic tiles", () => {
    render(<TripPublicSkeleton />);

    const tiles = boxes().filter((b) => b.height === 64 && b.borderRadius === 12);

    expect(tiles).toHaveLength(3);
  });
});
