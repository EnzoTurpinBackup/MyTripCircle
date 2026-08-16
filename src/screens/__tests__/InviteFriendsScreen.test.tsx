import "./support/screenMocks";

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import InviteFriendsScreen from "../InviteFriendsScreen";
import { hasActivityIndicator } from "./support/nativeQueries";
import { freezeClockAt, restoreClock } from "../../components/invitations/__tests__/frozenClock";

// L'écran affiche le nombre de jours restant avant l'expiration du lien : sans
// horloge figée, le libellé changerait d'un jour à l'autre.
const NOW = new Date("2026-06-15T12:00:00.000Z");

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join("|")}` : key,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { tripId: mockTripId } }),
}));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: () => ({ colors: jest.requireActual("../../contexts/ThemeContext").lightColors }),
}));

jest.mock("../../contexts/NetworkContext", () => ({
  useNetwork: () => ({ isConnected: mockIsConnected }),
}));

jest.mock("../../hooks/useInviteFriends", () => ({
  useInviteFriends: (...args: unknown[]) => {
    mockUseInviteFriends(...args);
    return mockState;
  },
}));

jest.mock("../../components/SkeletonBox", () => {
  const { stubComponent } = require("./support/stubComponent");
  return { __esModule: true, default: stubComponent("skeleton") };
});

jest.mock("../../components/inviteFriends/MemberRow", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  const MemberRow = ({ member, isOwner, onPress }: Record<string, any>) =>
    React.createElement(
      TouchableOpacity,
      { testID: `member:${member.userId}`, onPress: () => onPress(member) },
      React.createElement(Text, null, `${member.name}/${isOwner ? "owner" : "guest"}`),
    );
  return { __esModule: true, default: MemberRow };
});

jest.mock("../../components/inviteFriends/PendingRow", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  const PendingRow = ({ invitation, friends, onCancel }: Record<string, any>) =>
    React.createElement(
      TouchableOpacity,
      {
        testID: `pending:${invitation._id || invitation.id}`,
        onPress: () => onCancel(invitation),
      },
      React.createElement(Text, null, `${invitation.inviteeEmail}/${friends.length}`),
    );
  return { __esModule: true, default: PendingRow };
});

jest.mock("../../components/inviteFriends/MemberActionSheet", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const MemberActionSheet = ({
    member,
    isOwner,
    onClose,
    onViewProfile,
    onTransfer,
    onRemove,
  }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: "member-sheet" },
      React.createElement(
        Text,
        { testID: "member-sheet:state" },
        `${member.userId}/${isOwner ? "owner" : "guest"}`,
      ),
      ...["onClose", "onViewProfile", "onTransfer", "onRemove"].map((name) =>
        React.createElement(
          TouchableOpacity,
          {
            key: name,
            testID: `member-sheet:${name}`,
            onPress: { onClose, onViewProfile, onTransfer, onRemove }[name],
          },
          React.createElement(Text, null, name),
        ),
      ),
    );
  return { __esModule: true, default: MemberActionSheet };
});

jest.mock("../../components/inviteFriends/InvitePanelSheet", () => {
  const React = require("react");
  const { Text, TextInput, TouchableOpacity, View } = require("react-native");
  const InvitePanelSheet = ({
    friendsToInvite,
    alreadyMembers,
    invitedFriends,
    emailInput,
    sendingInvitations,
    inviteCount,
    onClose,
    onToggleFriend,
    onChangeEmail,
    onSend,
  }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: "invite-panel" },
      React.createElement(
        Text,
        { testID: "invite-panel:state" },
        [
          friendsToInvite.length,
          alreadyMembers.length,
          invitedFriends.length,
          inviteCount,
          sendingInvitations ? "sending" : "idle",
        ].join("/"),
      ),
      React.createElement(TextInput, {
        testID: "invite-panel:email",
        value: emailInput,
        onChangeText: onChangeEmail,
      }),
      React.createElement(
        TouchableOpacity,
        { testID: "invite-panel:toggle", onPress: () => onToggleFriend("friend-1") },
        React.createElement(Text, null, "toggle"),
      ),
      ...["onClose", "onSend"].map((name) =>
        React.createElement(
          TouchableOpacity,
          { key: name, testID: `invite-panel:${name}`, onPress: { onClose, onSend }[name] },
          React.createElement(Text, null, name),
        ),
      ),
    );
  return { __esModule: true, default: InvitePanelSheet };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockUseInviteFriends = jest.fn();

const openSheet = jest.fn();
const closeSheet = jest.fn();
const openInvitePanel = jest.fn();
const closeInvitePanel = jest.fn();
const handleShareLink = jest.fn();
const handleRenewLink = jest.fn();
const handleCancelInvitation = jest.fn();
const handleRemoveMember = jest.fn();
const handleTransferOwnership = jest.fn();
const handleViewProfile = jest.fn();
const toggleFriend = jest.fn();
const handleSendInvitations = jest.fn();
const setEmailInput = jest.fn();

let mockTripId = "trip-1";
let mockIsConnected = true;
let mockState: Record<string, unknown>;

const makeMember = (overrides: Record<string, unknown> = {}) => ({
  userId: "member-1",
  name: "Ada Lovelace",
  ...overrides,
});

const setState = (overrides: Record<string, unknown> = {}) => {
  mockState = {
    trip: { title: "Road trip en Islande" },
    owner: null,
    activeMembers: [],
    pendingInvitations: [],
    friends: [],
    friendsToInvite: [],
    alreadyMembers: [],
    invitationLink: "https://mytripcircle.app/t/abc",
    linkExpiry: null,
    loading: false,
    actionLoading: false,
    showInvitePanel: false,
    invitedFriends: [],
    emailInput: "",
    setEmailInput,
    sendingInvitations: false,
    inviteCount: 0,
    selectedMember: null,
    isOwner: false,
    backdropAnim: { current: 0 },
    sheetY: { current: 0 },
    inviteAnim: { current: 0 },
    inviteBackdrop: { current: 0 },
    inviteY: { current: 0 },
    openSheet,
    closeSheet,
    openInvitePanel,
    closeInvitePanel,
    handleShareLink,
    handleRenewLink,
    handleCancelInvitation,
    handleRemoveMember,
    handleTransferOwnership,
    handleViewProfile,
    toggleFriend,
    handleSendInvitations,
    ...overrides,
  };
};

const renderScreen = (overrides: Record<string, unknown> = {}) => {
  setState(overrides);
  render(<InviteFriendsScreen />);
};

describe("InviteFriendsScreen", () => {
  beforeEach(() => {
    freezeClockAt(NOW);
    jest.clearAllMocks();
    mockTripId = "trip-1";
    mockIsConnected = true;
    setState();
  });

  afterEach(() => {
    restoreClock();
  });

  describe("chargement", () => {
    it("should show a skeleton placeholder instead of the member list while loading", () => {
      // Arrange & Act
      renderScreen({ loading: true });

      // Assert — cinq blocs d'en-tête puis quatre lignes de quatre blocs.
      expect(screen.getAllByTestId("skeleton")).toHaveLength(21);
      expect(screen.queryByText("inviteFriends.manageMembers")).toBeNull();
    });

    it("should drive the screen from the trip carried by the route", () => {
      // Arrange & Act
      mockTripId = "trip-42";
      renderScreen();

      // Assert
      expect(mockUseInviteFriends).toHaveBeenCalledWith("trip-42");
    });
  });

  describe("en-tête", () => {
    it("should show the trip title above the screen name", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(screen.getByText("Road trip en Islande")).toBeTruthy();
      expect(screen.getByText("inviteFriends.manageMembers")).toBeTruthy();
    });

    it("should show only the screen name when the trip is not loaded yet", () => {
      // Arrange & Act
      renderScreen({ trip: null });

      // Assert
      expect(screen.getByText("inviteFriends.manageMembers")).toBeTruthy();
      expect(screen.queryByText("Road trip en Islande")).toBeNull();
    });

    it("should open the invite panel from the header button", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("inviteFriends.inviteBtn"));

      // Assert
      expect(openInvitePanel).toHaveBeenCalledTimes(1);
    });

    it("should keep the header invite button inert while the device is offline", () => {
      // Arrange
      mockIsConnected = false;
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("inviteFriends.inviteBtn"));

      // Assert
      expect(openInvitePanel).not.toHaveBeenCalled();
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

  describe("lien d'invitation", () => {
    it("should display the generated link and let it be shared", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("inviteFriends.linkShare"));

      // Assert
      expect(screen.getByText("https://mytripcircle.app/t/abc")).toBeTruthy();
      expect(handleShareLink).toHaveBeenCalledTimes(1);
    });

    it("should announce the generation and refuse to share while no link exists", () => {
      // Arrange
      renderScreen({ invitationLink: "" });

      // Act
      fireEvent.press(screen.getByText("inviteFriends.linkShare"));

      // Assert
      expect(screen.getByText("inviteFriends.linkGenerating")).toBeTruthy();
      expect(handleShareLink).not.toHaveBeenCalled();
    });

    it("should refuse to share the link while the device is offline", () => {
      // Arrange
      mockIsConnected = false;
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("inviteFriends.linkShare"));

      // Assert
      expect(handleShareLink).not.toHaveBeenCalled();
    });

    it("should hide the expiry line while no expiry date is known", () => {
      // Arrange & Act
      renderScreen({ linkExpiry: null });

      // Assert
      expect(screen.queryByText(/inviteFriends\.linkExpiry/)).toBeNull();
    });

    it("should count the whole days left before the link expires", () => {
      // Arrange & Act
      renderScreen({ linkExpiry: new Date("2026-06-18T12:00:00.000Z") });

      // Assert
      expect(screen.getByText("inviteFriends.linkExpiry:3")).toBeTruthy();
    });

    it("should round the remaining days up to the next whole day", () => {
      // Arrange & Act
      renderScreen({ linkExpiry: new Date("2026-06-17T06:00:00.000Z") });

      // Assert
      expect(screen.getByText("inviteFriends.linkExpiry:2")).toBeTruthy();
    });

    it("should never count a negative number of days for an expired link", () => {
      // Arrange & Act
      renderScreen({ linkExpiry: new Date("2026-06-01T12:00:00.000Z") });

      // Assert
      expect(screen.getByText("inviteFriends.linkExpiry:0")).toBeTruthy();
    });

    it("should renew the link on demand", () => {
      // Arrange
      renderScreen({ linkExpiry: new Date("2026-06-18T12:00:00.000Z") });

      // Act
      fireEvent.press(screen.getByText("inviteFriends.linkRenew"));

      // Assert
      expect(handleRenewLink).toHaveBeenCalledTimes(1);
    });

    it("should refuse to renew the link while the device is offline", () => {
      // Arrange
      mockIsConnected = false;
      renderScreen({ linkExpiry: new Date("2026-06-18T12:00:00.000Z") });

      // Act
      fireEvent.press(screen.getByText("inviteFriends.linkRenew"));

      // Assert
      expect(handleRenewLink).not.toHaveBeenCalled();
    });
  });

  describe("organisateur et membres", () => {
    it("should hide the organizer section while the owner is unknown", () => {
      // Arrange & Act
      renderScreen({ owner: null });

      // Assert
      expect(screen.queryByText("inviteFriends.sectionOrganizer")).toBeNull();
    });

    it("should show the organizer and open their action sheet", () => {
      // Arrange
      const owner = makeMember({ userId: "owner-1" });
      renderScreen({ owner, isOwner: true });

      // Act
      fireEvent.press(screen.getByTestId("member:owner-1"));

      // Assert
      expect(screen.getByText("inviteFriends.sectionOrganizer")).toBeTruthy();
      expect(openSheet).toHaveBeenCalledWith(owner);
    });

    it("should hide the members section while nobody else joined", () => {
      // Arrange & Act
      renderScreen({ activeMembers: [] });

      // Assert
      expect(screen.queryByText(/inviteFriends\.sectionMembers/)).toBeNull();
    });

    it("should count the active members in the section heading", () => {
      // Arrange & Act
      renderScreen({
        activeMembers: [makeMember(), makeMember({ userId: "member-2", name: "Grace Hopper" })],
      });

      // Assert
      expect(screen.getByText("inviteFriends.sectionMembers:2")).toBeTruthy();
      expect(screen.getByTestId("member:member-1")).toBeTruthy();
      expect(screen.getByTestId("member:member-2")).toBeTruthy();
    });

    it("should open the action sheet of the member that was tapped", () => {
      // Arrange
      const member = makeMember();
      renderScreen({ activeMembers: [member] });

      // Act
      fireEvent.press(screen.getByTestId("member:member-1"));

      // Assert
      expect(openSheet).toHaveBeenCalledWith(member);
    });
  });

  describe("invitations en attente", () => {
    it("should hide the pending section while nothing is pending", () => {
      // Arrange & Act
      renderScreen({ pendingInvitations: [] });

      // Assert
      expect(screen.queryByText(/inviteFriends\.sectionPending/)).toBeNull();
    });

    it("should count the pending invitations in the section heading", () => {
      // Arrange & Act
      renderScreen({
        pendingInvitations: [{ _id: "inv-1", inviteeEmail: "ada@example.com" }],
        friends: [{ id: "u2", email: "ada@example.com" }],
      });

      // Assert
      expect(screen.getByText("inviteFriends.sectionPending:1")).toBeTruthy();
      expect(screen.getByText("ada@example.com/1")).toBeTruthy();
    });

    it("should key a pending row on its plain id when it has no database id", () => {
      // Arrange & Act
      renderScreen({ pendingInvitations: [{ id: "legacy-1", inviteeEmail: "ada@example.com" }] });

      // Assert
      expect(screen.getByTestId("pending:legacy-1")).toBeTruthy();
    });

    it("should delegate the cancellation to the hook with the whole invitation", () => {
      // Arrange
      const invitation = { _id: "inv-1", inviteeEmail: "ada@example.com" };
      renderScreen({ pendingInvitations: [invitation] });

      // Act
      fireEvent.press(screen.getByTestId("pending:inv-1"));

      // Assert
      expect(handleCancelInvitation).toHaveBeenCalledWith(invitation);
    });
  });

  describe("panneau d'invitation", () => {
    it("should open the invite panel from the dashed button at the bottom", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("inviteFriends.inviteFromFriends"));

      // Assert
      expect(openInvitePanel).toHaveBeenCalledTimes(1);
    });

    it("should keep the panel hidden until it is opened", () => {
      // Arrange & Act
      renderScreen({ showInvitePanel: false });

      // Assert
      expect(screen.queryByTestId("invite-panel")).toBeNull();
    });

    it("should hand the panel the friends that can still be invited", () => {
      // Arrange & Act
      renderScreen({
        showInvitePanel: true,
        friendsToInvite: [{ id: "friend-1" }, { id: "friend-2" }],
        alreadyMembers: [{ id: "friend-3" }],
        invitedFriends: ["friend-1"],
        inviteCount: 1,
        sendingInvitations: true,
      });

      // Assert
      expect(screen.getByTestId("invite-panel:state")).toHaveTextContent("2/1/1/1/sending");
    });

    it("should forward the typed email to the hook", () => {
      // Arrange
      renderScreen({ showInvitePanel: true });

      // Act
      fireEvent.changeText(screen.getByTestId("invite-panel:email"), "ada@example.com");

      // Assert
      expect(setEmailInput).toHaveBeenCalledWith("ada@example.com");
    });

    it("should forward the selection of a friend to the hook", () => {
      // Arrange
      renderScreen({ showInvitePanel: true });

      // Act
      fireEvent.press(screen.getByTestId("invite-panel:toggle"));

      // Assert
      expect(toggleFriend).toHaveBeenCalledWith("friend-1");
    });

    it("should send the invitations when the panel asks for it", () => {
      // Arrange
      renderScreen({ showInvitePanel: true });

      // Act
      fireEvent.press(screen.getByTestId("invite-panel:onSend"));

      // Assert
      expect(handleSendInvitations).toHaveBeenCalledTimes(1);
    });

    it("should close the panel when it is dismissed", () => {
      // Arrange
      renderScreen({ showInvitePanel: true });

      // Act
      fireEvent.press(screen.getByTestId("invite-panel:onClose"));

      // Assert
      expect(closeInvitePanel).toHaveBeenCalledTimes(1);
    });
  });

  describe("feuille d'actions d'un membre", () => {
    it("should keep the sheet hidden while no member is selected", () => {
      // Arrange & Act
      renderScreen({ selectedMember: null });

      // Assert
      expect(screen.queryByTestId("member-sheet")).toBeNull();
    });

    it("should show the sheet of the selected member with the caller privileges", () => {
      // Arrange & Act
      renderScreen({ selectedMember: makeMember(), isOwner: true });

      // Assert
      expect(screen.getByTestId("member-sheet:state")).toHaveTextContent("member-1/owner");
    });

    it.each([
      ["onClose", closeSheet],
      ["onViewProfile", handleViewProfile],
      ["onTransfer", handleTransferOwnership],
      ["onRemove", handleRemoveMember],
    ])("should delegate %s to the hook", (callback, handler) => {
      // Arrange
      renderScreen({ selectedMember: makeMember() });

      // Act
      fireEvent.press(screen.getByTestId(`member-sheet:${callback}`));

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("action en cours", () => {
    it("should not veil the screen while no action is running", () => {
      // Arrange & Act
      renderScreen({ actionLoading: false });

      // Assert
      expect(hasActivityIndicator()).toBe(false);
    });

    it("should veil the screen while an action is running", () => {
      // Arrange & Act
      renderScreen({ actionLoading: true });

      // Assert
      expect(hasActivityIndicator()).toBe(true);
    });
  });
});
