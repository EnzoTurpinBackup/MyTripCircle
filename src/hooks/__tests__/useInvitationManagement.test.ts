import { renderHook, act } from "@testing-library/react-native";
import { Alert, Animated } from "react-native";
import { useInvitationManagement } from "../useInvitationManagement";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const mockRoute: { params: Record<string, unknown> | undefined } = { params: {} };
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useRoute: () => mockRoute,
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockRespondToInvitation = jest.fn();
const mockGetInvitationByToken = jest.fn();
const mockGetUserInvitations = jest.fn();
const mockGetSentInvitations = jest.fn();
const mockCancelInvitation = jest.fn();
jest.mock("../../contexts/TripsContext", () => ({
  useTrips: () => ({
    respondToInvitation: mockRespondToInvitation,
    getInvitationByToken: mockGetInvitationByToken,
    getUserInvitations: mockGetUserInvitations,
    getSentInvitations: mockGetSentInvitations,
    cancelInvitation: mockCancelInvitation,
  }),
}));

let mockUser: { id: string; email: string } | null = null;
jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockMarkAllAsRead = jest.fn();
jest.mock("../../contexts/NotificationContext", () => ({
  useNotifications: () => ({ markAllAsRead: mockMarkAllAsRead }),
}));

jest.mock("../../utils/i18n", () => ({
  parseApiError: (error: unknown) => (error as Error)?.message ?? "",
}));

const USER = { id: "user-1", email: "ana@example.com" };

/** Démarre l'animation du toast sans jamais la terminer, pour observer l'état affiché. */
const toastStart = jest.fn();

/** Récupère les boutons du dernier Alert.alert déclenché. */
function lastAlertButtons() {
  const alertMock = Alert.alert as unknown as jest.Mock;
  return alertMock.mock.calls[alertMock.mock.calls.length - 1][2];
}

/** Monte le hook en mode liste et attend la fin des chargements initiaux. */
async function setupList() {
  mockRoute.params = {};
  const hook = renderHook(() => useInvitationManagement());
  await act(async () => {});
  return hook;
}

/** Monte le hook en mode lien profond et attend la fin du chargement. */
async function setupDeepLink(token = "tok-1") {
  mockRoute.params = { token };
  const hook = renderHook(() => useInvitationManagement());
  await act(async () => {});
  return hook;
}

