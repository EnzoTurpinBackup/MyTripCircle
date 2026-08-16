import React from "react";
import { render } from "@testing-library/react-native";
import ProfileSkeleton from "../ProfileSkeleton";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

/**
 * Compte les nœuds du squelette : ce placeholder n'affiche ni texte ni élément
 * accessible, seule sa structure de blocs est observable.
 */
function countNodes(node: any): number {
  if (node == null || typeof node !== "object") return 0;
  const children = Array.isArray(node.children) ? node.children : [];
  return 1 + children.reduce((sum: number, child: any) => sum + countNodes(child), 0);
}

describe("ProfileSkeleton", () => {
  it("should render one placeholder block per profile section", () => {
    // Arrange / Act
    const { toJSON } = render(<ProfileSkeleton />);

    // Assert
    // 3 conteneurs + 3 blocs d'identité + 3 statistiques + 1 titre de section
    // + 4 vignettes de voyage + 1 bouton + le conteneur racine = 16 nœuds.
    expect(countNodes(toJSON())).toBe(16);
  });

  it("should render no text at all while the profile is loading", () => {
    // Arrange / Act
    const { queryByText } = render(<ProfileSkeleton />);

    // Assert
    expect(queryByText(/./)).toBeNull();
  });
});
