import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import InvitationDetailView from "../InvitationDetailView";
import i18n from "../../../utils/i18n";
import { collectImageUris } from "./renderTreeUtils";
import { freezeClockAt, restoreClock } from "./frozenClock";

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

// ─── Couverture des états et des branches restantes ───────────────────────────

// `isExpired` compare la date d'expiration à l'instant présent : sans horloge
// figée, les scénarios « expirée / encore valide » basculeraient avec le temps.
const NOW = new Date("2026-06-15T12:00:00.000Z");
const PAST = "2026-06-01T12:00:00.000Z";
const FUTURE = "2026-07-01T12:00:00.000Z";

describe("InvitationDetailView — états", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    freezeClockAt(NOW);
  });

  afterEach(() => {
    restoreClock();
  });

  it("should show the loading copy when the invitation is still being fetched", () => {
    // Arrange / Act
    renderDetailView({ loading: true });

    // Assert
    expect(screen.getByText("Loading invitation...")).toBeTruthy();
  });

  it("should show the not-found copy when no invitation could be loaded", () => {
    // Arrange / Act
    renderDetailView({ invitation: null });

    // Assert
    expect(screen.getByText("Invitation Not Found")).toBeTruthy();
    expect(screen.getByText("This invitation link is invalid or has expired.")).toBeTruthy();
  });

  it("should call onNavigateBack when the error view back button is pressed", () => {
    // Arrange
    const onNavigateBack = jest.fn();
    // La clé `common.back` n'existe pas dans les dictionnaires (seul
    // `common.a11y.back` est défini) : i18next retombe sur la clé brute.
    renderDetailView({ invitation: null, onNavigateBack });

    // Act
    fireEvent.press(screen.getByText("common.back"));

    // Assert
    expect(onNavigateBack).toHaveBeenCalledTimes(1);
  });

  it("should call onBack when the banner back button is pressed", () => {
    // Arrange
    const onBack = jest.fn();
    renderDetailView({ onBack });

    // Act
    fireEvent.press(screen.getByLabelText("Back"));

    // Assert
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("should show the accept and decline actions on a pending invitation", () => {
    // Arrange / Act
    renderDetailView({});

    // Assert
    expect(screen.getByText("Accept")).toBeTruthy();
    expect(screen.getByText("Decline")).toBeTruthy();
  });

  it("should call onAccept when the accept button is pressed", () => {
    // Arrange
    const onAccept = jest.fn();
    renderDetailView({ onAccept });

    // Act
    fireEvent.press(screen.getByText("Accept"));

    // Assert
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("should call onDecline when the decline button is pressed", () => {
    // Arrange
    const onDecline = jest.fn();
    renderDetailView({ onDecline });

    // Act
    fireEvent.press(screen.getByText("Decline"));

    // Assert
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("should replace both action labels by spinners while responding", () => {
    // Arrange / Act
    renderDetailView({ responding: true });

    // Assert
    expect(screen.queryByText("Accept")).toBeNull();
    expect(screen.queryByText("Decline")).toBeNull();
  });

  it("should offer a single join action and no decline on a link invitation", () => {
    // Arrange / Act
    renderDetailView({
      invitation: makeInvitation({ type: "link" }),
    });

    // Assert
    expect(screen.getByText("Join trip")).toBeTruthy();
    expect(screen.queryByText("Decline")).toBeNull();
  });

  it("should hide the call to action when the invitation is no longer pending", () => {
    // Arrange / Act
    renderDetailView({ invitation: makeInvitation({ status: "accepted" }) });

    // Assert
    expect(screen.queryByText("Accept")).toBeNull();
    expect(screen.queryByText("Decline")).toBeNull();
  });

  it("should show the expired banner and hide the actions when the invitation has expired", () => {
    // Arrange / Act
    renderDetailView({ invitation: makeInvitation({ expiresAt: PAST }) });

    // Assert
    expect(screen.getByText("This invitation has expired")).toBeTruthy();
    expect(screen.queryByText("Accept")).toBeNull();
  });

  it("should show the expiry chip and keep the actions when the expiry date is ahead", () => {
    // Arrange / Act
    renderDetailView({
      invitation: makeInvitation({
        expiresAt: FUTURE,
        trip: { title: "Trip to Nowhere", destination: "Lisbonne" },
      }),
    });

    // Assert
    expect(screen.getByText(/^Expires on /)).toBeTruthy();
    expect(screen.getByText("Accept")).toBeTruthy();
    expect(screen.queryByText("This invitation has expired")).toBeNull();
  });

  it("should hide the expiry chip once the invitation has expired", () => {
    // Arrange / Act
    renderDetailView({
      invitation: makeInvitation({
        expiresAt: PAST,
        trip: { title: "Trip to Nowhere", destination: "Lisbonne" },
      }),
    });

    // Assert
    expect(screen.queryByText(/^Expires on /)).toBeNull();
    expect(screen.getByText("This invitation has expired")).toBeTruthy();
  });

  it("should drop the whole chip row — expiry chip included — when the trip has neither destination nor dates", () => {
    // Arrange / Act
    // DetailChips court-circuite sur `!duration && !destination` : la puce
    // d'expiration devient alors inatteignable, même si `expiresAt` est fourni.
    renderDetailView({ invitation: makeInvitation({ expiresAt: FUTURE }) });

    // Assert
    expect(screen.queryByText(/^Expires on /)).toBeNull();
    expect(screen.getByText("Accept")).toBeTruthy();
  });

  it("should never mark a link invitation as expired even past its expiry date", () => {
    // Arrange / Act
    renderDetailView({ invitation: makeInvitation({ type: "link", expiresAt: PAST }) });

    // Assert
    expect(screen.queryByText("This invitation has expired")).toBeNull();
    expect(screen.getByText("Join trip")).toBeTruthy();
  });

  it("should show the accepted status banner when the invitation was accepted", () => {
    // Arrange / Act
    renderDetailView({ invitation: makeInvitation({ status: "accepted" }) });

    // Assert
    expect(screen.getByText("Accepted")).toBeTruthy();
  });

  it("should show the declined status banner when the invitation was declined", () => {
    // Arrange / Act
    renderDetailView({ invitation: makeInvitation({ status: "declined" }) });

    // Assert
    expect(screen.getByText("Declined")).toBeTruthy();
  });

  it("should show no status banner on a plain pending invitation", () => {
    // Arrange / Act
    renderDetailView({});

    // Assert
    expect(screen.queryByText("Accepted")).toBeNull();
    expect(screen.queryByText("Declined")).toBeNull();
    expect(screen.queryByText("This invitation has expired")).toBeNull();
  });

  it("should call onNavigateToTrip with the flat trip id when the view trip button is pressed", () => {
    // Arrange
    const onNavigateToTrip = jest.fn();
    renderDetailView({
      invitation: makeInvitation({ status: "accepted", tripId: "trip-42" }),
      onNavigateToTrip,
    });

    // Act
    fireEvent.press(screen.getByText("View trip"));

    // Assert
    expect(onNavigateToTrip).toHaveBeenCalledWith("trip-42");
  });

  it("should fall back to the nested trip id when no flat trip id is present", () => {
    // Arrange
    const onNavigateToTrip = jest.fn();
    renderDetailView({
      invitation: makeInvitation({
        status: "accepted",
        trip: { title: "Trip to Nowhere", destination: "", _id: "trip-99" },
      }),
      onNavigateToTrip,
    });

    // Act
    fireEvent.press(screen.getByText("View trip"));

    // Assert
    expect(onNavigateToTrip).toHaveBeenCalledWith("trip-99");
  });

  it("should hide the view trip button when an accepted invitation carries no trip id", () => {
    // Arrange / Act
    renderDetailView({ invitation: makeInvitation({ status: "accepted" }) });

    // Assert
    expect(screen.queryByText("View trip")).toBeNull();
  });

  it("should fall back to the generic inviter and trip labels when both are missing", () => {
    // Arrange / Act
    renderDetailView({ invitation: { type: "invite", status: "pending" } });

    // Assert
    expect(screen.getByText("Someone")).toBeTruthy();
    expect(screen.getByText("Trip")).toBeTruthy();
  });

  it("should show the inviter email when the invitation carries one", () => {
    // Arrange / Act
    renderDetailView({
      invitation: makeInvitation({ inviter: { name: "Ana", email: "ana@example.test" } }),
    });

    // Assert
    expect(screen.getByText("ana@example.test")).toBeTruthy();
  });

  it("should show no inviter email when the invitation carries none", () => {
    // Arrange / Act
    renderDetailView({});

    // Assert
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it("should show the personal message between quotes when the invitation has one", () => {
    // Arrange / Act
    renderDetailView({ invitation: makeInvitation({ message: "On compte sur toi" }) });

    // Assert
    expect(screen.getByText('"On compte sur toi"')).toBeTruthy();
  });

  it("should show the duration chip and the date range when the trip has dates", () => {
    // Arrange / Act
    const { toJSON } = renderDetailView({
      invitation: makeInvitation({
        trip: {
          title: "Trip to Nowhere",
          destination: "",
          startDate: "2026-08-01T00:00:00.000Z",
          endDate: "2026-08-08T00:00:00.000Z",
        },
      }),
    });

    // Assert
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("days")).toBeTruthy();
    expect(screen.getByText("📅 Aug 1 – Aug 8, 2026")).toBeTruthy();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should render no chip row at all when the trip has neither duration nor destination", () => {
    // Arrange / Act
    const { toJSON } = renderDetailView({});

    // Assert
    expect(screen.queryByText("days")).toBeNull();
    expect(screen.queryByTestId("invitation-destination-chip")).toBeNull();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should show an empty relative time when the invitation has no creation date", () => {
    // Arrange / Act
    const { toJSON } = renderDetailView({
      invitation: makeInvitation({ createdAt: undefined }),
    });

    // Assert
    expect(screen.getByText("Invitation from")).toBeTruthy();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should display the trip cover image when the trip has one", () => {
    // Arrange / Act
    const { toJSON } = renderDetailView({
      invitation: makeInvitation({
        trip: {
          title: "Trip to Nowhere",
          destination: "",
          coverImage: "https://example.test/banner.jpg",
        },
      }),
    });

    // Assert
    expect(collectImageUris(toJSON())).toEqual(["https://example.test/banner.jpg"]);
  });

  it("should display no image when the trip has no cover", () => {
    // Arrange / Act
    const { toJSON } = renderDetailView({});

    // Assert
    expect(collectImageUris(toJSON())).toEqual([]);
  });
});
