import "./support/screenMocks";

import React from "react";
import { Alert, LayoutAnimation, Share } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import FriendsScreen from "../FriendsScreen";
import type { Friend, FriendRequest, FriendSuggestion } from "../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join("|")}` : key,
  }),
}));

// `useFocusEffect` reçoit un `useCallback` : on le rejoue une fois au montage,
// ce que fait la navigation réelle quand l'écran prend le focus.
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = require("react");
    useEffect(() => {
      effect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  },
}));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: () => ({ colors: jest.requireActual("../../contexts/ThemeContext").lightColors }),
}));

jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("../../contexts/NetworkContext", () => ({
  useNetwork: () => ({ isConnected: mockIsConnected }),
}));
jest.mock("../../contexts/FriendsContext", () => ({ useFriends: () => mockFriendsContext }));

jest.mock("../../services/ApiService", () => ({
  ApiService: { getFriendInviteLink: (...args: unknown[]) => mockGetFriendInviteLink(...args) },
}));

jest.mock("../../utils/i18n", () => ({
  parseApiError: (...args: unknown[]) => mockParseApiError(...args),
}));

jest.mock("../../components/SkeletonBox", () => {
  const { stubComponent } = require("./support/stubComponent");
  return { __esModule: true, default: stubComponent("skeleton") };
});

jest.mock("../../components/friends/FriendsTabBar", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const FriendsTabBar = ({ activeTab, friendsCount, totalPending, onTabChange }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: "tab-bar" },
      React.createElement(
        Text,
        { testID: "tab-bar:state" },
        `${activeTab}/${friendsCount}/${totalPending}`,
      ),
      ...["friends", "requests", "suggestions"].map((tab) =>
        React.createElement(
          TouchableOpacity,
          { key: tab, testID: `tab-bar:${tab}`, onPress: () => onTabChange(tab) },
          React.createElement(Text, null, tab),
        ),
      ),
    );
  return { __esModule: true, default: FriendsTabBar };
});

jest.mock("../../components/friends/FriendsTab", () => {
  const React = require("react");
  const { Text, TextInput, TouchableOpacity, View } = require("react-native");
  const FriendsTab = ({
    friends,
    sharingLink,
    searchQuery,
    onShareInviteLink,
    onSearchChange,
    onFriendPress,
    onFriendLongPress,
  }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: "friends-tab" },
      React.createElement(Text, { testID: "friends-tab:sharing" }, String(sharingLink)),
      React.createElement(TextInput, {
        testID: "friends-tab:search",
        value: searchQuery,
        onChangeText: onSearchChange,
      }),
      React.createElement(
        TouchableOpacity,
        { testID: "friends-tab:share", onPress: onShareInviteLink },
        React.createElement(Text, null, "share"),
      ),
      ...friends.map((friend: any) =>
        React.createElement(
          TouchableOpacity,
          {
            key: friend.id,
            testID: `friends-tab:${friend.id}`,
            onPress: () => onFriendPress(friend.friendId, friend.name),
            onLongPress: () => onFriendLongPress(friend),
          },
          React.createElement(Text, null, friend.name),
        ),
      ),
    );
  return { __esModule: true, default: FriendsTab };
});

jest.mock("../../components/friends/RequestsTab", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const RequestsTab = ({ receivedRequests, sentRequests, onRespond, onCancel }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: "requests-tab" },
      ...receivedRequests.flatMap((request: any) =>
        ["accept", "decline"].map((action) =>
          React.createElement(
            TouchableOpacity,
            {
              key: `${request.id}:${action}`,
              testID: `requests-tab:received:${request.id}:${action}`,
              onPress: () => onRespond(request.id, action),
            },
            React.createElement(Text, null, action),
          ),
        ),
      ),
      ...sentRequests.map((request: any) =>
        React.createElement(
          TouchableOpacity,
          {
            key: request.id,
            testID: `requests-tab:sent:${request.id}`,
            onPress: () => onCancel(request),
          },
          React.createElement(Text, null, "cancel"),
        ),
      ),
    );
  return { __esModule: true, default: RequestsTab };
});

