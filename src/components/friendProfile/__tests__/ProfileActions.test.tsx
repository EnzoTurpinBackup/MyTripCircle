import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import ProfileActions from "../ProfileActions";
import i18n from "../../../utils/i18n";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function renderActions(props: Partial<React.ComponentProps<typeof ProfileActions>> = {}) {
  const handlers = {
    onInvite: jest.fn(),
    onRemove: jest.fn(),
    onAddFriend: jest.fn(),
    onReport: jest.fn(),
    onBlock: jest.fn(),
  };
  const utils = render(
    <ProfileActions
      isFriend={false}
      sending={false}
      dangerBg="#FDEAEA"
      dangerColor="#C04040"
      {...handlers}
      {...props}
    />
  );
  return { ...utils, ...handlers };
}

describe("ProfileActions", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should offer to invite the friend to a trip when they are already a friend", () => {
    // Arrange / Act
    renderActions({ isFriend: true });

    // Assert
    expect(screen.getByText("Invite to trip")).toBeTruthy();
    expect(screen.queryByText("Add as friend")).toBeNull();
  });

  it("should offer to add the user when they are not a friend yet", () => {
    // Arrange / Act
    renderActions({ isFriend: false });

    // Assert
    expect(screen.getByText("Add as friend")).toBeTruthy();
    expect(screen.queryByText("Invite to trip")).toBeNull();
  });

  it("should call onInvite when the invite button is pressed", () => {
    // Arrange
    const { onInvite } = renderActions({ isFriend: true });

    // Act
    fireEvent.press(screen.getByText("Invite to trip"));

    // Assert
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it("should call onAddFriend when the add friend button is pressed", () => {
    // Arrange
    const { onAddFriend } = renderActions({ isFriend: false });

    // Act
    fireEvent.press(screen.getByText("Add as friend"));

    // Assert
    expect(onAddFriend).toHaveBeenCalledTimes(1);
  });

  it("should not call onAddFriend while a request is already being sent", () => {
    // Arrange
    const { onAddFriend } = renderActions({ isFriend: false, sending: true });

    // Act
    fireEvent.press(screen.getByText("Add as friend"));

    // Assert
    expect(onAddFriend).not.toHaveBeenCalled();
  });

  it("should call onReport when the report button is pressed on a friend profile", () => {
    // Arrange
    const { onReport } = renderActions({ isFriend: true });

    // Act
    fireEvent.press(screen.getByLabelText("Report this user"));

    // Assert
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it("should call onReport when the report button is pressed on a stranger profile", () => {
    // Arrange
    const { onReport } = renderActions({ isFriend: false });

    // Act
    fireEvent.press(screen.getByLabelText("Report this user"));

    // Assert
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it("should call onBlock when the block button is pressed on a stranger profile", () => {
    // Arrange
    const { onBlock } = renderActions({ isFriend: false });

    // Act
    fireEvent.press(screen.getByLabelText("Block this user"));

    // Assert
    expect(onBlock).toHaveBeenCalledTimes(1);
  });

  it("should offer no block action on a friend profile", () => {
    // Arrange / Act
    renderActions({ isFriend: true });

    // Assert
    expect(screen.queryByLabelText("Block this user")).toBeNull();
  });
});
