import "./support/screenMocks";

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import InvitationScreen from "../InvitationScreen";
import { isRefreshing, pullToRefresh } from "./support/nativeQueries";

jest.mock("react-i18next", () => ({
  // Les onglets passent un `count` : on le concatène pour rendre l'assertion
  // sensible au compteur réellement transmis.
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options && "count" in options ? `${key}:${options.count}` : key,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: () => ({ colors: jest.requireActual("../../contexts/ThemeContext").lightColors }),
}));

jest.mock("../../contexts/NetworkContext", () => ({
  useNetwork: () => ({ isConnected: mockIsConnected }),
}));

jest.mock("../../hooks/useInvitationManagement", () => ({
  useInvitationManagement: () => mockManagement,
}));

jest.mock("../../components/SkeletonBox", () => {
  const { stubComponent } = require("./support/stubComponent");
  return { __esModule: true, default: stubComponent("skeleton") };
});

jest.mock("../../components/invitations/EmptyState", () => {
  const { stubComponent } = require("./support/stubComponent");
  return { __esModule: true, default: stubComponent("empty-state", { fields: ["tab"] }) };
});

jest.mock("../../components/invitations/DeclineModal", () => {
  const { stubComponent } = require("./support/stubComponent");
  return {
    __esModule: true,
    default: stubComponent("decline-modal", {
      fields: ["visible", "declining", "declineReason"],
      callbacks: ["onConfirm", "onCancel"],
    }),
  };
});

jest.mock("../../components/invitations/AcceptedToast", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const AcceptedToast = ({ toastTrip, onView }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: "accepted-toast" },
      React.createElement(Text, { testID: "accepted-toast:trip" }, String(toastTrip?.id)),
      React.createElement(
        TouchableOpacity,
        { testID: "accepted-toast:onView", onPress: () => onView("trip-toast") },
        React.createElement(Text, null, "view"),
      ),
    );
  return { __esModule: true, default: AcceptedToast };
});

jest.mock("../../components/invitations/InvitationDetailView", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const InvitationDetailView = ({
    invitation,
    loading,
    responding,
    onBack,
    onAccept,
    onDecline,
    onNavigateToTrip,
    onNavigateBack,
  }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: "detail-view" },
      React.createElement(
        Text,
        { testID: "detail-view:state" },
        `${invitation?.token ?? "none"}/${loading ? "loading" : "loaded"}/${responding ? "responding" : "idle"}`,
      ),
      ...["onBack", "onAccept", "onDecline", "onNavigateBack"].map((name) =>
        React.createElement(
          TouchableOpacity,
          {
            key: name,
            testID: `detail-view:${name}`,
            onPress: { onBack, onAccept, onDecline, onNavigateBack }[name],
          },
          React.createElement(Text, null, name),
        ),
      ),
      React.createElement(
        TouchableOpacity,
        { testID: "detail-view:onNavigateToTrip", onPress: () => onNavigateToTrip("trip-detail") },
        React.createElement(Text, null, "toTrip"),
      ),
    );
  return { __esModule: true, default: InvitationDetailView };
});

jest.mock("../../components/invitations/InvitationCard", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const InvitationCard = ({
    invitation,
    expanded,
    accepting,
    disabled,
    onAccept,
    onDecline,
    onDetail,
    onViewTrip,
  }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: `card:${invitation.token}` },
      React.createElement(
        Text,
        { testID: `card:${invitation.token}:state` },
        `${expanded ? "expanded" : "collapsed"}/${accepting ? "accepting" : "idle"}/${disabled ? "offline" : "online"}`,
      ),
      ...["onAccept", "onDecline", "onDetail", "onViewTrip"].map((name) =>
        React.createElement(
          TouchableOpacity,
          {
            key: name,
            testID: `card:${invitation.token}:${name}`,
            onPress: { onAccept, onDecline, onDetail, onViewTrip }[name],
          },
          React.createElement(Text, null, name),
        ),
      ),
    );
  return { __esModule: true, default: InvitationCard };
});

jest.mock("../../components/invitations/SentCard", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const SentCard = ({ invitation, disabled, onViewTrip, onCancel }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: `sent:${invitation.token ?? invitation.id}` },
      React.createElement(
        Text,
        { testID: `sent:${invitation.token ?? invitation.id}:state` },
        disabled ? "offline" : "online",
      ),
      React.createElement(
        TouchableOpacity,
        { testID: `sent:${invitation.token ?? invitation.id}:onViewTrip`, onPress: onViewTrip },
        React.createElement(Text, null, "view"),
      ),
      React.createElement(
        TouchableOpacity,
        { testID: `sent:${invitation.token ?? invitation.id}:onCancel`, onPress: onCancel },
        React.createElement(Text, null, "cancel"),
      ),
    );
  return { __esModule: true, default: SentCard };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

