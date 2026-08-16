import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { usePendingInvitations } from "../usePendingInvitations";
import ApiService from "../../services/ApiService";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const mockGetSentInvitations = jest.fn();
jest.mock("../../contexts/TripsContext", () => ({
  useTrips: () => ({ getSentInvitations: mockGetSentInvitations }),
}));

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: { cancelInvitation: jest.fn() },
}));

const mockCancelInvitation = (ApiService as unknown as { cancelInvitation: jest.Mock })
  .cancelInvitation;

/**
 * Bascule le flag global `__DEV__` à false pour le test courant : c'est la seule
 * façon d'exercer la branche « production » des garde-fous `if (__DEV__)`.
 * La valeur d'origine est restaurée dans le afterEach.
 */
function withoutDevMode() {
  (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
}

/** Récupère le bouton de confirmation du dernier Alert.alert déclenché. */
function lastConfirmButton() {
  const alertMock = Alert.alert as unknown as jest.Mock;
  const buttons = alertMock.mock.calls[alertMock.mock.calls.length - 1][2];
  return buttons[1];
}

const INITIAL_DEV = (globalThis as unknown as { __DEV__: boolean }).__DEV__;

describe("usePendingInvitations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = INITIAL_DEV;
    jest.restoreAllMocks();
  });

  describe("loadPendingInvitations", () => {
    it("should not query the API when the user id is undefined", async () => {
      // Arrange
      const { result } = renderHook(() => usePendingInvitations("trip-1", undefined));

      // Act
      await act(async () => {
        await result.current.loadPendingInvitations();
      });

      // Assert
      expect(mockGetSentInvitations).not.toHaveBeenCalled();
      expect(result.current.pendingInvitations).toEqual([]);
    });

    it("should keep only the pending non-link invitations of the current trip", async () => {
      // Arrange
      mockGetSentInvitations.mockResolvedValue([
        { id: "keep", tripId: "trip-1", type: "invite", inviteeEmail: "a@example.com" },
        { id: "other-trip", tripId: "trip-2", type: "invite", inviteeEmail: "b@example.com" },
        { id: "link", tripId: "trip-1", type: "link", inviteeEmail: "c@example.com" },
        { id: "no-contact", tripId: "trip-1", type: "invite" },
      ]);
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));

      // Act
      await act(async () => {
        await result.current.loadPendingInvitations();
      });

      // Assert
      expect(mockGetSentInvitations).toHaveBeenCalledWith("user-1", "pending");
      expect(result.current.pendingInvitations.map((i: any) => i.id)).toEqual(["keep"]);
    });

    it("should keep an invitation carrying only a phone number", async () => {
      // Arrange
      mockGetSentInvitations.mockResolvedValue([
        { id: "by-phone", tripId: "trip-1", type: "invite", inviteePhone: "+33600000000" },
      ]);
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));

      // Act
      await act(async () => {
        await result.current.loadPendingInvitations();
      });

      // Assert
      expect(result.current.pendingInvitations.map((i: any) => i.id)).toEqual(["by-phone"]);
    });

    it("should leave the list unchanged when the API call fails", async () => {
      // Arrange
      mockGetSentInvitations.mockRejectedValue(new Error("network down"));
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));

      // Act
      await act(async () => {
        await result.current.loadPendingInvitations();
      });

      // Assert
      expect(result.current.pendingInvitations).toEqual([]);
    });

    it("should stay silent on a load failure when not running in dev mode", async () => {
      // Arrange
      withoutDevMode();
      mockGetSentInvitations.mockRejectedValue(new Error("network down"));
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));

      // Act
      await act(async () => {
        await result.current.loadPendingInvitations();
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe("handleCancelInvitation", () => {
    it("should label the confirmation with the invitee email when present", () => {
      // Arrange
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));

      // Act
      act(() => {
        result.current.handleCancelInvitation({ id: "inv-1", inviteeEmail: "a@example.com" }, jest.fn());
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "inviteFriends.cancelInviteTitle",
        'inviteFriends.cancelInviteMsg:{"name":"a@example.com"}',
        expect.any(Array),
      );
    });

    it("should label the confirmation with the invitee phone when there is no email", () => {
      // Arrange
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));

      // Act
      act(() => {
        result.current.handleCancelInvitation({ id: "inv-1", inviteePhone: "+33600000000" }, jest.fn());
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "inviteFriends.cancelInviteTitle",
        'inviteFriends.cancelInviteMsg:{"name":"+33600000000"}',
        expect.any(Array),
      );
    });

    it("should label the confirmation with the guest fallback when no contact is known", () => {
      // Arrange
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));

      // Act
      act(() => {
        result.current.handleCancelInvitation({ id: "inv-1" }, jest.fn());
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "inviteFriends.cancelInviteTitle",
        'inviteFriends.cancelInviteMsg:{"name":"inviteFriends.guestFallback"}',
        expect.any(Array),
      );
    });

    it("should offer a cancel choice and a destructive confirm choice", () => {
      // Arrange
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));

      // Act
      act(() => {
        result.current.handleCancelInvitation({ id: "inv-1" }, jest.fn());
      });

      // Assert
      const buttons = (Alert.alert as unknown as jest.Mock).mock.calls[0][2];
      expect(buttons[0].style).toBe("cancel");
      expect(buttons[1].style).toBe("destructive");
    });

    it("should cancel the invitation by its mongo _id and refresh when confirmed", async () => {
      // Arrange
      mockCancelInvitation.mockResolvedValue({ success: true });
      const onRefresh = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));
      act(() => {
        result.current.handleCancelInvitation({ _id: "mongo-1", id: "local-1" }, onRefresh);
      });

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(mockCancelInvitation).toHaveBeenCalledWith("mongo-1");
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it("should fall back to the plain id when the invitation has no mongo _id", async () => {
      // Arrange
      mockCancelInvitation.mockResolvedValue({ success: true });
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));
      act(() => {
        result.current.handleCancelInvitation({ id: "local-1" }, jest.fn().mockResolvedValue(undefined));
      });

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(mockCancelInvitation).toHaveBeenCalledWith("local-1");
    });

    it("should alert the user and skip the refresh when the cancellation fails", async () => {
      // Arrange
      mockCancelInvitation.mockRejectedValue(new Error("cancel failed"));
      const onRefresh = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));
      act(() => {
        result.current.handleCancelInvitation({ id: "inv-1" }, onRefresh);
      });

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(onRefresh).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "inviteFriends.cancelInviteError");
    });

    it("should stay silent on a cancellation failure when not running in dev mode", async () => {
      // Arrange
      withoutDevMode();
      mockCancelInvitation.mockRejectedValue(new Error("cancel failed"));
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));
      act(() => {
        result.current.handleCancelInvitation({ id: "inv-1" }, jest.fn().mockResolvedValue(undefined));
      });

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
    });

    it("should reset the action loading flag once the cancellation is done", async () => {
      // Arrange
      mockCancelInvitation.mockResolvedValue({ success: true });
      const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));
      act(() => {
        result.current.handleCancelInvitation({ id: "inv-1" }, jest.fn().mockResolvedValue(undefined));
      });

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(result.current.actionLoading).toBe(false);
    });
  });

  it("should expose a setter allowing the caller to override the pending list", () => {
    // Arrange
    const { result } = renderHook(() => usePendingInvitations("trip-1", "user-1"));

    // Act
    act(() => {
      result.current.setPendingInvitations([{ id: "manual" }]);
    });

    // Assert
    expect(result.current.pendingInvitations).toEqual([{ id: "manual" }]);
  });
});
