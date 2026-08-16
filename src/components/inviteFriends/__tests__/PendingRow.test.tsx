import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import PendingRow from "../PendingRow";
import i18n from "../../../utils/i18n";
import type { User } from "../../../types";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Le libellé « il y a X » est calculé depuis `Date.now()` : l'horloge est figée
// pour que chaque palier (secondes, minutes, heures, jours) reste déterministe.
const NOW = new Date("2026-06-15T12:00:00.000Z");

const FRIENDS: User[] = [
  { id: "f1", name: "Nadia Ben", email: "nadia@example.test" } as User,
];

function renderRow(props: Partial<React.ComponentProps<typeof PendingRow>> = {}) {
  const onCancel = jest.fn();
  const utils = render(
    <PendingRow
      invitation={{ inviteeEmail: "invite@example.test", createdAt: NOW.toISOString() }}
      friends={FRIENDS}
      isOwner={false}
      onCancel={onCancel}
      {...props}
    />
  );
  return { ...utils, onCancel };
}

describe("PendingRow", () => {
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

  it("should show the pending label", () => {
    // Arrange / Act
    renderRow();

    // Assert
    expect(screen.getByText("⏳ Invitation sent")).toBeTruthy();
  });

  it("should show the invitee email when no friend matches it", () => {
    // Arrange / Act
    renderRow();

    // Assert
    expect(screen.getByText("invite@example.test")).toBeTruthy();
  });

  it("should prefer the friend name when a friend matches the invitee email", () => {
    // Arrange / Act
    renderRow({ invitation: { inviteeEmail: "nadia@example.test" } });

    // Assert
    expect(screen.getByText("Nadia Ben")).toBeTruthy();
    expect(screen.queryByText("nadia@example.test")).toBeNull();
  });

  it("should match a friend on the invitee phone field as well", () => {
    // Arrange / Act
    renderRow({ invitation: { inviteePhone: "nadia@example.test" } });

    // Assert
    expect(screen.getByText("Nadia Ben")).toBeTruthy();
  });

  it("should fall back to the invitee phone when there is no email and no match", () => {
    // Arrange / Act
    renderRow({ invitation: { inviteePhone: "+33612345678" } });

    // Assert
    expect(screen.getByText("+33612345678")).toBeTruthy();
  });

  it("should fall back to the guest label when the invitation has no recipient at all", () => {
    // Arrange / Act
    renderRow({ invitation: {} });

    // Assert
    expect(screen.getByText("Guest")).toBeTruthy();
  });

  it("should show the elapsed time in seconds for a very recent invitation", () => {
    // Arrange / Act
    renderRow({
      invitation: { inviteeEmail: "a@example.test", createdAt: "2026-06-15T11:59:30.000Z" },
    });

    // Assert
    expect(screen.getByText("30s ago")).toBeTruthy();
  });

  it("should show the elapsed time in minutes for an invitation sent within the hour", () => {
    // Arrange / Act
    renderRow({
      invitation: { inviteeEmail: "a@example.test", createdAt: "2026-06-15T11:20:00.000Z" },
    });

    // Assert
    expect(screen.getByText("40min ago")).toBeTruthy();
  });

  it("should show the elapsed time in hours for an invitation sent within the day", () => {
    // Arrange / Act
    renderRow({
      invitation: { inviteeEmail: "a@example.test", createdAt: "2026-06-15T07:00:00.000Z" },
    });

    // Assert
    expect(screen.getByText("5h ago")).toBeTruthy();
  });

  it("should show the elapsed time in days for an older invitation", () => {
    // Arrange / Act
    renderRow({
      invitation: { inviteeEmail: "a@example.test", createdAt: "2026-06-12T12:00:00.000Z" },
    });

    // Assert
    expect(screen.getByText("3j ago")).toBeTruthy();
  });

  it("should show no elapsed time when the invitation has no creation date", () => {
    // Arrange / Act
    renderRow({ invitation: { inviteeEmail: "a@example.test" } });

    // Assert
    expect(screen.queryByText(/ago/)).toBeNull();
  });

  it("should let the trip owner cancel the invitation", () => {
    // Arrange
    const invitation = { inviteeEmail: "invite@example.test" };
    const { onCancel } = renderRow({ isOwner: true, invitation });

    // Act
    fireEvent.press(screen.getByText("Cancel"));

    // Assert
    expect(onCancel).toHaveBeenCalledWith(invitation);
  });

  it("should hide the cancel action from a member who does not own the trip", () => {
    // Arrange / Act
    renderRow({ isOwner: false });

    // Assert
    expect(screen.queryByText("Cancel")).toBeNull();
  });
});