const setCurrentToken = jest.fn();
const setTab = jest.fn();
const setDeclineTarget = jest.fn();
const setDeclineReason = jest.fn();
const onRefresh = jest.fn();
const handleAccept = jest.fn();
const openDecline = jest.fn();
const confirmDecline = jest.fn();
const handleCancelInvitation = jest.fn();
const handleAcceptSingle = jest.fn();
const handleDeclineSingle = jest.fn();

let mockIsConnected = true;
let mockManagement: Record<string, unknown>;

const makeInvitation = (overrides: Record<string, unknown> = {}) => ({
  token: "tok-1",
  ...overrides,
});

/** Réarme l'état du hook de gestion ; à appeler dans chaque `beforeEach`. */
const setManagement = (overrides: Record<string, unknown> = {}) => {
  mockManagement = {
    invitation: null,
    loading: false,
    currentToken: undefined,
    setCurrentToken,
    initialToken: undefined,
    responding: false,
    invitations: [],
    sentInvitations: [],
    refreshing: false,
    tab: "all",
    setTab,
    pending: [],
    displayed: [],
    declineTarget: null,
    setDeclineTarget,
    declineReason: "",
    setDeclineReason,
    declining: false,
    acceptingId: null,
    toastAnim: { current: 0 },
    toastTrip: null,
    onRefresh,
    handleAccept,
    openDecline,
    confirmDecline,
    handleCancelInvitation,
    handleAcceptSingle,
    handleDeclineSingle,
    ...overrides,
  };
};

const renderScreen = (overrides: Record<string, unknown> = {}) => {
  setManagement(overrides);
  render(<InvitationScreen />);
};