describe("useInvitationManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = USER;
    mockRoute.params = {};
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest
      .spyOn(Animated, "sequence")
      .mockReturnValue({ start: toastStart } as unknown as Animated.CompositeAnimation);
    mockGetUserInvitations.mockResolvedValue([]);
    mockGetSentInvitations.mockResolvedValue([]);
    mockRespondToInvitation.mockResolvedValue(true);
    mockCancelInvitation.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("list mode loading", () => {
    it("should load the received and the sent invitations of the current user", async () => {
      // Arrange & Act
      const { result } = await setupList();

      // Assert
      expect(mockGetUserInvitations).toHaveBeenCalledWith("ana@example.com");
      expect(mockGetSentInvitations).toHaveBeenCalledWith("user-1");
      expect(result.current.loading).toBe(false);
    });

    it("should mark the notifications as read once the invitations are loaded", async () => {
      // Arrange & Act
      await setupList();

      // Assert
      expect(mockMarkAllAsRead).toHaveBeenCalled();
    });

    it("should sort the received invitations by status then by recency", async () => {
      // Arrange
      mockGetUserInvitations.mockResolvedValue([
        { id: "expired", status: "expired", createdAt: "2026-01-05T00:00:00.000Z" },
        { id: "unknown", status: "archived", createdAt: "2026-01-04T00:00:00.000Z" },
        { id: "pending-old", status: "pending", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "declined", status: "declined", createdAt: "2026-01-03T00:00:00.000Z" },
        { id: "accepted", status: "accepted", createdAt: "2026-01-02T00:00:00.000Z" },
        { id: "pending-new", status: "pending", createdAt: "2026-01-06T00:00:00.000Z" },
      ]);

      // Act
      const { result } = await setupList();

      // Assert
      expect(result.current.invitations.map((i: any) => i.id)).toEqual([
        "pending-new",
        "pending-old",
        "accepted",
        "declined",
        "expired",
        "unknown",
      ]);
    });

    it("should sort the sent invitations from the most recent to the oldest", async () => {
      // Arrange
      mockGetSentInvitations.mockResolvedValue([
        { id: "old", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "new", createdAt: "2026-01-09T00:00:00.000Z" },
      ]);

      // Act
      const { result } = await setupList();

      // Assert
      expect(result.current.sentInvitations.map((i: any) => i.id)).toEqual(["new", "old"]);
    });

    it("should not query the received invitations when the user has no email", async () => {
      // Arrange
      mockUser = { id: "user-1", email: "" };

      // Act
      await setupList();

      // Assert
      expect(mockGetUserInvitations).not.toHaveBeenCalled();
    });

    it("should not query the sent invitations when there is no signed-in user", async () => {
      // Arrange
      mockUser = null;

      // Act
      await setupList();

      // Assert
      expect(mockGetSentInvitations).not.toHaveBeenCalled();
    });

    it("should keep an empty list when the received invitations cannot be loaded", async () => {
      // Arrange
      mockGetUserInvitations.mockRejectedValue(new Error("réseau indisponible"));

      // Act
      const { result } = await setupList();

      // Assert
      expect(result.current.invitations).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it("should keep an empty list when the sent invitations cannot be loaded", async () => {
      // Arrange
      mockGetSentInvitations.mockRejectedValue(new Error("réseau indisponible"));

      // Act
      const { result } = await setupList();

      // Assert
      expect(result.current.sentInvitations).toEqual([]);
    });
  });

  describe("onRefresh", () => {
    it("should reload both lists and clear the refreshing flag", async () => {
      // Arrange
      const { result } = await setupList();
      mockGetUserInvitations.mockClear();
      mockGetSentInvitations.mockClear();

      // Act
      await act(async () => {
        await result.current.onRefresh();
      });

      // Assert
      expect(mockGetUserInvitations).toHaveBeenCalledTimes(1);
      expect(mockGetSentInvitations).toHaveBeenCalledTimes(1);
      expect(result.current.refreshing).toBe(false);
    });
  });

  describe("displayed list", () => {
    it("should display every received invitation on the all tab", async () => {
      // Arrange
      mockGetUserInvitations.mockResolvedValue([
        { id: "a", status: "pending", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "b", status: "accepted", createdAt: "2026-01-02T00:00:00.000Z" },
      ]);

      // Act
      const { result } = await setupList();

      // Assert
      expect(result.current.tab).toBe("all");
      expect(result.current.displayed.map((i: any) => i.id)).toEqual(["a", "b"]);
    });

    it("should display only the pending invitations on the pending tab", async () => {
      // Arrange
      mockGetUserInvitations.mockResolvedValue([
        { id: "a", status: "pending", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "b", status: "accepted", createdAt: "2026-01-02T00:00:00.000Z" },
      ]);
      const { result } = await setupList();

      // Act
      act(() => result.current.setTab("pending"));

      // Assert
      expect(result.current.displayed.map((i: any) => i.id)).toEqual(["a"]);
      expect(result.current.pending.map((i: any) => i.id)).toEqual(["a"]);
    });

    it("should display the sent invitations on the sent tab", async () => {
      // Arrange
      mockGetSentInvitations.mockResolvedValue([
        { id: "s1", createdAt: "2026-01-01T00:00:00.000Z" },
      ]);
      const { result } = await setupList();

      // Act
      act(() => result.current.setTab("sent"));

      // Assert
      expect(result.current.displayed.map((i: any) => i.id)).toEqual(["s1"]);
    });
  });

  describe("handleAccept", () => {
    it("should accept the invitation on behalf of the signed-in user", async () => {
      // Arrange
      const { result } = await setupList();

      // Act
      await act(async () => {
        await result.current.handleAccept({ token: "tok-1", tripName: "Tokyo", tripId: "trip-1" });
      });

      // Assert
      expect(mockRespondToInvitation).toHaveBeenCalledWith("tok-1", "accept", "user-1");
      expect(result.current.acceptingId).toBeNull();
    });

    it("should show a toast naming the trip when the invitation is accepted", async () => {
      // Arrange
      const { result } = await setupList();

      // Act
      await act(async () => {
        await result.current.handleAccept({ token: "tok-1", tripName: "Tokyo", tripId: "trip-1" });
      });

      // Assert
      expect(result.current.toastTrip).toEqual({ name: "Tokyo", id: "trip-1" });
    });

    it("should fall back to the nested trip title and id when the flat fields are missing", async () => {
      // Arrange
      const { result } = await setupList();

      // Act
      await act(async () => {
        await result.current.handleAccept({
          token: "tok-1",
          trip: { title: "Kyoto", _id: "trip-2" },
        });
      });

      // Assert
      expect(result.current.toastTrip).toEqual({ name: "Kyoto", id: "trip-2" });
    });

    it("should fall back to a generic trip label when no name is available", async () => {
      // Arrange
      const { result } = await setupList();

      // Act
      await act(async () => {
        await result.current.handleAccept({ token: "tok-1" });
      });

      // Assert
      expect(result.current.toastTrip).toEqual({
        name: "invitation.thisTripRef",
        id: undefined,
      });
    });

    it("should hide the toast once its animation ends", async () => {
      // Arrange
      const { result } = await setupList();
      await act(async () => {
        await result.current.handleAccept({ token: "tok-1", tripName: "Tokyo", tripId: "trip-1" });
      });

      // Act
      act(() => {
        toastStart.mock.calls[0][0]();
      });

      // Assert
      expect(result.current.toastTrip).toBeNull();
    });

    it("should alert the user when the server refuses the acceptance", async () => {
      // Arrange
      mockRespondToInvitation.mockResolvedValue(false);
      const { result } = await setupList();

      // Act
      await act(async () => {
        await result.current.handleAccept({ token: "tok-1" });
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "invitation.acceptError2");
      expect(result.current.toastTrip).toBeNull();
    });

    it("should surface the parsed error when the acceptance throws", async () => {
      // Arrange
      mockRespondToInvitation.mockRejectedValue(new Error("déjà membre"));
      const { result } = await setupList();

      // Act
      await act(async () => {
        await result.current.handleAccept({ token: "tok-1" });
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "déjà membre");
    });

    it("should fall back to a generic message when the thrown error cannot be parsed", async () => {
      // Arrange
      mockRespondToInvitation.mockRejectedValue(new Error(""));
      const { result } = await setupList();

      // Act
      await act(async () => {
        await result.current.handleAccept({ token: "tok-1" });
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "invitation.unexpectedError");
    });
  });

  describe("decline from the list", () => {
    it("should target the invitation and reset the reason when the modal opens", async () => {
      // Arrange
      const { result } = await setupList();
      act(() => result.current.setDeclineReason("ancienne raison"));

      // Act
      act(() => result.current.openDecline({ token: "tok-1" }));

      // Assert
      expect(result.current.declineTarget).toEqual({ token: "tok-1" });
      expect(result.current.declineReason).toBe("");
    });

    it("should do nothing when confirming without a target", async () => {
      // Arrange
      const { result } = await setupList();

      // Act
      await act(async () => {
        await result.current.confirmDecline();
      });

      // Assert
      expect(mockRespondToInvitation).not.toHaveBeenCalled();
    });

    it("should decline the targeted invitation and close the modal", async () => {
      // Arrange
      const { result } = await setupList();
      act(() => result.current.openDecline({ token: "tok-1" }));

      // Act
      await act(async () => {
        await result.current.confirmDecline();
      });

      // Assert
      expect(mockRespondToInvitation).toHaveBeenCalledWith("tok-1", "decline", "user-1");
      expect(result.current.declineTarget).toBeNull();
      expect(result.current.declining).toBe(false);
    });

    it("should keep the modal open and alert when the server refuses the decline", async () => {
      // Arrange
      mockRespondToInvitation.mockResolvedValue(false);
      const { result } = await setupList();
      act(() => result.current.openDecline({ token: "tok-1" }));

      // Act
      await act(async () => {
        await result.current.confirmDecline();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "invitation.declineError2");
      expect(result.current.declineTarget).toEqual({ token: "tok-1" });
    });

    it("should surface the parsed error when the decline throws", async () => {
      // Arrange
      mockRespondToInvitation.mockRejectedValue(new Error("invitation expirée"));
      const { result } = await setupList();
      act(() => result.current.openDecline({ token: "tok-1" }));

      // Act
      await act(async () => {
        await result.current.confirmDecline();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "invitation expirée");
    });

    it("should fall back to a generic message when the thrown decline error cannot be parsed", async () => {
      // Arrange
      mockRespondToInvitation.mockRejectedValue(new Error(""));
      const { result } = await setupList();
      act(() => result.current.openDecline({ token: "tok-1" }));

      // Act
      await act(async () => {
        await result.current.confirmDecline();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "invitation.unexpectedError");
    });
  });

  describe("handleCancelInvitation", () => {
    it("should name the invitee and the trip in the confirmation", async () => {
      // Arrange
      const { result } = await setupList();

      // Act
      act(() =>
        result.current.handleCancelInvitation({
          id: "inv-1",
          inviteeEmail: "bob@example.com",
          trip: { title: "Tokyo" },
        }),
      );

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "invitation.cancelInvitationTitle",
        'invitation.cancelInvitationMessage:{"invitee":"bob@example.com","tripName":"Tokyo"}',
        expect.any(Array),
      );
    });

    it("should name the invitee by phone when there is no email", async () => {
      // Arrange
      const { result } = await setupList();

      // Act
      act(() =>
        result.current.handleCancelInvitation({ id: "inv-1", inviteePhone: "+33600000000" }),
      );

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "invitation.cancelInvitationTitle",
        'invitation.cancelInvitationMessage:{"invitee":"+33600000000","tripName":"invitation.thisTripRef"}',
        expect.any(Array),
      );
    });

    it("should use generic labels when neither the invitee nor the trip is known", async () => {
      // Arrange
      const { result } = await setupList();

      // Act
      act(() => result.current.handleCancelInvitation({ id: "inv-1" }));

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "invitation.cancelInvitationTitle",
        'invitation.cancelInvitationMessage:{"invitee":"invitation.someoneRef","tripName":"invitation.thisTripRef"}',
        expect.any(Array),
      );
    });

    it("should cancel by mongo id and reload the sent invitations when confirmed", async () => {
      // Arrange
      const { result } = await setupList();
      mockGetSentInvitations.mockClear();
      act(() => result.current.handleCancelInvitation({ _id: "mongo-1", id: "local-1" }));

      // Act
      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      // Assert
      expect(mockCancelInvitation).toHaveBeenCalledWith("mongo-1");
      expect(mockGetSentInvitations).toHaveBeenCalledTimes(1);
    });

    it("should fall back to the plain id when there is no mongo id", async () => {
      // Arrange
      const { result } = await setupList();
      act(() => result.current.handleCancelInvitation({ id: "local-1" }));

      // Act
      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      // Assert
      expect(mockCancelInvitation).toHaveBeenCalledWith("local-1");
    });

    it("should alert the user when the server refuses the cancellation", async () => {
      // Arrange
      mockCancelInvitation.mockResolvedValue(false);
      const { result } = await setupList();
      act(() => result.current.handleCancelInvitation({ id: "inv-1" }));

      // Act
      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "invitation.cancelError");
    });

    it("should surface the parsed error when the cancellation throws", async () => {
      // Arrange
      mockCancelInvitation.mockRejectedValue(new Error("déjà annulée"));
      const { result } = await setupList();
      act(() => result.current.handleCancelInvitation({ id: "inv-1" }));

      // Act
      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "déjà annulée");
    });

    it("should fall back to a generic message when the thrown cancellation error cannot be parsed", async () => {
      // Arrange
      mockCancelInvitation.mockRejectedValue(new Error(""));
      const { result } = await setupList();
      act(() => result.current.handleCancelInvitation({ id: "inv-1" }));

      // Act
      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "invitation.unexpectedError");
    });
  });

  describe("deep-link mode", () => {
    it("should redirect to the public trip view when the invitation carries a trip id", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ tripId: "trip-1" });

      // Act
      const { result } = await setupDeepLink();

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripPublicView", {
        tripId: "trip-1",
        invitationToken: "tok-1",
      });
      expect(result.current.currentToken).toBeUndefined();
    });

    it("should redirect using the nested trip id when the flat one is missing", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ trip: { _id: "trip-2" } });

      // Act
      await setupDeepLink();

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripPublicView", {
        tripId: "trip-2",
        invitationToken: "tok-1",
      });
    });

    it("should show the invitation detail when it carries no trip id", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite", status: "pending" });

      // Act
      const { result } = await setupDeepLink();

      // Assert
      expect(result.current.invitation).toEqual({ type: "invite", status: "pending" });
      expect(result.current.loading).toBe(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should alert the user when the invitation cannot be loaded", async () => {
      // Arrange
      mockGetInvitationByToken.mockRejectedValue(new Error("jeton inconnu"));

      // Act
      const { result } = await setupDeepLink();

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "invitation.loadingError");
      expect(result.current.loading).toBe(false);
    });

    it("should expose the token received in the route params", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });

      // Act
      const { result } = await setupDeepLink("tok-9");

      // Assert
      expect(result.current.initialToken).toBe("tok-9");
      expect(result.current.currentToken).toBe("tok-9");
    });

    it("should follow the token when the route params change", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      const { result, rerender } = await setupDeepLink("tok-1");

      // Act
      mockRoute.params = { token: "tok-2" };
      await act(async () => {
        rerender(undefined);
      });

      // Assert
      expect(result.current.currentToken).toBe("tok-2");
      expect(mockGetInvitationByToken).toHaveBeenLastCalledWith("tok-2");
    });

    it("should load the list when the route carries no params at all", async () => {
      // Arrange
      mockRoute.params = undefined;

      // Act
      renderHook(() => useInvitationManagement());
      await act(async () => {});

      // Assert
      expect(mockGetUserInvitations).toHaveBeenCalledWith("ana@example.com");
      expect(mockGetInvitationByToken).not.toHaveBeenCalled();
    });
  });

  describe("handleAcceptSingle", () => {
    it("should do nothing when no invitation has been loaded", async () => {
      // Arrange
      const { result } = await setupList();

      // Act
      await act(async () => {
        await result.current.handleAcceptSingle();
      });

      // Assert
      expect(mockRespondToInvitation).not.toHaveBeenCalled();
    });

    it("should ask a signed-out visitor to log in first", async () => {
      // Arrange
      mockUser = null;
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      const { result } = await setupDeepLink();

      // Act
      await act(async () => {
        await result.current.handleAcceptSingle();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "invitation.loginRequired",
        "invitation.loginToAccept",
        expect.any(Array),
      );
      expect(mockRespondToInvitation).not.toHaveBeenCalled();
    });

    it("should send a signed-out visitor to the auth screen when they accept to log in", async () => {
      // Arrange
      mockUser = null;
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      const { result } = await setupDeepLink();
      await act(async () => {
        await result.current.handleAcceptSingle();
      });

      // Act
      act(() => lastAlertButtons()[1].onPress());

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("Auth");
    });

    it("should confirm with the joined trip wording for a link invitation", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "link" });
      const { result } = await setupDeepLink();

      // Act
      await act(async () => {
        await result.current.handleAcceptSingle();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "invitation.tripJoined",
        "invitation.tripJoinedMessage",
        expect.any(Array),
      );
      expect(result.current.responding).toBe(false);
    });

    it("should confirm with the accepted wording for a regular invitation", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      const { result } = await setupDeepLink();

      // Act
      await act(async () => {
        await result.current.handleAcceptSingle();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "invitation.accepted",
        "invitation.acceptedMessage",
        expect.any(Array),
      );
    });

    // Note : la branche `navigation.navigate("TripDetails", …)` de handleAcceptSingle
    // est inatteignable — `loadSingleInvitation` redirige vers TripPublicView dès
    // qu'un identifiant de voyage est présent, donc `invitation.tripId` est
    // toujours absent quand la vue détaillée s'affiche.

    it("should go back to the main screen when the accepted invitation has no trip", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      const { result } = await setupDeepLink();
      await act(async () => {
        await result.current.handleAcceptSingle();
      });

      // Act
      act(() => lastAlertButtons()[0].onPress());

      // Assert
      expect(mockNavigate).toHaveBeenLastCalledWith("Main");
    });

    it("should alert the user when the server refuses the acceptance", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      mockRespondToInvitation.mockResolvedValue(false);
      const { result } = await setupDeepLink();

      // Act
      await act(async () => {
        await result.current.handleAcceptSingle();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "invitation.acceptError");
    });

    it("should surface the parsed error when the acceptance throws", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      mockRespondToInvitation.mockRejectedValue(new Error("invitation révoquée"));
      const { result } = await setupDeepLink();

      // Act
      await act(async () => {
        await result.current.handleAcceptSingle();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "invitation révoquée");
    });

    it("should fall back to the accept error when the thrown error cannot be parsed", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      mockRespondToInvitation.mockRejectedValue(new Error(""));
      const { result } = await setupDeepLink();

      // Act
      await act(async () => {
        await result.current.handleAcceptSingle();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "invitation.acceptError");
    });
  });

  describe("handleDeclineSingle", () => {
    it("should ask for confirmation before declining", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      const { result } = await setupDeepLink();

      // Act
      act(() => result.current.handleDeclineSingle());

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "invitation.declineTitle",
        "invitation.declineMessage",
        expect.any(Array),
      );
    });

    it("should decline the invitation and offer to go back to the main screen", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      const { result } = await setupDeepLink();
      act(() => result.current.handleDeclineSingle());

      // Act
      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });
      act(() => lastAlertButtons()[0].onPress());

      // Assert
      expect(mockRespondToInvitation).toHaveBeenCalledWith("tok-1", "decline", "user-1");
      expect(mockNavigate).toHaveBeenLastCalledWith("Main");
      expect(result.current.responding).toBe(false);
    });

    it("should alert the user when the server refuses the decline", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      mockRespondToInvitation.mockResolvedValue(false);
      const { result } = await setupDeepLink();
      act(() => result.current.handleDeclineSingle());

      // Act
      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "invitation.declineError");
    });

    it("should surface the parsed error when the decline throws", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      mockRespondToInvitation.mockRejectedValue(new Error("lien expiré"));
      const { result } = await setupDeepLink();
      act(() => result.current.handleDeclineSingle());

      // Act
      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "lien expiré");
    });

    it("should fall back to the decline error when the thrown error cannot be parsed", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      mockRespondToInvitation.mockRejectedValue(new Error(""));
      const { result } = await setupDeepLink();
      act(() => result.current.handleDeclineSingle());

      // Act
      await act(async () => {
        await lastAlertButtons()[1].onPress();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "invitation.declineError");
    });
  });

  describe("setCurrentToken", () => {
    it("should switch back to the list when the token is cleared", async () => {
      // Arrange
      mockGetInvitationByToken.mockResolvedValue({ type: "invite" });
      const { result } = await setupDeepLink();
      mockGetUserInvitations.mockClear();

      // Act
      await act(async () => {
        result.current.setCurrentToken(undefined);
      });

      // Assert
      expect(mockGetUserInvitations).toHaveBeenCalled();
    });
  });
});
