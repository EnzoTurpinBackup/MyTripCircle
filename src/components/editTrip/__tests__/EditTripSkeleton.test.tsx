jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import React from "react";
import { render, screen } from "@testing-library/react-native";
import "../../__tests__/voyagesTestUtils";
import EditTripSkeleton from "../EditTripSkeleton";
import SkeletonBox from "../../SkeletonBox";

const boxes = () => screen.UNSAFE_getAllByType(SkeletonBox).map((b) => b.props);

describe("EditTripSkeleton", () => {
  it("should render one placeholder per field of the edit form", () => {
    render(<EditTripSkeleton />);

    // 2 en-tête + 1 couverture + 4 champs × 2 + 2 colonnes × 2 + 1 libellé
    // + 3 vignettes de visibilité + 1 bouton d'enregistrement.
    expect(boxes()).toHaveLength(20);
  });

  it("should reserve the cover photo area", () => {
    render(<EditTripSkeleton />);

    expect(boxes()).toContainEqual(
      expect.objectContaining({ width: "100%", height: 160, borderRadius: 16 }),
    );
  });

  it("should reserve four full-height input placeholders", () => {
    render(<EditTripSkeleton />);

    const inputs = boxes().filter((b) => b.height === 52 && b.borderRadius === 10);

    expect(inputs).toHaveLength(6);
  });
});
