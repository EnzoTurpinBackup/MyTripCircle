import "./support/screenMocks";

import React from "react";
import { Alert, Keyboard } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import AddFriendScreen from "../AddFriendScreen";
import { restoreDebounceTimers, useDebounceTimers } from "./support/debounceTimers";

const DEBOUNCE_MS = 600;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, replace: mockReplace }),
}));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: () => ({ colors: jest.requireActual("../../contexts/ThemeContext").lightColors }),
}));

jest.mock("../../contexts/FriendsContext", () => ({
  useFriends: () => ({
    sendFriendRequest: mockSendFriendRequest,
    suggestions: mockSuggestions,
    refreshSuggestions: mockRefreshSuggestions,
  }),
}));

jest.mock("../../services/ApiService", () => ({
  ApiService: { lookupUser: (...args: unknown[]) => mockLookupUser(...args) },
}));

jest.mock("../../utils/i18n", () => ({
  parseApiError: (...args: unknown[]) => mockParseApiError(...args),
}));

jest.mock("../../hooks/useSearchHistory", () => ({
  __esModule: true,
  default: () => ({
    history: mockHistory,
    saveToHistory: mockSaveToHistory,
    removeFromHistory: mockRemoveFromHistory,
    clearHistory: mockClearHistory,
  }),
}));

jest.mock("../../components/addFriend/SearchBarWithHistory", () => {
  const React = require("react");
  const { Text, TextInput, TouchableOpacity, View } = require("react-native");
  const SearchBarWithHistory = ({
    input,
    onInputChange,
    focused,
    onFocus,
    onBlur,
    history,
    onHistorySelect,
    onHistoryRemove,
    onHistoryClear,
  }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: "search-bar" },
      React.createElement(Text, { testID: "search-bar:focused" }, String(focused)),
      React.createElement(TextInput, {
        testID: "search-bar:input",
        value: input,
        onChangeText: onInputChange,
        onFocus,
        onBlur,
      }),
      React.createElement(
        TouchableOpacity,
        { testID: "search-bar:clear-history", onPress: onHistoryClear },
        React.createElement(Text, null, "clear"),
      ),
      ...history.map((entry: string) => [
        React.createElement(
          TouchableOpacity,
          {
            key: `${entry}:select`,
            testID: `search-bar:history:${entry}`,
            onPress: () => onHistorySelect(entry),
          },
          React.createElement(Text, null, entry),
        ),
        React.createElement(
          TouchableOpacity,
          {
            key: `${entry}:remove`,
            testID: `search-bar:history:${entry}:remove`,
            onPress: () => onHistoryRemove(entry),
          },
          React.createElement(Text, null, "remove"),
        ),
      ]).flat(),
    );
  return { __esModule: true, default: SearchBarWithHistory };
});

jest.mock("../../components/addFriend/SearchResultCard", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const SearchResultCard = ({ result, sending, onSend, onViewProfile }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: "search-result" },
      React.createElement(Text, { testID: "search-result:id" }, String(result.id)),
      React.createElement(Text, { testID: "search-result:sending" }, String(sending)),
      React.createElement(
        TouchableOpacity,
        { testID: "search-result:send", onPress: onSend },
        React.createElement(Text, null, "send"),
      ),
      React.createElement(
        TouchableOpacity,
        { testID: "search-result:profile", onPress: onViewProfile },
        React.createElement(Text, null, "profile"),
      ),
    );
  return { __esModule: true, default: SearchResultCard };
});

jest.mock("../../components/addFriend/SuggestionCard", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const SuggestionCard = ({ item, sending, onSend, onViewProfile }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: `suggestion:${item.id}` },
      React.createElement(Text, { testID: `suggestion:${item.id}:sending` }, String(sending)),
      React.createElement(
        TouchableOpacity,
        {
          testID: `suggestion:${item.id}:send`,
          onPress: () => onSend(item.email, undefined, item.name),
        },
        React.createElement(Text, null, "send"),
      ),
      React.createElement(
        TouchableOpacity,
        {
          testID: `suggestion:${item.id}:profile`,
          onPress: () => onViewProfile(item.id, item.name),
        },
        React.createElement(Text, null, "profile"),
      ),
    );
  return { __esModule: true, default: SuggestionCard };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReplace = jest.fn();
const mockLookupUser = jest.fn();
const mockSendFriendRequest = jest.fn();
const mockRefreshSuggestions = jest.fn();
const mockParseApiError = jest.fn();
const mockSaveToHistory = jest.fn();
const mockRemoveFromHistory = jest.fn();
const mockClearHistory = jest.fn();

