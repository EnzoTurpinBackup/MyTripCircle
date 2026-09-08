import "./support/screenMocks";

import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import NotificationsScreen from "../NotificationsScreen";
import { isRefreshing, pullToRefresh } from "./support/nativeQueries";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: () => ({ colors: jest.requireActual("../../contexts/ThemeContext").lightColors }),
}));

jest.mock("../../contexts/TripsContext", () => ({
  useTrips: () => ({
    getUserInvitations: mockGetUserInvitations,
    respondToInvitation: mockRespondToInvitation,
  }),
}));

jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));

jest.mock("../../contexts/NotificationContext", () => ({
  useNotifications: () => ({
    markAllAsRead: mockMarkAllAsRead,
    markAsRead: mockMarkAsRead,
    readIds: mockReadIds,
  }),
}));

jest.mock("../../utils/i18n", () => ({ parseApiError: (...args: unknown[]) => mockParseApiError(...args) }));

jest.mock("../../components/SkeletonBox", () => {
  const { stubComponent } = require("./support/stubComponent");
  return { __esModule: true, default: stubComponent("skeleton") };
});

jest.mock("../../components/notifications/NotifEmptyState", () => {
  const { stubComponent } = require("./support/stubComponent");
  return { __esModule: true, default: stubComponent("notif-empty") };
});

// La liste est le cœur de l'écran : sa doublure reconstitue une ligne par
// invitation, avec les rappels branchés sur le jeton effectivement transmis.
jest.mock("../../components/notifications/NotifItem", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const NotifItem = ({
    invitation,
    unread,
    responding,
    onPress,
    onAccept,
    onDecline,
  }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: `notif:${invitation.token}` },
      React.createElement(
        Text,
        { testID: `notif:${invitation.token}:state` },
        `${unread ? "unread" : "read"}/${responding ? "responding" : "idle"}`,
      ),
      React.createElement(
        TouchableOpacity,
        { testID: `notif:${invitation.token}:press`, onPress },
        React.createElement(Text, null, "press"),
      ),
      React.createElement(
        TouchableOpacity,
        { testID: `notif:${invitation.token}:accept`, onPress: onAccept },
        React.createElement(Text, null, "accept"),
      ),
      React.createElement(
        TouchableOpacity,
        { testID: `notif:${invitation.token}:decline`, onPress: onDecline },
        React.createElement(Text, null, "decline"),
      ),
    );
  return { __esModule: true, default: NotifItem };
});

const mockGoBack = jest.fn();
const mockGetUserInvitations = jest.fn();
const mockRespondToInvitation = jest.fn();
const mockMarkAllAsRead = jest.fn();
const mockMarkAsRead = jest.fn();
const mockParseApiError = jest.fn();

// Lus à chaque rendu par les doublures de contexte : les tests les réassignent.
let mockUser: Record<string, unknown> | null = null;
let mockReadIds = new Set<string>();

type AlertButton = { text?: string; style?: string; onPress?: () => void | Promise<void> };

const makeInvitation = (overrides: Record<string, unknown> = {}) => ({
  _id: undefined,
  token: "tok-1",
  status: "pending",
  createdAt: "2026-03-01T10:00:00.000Z",
  ...overrides,
});

/** Monte l'écran et laisse le premier chargement se résoudre. */
const renderScreen = async () => {
  render(<NotificationsScreen />);
  await act(async () => {});
};

const lastAlertButtons = (alert: jest.SpyInstance): AlertButton[] =>
  (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];