jest.mock("../../components/friends/SuggestionsTab", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const SuggestionsTab = ({ suggestions, sending, onSuggestionPress, onAddSuggestion }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: "suggestions-tab" },
      React.createElement(Text, { testID: "suggestions-tab:sending" }, String(sending)),
      ...suggestions.flatMap((suggestion: any) => [
        React.createElement(
          TouchableOpacity,
          {
            key: `${suggestion.id}:open`,
            testID: `suggestions-tab:${suggestion.id}:open`,
            onPress: () => onSuggestionPress(suggestion.id, suggestion.name),
          },
          React.createElement(Text, null, suggestion.name),
        ),
        React.createElement(
          TouchableOpacity,
          {
            key: `${suggestion.id}:add`,
            testID: `suggestions-tab:${suggestion.id}:add`,
            onPress: () => onAddSuggestion(suggestion),
          },
          React.createElement(Text, null, "add"),
        ),
      ]),
    );
  return { __esModule: true, default: SuggestionsTab };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetFriendInviteLink = jest.fn();
const mockParseApiError = jest.fn();

const sendFriendRequest = jest.fn();
const respondToFriendRequest = jest.fn();
const cancelFriendRequest = jest.fn();
const removeFriend = jest.fn();
const refreshFriendRequests = jest.fn();
const refreshFriends = jest.fn();
const refreshSuggestions = jest.fn();

let mockUser: Record<string, unknown> | null = null;
let mockIsConnected = true;
let mockFriendsContext: Record<string, unknown>;

type AlertButton = { text?: string; style?: string; onPress?: () => void | Promise<void> };

const makeFriend = (overrides: Partial<Friend> = {}): Friend =>
  ({
    id: "f1",
    userId: "u1",
    friendId: "friend-1",
    name: "Ada Lovelace",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }) as Friend;

const makeRequest = (overrides: Partial<FriendRequest> = {}): FriendRequest =>
  ({
    id: "r1",
    senderId: "other",
    senderName: "Grace Hopper",
    status: "pending",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }) as FriendRequest;

const makeSuggestion = (overrides: Partial<FriendSuggestion> = {}): FriendSuggestion => ({
  id: "s1",
  name: "Alan Turing",
  email: "alan@example.com",
  commonFriends: 2,
  ...overrides,
});

const setFriendsContext = (overrides: Record<string, unknown> = {}) => {
  mockFriendsContext = {
    friends: [],
    friendRequests: [],
    suggestions: [],
    loading: false,
    sendFriendRequest,
    respondToFriendRequest,
    cancelFriendRequest,
    removeFriend,
    refreshFriendRequests,
    refreshFriends,
    refreshSuggestions,
    ...overrides,
  };
};

const renderScreen = (overrides: Record<string, unknown> = {}) => {
  setFriendsContext(overrides);
  render(<FriendsScreen />);
};

const lastAlertButtons = (alert: jest.SpyInstance): AlertButton[] =>
  (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];

