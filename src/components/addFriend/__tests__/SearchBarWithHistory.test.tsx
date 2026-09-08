import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Ionicons } from "@expo/vector-icons";
import SearchBarWithHistory from "../SearchBarWithHistory";
import i18n from "../../../utils/i18n";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function renderBar(props: Partial<React.ComponentProps<typeof SearchBarWithHistory>> = {}) {
  const handlers = {
    onInputChange: jest.fn(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
    onHistorySelect: jest.fn(),
    onHistoryRemove: jest.fn(),
    onHistoryClear: jest.fn(),
  };
  const utils = render(
    <SearchBarWithHistory input="" focused={false} history={[]} {...handlers} {...props} />
  );
  return { ...utils, ...handlers };
}

describe("SearchBarWithHistory", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should render the search placeholder", () => {
    // Arrange / Act
    renderBar();

    // Assert
    expect(screen.getByPlaceholderText("Email or phone number...")).toBeTruthy();
  });

  it("should call onInputChange when the query is typed", () => {
    // Arrange
    const { onInputChange } = renderBar();

    // Act
    fireEvent.changeText(screen.getByPlaceholderText("Email or phone number..."), "manon");

    // Assert
    expect(onInputChange).toHaveBeenCalledWith("manon");
  });

  it("should call onFocus when the field gains focus", () => {
    // Arrange
    const { onFocus } = renderBar();

    // Act
    fireEvent(screen.getByPlaceholderText("Email or phone number..."), "focus");

    // Assert
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it("should call onBlur when the field loses focus", () => {
    // Arrange
    const { onBlur } = renderBar();

    // Act
    fireEvent(screen.getByPlaceholderText("Email or phone number..."), "blur");

    // Assert
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("should display the current query", () => {
    // Arrange / Act
    renderBar({ input: "manon" });

    // Assert
    expect(screen.getByDisplayValue("manon")).toBeTruthy();
  });

  it("should hide the history when the field is not focused", () => {
    // Arrange / Act
    renderBar({ focused: false, history: ["alice", "bob"] });

    // Assert
    expect(screen.queryByText("alice")).toBeNull();
    expect(screen.queryByText("Clear history")).toBeNull();
  });

  it("should show the history when the field is focused and empty", () => {
    // Arrange / Act
    renderBar({ focused: true, history: ["alice", "bob"] });

    // Assert
    expect(screen.getByText("alice")).toBeTruthy();
    expect(screen.getByText("bob")).toBeTruthy();
    expect(screen.getByText("Clear history")).toBeTruthy();
  });

  it("should hide the history once the user starts typing", () => {
    // Arrange / Act
    renderBar({ focused: true, input: "al", history: ["alice"] });

    // Assert
    expect(screen.queryByText("Clear history")).toBeNull();
  });

  it("should hide the history when the field is focused but the history is empty", () => {
    // Arrange / Act
    renderBar({ focused: true, history: [] });

    // Assert
    expect(screen.queryByText("Clear history")).toBeNull();
  });

  it("should treat a whitespace-only query as empty and keep showing the history", () => {
    // Arrange / Act
    renderBar({ focused: true, input: "   ", history: ["alice"] });

    // Assert
    expect(screen.getByText("alice")).toBeTruthy();
  });

  it("should call onHistorySelect when a history entry is pressed", () => {
    // Arrange
    const { onHistorySelect } = renderBar({ focused: true, history: ["alice"] });

    // Act
    fireEvent.press(screen.getByText("alice"));

    // Assert
    expect(onHistorySelect).toHaveBeenCalledWith("alice");
  });

  it("should call onHistoryClear when the clear history row is pressed", () => {
    // Arrange
    const { onHistoryClear } = renderBar({ focused: true, history: ["alice"] });

    // Act
    fireEvent.press(screen.getByText("Clear history"));

    // Assert
    expect(onHistoryClear).toHaveBeenCalledTimes(1);
  });

  describe("accessibility", () => {
    it("should expose the field clearing cross as a labelled button", () => {
      // Arrange / Act
      renderBar({ input: "manon" });

      // Assert
      expect(screen.getByLabelText("Clear search").props.accessibilityRole).toBe("button");
    });

    it("should clear the query when the labelled cross is pressed", () => {
      // Arrange
      const { onInputChange } = renderBar({ input: "manon" });

      // Act
      fireEvent.press(screen.getByLabelText("Clear search"));

      // Assert
      expect(onInputChange).toHaveBeenCalledWith("");
    });

    it("should name the history removal cross after the entry it drops", () => {
      // Arrange / Act
      renderBar({ focused: true, history: ["alice"] });

      // Assert
      expect(screen.getByLabelText('Remove "alice" from search history').props.accessibilityRole)
        .toBe("button");
    });

    it("should drop the history entry when its labelled cross is pressed", () => {
      // Arrange
      const { onHistoryRemove } = renderBar({ focused: true, history: ["alice"] });

      // Act
      fireEvent.press(screen.getByLabelText('Remove "alice" from search history'));

      // Assert
      expect(onHistoryRemove).toHaveBeenCalledWith("alice");
    });

    it("should keep the magnifier out of the accessibility tree", () => {
      // Arrange / Act
      renderBar();

      // Assert — le champ porte déjà son intitulé, l'icône ne fait que l'illustrer
      const magnifier = screen
        .UNSAFE_queryAllByType(Ionicons)
        .filter((icon) => icon.props.name === "search");
      expect(magnifier).toHaveLength(1);
      expect(magnifier[0].props).toMatchObject({
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: "no",
      });
    });
  });
});
