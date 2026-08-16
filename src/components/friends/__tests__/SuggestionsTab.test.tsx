import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import SuggestionsTab from "../SuggestionsTab";
import i18n from "../../../utils/i18n";
import type { FriendSuggestion } from "../../../types";
import { colors, t } from "./friendsTestHarness";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function makeSuggestion(overrides: Partial<FriendSuggestion> = {}): FriendSuggestion {
  return { id: "s1", name: "Yanis Cohen", commonFriends: 2, ...overrides };
}

function renderTab(props: Partial<React.ComponentProps<typeof SuggestionsTab>> = {}) {
  const handlers = { onSuggestionPress: jest.fn(), onAddSuggestion: jest.fn() };
  const utils = render(
    <SuggestionsTab
      suggestions={[]}
      sending={false}
      colors={colors}
      t={t}
      {...handlers}
      {...props}
    />
  );
  return { ...utils, ...handlers };
}

describe("SuggestionsTab", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should show the empty state when there is no suggestion", () => {
    // Arrange / Act
    renderTab();

    // Assert
    expect(screen.getByText("No suggestions")).toBeTruthy();
    expect(
      screen.getByText("Add friends to see suggestions based on your mutual contacts.")
    ).toBeTruthy();
  });

  it("should list the suggestions under the section heading", () => {
    // Arrange / Act
    renderTab({ suggestions: [makeSuggestion()] });

    // Assert
    expect(screen.getByText("YOU MIGHT KNOW...")).toBeTruthy();
    expect(screen.getByText("Yanis Cohen")).toBeTruthy();
    expect(screen.queryByText("No suggestions")).toBeNull();
  });

  it("should show the plural mutual friends count", () => {
    // Arrange / Act
    renderTab({ suggestions: [makeSuggestion({ commonFriends: 2 })] });

    // Assert
    expect(screen.getByText("2 mutual friends")).toBeTruthy();
  });

  it("should show the singular mutual friend count", () => {
    // Arrange / Act
    renderTab({ suggestions: [makeSuggestion({ commonFriends: 1 })] });

    // Assert
    expect(screen.getByText("1 mutual friend")).toBeTruthy();
  });

  it("should call onSuggestionPress with the id and name when a suggestion is tapped", () => {
    // Arrange
    const { onSuggestionPress } = renderTab({ suggestions: [makeSuggestion()] });

    // Act
    fireEvent.press(screen.getByText("Yanis Cohen"));

    // Assert
    expect(onSuggestionPress).toHaveBeenCalledWith("s1", "Yanis Cohen");
  });

  it("should call onAddSuggestion with the suggestion when the add button is pressed", () => {
    // Arrange
    const suggestion = makeSuggestion();
    const { onAddSuggestion } = renderTab({ suggestions: [suggestion] });

    // Act
    fireEvent.press(screen.getByText("+ Add"));

    // Assert
    expect(onAddSuggestion).toHaveBeenCalledWith(suggestion);
  });

  it("should not call onAddSuggestion while a request is already being sent", () => {
    // Arrange
    const { onAddSuggestion } = renderTab({ suggestions: [makeSuggestion()], sending: true });

    // Act
    fireEvent.press(screen.getByText("+ Add"));

    // Assert
    expect(onAddSuggestion).not.toHaveBeenCalled();
  });

  it("should show the suggestion initials when there is no avatar", () => {
    // Arrange / Act
    renderTab({ suggestions: [makeSuggestion()] });

    // Assert
    expect(screen.getByText("YC")).toBeTruthy();
  });

  it("should show the avatar image instead of the initials when one is available", () => {
    // Arrange / Act
    renderTab({ suggestions: [makeSuggestion({ avatar: "https://example.test/y.png" })] });

    // Assert
    expect(screen.queryByText("YC")).toBeNull();
  });
});
