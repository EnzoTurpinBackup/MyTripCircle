import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import SuggestionCard from "../SuggestionCard";
import i18n from "../../../utils/i18n";
import type { FriendSuggestion } from "../../../types";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function makeSuggestion(overrides: Partial<FriendSuggestion> = {}): FriendSuggestion {
  return {
    id: "s1",
    name: "Théo Bernard",
    email: "theo@example.test",
    commonFriends: 4,
    ...overrides,
  };
}

function renderCard(props: Partial<React.ComponentProps<typeof SuggestionCard>> = {}) {
  const handlers = { onSend: jest.fn(), onViewProfile: jest.fn() };
  const utils = render(
    <SuggestionCard item={makeSuggestion()} sending={false} {...handlers} {...props} />
  );
  return { ...utils, ...handlers };
}

describe("SuggestionCard", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should render the suggestion name and the mutual friends count", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("Théo Bernard")).toBeTruthy();
    expect(screen.getByText("4 mutual friends")).toBeTruthy();
  });

  it("should show the singular mutual friend count", () => {
    // Arrange / Act
    renderCard({ item: makeSuggestion({ commonFriends: 1 }) });

    // Assert
    expect(screen.getByText("1 mutual friend")).toBeTruthy();
  });

  it("should call onViewProfile with the id and name when the name block is pressed", () => {
    // Arrange
    const { onViewProfile } = renderCard();

    // Act
    fireEvent.press(screen.getByText("Théo Bernard"));

    // Assert
    expect(onViewProfile).toHaveBeenCalledWith("s1", "Théo Bernard");
  });

  it("should call onViewProfile when the avatar is pressed", () => {
    // Arrange
    const { onViewProfile } = renderCard();

    // Act
    fireEvent.press(screen.getByText("TB"));

    // Assert
    expect(onViewProfile).toHaveBeenCalledWith("s1", "Théo Bernard");
  });

  it("should call onSend with the suggestion email and name when the add button is pressed", () => {
    // Arrange
    const { onSend } = renderCard();

    // Act
    fireEvent.press(screen.getByText("+ Add"));

    // Assert
    expect(onSend).toHaveBeenCalledWith("theo@example.test", undefined, "Théo Bernard");
  });

  it("should not call onSend while a request is already being sent", () => {
    // Arrange
    const { onSend } = renderCard({ sending: true });

    // Act
    fireEvent.press(screen.getByText("+ Add"));

    // Assert
    expect(onSend).not.toHaveBeenCalled();
  });

  it("should show the suggestion initials when there is no avatar", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("TB")).toBeTruthy();
  });

  it("should show the avatar image instead of the initials when one is available", () => {
    // Arrange / Act
    renderCard({ item: makeSuggestion({ avatar: "https://example.test/t.png" }) });

    // Assert
    expect(screen.queryByText("TB")).toBeNull();
  });

  it("should expose the view profile shortcut", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("View profile ›")).toBeTruthy();
  });
});