let mockSuggestions: Record<string, unknown>[] = [];
let mockHistory: string[] = [];

/** Saisit un texte puis laisse expirer la temporisation de recherche. */
const search = async (text: string) => {
  fireEvent.changeText(screen.getByTestId("search-bar:input"), text);
  await act(async () => {
    jest.advanceTimersByTime(DEBOUNCE_MS);
  });
};

describe("AddFriendScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    useDebounceTimers();
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockSuggestions = [];
    mockHistory = [];
    mockLookupUser.mockResolvedValue({ id: "user-9", name: "Ada Lovelace", email: "ada@example.com" });
    mockSendFriendRequest.mockResolvedValue({});
    mockParseApiError.mockReturnValue("");
    render(<AddFriendScreen />);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    restoreDebounceTimers();
  });

  describe("suggestions", () => {
    it("should refresh the suggestions on mount", () => {
      // Assert
      expect(mockRefreshSuggestions).toHaveBeenCalledTimes(1);
    });

    it("should tell the user when no suggestion is available", () => {
      // Assert
      expect(screen.getByText("addFriend.noSuggestions")).toBeTruthy();
    });
  });

  describe("détection du type de contact", () => {
    it("should look the contact up by email when the input is an email address", async () => {
      // Arrange & Act
      await search("ada@example.com");

      // Assert
      expect(mockLookupUser).toHaveBeenCalledWith({ email: "ada@example.com" });
    });

    it("should look the contact up by phone when the input is a phone number", async () => {
      // Arrange & Act
      await search("+33 6 12 34 56 78");

      // Assert
      expect(mockLookupUser).toHaveBeenCalledWith({ phone: "+33 6 12 34 56 78" });
    });

    it("should not search anything when the input is neither an email nor a phone", async () => {
      // Arrange & Act
      await search("Ada");

      // Assert
      expect(mockLookupUser).not.toHaveBeenCalled();
    });

    it("should not search anything when the input is only blank characters", async () => {
      // Arrange & Act
      await search("   ");

      // Assert
      expect(mockLookupUser).not.toHaveBeenCalled();
    });

    it("should cancel the pending search when the input changes again", async () => {
      // Arrange
      fireEvent.changeText(screen.getByTestId("search-bar:input"), "ada@example.com");

      // Act
      await search("grace@example.com");

      // Assert
      expect(mockLookupUser).toHaveBeenCalledTimes(1);
      expect(mockLookupUser).toHaveBeenCalledWith({ email: "grace@example.com" });
    });
  });

  describe("recherche en cours", () => {
    it("should announce the search while the lookup is in flight", async () => {
      // Arrange
      let release: (value: unknown) => void = () => {};
      mockLookupUser.mockReturnValue(new Promise((r) => { release = r; }));

      // Act
      await search("ada@example.com");

      // Assert
      expect(screen.getByText("addFriend.searching")).toBeTruthy();
      await act(async () => { release({ id: "user-9" }); });
      expect(screen.queryByText("addFriend.searching")).toBeNull();
    });

    it("should hide the suggestions section as soon as something is typed", async () => {
      // Arrange & Act
      await search("ada@example.com");

      // Assert
      expect(screen.queryByText("addFriend.sectionSuggestions")).toBeNull();
    });
  });

  describe("résultat de recherche", () => {
    it("should display the matching user and remember the query", async () => {
      // Arrange & Act
      await search("ada@example.com");

      // Assert
      expect(screen.getByTestId("search-result:id")).toHaveTextContent("user-9");
      expect(mockSaveToHistory).toHaveBeenCalledWith("ada@example.com");
    });

    it("should open the profile of the matching user", async () => {
      // Arrange
      await search("ada@example.com");

      // Act
      fireEvent.press(screen.getByTestId("search-result:profile"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("FriendProfile", {
        friendId: "user-9",
        friendName: "Ada Lovelace",
      });
    });

    it("should clear the previous result as soon as the input changes", async () => {
      // Arrange
      await search("ada@example.com");

      // Act
      fireEvent.changeText(screen.getByTestId("search-bar:input"), "grace@example.com");

      // Assert
      expect(screen.queryByTestId("search-result")).toBeNull();
    });
  });

  describe("échecs de recherche", () => {
    it("should tell the user when the API answers with a structured not found error", async () => {
      // Arrange
      mockLookupUser.mockRejectedValue(new Error(JSON.stringify({ error: "User not found" })));

      // Act
      await search("ada@example.com");

      // Assert
      expect(screen.getByText("addFriend.errorNotFound")).toBeTruthy();
      expect(screen.queryByTestId("search-result")).toBeNull();
    });

    it("should tell the user when the API answers with a bare 404 message", async () => {
      // Arrange
      mockLookupUser.mockRejectedValue(new Error("Request failed with 404"));

      // Act
      await search("ada@example.com");

      // Assert
      expect(screen.getByText("addFriend.errorNotFound")).toBeTruthy();
    });

    it("should tell the user when they searched for their own contact", async () => {
      // Arrange
      mockLookupUser.mockRejectedValue(new Error(JSON.stringify({ error: "You cannot add yourself" })));

      // Act
      await search("ada@example.com");

      // Assert
      expect(screen.getByText("addFriend.errorYourself")).toBeTruthy();
    });

    it("should stay silent when the API failure is not actionable", async () => {
      // Arrange
      mockLookupUser.mockRejectedValue(new Error("Internal server error"));

      // Act
      await search("ada@example.com");

      // Assert
      expect(screen.queryByText("addFriend.errorNotFound")).toBeNull();
      expect(screen.queryByText("addFriend.errorYourself")).toBeNull();
      expect(screen.queryByTestId("search-result")).toBeNull();
    });

    it("should stay silent when the structured failure carries no message", async () => {
      // Arrange
      mockLookupUser.mockRejectedValue(new Error(JSON.stringify({ status: 500 })));

      // Act
      await search("ada@example.com");

      // Assert
      expect(screen.queryByText("addFriend.errorNotFound")).toBeNull();
      expect(screen.queryByText("addFriend.errorYourself")).toBeNull();
    });

    it("should clear the previous error as soon as the input changes", async () => {
      // Arrange
      mockLookupUser.mockRejectedValue(new Error("404"));
      await search("ada@example.com");

      // Act
      fireEvent.changeText(screen.getByTestId("search-bar:input"), "grace@example.com");

      // Assert
      expect(screen.queryByText("addFriend.errorNotFound")).toBeNull();
    });
  });

  describe("envoi depuis le résultat de recherche", () => {
    it("should send the request to the email that was typed", async () => {
      // Arrange
      await search("ada@example.com");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("search-result:send"));
      });

      // Assert
      expect(mockSendFriendRequest).toHaveBeenCalledWith({ recipientEmail: "ada@example.com" });
      expect(mockReplace).toHaveBeenCalledWith("FriendRequestConfirmation", {
        recipientName: "Ada Lovelace",
        recipientEmail: "ada@example.com",
        autoAccepted: false,
      });
    });

    it("should send the request to the phone number that was typed", async () => {
      // Arrange
      mockLookupUser.mockResolvedValue({ id: "user-9", name: "Ada", email: "ada@example.com" });
      await search("+33612345678");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("search-result:send"));
      });

      // Assert
      expect(mockSendFriendRequest).toHaveBeenCalledWith({ recipientPhone: "+33612345678" });
      expect(mockReplace).toHaveBeenCalledWith("FriendRequestConfirmation", {
        recipientName: "Ada",
        recipientEmail: "ada@example.com",
        autoAccepted: false,
      });
    });

    it("should fall back to the typed value when the match carries no name nor email", async () => {
      // Arrange
      mockLookupUser.mockResolvedValue({ id: "user-9" });
      await search("ada@example.com");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("search-result:send"));
      });

      // Assert
      expect(mockReplace).toHaveBeenCalledWith("FriendRequestConfirmation", {
        recipientName: "ada@example.com",
        recipientEmail: "ada@example.com",
        autoAccepted: false,
      });
    });

    it("should confirm without any email when a phone match carries none", async () => {
      // Arrange
      mockLookupUser.mockResolvedValue({ id: "user-9", name: "Ada" });
      await search("+33612345678");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("search-result:send"));
      });

      // Assert
      expect(mockReplace).toHaveBeenCalledWith("FriendRequestConfirmation", {
        recipientName: "Ada",
        recipientEmail: undefined,
        autoAccepted: false,
      });
    });

    it("should report an auto accepted friendship when the API says so", async () => {
      // Arrange
      mockSendFriendRequest.mockResolvedValue({ autoAccepted: true });
      await search("ada@example.com");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("search-result:send"));
      });

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(
        "FriendRequestConfirmation",
        expect.objectContaining({ autoAccepted: true }),
      );
    });

    it("should treat an empty API response as a pending request", async () => {
      // Arrange
      mockSendFriendRequest.mockResolvedValue(undefined);
      await search("ada@example.com");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("search-result:send"));
      });

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(
        "FriendRequestConfirmation",
        expect.objectContaining({ autoAccepted: false }),
      );
    });

    it("should flag the sending state while the request is in flight", async () => {
      // Arrange
      let release: (value: unknown) => void = () => {};
      mockSendFriendRequest.mockReturnValue(new Promise((r) => { release = r; }));
      await search("ada@example.com");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("search-result:send"));
      });

      // Assert
      expect(screen.getByTestId("search-result:sending")).toHaveTextContent("true");
      await act(async () => { release({}); });
      expect(screen.getByTestId("search-result:sending")).toHaveTextContent("false");
    });

    it("should report the parsed failure when the request is rejected", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Demande déjà envoyée");
      mockSendFriendRequest.mockRejectedValue(new Error("409"));
      await search("ada@example.com");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("search-result:send"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "Demande déjà envoyée");
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should fall back to a generic message when the failure cannot be parsed", async () => {
      // Arrange
      mockSendFriendRequest.mockRejectedValue(new Error("boom"));
      await search("ada@example.com");

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("search-result:send"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "addFriend.errorDefault");
    });
  });

  describe("envoi depuis une suggestion", () => {
    beforeEach(() => {
      mockSuggestions = [{ id: "s1", name: "Alan Turing", email: "alan@example.com" }];
      screen.rerender(<AddFriendScreen />);
    });

    it("should send the request to the suggested email even though nothing was typed", async () => {
      // Arrange & Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("suggestion:s1:send"));
      });

      // Assert
      expect(mockSendFriendRequest).toHaveBeenCalledWith({ recipientEmail: "alan@example.com" });
      expect(mockReplace).toHaveBeenCalledWith("FriendRequestConfirmation", {
        recipientName: "Alan Turing",
        recipientEmail: "alan@example.com",
        autoAccepted: false,
      });
    });

    it("should open the profile of the suggested user", () => {
      // Arrange & Act
      fireEvent.press(screen.getByTestId("suggestion:s1:profile"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("FriendProfile", {
        friendId: "s1",
        friendName: "Alan Turing",
      });
    });
  });

  describe("historique de recherche", () => {
    beforeEach(() => {
      mockHistory = ["ada@example.com"];
      screen.rerender(<AddFriendScreen />);
    });

    it("should replay a history entry as a new search and close the history", async () => {
      // Arrange & Act
      fireEvent.press(screen.getByTestId("search-bar:history:ada@example.com"));
      await act(async () => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      // Assert
      expect(mockLookupUser).toHaveBeenCalledWith({ email: "ada@example.com" });
      expect(screen.getByTestId("search-bar:focused")).toHaveTextContent("false");
    });

    it("should forward the removal of a single history entry", () => {
      // Arrange & Act
      fireEvent.press(screen.getByTestId("search-bar:history:ada@example.com:remove"));

      // Assert
      expect(mockRemoveFromHistory).toHaveBeenCalledWith("ada@example.com");
    });

    it("should forward the clearing of the whole history", () => {
      // Arrange & Act
      fireEvent.press(screen.getByTestId("search-bar:clear-history"));

      // Assert
      expect(mockClearHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe("clavier", () => {
    it("should track the focus state of the search bar", () => {
      // Arrange & Act
      fireEvent(screen.getByTestId("search-bar:input"), "focus");

      // Assert
      expect(screen.getByTestId("search-bar:focused")).toHaveTextContent("true");

      // Act
      fireEvent(screen.getByTestId("search-bar:input"), "blur");

      // Assert
      expect(screen.getByTestId("search-bar:focused")).toHaveTextContent("false");
    });

    it("should dismiss the keyboard and unfocus the search bar when the background is tapped", () => {
      // Arrange
      const dismiss = jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
      fireEvent(screen.getByTestId("search-bar:input"), "focus");

      // Act
      fireEvent.press(screen.getByText("addFriend.title"));

      // Assert
      expect(dismiss).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("search-bar:focused")).toHaveTextContent("false");
    });
  });

  describe("navigation", () => {
    it("should go back when the back button is pressed", () => {
      // Arrange & Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
