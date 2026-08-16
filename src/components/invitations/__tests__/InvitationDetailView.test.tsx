import React from "react";
import { render } from "@testing-library/react-native";
import InvitationDetailView from "../InvitationDetailView";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// useSafeAreaInsets a besoin d'un SafeAreaProvider ayant reçu ses métriques
// via un événement natif, ce qui n'arrive jamais en environnement de test :
// on utilise le mock officiel de la librairie, qui fournit des valeurs par défaut.
jest.mock("react-native-safe-area-context", () => {
  const mock = require("react-native-safe-area-context/jest/mock");
  return mock.default ?? mock;
});

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

function makeInvitation(overrides: Record<string, any> = {}) {
  return {
    type: "invite",
    status: "pending",
    inviter: { name: "Ana" },
    trip: { title: "Trip to Nowhere", destination: "" },
    createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    ...overrides,
  };
}

const noop = () => {};

function renderDetailView(props: Partial<React.ComponentProps<typeof InvitationDetailView>>) {
  return render(
    <InvitationDetailView
      invitation={makeInvitation()}
      loading={false}
      responding={false}
      onBack={noop}
      onAccept={noop}
      onDecline={noop}
      onNavigateToTrip={noop}
      onNavigateBack={noop}
      {...props}
    />
  );
}

describe("InvitationDetailView", () => {
  it("should not render a leaked string when trip destination is an empty string", () => {
    // Arrange
    const invitation = makeInvitation({
      trip: {
        title: "Trip to Nowhere",
        destination: "",
        startDate: "2026-03-01T00:00:00.000Z",
        endDate: "2026-03-03T00:00:00.000Z",
      },
    });

    // Act
    const { toJSON, queryByTestId } = renderDetailView({ invitation });

    // Assert
    expect(queryByTestId("invitation-destination-row")).toBeNull();
    expect(queryByTestId("invitation-destination-chip")).toBeNull();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should render the destination text when trip destination is a non-empty string", () => {
    // Arrange
    const invitation = makeInvitation({
      trip: { title: "Trip to Nowhere", destination: "Lisbonne" },
    });

    // Act
    const { getAllByText, getByTestId, toJSON } = renderDetailView({ invitation });

    // Assert
    expect(getAllByText("Lisbonne").length).toBeGreaterThan(0);
    expect(getByTestId("invitation-destination-row")).toBeTruthy();
    expect(getByTestId("invitation-destination-chip")).toBeTruthy();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });
});
