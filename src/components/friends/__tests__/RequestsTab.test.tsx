import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import RequestsTab from "../RequestsTab";
import i18n from "../../../utils/i18n";
import type { FriendRequest } from "../../../types";
import { colors, t } from "./friendsTestHarness";
import { freezeClockAt, restoreClock } from "../../invitations/__tests__/frozenClock";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// `timeAgo` se base sur `Date.now()` : l'horloge est figée pour que les
// libellés « à l'instant » et « il y a N min » restent déterministes.
const NOW = new Date("2026-06-15T12:00:00.000Z");

function makeReceived(overrides: Partial<FriendRequest> = {}): FriendRequest {
  return {
    id: "r1",
    senderId: "s1",
    senderName: "Hugo Blanc",
    status: "pending",
    createdAt: new Date("2026-06-15T11:30:00.000Z"),
    ...overrides,
  } as FriendRequest;
}

function makeSent(overrides: Partial<FriendRequest> = {}): FriendRequest {
  return {
    id: "s1",
    senderId: "me",
    senderName: "Moi",
    recipientName: "Inès Dupuis",
    status: "pending",
    createdAt: new Date("2026-06-15T11:30:00.000Z"),
    ...overrides,
  } as FriendRequest;
}

function renderTab(props: Partial<React.ComponentProps<typeof RequestsTab>> = {}) {
  const handlers = { onRespond: jest.fn(), onCancel: jest.fn() };
  const utils = render(
    <RequestsTab
      receivedRequests={[]}
      sentRequests={[]}
      colors={colors}
      t={t}
      {...handlers}
      {...props}
    />
  );
  return { ...utils, ...handlers };
}

describe("RequestsTab", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    freezeClockAt(NOW);
  });

  afterEach(() => {
    restoreClock();
  });

  it("should show both empty states when there is no request at all", () => {
    // Arrange / Act
    renderTab();

    // Assert
    expect(screen.getByText("No requests received")).toBeTruthy();
    expect(screen.getByText("No requests sent")).toBeTruthy();
  });

  it("should show the section counters", () => {
    // Arrange / Act
    renderTab({ receivedRequests: [makeReceived()], sentRequests: [makeSent()] });

    // Assert
    expect(screen.getByText("RECEIVED (1)")).toBeTruthy();
    expect(screen.getByText("SENT (1)")).toBeTruthy();
  });

  it("should list a received request with its sender name", () => {
    // Arrange / Act
    renderTab({ receivedRequests: [makeReceived()] });

    // Assert
    expect(screen.getByText("Hugo Blanc")).toBeTruthy();
    expect(screen.queryByText("No requests received")).toBeNull();
  });

  it("should show the elapsed minutes since a received request", () => {
    // Arrange / Act
    renderTab({ receivedRequests: [makeReceived()] });

    // Assert
    expect(screen.getByText("Received 30min ago")).toBeTruthy();
  });

  it("should show the just-now label for a request received less than a minute ago", () => {
    // Arrange / Act
    renderTab({ receivedRequests: [makeReceived({ createdAt: NOW })] });

    // Assert
    expect(screen.getByText("Received just now")).toBeTruthy();
  });

  it("should append the mutual friends count when the request has one", () => {
    // Arrange / Act
    renderTab({ receivedRequests: [makeReceived({ commonFriends: 2 })] });

    // Assert
    expect(screen.getByText("Received 30min ago · 2 mutual friends")).toBeTruthy();
  });

  it("should omit the mutual friends part when the count is zero", () => {
    // Arrange / Act
    renderTab({ receivedRequests: [makeReceived({ commonFriends: 0 })] });

    // Assert
    expect(screen.getByText("Received 30min ago")).toBeTruthy();
  });

  it("should call onRespond with accept when the accept button is pressed", () => {
    // Arrange
    const { onRespond } = renderTab({ receivedRequests: [makeReceived()] });

    // Act
    fireEvent.press(screen.getByText("Accept"));

    // Assert
    expect(onRespond).toHaveBeenCalledWith("r1", "accept");
  });

  it("should call onRespond with decline when the decline button is pressed", () => {
    // Arrange
    const { onRespond } = renderTab({ receivedRequests: [makeReceived()] });

    // Act
    fireEvent.press(screen.getByText("Decline"));

    // Assert
    expect(onRespond).toHaveBeenCalledWith("r1", "decline");
  });

  it("should list a sent request with the recipient name and its pending pill", () => {
    // Arrange / Act
    renderTab({ sentRequests: [makeSent()] });

    // Assert
    expect(screen.getByText("Inès Dupuis")).toBeTruthy();
    expect(screen.getByText("Request sent")).toBeTruthy();
    expect(screen.getByText("Pending")).toBeTruthy();
  });

  it("should fall back to the recipient email when the recipient has no name", () => {
    // Arrange / Act
    renderTab({ sentRequests: [makeSent({ recipientName: undefined, recipientEmail: "ines@example.test" })] });

    // Assert
    expect(screen.getByText("ines@example.test")).toBeTruthy();
  });

  it("should fall back to the recipient phone when there is neither name nor email", () => {
    // Arrange / Act
    renderTab({
      sentRequests: [makeSent({ recipientName: undefined, recipientEmail: undefined, recipientPhone: "+33699887766" })],
    });

    // Assert
    expect(screen.getByText("+33699887766")).toBeTruthy();
  });

  it("should fall back to the unknown label when the recipient has no identity at all", () => {
    // Arrange / Act
    renderTab({
      sentRequests: [makeSent({ recipientName: undefined, recipientEmail: undefined, recipientPhone: undefined })],
    });

    // Assert
    expect(screen.getByText("Unknown")).toBeTruthy();
  });

  it("should show the uppercase initial of the recipient as avatar", () => {
    // Arrange / Act
    renderTab({ sentRequests: [makeSent({ recipientName: "inès dupuis" })] });

    // Assert
    expect(screen.getByText("I")).toBeTruthy();
  });

  // NB : le bouton d'annulation d'une demande envoyée est une icône seule, sans
  // `accessibilityLabel` ni `testID` : il n'existe aucune requête accessible
  // permettant de l'atteindre. `onCancel` reste donc non couvert — c'est un
  // manquement WCAG 2.1 AA signalé plutôt que contourné par une requête
  // structurelle.

  it("should render the sender fallback marker when the sender has no name", () => {
    // Arrange / Act
    renderTab({ receivedRequests: [makeReceived({ senderName: undefined as any })] });

    // Assert
    expect(screen.getByText("?")).toBeTruthy();
  });
});
