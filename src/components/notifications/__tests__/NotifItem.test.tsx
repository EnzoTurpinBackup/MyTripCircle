import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import NotifItem from "../NotifItem";
import i18n from "../../../utils/i18n";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// `timeAgo` se base sur `Date.now()` : l'horloge est figée pour que le
// sous-titre de la notification reste identique d'une exécution à l'autre.
const NOW = new Date("2026-06-15T12:00:00.000Z");

function makeInvitation(overrides: Record<string, any> = {}) {
  return {
    status: "pending",
    inviterName: "Élodie Faure",
    tripName: "Corse 2026",
    createdAt: "2026-06-15T11:00:00.000Z",
    ...overrides,
  };
}

function renderItem(props: Partial<React.ComponentProps<typeof NotifItem>> = {}) {
  const handlers = { onPress: jest.fn(), onAccept: jest.fn(), onDecline: jest.fn() };
  const utils = render(
    <NotifItem
      invitation={makeInvitation()}
      unread={false}
      responding={false}
      {...handlers}
      {...props}
    />
  );
  return { ...utils, ...handlers };
}

describe("NotifItem", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should announce a received invitation with the trip name and the elapsed time", () => {
    // Arrange / Act
    renderItem();

    // Assert
    expect(screen.getByText("Élodie Faure invites you to join a trip")).toBeTruthy();
    expect(screen.getByText("Corse 2026 · 1h ago")).toBeTruthy();
  });

  it("should announce an accepted invitation", () => {
    // Arrange / Act
    renderItem({ invitation: makeInvitation({ status: "accepted" }) });

    // Assert
    expect(screen.getByText("Élodie Faure accepted your invitation")).toBeTruthy();
  });

  it("should announce a declined invitation", () => {
    // Arrange / Act
    renderItem({ invitation: makeInvitation({ status: "declined" }) });

    // Assert
    expect(screen.getByText("Élodie Faure declined your invitation")).toBeTruthy();
  });

  it("should treat a missing status as pending", () => {
    // Arrange / Act
    renderItem({ invitation: { inviterName: "Élodie Faure", tripName: "Corse 2026" } });

    // Assert
    expect(screen.getByText("Accept")).toBeTruthy();
  });

  it("should show the accept and decline actions on a pending invitation", () => {
    // Arrange / Act
    renderItem();

    // Assert
    expect(screen.getByText("Accept")).toBeTruthy();
    expect(screen.getByText("Decline")).toBeTruthy();
  });

  it("should hide the actions once the invitation has been answered", () => {
    // Arrange / Act
    renderItem({ invitation: makeInvitation({ status: "accepted" }) });

    // Assert
    expect(screen.queryByText("Accept")).toBeNull();
    expect(screen.queryByText("Decline")).toBeNull();
  });

  it("should call onAccept when the accept button is pressed", () => {
    // Arrange
    const { onAccept } = renderItem();

    // Act
    fireEvent.press(screen.getByText("Accept"));

    // Assert
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("should call onDecline when the decline button is pressed", () => {
    // Arrange
    const { onDecline } = renderItem();

    // Act
    fireEvent.press(screen.getByText("Decline"));

    // Assert
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("should call onPress when the notification body is pressed", () => {
    // Arrange
    const { onPress } = renderItem();

    // Act
    fireEvent.press(screen.getByText("Élodie Faure invites you to join a trip"));

    // Assert
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("should replace the accept label by a spinner while responding", () => {
    // Arrange / Act
    renderItem({ responding: true });

    // Assert
    expect(screen.queryByText("Accept")).toBeNull();
    expect(screen.getByText("Decline")).toBeTruthy();
  });

  it("should not call onDecline while a response is already in flight", () => {
    // Arrange
    const { onDecline, onPress } = renderItem({ responding: true });

    // Act
    fireEvent.press(screen.getByText("Decline"));

    // Assert
    expect(onDecline).not.toHaveBeenCalled();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("should fall back to the generic inviter label when no inviter is known", () => {
    // Arrange / Act
    renderItem({ invitation: { status: "pending", tripName: "Corse 2026" } });

    // Assert
    expect(screen.getByText("Someone invites you to join a trip")).toBeTruthy();
  });

  it("should use the nested inviter name when no flat name is provided", () => {
    // Arrange / Act
    renderItem({
      invitation: makeInvitation({ inviterName: undefined, inviter: { name: "Karim" } }),
    });

    // Assert
    expect(screen.getByText("Karim invites you to join a trip")).toBeTruthy();
  });

  it("should show only the elapsed time when the invitation carries no trip name", () => {
    // Arrange / Act
    renderItem({ invitation: makeInvitation({ tripName: undefined }) });

    // Assert
    expect(screen.getByText("1h ago")).toBeTruthy();
  });

  it("should show an empty subtitle when the invitation has no creation date", () => {
    // Arrange / Act
    renderItem({ invitation: makeInvitation({ tripName: undefined, createdAt: undefined }) });

    // Assert
    expect(screen.queryByText(/ago/)).toBeNull();
  });

  // Le point « non lu » est un marqueur purement décoratif (une View sans texte
  // ni label) : on vérifie qu'il ne modifie ni le contenu ni les actions.
  it("should keep the same content and actions when the notification is unread", () => {
    // Arrange
    const { onAccept } = renderItem({ unread: true });

    // Act
    fireEvent.press(screen.getByText("Accept"));

    // Assert
    expect(screen.getByText("Élodie Faure invites you to join a trip")).toBeTruthy();
    expect(screen.getByText("Corse 2026 · 1h ago")).toBeTruthy();
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});