describe("InvitationScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsConnected = true;
    setManagement();
  });

  describe("mode lien profond", () => {
    it("should render the invitation detail instead of the list when a token is selected", () => {
      // Arrange & Act
      renderScreen({ currentToken: "tok-1", invitation: makeInvitation(), loading: true, responding: true });

      // Assert
      expect(screen.getByTestId("detail-view:state")).toHaveTextContent("tok-1/loading/responding");
      expect(screen.queryByText("invitation.myInvitations")).toBeNull();
    });

    it("should leave the screen when the detail was opened from a deep link", () => {
      // Arrange
      renderScreen({ currentToken: "tok-1", initialToken: "tok-1" });

      // Act
      fireEvent.press(screen.getByTestId("detail-view:onBack"));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(setCurrentToken).not.toHaveBeenCalled();
    });

    it("should return to the list when the detail was opened from the list itself", () => {
      // Arrange
      renderScreen({ currentToken: "tok-1", initialToken: undefined });

      // Act
      fireEvent.press(screen.getByTestId("detail-view:onBack"));

      // Assert
      expect(setCurrentToken).toHaveBeenCalledWith(undefined);
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it("should delegate the acceptance of the displayed invitation to the hook", () => {
      // Arrange
      renderScreen({ currentToken: "tok-1" });

      // Act
      fireEvent.press(screen.getByTestId("detail-view:onAccept"));

      // Assert
      expect(handleAcceptSingle).toHaveBeenCalledTimes(1);
    });

    it("should delegate the refusal of the displayed invitation to the hook", () => {
      // Arrange
      renderScreen({ currentToken: "tok-1" });

      // Act
      fireEvent.press(screen.getByTestId("detail-view:onDecline"));

      // Assert
      expect(handleDeclineSingle).toHaveBeenCalledTimes(1);
    });

    it("should open the trip when the detail links to it", () => {
      // Arrange
      renderScreen({ currentToken: "tok-1" });

      // Act
      fireEvent.press(screen.getByTestId("detail-view:onNavigateToTrip"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripDetails", { tripId: "trip-detail" });
    });

    it("should go back when the detail asks to close the screen", () => {
      // Arrange
      renderScreen({ currentToken: "tok-1" });

      // Act
      fireEvent.press(screen.getByTestId("detail-view:onNavigateBack"));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("onglets", () => {
    it("should label each tab with the size of the list it shows", () => {
      // Arrange & Act
      renderScreen({
        invitations: [makeInvitation(), makeInvitation({ token: "tok-2" })],
        pending: [makeInvitation()],
        sentInvitations: [makeInvitation(), makeInvitation(), makeInvitation()],
      });

      // Assert
      expect(screen.getByText("invitation.tabAll:2")).toBeTruthy();
      expect(screen.getByText("invitation.tabPending:1")).toBeTruthy();
      expect(screen.getByText("invitation.tabSent:3")).toBeTruthy();
    });

    it.each([
      ["invitation.tabAll:0", "all"],
      ["invitation.tabPending:0", "pending"],
      ["invitation.tabSent:0", "sent"],
    ])("should select the %s tab when it is pressed", (label, key) => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByText(label));

      // Assert
      expect(setTab).toHaveBeenCalledWith(key);
    });
  });

  describe("chargement", () => {
    it("should show a skeleton placeholder instead of the list while loading", () => {
      // Arrange & Act
      renderScreen({ loading: true });

      // Assert — quatre cartes de six blocs.
      expect(screen.getAllByTestId("skeleton")).toHaveLength(24);
      expect(screen.queryByTestId("empty-state")).toBeNull();
    });
  });

  describe("liste vide", () => {
    it("should show the empty state of the active tab when nothing is displayed", () => {
      // Arrange & Act
      renderScreen({ tab: "pending", displayed: [] });

      // Assert
      expect(screen.getByTestId("empty-state:tab")).toHaveTextContent("pending");
    });
  });

  describe("invitations reçues", () => {
    it("should collapse the cards on the all tab", () => {
      // Arrange & Act
      renderScreen({ tab: "all", displayed: [makeInvitation()] });

      // Assert
      expect(screen.getByTestId("card:tok-1:state")).toHaveTextContent("collapsed/idle/online");
    });

    it("should expand the cards on the pending tab", () => {
      // Arrange & Act
      renderScreen({ tab: "pending", displayed: [makeInvitation()] });

      // Assert
      expect(screen.getByTestId("card:tok-1:state")).toHaveTextContent("expanded/idle/online");
    });

    it("should flag the card being accepted", () => {
      // Arrange & Act
      renderScreen({ displayed: [makeInvitation()], acceptingId: "tok-1" });

      // Assert
      expect(screen.getByTestId("card:tok-1:state")).toHaveTextContent("collapsed/accepting/online");
    });

    it("should disable the cards while the device is offline", () => {
      // Arrange
      mockIsConnected = false;

      // Act
      renderScreen({ displayed: [makeInvitation()] });

      // Assert
      expect(screen.getByTestId("card:tok-1:state")).toHaveTextContent("collapsed/idle/offline");
    });

    it("should delegate the acceptance to the hook with the whole invitation", () => {
      // Arrange
      const invitation = makeInvitation();
      renderScreen({ displayed: [invitation] });

      // Act
      fireEvent.press(screen.getByTestId("card:tok-1:onAccept"));

      // Assert
      expect(handleAccept).toHaveBeenCalledWith(invitation);
    });

    it("should open the decline modal for the invitation being refused", () => {
      // Arrange
      const invitation = makeInvitation();
      renderScreen({ displayed: [invitation] });

      // Act
      fireEvent.press(screen.getByTestId("card:tok-1:onDecline"));

      // Assert
      expect(openDecline).toHaveBeenCalledWith(invitation);
    });

    it("should open the public trip view when the invitation carries a trip id", () => {
      // Arrange
      renderScreen({ displayed: [makeInvitation({ tripId: "trip-1" })] });

      // Act
      fireEvent.press(screen.getByTestId("card:tok-1:onDetail"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripPublicView", {
        tripId: "trip-1",
        invitationToken: "tok-1",
      });
    });

    it("should read the trip id from the embedded trip when the flat one is missing", () => {
      // Arrange
      renderScreen({ displayed: [makeInvitation({ trip: { _id: "trip-embedded" } })] });

      // Act
      fireEvent.press(screen.getByTestId("card:tok-1:onDetail"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripPublicView", {
        tripId: "trip-embedded",
        invitationToken: "tok-1",
      });
    });

    it("should fall back to the token detail view when no trip is attached", () => {
      // Arrange
      renderScreen({ displayed: [makeInvitation()] });

      // Act
      fireEvent.press(screen.getByTestId("card:tok-1:onDetail"));

      // Assert
      expect(setCurrentToken).toHaveBeenCalledWith("tok-1");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should open the trip details when the card links to the trip", () => {
      // Arrange
      renderScreen({ displayed: [makeInvitation({ tripId: "trip-1" })] });

      // Act
      fireEvent.press(screen.getByTestId("card:tok-1:onViewTrip"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripDetails", { tripId: "trip-1" });
    });

    it("should ignore the trip link when the invitation references no trip", () => {
      // Arrange
      renderScreen({ displayed: [makeInvitation()] });

      // Act
      fireEvent.press(screen.getByTestId("card:tok-1:onViewTrip"));

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should key a card on its database id when it has one", () => {
      // Arrange & Act
      renderScreen({
        displayed: [makeInvitation({ _id: "inv-1" }), makeInvitation({ token: "tok-2" })],
      });

      // Assert
      expect(screen.getAllByTestId(/^card:[^:]+$/)).toHaveLength(2);
    });
  });

  describe("invitations envoyées", () => {
    it("should render sent cards instead of invitation cards on the sent tab", () => {
      // Arrange & Act
      renderScreen({ tab: "sent", displayed: [makeInvitation()] });

      // Assert
      expect(screen.getByTestId("sent:tok-1")).toBeTruthy();
      expect(screen.queryByTestId("card:tok-1")).toBeNull();
    });

    it("should disable the sent cards while the device is offline", () => {
      // Arrange
      mockIsConnected = false;

      // Act
      renderScreen({ tab: "sent", displayed: [makeInvitation()] });

      // Assert
      expect(screen.getByTestId("sent:tok-1:state")).toHaveTextContent("offline");
    });

    it("should open the trip details when a sent card links to its trip", () => {
      // Arrange
      renderScreen({ tab: "sent", displayed: [makeInvitation({ tripId: "trip-1" })] });

      // Act
      fireEvent.press(screen.getByTestId("sent:tok-1:onViewTrip"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripDetails", { tripId: "trip-1" });
    });

    it("should read the trip id of a sent card from the embedded trip", () => {
      // Arrange
      renderScreen({ tab: "sent", displayed: [makeInvitation({ trip: { _id: "trip-embedded" } })] });

      // Act
      fireEvent.press(screen.getByTestId("sent:tok-1:onViewTrip"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripDetails", { tripId: "trip-embedded" });
    });

    it("should ignore the trip link of a sent card that references no trip", () => {
      // Arrange
      renderScreen({ tab: "sent", displayed: [makeInvitation()] });

      // Act
      fireEvent.press(screen.getByTestId("sent:tok-1:onViewTrip"));

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should delegate the cancellation to the hook with the whole invitation", () => {
      // Arrange
      const invitation = makeInvitation();
      renderScreen({ tab: "sent", displayed: [invitation] });

      // Act
      fireEvent.press(screen.getByTestId("sent:tok-1:onCancel"));

      // Assert
      expect(handleCancelInvitation).toHaveBeenCalledWith(invitation);
    });

    it("should key a sent card on its plain id when it has neither database id nor token", () => {
      // Arrange & Act
      renderScreen({ tab: "sent", displayed: [{ id: "legacy-1" }] });

      // Assert
      expect(screen.getByTestId("sent:legacy-1")).toBeTruthy();
    });
  });

  describe("modale de refus", () => {
    it("should keep the modal closed while no invitation is being refused", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(screen.getByTestId("decline-modal:visible")).toHaveTextContent("false");
    });

    it("should open the modal as soon as an invitation is targeted", () => {
      // Arrange & Act
      renderScreen({ declineTarget: makeInvitation(), declineReason: "trop loin", declining: true });

      // Assert
      expect(screen.getByTestId("decline-modal:visible")).toHaveTextContent("true");
      expect(screen.getByTestId("decline-modal:declineReason")).toHaveTextContent("trop loin");
      expect(screen.getByTestId("decline-modal:declining")).toHaveTextContent("true");
    });

    it("should delegate the confirmation to the hook", () => {
      // Arrange
      renderScreen({ declineTarget: makeInvitation() });

      // Act
      fireEvent.press(screen.getByTestId("decline-modal:onConfirm"));

      // Assert
      expect(confirmDecline).toHaveBeenCalledTimes(1);
    });

    it("should clear the target when the modal is dismissed", () => {
      // Arrange
      renderScreen({ declineTarget: makeInvitation() });

      // Act
      fireEvent.press(screen.getByTestId("decline-modal:onCancel"));

      // Assert
      expect(setDeclineTarget).toHaveBeenCalledWith(null);
    });
  });

  describe("toast d'acceptation", () => {
    it("should open the joined trip from the toast", () => {
      // Arrange
      renderScreen({ toastTrip: { id: "trip-toast" } });

      // Act
      fireEvent.press(screen.getByTestId("accepted-toast:onView"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripDetails", { tripId: "trip-toast" });
    });
  });

  describe("rafraîchissement manuel", () => {
    it("should delegate the pull to refresh to the hook", async () => {
      // Arrange
      renderScreen();

      // Act
      await pullToRefresh();

      // Assert
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it("should reflect the refreshing state exposed by the hook", () => {
      // Arrange & Act
      renderScreen({ refreshing: true });

      // Assert
      expect(isRefreshing()).toBe(true);
    });
  });

  describe("navigation", () => {
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
