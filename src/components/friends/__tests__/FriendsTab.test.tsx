import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import FriendsTab from "../FriendsTab";
import i18n from "../../../utils/i18n";
import type { Friend } from "../../../types";
import { colors, t } from "./friendsTestHarness";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function makeFriend(overrides: Partial<Friend> & Record<string, any> = {}): Friend {
  return {
    id: "1",
    userId: "me",
    friendId: "f1",
    name: "Léa Fontaine",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  } as Friend;
}

function renderTab(props: Partial<React.ComponentProps<typeof FriendsTab>> = {}) {
  const handlers = {
    onShareInviteLink: jest.fn(),
    onSearchChange: jest.fn(),
    onFriendPress: jest.fn(),
    onFriendLongPress: jest.fn(),
  };
  const utils = render(
    <FriendsTab
      friends={[]}
      sharingLink={false}
      searchQuery=""
      colors={colors}
      t={t}
      {...handlers}
      {...props}
    />
  );
  return { ...utils, ...handlers };
}

describe("FriendsTab", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should show the empty state when the user has no friends", () => {
    // Arrange / Act
    renderTab();

    // Assert
    expect(screen.getByText("No friends yet")).toBeTruthy();
    expect(screen.getByText("Share your invitation link to add friends")).toBeTruthy();
  });

  it("should list the friends when there are some", () => {
    // Arrange / Act
    renderTab({ friends: [makeFriend()] });

    // Assert
    expect(screen.getByText("Léa Fontaine")).toBeTruthy();
    expect(screen.queryByText("No friends yet")).toBeNull();
  });

  it("should call onFriendPress with the friend id and name when a friend is tapped", () => {
    // Arrange
    const { onFriendPress } = renderTab({ friends: [makeFriend()] });

    // Act
    fireEvent.press(screen.getByText("Léa Fontaine"));

    // Assert
    expect(onFriendPress).toHaveBeenCalledWith("f1", "Léa Fontaine");
  });

  it("should call onFriendLongPress with the friend when a friend row is long pressed", () => {
    // Arrange
    const friend = makeFriend();
    const { onFriendLongPress } = renderTab({ friends: [friend] });

    // Act
    fireEvent(screen.getByText("Léa Fontaine"), "longPress");

    // Assert
    expect(onFriendLongPress).toHaveBeenCalledWith(friend);
  });

  it("should show the number of trips in common when the friend has some", () => {
    // Arrange / Act
    renderTab({ friends: [makeFriend({ commonTrips: 3 })] });

    // Assert
    expect(screen.getByText("3 trips in common")).toBeTruthy();
  });

  it("should show the singular trip label when only one trip is shared", () => {
    // Arrange / Act
    renderTab({ friends: [makeFriend({ commonTrips: 1 })] });

    // Assert
    expect(screen.getByText("1 trip in common")).toBeTruthy();
  });

  it("should fall back to the email when the friend has no trip in common", () => {
    // Arrange / Act
    renderTab({ friends: [makeFriend({ email: "lea@example.test" })] });

    // Assert
    expect(screen.getByText("lea@example.test")).toBeTruthy();
  });

  it("should fall back to the phone number when the friend has neither trips nor email", () => {
    // Arrange / Act
    renderTab({ friends: [makeFriend({ phone: "+33611223344" })] });

    // Assert
    expect(screen.getByText("+33611223344")).toBeTruthy();
  });

  it("should fall back to the generic friend label when the friend has no contact detail", () => {
    // Arrange / Act
    renderTab({ friends: [makeFriend()] });

    // Assert
    expect(screen.getByText("Friends")).toBeTruthy();
  });

  it("should call onShareInviteLink when the invite banner is pressed", () => {
    // Arrange
    const { onShareInviteLink } = renderTab();

    // Act
    fireEvent.press(screen.getByText("Share my invitation link"));

    // Assert
    expect(onShareInviteLink).toHaveBeenCalledTimes(1);
  });

  it("should show the invite description when no link is being generated", () => {
    // Arrange / Act
    renderTab({ sharingLink: false });

    // Assert
    expect(screen.getByText("Invite your friends to join in one click")).toBeTruthy();
  });

  it("should show the generating copy while the invite link is being built", () => {
    // Arrange / Act
    renderTab({ sharingLink: true });

    // Assert
    expect(screen.getByText("Generating link...")).toBeTruthy();
  });

  it("should not call onShareInviteLink while a link is already being generated", () => {
    // Arrange
    const { onShareInviteLink } = renderTab({ sharingLink: true });

    // Act
    fireEvent.press(screen.getByText("Generating link..."));

    // Assert
    expect(onShareInviteLink).not.toHaveBeenCalled();
  });

  it("should call onSearchChange when the search field changes", () => {
    // Arrange
    const { onSearchChange } = renderTab();

    // Act
    fireEvent.changeText(screen.getByPlaceholderText("Search a friend..."), "Léa");

    // Assert
    expect(onSearchChange).toHaveBeenCalledWith("Léa");
  });

  it("should display the current search query", () => {
    // Arrange / Act
    renderTab({ searchQuery: "Marc" });

    // Assert
    expect(screen.getByDisplayValue("Marc")).toBeTruthy();
  });

  it("should show the friend avatar image when one is available", () => {
    // Arrange / Act
    renderTab({ friends: [makeFriend({ avatar: "https://example.test/lea.png" })] });

    // Assert
    expect(screen.queryByText("LF")).toBeNull();
  });

  it("should show the friend initials when no avatar is available", () => {
    // Arrange / Act
    renderTab({ friends: [makeFriend()] });

    // Assert
    expect(screen.getByText("LF")).toBeTruthy();
  });
});
