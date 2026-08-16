import React from "react";
import { render } from "@testing-library/react-native";
import { AddressForm } from "../AddressForm";
import { Address } from "../../types";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// useCurrentLocation interroge la géolocalisation native au montage : on la
// mocke pour éviter tout appel réel et rester déterministe en test.
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied" }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parcourt récursivement l'arbre rendu (toJSON) et signale toute chaîne de
 * caractères "brute" présente directement parmi les enfants d'un nœud qui
 * n'est pas un <Text>. C'est exactement le symptôme de la fuite de valeur
 * décrite par la règle SonarCloud typescript:S6439 : `{valeur && <X/>}` rend
 * `valeur` telle quelle lorsqu'elle est falsy mais non booléenne (ex: 0).
 */
function findOrphanTextNodes(node: any, path = "root"): string[] {
  if (node == null || typeof node !== "object") return [];
  const orphans: string[] = [];
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    if (typeof child === "string") {
      if (node.type !== "Text") {
        orphans.push(`${path} > "${child}"`);
      }
      continue;
    }
    orphans.push(...findOrphanTextNodes(child, `${path} > ${child?.type ?? "?"}`));
  }
  return orphans;
}

const makeAddress = (overrides: Partial<Address> = {}): Address => ({
  id: "addr-1",
  type: "hotel",
  name: "Hôtel Central",
  address: "1 rue de Paris",
  city: "Paris",
  country: "France",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

const noop = () => {};
const noopSave = async () => {};

describe("AddressForm", () => {
  it("should not render a leaked string when creating a new address with no name yet", () => {
    // Arrange
    // Aucune adresse initiale et un nom vide : (initialAddress || form.name) vaut ""
    // avant la correction, ce qui laisse fuir la chaîne vide dans l'arbre rendu.

    // Act
    const { toJSON, queryByText } = render(
      <AddressForm visible onClose={noop} onSave={noopSave} />
    );

    // Assert
    expect(queryByText("Name")).toBeNull();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should render the name field when editing an address that already has a name", () => {
    // Arrange
    const initialAddress = makeAddress({ name: "Hôtel Central" });

    // Act
    const { getAllByDisplayValue, toJSON } = render(
      <AddressForm visible onClose={noop} onSave={noopSave} initialAddress={initialAddress} />
    );

    // Assert
    expect(getAllByDisplayValue("Hôtel Central").length).toBeGreaterThan(0);
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });
});
