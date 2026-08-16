import React from "react";
import { Animated } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import InvitePanelSheet from "../InvitePanelSheet";
import i18n from "../../../utils/i18n";
import type { User } from "../../../types";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const FRIEND_A = { id: "a", name: "Alice Martin", email: "alice@example.test" } as User;
const FRIEND_B = { id: "b", name: "Bob Durand", email: "" } as User;
const MEMBER = { id: "m", name: "Chloé Petit", email: "chloe@example.test" } as User;

function renderSheet(props: Partial<React.ComponentProps<typeof InvitePanelSheet>> = {}) {
  const handlers = {
    onClose: jest.fn(),
    onToggleFriend: jest.fn(),
    onChangeEmail: jest.fn(),
    onSend: jest.fn(),
  };
  const anim = new Animated.Value(1);
  const utils = render(
    <InvitePanelSheet
      inviteAnim={anim}
      inviteBackdrop={anim}
      inviteY={anim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] })}
      friendsToInvite={[]}
      alreadyMembers={[]}
      invitedFriends={[]}
      emailInput=""
      sendingInvitations={false}
      inviteCount={0}
      {...handlers}
      {...props}
    />
  );
  return { ...utils, ...handlers };
}

describe("InvitePanelSheet", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should render the sheet title", () => {
    // Arrange / Act
    renderSheet();

    // Assert
    expect(screen.getByText("Invite to trip")).toBeTruthy();
  });

  it("should call onChangeEmail when the guest email is typed", () => {
    // Arrange
    const { onChangeEmail } = renderSheet();

    // Act
    fireEvent.changeText(screen.getByPlaceholderText("Guest email..."), "x@example.test");

    // Assert
    expect(onChangeEmail).toHaveBeenCalledWith("x@example.test");
  });

  it("should hide the friends section when there is nobody left to invite", () => {
    // Arrange / Act
    renderSheet();

    // Assert
    expect(screen.queryByText("My friends — not yet members")).toBeNull();
  });

  it("should list the friends who are not members yet", () => {
    // Arrange / Act
    renderSheet({ friendsToInvite: [FRIEND_A] });

    // Assert
    expect(screen.getByText("My friends — not yet members")).toBeTruthy();
    expect(screen.getByText("Alice Martin")).toBeTruthy();
    expect(screen.getByText("alice@example.test")).toBeTruthy();
  });

  it("should call onToggleFriend with the friend id when a friend row is pressed", () => {
    // Arrange
    const { onToggleFriend } = renderSheet({ friendsToInvite: [FRIEND_A] });

    // Act
    fireEvent.press(screen.getByText("Alice Martin"));

    // Assert
    expect(onToggleFriend).toHaveBeenCalledWith("a");
  });

  it("should render an empty subtitle for a friend without an email address", () => {
    // Arrange / Act
    renderSheet({ friendsToInvite: [FRIEND_B] });

    // Assert
    expect(screen.getByText("Bob Durand")).toBeTruthy();
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it("should hide the already-in-trip section when no member is listed", () => {
    // Arrange / Act
    renderSheet();

    // Assert
    expect(screen.queryByText("Already in the trip")).toBeNull();
  });

  it("should list the members who are already in the trip", () => {
    // Arrange / Act
    renderSheet({ alreadyMembers: [MEMBER] });

    // Assert
    expect(screen.getByText("Already in the trip")).toBeTruthy();
    expect(screen.getByText("Chloé Petit")).toBeTruthy();
    expect(screen.getByText("Already a member")).toBeTruthy();
    expect(screen.getByText("✓ Member")).toBeTruthy();
  });

  it("should show the plain send label when nothing is selected", () => {
    // Arrange / Act
    renderSheet();

    // Assert
    expect(screen.getByText("Send invitation")).toBeTruthy();
  });

  it("should show the selected count on the send button", () => {
    // Arrange / Act
    renderSheet({ inviteCount: 3 });

    // Assert
    expect(screen.getByText("Send invitation (3)")).toBeTruthy();
  });

  it("should show the sending label while invitations are in flight", () => {
    // Arrange / Act
    renderSheet({ sendingInvitations: true, inviteCount: 2 });

    // Assert
    expect(screen.getByText("Sending...")).toBeTruthy();
  });

  it("should call onSend when the send button is pressed with a selection", () => {
    // Arrange
    const { onSend } = renderSheet({ inviteCount: 1 });

    // Act
    fireEvent.press(screen.getByText("Send invitation (1)"));

    // Assert
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("should not call onSend when nothing is selected", () => {
    // Arrange
    const { onSend } = renderSheet({ inviteCount: 0 });

    // Act
    fireEvent.press(screen.getByText("Send invitation"));

    // Assert
    expect(onSend).not.toHaveBeenCalled();
  });

  it("should not call onSend while invitations are already being sent", () => {
    // Arrange
    const { onSend } = renderSheet({ sendingInvitations: true, inviteCount: 2 });

    // Act
    fireEvent.press(screen.getByText("Sending..."));

    // Assert
    expect(onSend).not.toHaveBeenCalled();
  });

  it("should let an already selected friend be toggled off", () => {
    // Arrange
    const { onToggleFriend } = renderSheet({
      friendsToInvite: [FRIEND_A],
      invitedFriends: ["a"],
    });

    // Act
    fireEvent.press(screen.getByText("Alice Martin"));

    // Assert
    expect(onToggleFriend).toHaveBeenCalledWith("a");
  });
});