describe("FriendsScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockUser = { id: "u1" };
    mockIsConnected = true;
    mockParseApiError.mockReturnValue("");
    sendFriendRequest.mockResolvedValue({});
    respondToFriendRequest.mockResolvedValue(undefined);
    cancelFriendRequest.mockResolvedValue(undefined);
    removeFriend.mockResolvedValue(undefined);
    mockGetFriendInviteLink.mockResolvedValue({ link: "https://mytripcircle.app/i/abc" });
    setFriendsContext();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("chargement initial", () => {
    it("should refresh requests, friends and suggestions when the screen gains focus", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(refreshFriendRequests).toHaveBeenCalledTimes(1);
      expect(refreshFriends).toHaveBeenCalledTimes(1);
      expect(refreshSuggestions).toHaveBeenCalledTimes(1);
    });

    it("should show a skeleton placeholder instead of any tab while loading", () => {
      // Arrange & Act
      renderScreen({ loading: true });

      // Assert — cinq lignes de quatre blocs.
      expect(screen.getAllByTestId("skeleton")).toHaveLength(20);
      expect(screen.queryByTestId("friends-tab")).toBeNull();
    });
  });

  describe("navigation entre onglets", () => {
    it("should open the friends tab first", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(screen.getByTestId("friends-tab")).toBeTruthy();
      expect(screen.getByTestId("tab-bar:state")).toHaveTextContent("friends/0/0");
    });

    it("should animate and switch to the requests tab when it is selected", () => {
      // Arrange
      const configureNext = jest.spyOn(LayoutAnimation, "configureNext");
      renderScreen();

      // Act
      fireEvent.press(screen.getByTestId("tab-bar:requests"));

      // Assert
      expect(screen.getByTestId("requests-tab")).toBeTruthy();
      expect(configureNext).toHaveBeenCalledTimes(1);
    });

    it("should switch to the suggestions tab when it is selected", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByTestId("tab-bar:suggestions"));

      // Assert
      expect(screen.getByTestId("suggestions-tab")).toBeTruthy();
      expect(screen.queryByTestId("friends-tab")).toBeNull();
    });

    it("should report the friends count and the pending requests count to the tab bar", () => {
      // Arrange & Act
      renderScreen({
        friends: [makeFriend(), makeFriend({ id: "f2" })],
        friendRequests: [makeRequest(), makeRequest({ id: "r2", senderId: "u1" })],
      });

      // Assert — seules les demandes reçues alimentent la pastille.
      expect(screen.getByTestId("tab-bar:state")).toHaveTextContent("friends/2/1");
    });
  });

  describe("liste d'amis", () => {
    it("should show every friend when the search box is empty", () => {
      // Arrange & Act
      renderScreen({ friends: [makeFriend(), makeFriend({ id: "f2", name: "Grace Hopper" })] });

      // Assert
      expect(screen.getByTestId("friends-tab:f1")).toBeTruthy();
      expect(screen.getByTestId("friends-tab:f2")).toBeTruthy();
    });

    it("should filter the friends on the typed query regardless of case", () => {
      // Arrange
      renderScreen({ friends: [makeFriend(), makeFriend({ id: "f2", name: "Grace Hopper" })] });

      // Act
      fireEvent.changeText(screen.getByTestId("friends-tab:search"), "GRACE");

      // Assert
      expect(screen.getByTestId("friends-tab:f2")).toBeTruthy();
      expect(screen.queryByTestId("friends-tab:f1")).toBeNull();
    });

    it("should show every friend again when the query is only blank characters", () => {
      // Arrange
      renderScreen({ friends: [makeFriend(), makeFriend({ id: "f2", name: "Grace Hopper" })] });

      // Act
      fireEvent.changeText(screen.getByTestId("friends-tab:search"), "   ");

      // Assert
      expect(screen.getByTestId("friends-tab:f1")).toBeTruthy();
      expect(screen.getByTestId("friends-tab:f2")).toBeTruthy();
    });

    it("should open the profile of the friend that was tapped", () => {
      // Arrange
      renderScreen({ friends: [makeFriend()] });

      // Act
      fireEvent.press(screen.getByTestId("friends-tab:f1"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("FriendProfile", {
        friendId: "friend-1",
        friendName: "Ada Lovelace",
      });
    });
  });

  describe("suppression d'un ami", () => {
    const longPressFriend = () => fireEvent(screen.getByTestId("friends-tab:f1"), "longPress");

    it("should ask for confirmation before removing a friend", () => {
      // Arrange
      renderScreen({ friends: [makeFriend()] });

      // Act
      longPressFriend();

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "friends.removeFriend",
        "friends.removeFriendConfirm:Ada Lovelace",
        expect.any(Array),
      );
      expect(removeFriend).not.toHaveBeenCalled();
    });

    it("should remove the friend when the destructive button is confirmed", async () => {
      // Arrange
      renderScreen({ friends: [makeFriend()] });
      longPressFriend();

      // Act
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });

      // Assert
      expect(removeFriend).toHaveBeenCalledWith("friend-1");
    });

    it("should report the failure when the removal is rejected", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Ami introuvable");
      removeFriend.mockRejectedValue(new Error("404"));
      renderScreen({ friends: [makeFriend()] });
      longPressFriend();

      // Act
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "Ami introuvable");
    });

    it("should fall back to a generic message when the removal error cannot be parsed", async () => {
      // Arrange
      removeFriend.mockRejectedValue(new Error("boom"));
      renderScreen({ friends: [makeFriend()] });
      longPressFriend();

      // Act
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "friends.sendError");
    });
  });

  describe("partage du lien d'invitation", () => {
    it("should share the freshly generated invite link", async () => {
      // Arrange
      const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
      renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("friends-tab:share"));
      });

      // Assert
      expect(share).toHaveBeenCalledWith({
        message: "friends.shareMessage:https://mytripcircle.app/i/abc",
        title: "MyTripCircle",
      });
      expect(alert).not.toHaveBeenCalled();
    });

    it("should flag the sharing state while the link is being generated", async () => {
      // Arrange
      jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
      let release: (value: { link: string }) => void = () => {};
      mockGetFriendInviteLink.mockReturnValue(new Promise((r) => { release = r; }));
      renderScreen();

      // Act
      fireEvent.press(screen.getByTestId("friends-tab:share"));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("friends-tab:sharing")).toHaveTextContent("true");
      });
      await act(async () => { release({ link: "https://mytripcircle.app/i/abc" }); });
      expect(screen.getByTestId("friends-tab:sharing")).toHaveTextContent("false");
    });

    it("should stay silent when the user dismisses the native share sheet", async () => {
      // Arrange
      jest.spyOn(Share, "share").mockRejectedValue(new Error("User did not share"));
      renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("friends-tab:share"));
      });

      // Assert
      expect(alert).not.toHaveBeenCalled();
    });

    it("should report the failure when the link cannot be generated", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Service indisponible");
      mockGetFriendInviteLink.mockRejectedValue(new Error("500"));
      renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("friends-tab:share"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "Service indisponible");
    });

    it("should fall back to a generic message when the share error is not an Error instance", async () => {
      // Arrange
      mockGetFriendInviteLink.mockRejectedValue("panne");
      renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("friends-tab:share"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "friends.sendError");
    });
  });

  describe("demandes d'amis", () => {
    const openRequests = () => fireEvent.press(screen.getByTestId("tab-bar:requests"));

    it("should split the pending requests between received and sent", () => {
      // Arrange
      renderScreen({
        friendRequests: [
          makeRequest({ id: "received", senderId: "other" }),
          makeRequest({ id: "sent", senderId: "u1" }),
          makeRequest({ id: "answered", senderId: "other", status: "accepted" }),
        ],
      });

      // Act
      openRequests();

      // Assert
      expect(screen.getByTestId("requests-tab:received:received:accept")).toBeTruthy();
      expect(screen.getByTestId("requests-tab:sent:sent")).toBeTruthy();
      expect(screen.queryByTestId("requests-tab:received:answered:accept")).toBeNull();
    });

    it("should treat every pending request as received when nobody is signed in", () => {
      // Arrange
      mockUser = null;

      // Act
      renderScreen({ friendRequests: [makeRequest({ id: "received", senderId: "u1" })] });
      openRequests();

      // Assert
      expect(screen.getByTestId("requests-tab:received:received:accept")).toBeTruthy();
      expect(screen.queryByTestId("requests-tab:sent:received")).toBeNull();
    });

    it("should confirm the acceptance of a received request", async () => {
      // Arrange
      renderScreen({ friendRequests: [makeRequest()] });
      openRequests();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("requests-tab:received:r1:accept"));
      });

      // Assert
      expect(respondToFriendRequest).toHaveBeenCalledWith("r1", "accept");
      expect(alert).toHaveBeenCalledWith("friends.success", "friends.requestAccepted");
    });

    it("should decline a received request without any confirmation dialog", async () => {
      // Arrange
      renderScreen({ friendRequests: [makeRequest()] });
      openRequests();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("requests-tab:received:r1:decline"));
      });

      // Assert
      expect(respondToFriendRequest).toHaveBeenCalledWith("r1", "decline");
      expect(alert).not.toHaveBeenCalled();
    });

    it("should report the failure when the answer is rejected", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Demande expirée");
      respondToFriendRequest.mockRejectedValue(new Error("410"));
      renderScreen({ friendRequests: [makeRequest()] });
      openRequests();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("requests-tab:received:r1:accept"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "Demande expirée");
    });

    it("should fall back to a generic message when the answer error cannot be parsed", async () => {
      // Arrange
      respondToFriendRequest.mockRejectedValue(new Error("boom"));
      renderScreen({ friendRequests: [makeRequest()] });
      openRequests();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("requests-tab:received:r1:accept"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "friends.sendError");
    });
  });

  describe("annulation d'une demande envoyée", () => {
    const openSentRequest = (request: FriendRequest) => {
      renderScreen({ friendRequests: [request] });
      fireEvent.press(screen.getByTestId("tab-bar:requests"));
      fireEvent.press(screen.getByTestId(`requests-tab:sent:${request.id}`));
    };

    it.each([
      ["the recipient name", { recipientName: "Ada", recipientEmail: "ada@example.com" }, "Ada"],
      ["the recipient email", { recipientEmail: "ada@example.com" }, "ada@example.com"],
      ["the recipient phone", { recipientPhone: "+33600000000" }, "+33600000000"],
    ])("should name the confirmation after %s", (_label, overrides, expected) => {
      // Arrange & Act
      openSentRequest(makeRequest({ senderId: "u1", ...overrides }));

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "friends.cancelRequest",
        `friends.cancelRequestConfirm:${expected}`,
        expect.any(Array),
      );
    });

    it("should name the confirmation after an unknown recipient when none is identified", () => {
      // Arrange & Act
      openSentRequest(makeRequest({ senderId: "u1" }));

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "friends.cancelRequest",
        "friends.cancelRequestConfirm:common.unknown",
        expect.any(Array),
      );
    });

    it("should leave the request untouched when the confirmation is cancelled", () => {
      // Arrange & Act
      openSentRequest(makeRequest({ senderId: "u1" }));

      // Assert
      expect(lastAlertButtons(alert)[0]).toMatchObject({ text: "common.cancel", style: "cancel" });
      expect(cancelFriendRequest).not.toHaveBeenCalled();
    });

    it("should cancel the request when the destructive button is confirmed", async () => {
      // Arrange
      openSentRequest(makeRequest({ senderId: "u1" }));

      // Act
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });

      // Assert
      expect(cancelFriendRequest).toHaveBeenCalledWith("r1");
    });

    it("should report the failure when the cancellation is rejected", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Demande déjà traitée");
      cancelFriendRequest.mockRejectedValue(new Error("409"));
      openSentRequest(makeRequest({ senderId: "u1" }));

      // Act
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "Demande déjà traitée");
    });

    it("should fall back to a generic message when the cancellation error cannot be parsed", async () => {
      // Arrange
      cancelFriendRequest.mockRejectedValue(new Error("boom"));
      openSentRequest(makeRequest({ senderId: "u1" }));

      // Act
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "friends.sendError");
    });
  });

  describe("suggestions", () => {
    const openSuggestions = (suggestions: FriendSuggestion[]) => {
      renderScreen({ suggestions });
      fireEvent.press(screen.getByTestId("tab-bar:suggestions"));
    };

    it("should open the profile of the suggestion that was tapped", () => {
      // Arrange
      openSuggestions([makeSuggestion()]);

      // Act
      fireEvent.press(screen.getByTestId("suggestions-tab:s1:open"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("FriendProfile", {
        friendId: "s1",
        friendName: "Alan Turing",
      });
    });

    it("should confirm a pending request when the suggestion is added", async () => {
      // Arrange
      openSuggestions([makeSuggestion()]);

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("suggestions-tab:s1:add"));
      });

      // Assert
      expect(sendFriendRequest).toHaveBeenCalledWith({ recipientEmail: "alan@example.com" });
      expect(mockNavigate).toHaveBeenCalledWith("FriendRequestConfirmation", {
        recipientName: "Alan Turing",
        recipientEmail: "alan@example.com",
        autoAccepted: false,
      });
    });

    it("should report an auto accepted friendship when the API says so", async () => {
      // Arrange
      sendFriendRequest.mockResolvedValue({ autoAccepted: true });
      openSuggestions([makeSuggestion()]);

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("suggestions-tab:s1:add"));
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        "FriendRequestConfirmation",
        expect.objectContaining({ autoAccepted: true }),
      );
    });

    it("should treat an empty API response as a pending request", async () => {
      // Arrange
      sendFriendRequest.mockResolvedValue(undefined);
      openSuggestions([makeSuggestion()]);

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("suggestions-tab:s1:add"));
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        "FriendRequestConfirmation",
        expect.objectContaining({ autoAccepted: false }),
      );
    });

    it("should flag the sending state while the request is in flight", async () => {
      // Arrange
      let release: (value: unknown) => void = () => {};
      sendFriendRequest.mockReturnValue(new Promise((r) => { release = r; }));
      openSuggestions([makeSuggestion()]);

      // Act
      fireEvent.press(screen.getByTestId("suggestions-tab:s1:add"));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("suggestions-tab:sending")).toHaveTextContent("true");
      });
      await act(async () => { release({}); });
      expect(screen.getByTestId("suggestions-tab:sending")).toHaveTextContent("false");
    });

    it("should report the failure when the suggestion cannot be added", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Déjà amis");
      sendFriendRequest.mockRejectedValue(new Error("409"));
      openSuggestions([makeSuggestion()]);

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("suggestions-tab:s1:add"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "Déjà amis");
    });

    it("should fall back to a generic message when the suggestion error cannot be parsed", async () => {
      // Arrange
      sendFriendRequest.mockRejectedValue(new Error("boom"));
      openSuggestions([makeSuggestion()]);

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("suggestions-tab:s1:add"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "friends.sendError");
    });
  });

  describe("navigation", () => {
    it("should open the add friend screen from the header button", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("+"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("AddFriend");
    });

    it("should keep the add friend button inert while the device is offline", () => {
      // Arrange
      mockIsConnected = false;
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("+"));

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should go back when the back button is pressed", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