describe("NotificationsScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockUser = { id: "u1", email: "ada@example.com" };
    mockReadIds = new Set<string>();
    mockGetUserInvitations.mockResolvedValue([]);
    mockRespondToInvitation.mockResolvedValue(true);
    mockParseApiError.mockReturnValue("");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("chargement", () => {
    it("should show a skeleton placeholder while the invitations are being fetched", async () => {
      // Arrange
      let release: (value: unknown[]) => void = () => {};
      mockGetUserInvitations.mockReturnValue(new Promise((r) => { release = r; }));

      // Act
      render(<NotificationsScreen />);

      // Assert — cinq lignes de cinq blocs.
      expect(screen.getAllByTestId("skeleton")).toHaveLength(25);
      expect(screen.queryByTestId("notif-empty")).toBeNull();
      await act(async () => { release([]); });
    });

    it("should replace the skeleton by the list once the fetch resolves", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.queryByTestId("skeleton")).toBeNull();
      expect(screen.getByTestId("notif-empty")).toBeTruthy();
    });

    it("should request the invitations addressed to the signed in email", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(mockGetUserInvitations).toHaveBeenCalledWith("ada@example.com");
    });

    it("should skip the fetch entirely when no email is known", async () => {
      // Arrange
      mockUser = { id: "u1" };

      // Act
      await renderScreen();

      // Assert
      expect(mockGetUserInvitations).not.toHaveBeenCalled();
      expect(screen.getByTestId("notif-empty")).toBeTruthy();
    });

    it("should skip the fetch when nobody is signed in", async () => {
      // Arrange
      mockUser = null;

      // Act
      await renderScreen();

      // Assert
      expect(mockGetUserInvitations).not.toHaveBeenCalled();
    });

    it("should show an empty list and log the failure when the fetch rejects", async () => {
      // Arrange
      const error = new Error("réseau indisponible");
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
      mockGetUserInvitations.mockRejectedValue(error);
      // Le rejet se propage au rendu suivant : `renderScreen` le laisse aboutir.

      // Act
      await renderScreen();

      // Assert
      expect(consoleError).toHaveBeenCalledWith("NotificationsScreen load error:", error);
      expect(screen.getByTestId("notif-empty")).toBeTruthy();
    });
  });

  describe("tri des invitations", () => {
    it("should list pending invitations before accepted and declined ones", async () => {
      // Arrange
      mockGetUserInvitations.mockResolvedValue([
        makeInvitation({ token: "declined", status: "declined" }),
        makeInvitation({ token: "accepted", status: "accepted" }),
        makeInvitation({ token: "pending", status: "pending" }),
      ]);

      // Act
      await renderScreen();

      // Assert
      expect(screen.getAllByTestId(/^notif:[^:]+$/).map((n) => n.props.testID)).toEqual([
        "notif:pending",
        "notif:accepted",
        "notif:declined",
      ]);
    });

    it("should push invitations with an unknown status to the end of the list", async () => {
      // Arrange
      mockGetUserInvitations.mockResolvedValue([
        makeInvitation({ token: "cancelled", status: "cancelled" }),
        makeInvitation({ token: "declined", status: "declined" }),
      ]);

      // Act
      await renderScreen();

      // Assert
      expect(screen.getAllByTestId(/^notif:[^:]+$/).map((n) => n.props.testID)).toEqual([
        "notif:declined",
        "notif:cancelled",
      ]);
    });

    it("should fall back to the creation date when both statuses are unknown", async () => {
      // Arrange
      mockGetUserInvitations.mockResolvedValue([
        makeInvitation({ token: "expired", status: "expired", createdAt: "2026-03-01T10:00:00.000Z" }),
        makeInvitation({ token: "cancelled", status: "cancelled", createdAt: "2026-03-05T10:00:00.000Z" }),
      ]);

      // Act
      await renderScreen();

      // Assert
      expect(screen.getAllByTestId(/^notif:[^:]+$/).map((n) => n.props.testID)).toEqual([
        "notif:cancelled",
        "notif:expired",
      ]);
    });

    it("should sort invitations sharing a status by descending creation date", async () => {
      // Arrange
      mockGetUserInvitations.mockResolvedValue([
        makeInvitation({ token: "older", createdAt: "2026-03-01T10:00:00.000Z" }),
        makeInvitation({ token: "newer", createdAt: "2026-03-05T10:00:00.000Z" }),
      ]);

      // Act
      await renderScreen();

      // Assert
      expect(screen.getAllByTestId(/^notif:[^:]+$/).map((n) => n.props.testID)).toEqual([
        "notif:newer",
        "notif:older",
      ]);
    });
  });

  describe("état lu / non lu", () => {
    it("should mark a pending invitation as unread when its id is not in the read set", async () => {
      // Arrange
      mockGetUserInvitations.mockResolvedValue([makeInvitation()]);

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByTestId("notif:tok-1:state")).toHaveTextContent("unread/idle");
    });

    it("should mark a pending invitation as read when its id is in the read set", async () => {
      // Arrange
      mockReadIds = new Set(["tok-1"]);
      mockGetUserInvitations.mockResolvedValue([makeInvitation()]);

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByTestId("notif:tok-1:state")).toHaveTextContent("read/idle");
    });

    it("should never mark an already answered invitation as unread", async () => {
      // Arrange
      mockGetUserInvitations.mockResolvedValue([makeInvitation({ status: "accepted" })]);

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByTestId("notif:tok-1:state")).toHaveTextContent("read/idle");
    });

    it("should key the read state on the database id when the invitation carries one", async () => {
      // Arrange
      mockReadIds = new Set(["inv-1"]);
      mockGetUserInvitations.mockResolvedValue([makeInvitation({ _id: "inv-1" })]);

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByTestId("notif:tok-1:state")).toHaveTextContent("read/idle");
    });

    it("should mark a single invitation as read when it is pressed", async () => {
      // Arrange
      mockGetUserInvitations.mockResolvedValue([makeInvitation({ _id: "inv-1" })]);
      await renderScreen();

      // Act
      fireEvent.press(screen.getByTestId("notif:tok-1:press"));

      // Assert
      expect(mockMarkAsRead).toHaveBeenCalledWith("inv-1");
    });

    it("should mark every invitation as read when the header action is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("notifications.markAllRead"));

      // Assert
      expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);
    });
  });

  describe("acceptation d'une invitation", () => {
    beforeEach(() => {
      mockGetUserInvitations.mockResolvedValue([makeInvitation()]);
    });

    it("should answer the invitation without asking for confirmation", async () => {
      // Arrange
      await renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("notif:tok-1:accept"));
      });

      // Assert
      expect(mockRespondToInvitation).toHaveBeenCalledWith("tok-1", "accept", "u1");
      expect(alert).not.toHaveBeenCalled();
    });

    it("should mark the invitation as read and refresh the list once accepted", async () => {
      // Arrange
      await renderScreen();
      mockGetUserInvitations.mockClear();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("notif:tok-1:accept"));
      });

      // Assert
      expect(mockMarkAsRead).toHaveBeenCalledWith("tok-1");
      expect(mockGetUserInvitations).toHaveBeenCalledTimes(1);
    });

    it("should flag the invitation as responding while the answer is in flight", async () => {
      // Arrange
      let release: (value: boolean) => void = () => {};
      mockRespondToInvitation.mockReturnValue(new Promise<boolean>((r) => { release = r; }));
      await renderScreen();

      // Act
      fireEvent.press(screen.getByTestId("notif:tok-1:accept"));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("notif:tok-1:state")).toHaveTextContent("unread/responding");
      });
      await act(async () => { release(true); });
      expect(screen.getByTestId("notif:tok-1:state")).toHaveTextContent("unread/idle");
    });

    it("should report an error when the API refuses the answer", async () => {
      // Arrange
      mockRespondToInvitation.mockResolvedValue(false);
      await renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("notif:tok-1:accept"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "notifications.declineError");
      expect(mockMarkAsRead).not.toHaveBeenCalled();
    });

    it("should surface the parsed API message when the answer throws", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Invitation expirée");
      mockRespondToInvitation.mockRejectedValue(new Error("410"));
      await renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("notif:tok-1:accept"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "Invitation expirée");
    });

    it("should fall back to a generic message when the error cannot be parsed", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("");
      mockRespondToInvitation.mockRejectedValue(new Error("boom"));
      await renderScreen();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByTestId("notif:tok-1:accept"));
      });

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "friendInvitation.errorOccurred");
    });
  });

  describe("refus d'une invitation", () => {
    beforeEach(() => {
      mockGetUserInvitations.mockResolvedValue([makeInvitation()]);
    });

    it("should ask for confirmation before declining", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByTestId("notif:tok-1:decline"));

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "notifications.declineConfirmTitle",
        "notifications.declineConfirmMessage",
        expect.any(Array),
      );
      expect(mockRespondToInvitation).not.toHaveBeenCalled();
    });

    it("should leave the invitation untouched when the confirmation is cancelled", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByTestId("notif:tok-1:decline"));

      // Assert
      expect(lastAlertButtons(alert)[0]).toMatchObject({ text: "common.cancel", style: "cancel" });
      expect(lastAlertButtons(alert)[0].onPress).toBeUndefined();
    });

    it("should decline the invitation when the destructive button is confirmed", async () => {
      // Arrange
      await renderScreen();
      fireEvent.press(screen.getByTestId("notif:tok-1:decline"));

      // Act
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });

      // Assert
      expect(mockRespondToInvitation).toHaveBeenCalledWith("tok-1", "decline", "u1");
      expect(mockMarkAsRead).toHaveBeenCalledWith("tok-1");
    });

    it("should answer on behalf of an anonymous user when no id is known", async () => {
      // Arrange
      mockUser = { email: "ada@example.com" };
      await renderScreen();
      fireEvent.press(screen.getByTestId("notif:tok-1:decline"));

      // Act
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });

      // Assert
      expect(mockRespondToInvitation).toHaveBeenCalledWith("tok-1", "decline", undefined);
    });
  });

  describe("rafraîchissement manuel", () => {
    it("should reload the invitations when the list is pulled down", async () => {
      // Arrange
      await renderScreen();
      mockGetUserInvitations.mockClear();

      // Act
      await pullToRefresh();

      // Assert
      expect(mockGetUserInvitations).toHaveBeenCalledTimes(1);
    });

    it("should show then hide the refresh indicator around the reload", async () => {
      // Arrange
      let release: (value: unknown[]) => void = () => {};
      await renderScreen();
      mockGetUserInvitations.mockReturnValue(new Promise((r) => { release = r; }));

      // Act
      await pullToRefresh();

      // Assert
      expect(isRefreshing()).toBe(true);
      await act(async () => { release([]); });
      expect(isRefreshing()).toBe(false);
    });
  });

  describe("navigation", () => {
    it("should go back when the back button is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
