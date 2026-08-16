import { renderHook, act } from "@testing-library/react-native";
import { Alert, Share } from "react-native";
import { useInvitationLink } from "../useInvitationLink";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const mockGetTripInvitationLink = jest.fn();
jest.mock("../../contexts/TripsContext", () => ({
  useTrips: () => ({ getTripInvitationLink: mockGetTripInvitationLink }),
}));

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const INITIAL_DEV = (globalThis as unknown as { __DEV__: boolean }).__DEV__;

/**
 * Bascule le flag global `__DEV__` à false pour le test courant : c'est la seule
 * façon d'exercer la branche « production » des garde-fous `if (__DEV__)`.
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

describe("useInvitationLink", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = INITIAL_DEV;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("loadLink", () => {
    it("should start with an empty link and no expiry", () => {
      // Arrange & Act
      const { result } = renderHook(() => useInvitationLink("trip-1"));

      // Assert
      expect(result.current.invitationLink).toBe("");
      expect(result.current.linkExpiry).toBeNull();
    });

    it("should store the link returned by the API", async () => {
      // Arrange
      mockGetTripInvitationLink.mockResolvedValue({ token: "tok-1", link: "https://x/tok-1" });
      const { result } = renderHook(() => useInvitationLink("trip-1"));

      // Act
      await act(async () => {
        await result.current.loadLink();
      });

      // Assert
      expect(mockGetTripInvitationLink).toHaveBeenCalledWith("trip-1");
      expect(result.current.invitationLink).toBe("https://x/tok-1");
    });

    it("should set the expiry seven days after the current date", async () => {
      // Arrange
      mockGetTripInvitationLink.mockResolvedValue({ link: "https://x/tok-1" });
      const { result } = renderHook(() => useInvitationLink("trip-1"));

      // Act
      await act(async () => {
        await result.current.loadLink();
      });

      // Assert
      expect(result.current.linkExpiry!.getTime() - Date.now()).toBe(SEVEN_DAYS_MS);
    });

    it("should fall back to an empty link when the API returns none", async () => {
      // Arrange
      mockGetTripInvitationLink.mockResolvedValue({ token: "tok-1" });
      const { result } = renderHook(() => useInvitationLink("trip-1"));

      // Act
      await act(async () => {
        await result.current.loadLink();
      });

      // Assert
      expect(result.current.invitationLink).toBe("");
    });

    it("should leave the link empty when the API call fails", async () => {
      // Arrange
      mockGetTripInvitationLink.mockRejectedValue(new Error("network down"));
      const { result } = renderHook(() => useInvitationLink("trip-1"));

      // Act
      await act(async () => {
        await result.current.loadLink();
      });

      // Assert
      expect(result.current.invitationLink).toBe("");
      expect(result.current.linkExpiry).toBeNull();
    });

    it("should stay silent on a load failure when not running in dev mode", async () => {
      // Arrange
      withoutDevMode();
      mockGetTripInvitationLink.mockRejectedValue(new Error("network down"));
      const { result } = renderHook(() => useInvitationLink("trip-1"));

      // Act
      await act(async () => {
        await result.current.loadLink();
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe("handleShareLink", () => {
    it("should not open the share sheet when no link has been loaded", async () => {
      // Arrange
      const { result } = renderHook(() => useInvitationLink("trip-1"));

      // Act
      await act(async () => {
        await result.current.handleShareLink();
      });

      // Assert
      expect(Share.share).not.toHaveBeenCalled();
    });

    it("should share the loaded link with a translated message", async () => {
      // Arrange
      mockGetTripInvitationLink.mockResolvedValue({ link: "https://x/tok-1" });
      const { result } = renderHook(() => useInvitationLink("trip-1"));
      await act(async () => {
        await result.current.loadLink();
      });

      // Act
      await act(async () => {
        await result.current.handleShareLink();
      });

      // Assert
      expect(Share.share).toHaveBeenCalledWith({
        message: 'inviteFriends.shareMsg:{"link":"https://x/tok-1"}',
        url: "https://x/tok-1",
      });
    });

    it("should keep the link when the share sheet is cancelled", async () => {
      // Arrange
      mockGetTripInvitationLink.mockResolvedValue({ link: "https://x/tok-1" });
      (Share.share as unknown as jest.Mock).mockRejectedValue(new Error("dismissed"));
      const { result } = renderHook(() => useInvitationLink("trip-1"));
      await act(async () => {
        await result.current.loadLink();
      });

      // Act
      await act(async () => {
        await result.current.handleShareLink();
      });

      // Assert
      expect(result.current.invitationLink).toBe("https://x/tok-1");
    });

    it("should stay silent on a share failure when not running in dev mode", async () => {
      // Arrange
      mockGetTripInvitationLink.mockResolvedValue({ link: "https://x/tok-1" });
      (Share.share as unknown as jest.Mock).mockRejectedValue(new Error("dismissed"));
      const { result } = renderHook(() => useInvitationLink("trip-1"));
      await act(async () => {
        await result.current.loadLink();
      });
      withoutDevMode();

      // Act
      await act(async () => {
        await result.current.handleShareLink();
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe("handleRenewLink", () => {
    it("should ask for confirmation before renewing the link", () => {
      // Arrange
      const { result } = renderHook(() => useInvitationLink("trip-1"));

      // Act
      act(() => {
        result.current.handleRenewLink();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "inviteFriends.renewTitle",
        "inviteFriends.renewMsg",
        expect.any(Array),
      );
    });

    it("should request a forced link and update the state when confirmed", async () => {
      // Arrange
      mockGetTripInvitationLink.mockResolvedValue({ link: "https://x/tok-2" });
      const { result } = renderHook(() => useInvitationLink("trip-1"));
      act(() => {
        result.current.handleRenewLink();
      });

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(mockGetTripInvitationLink).toHaveBeenCalledWith("trip-1", true);
      expect(result.current.invitationLink).toBe("https://x/tok-2");
      expect(result.current.linkExpiry!.getTime() - Date.now()).toBe(SEVEN_DAYS_MS);
    });

    it("should fall back to an empty link when the renewal returns none", async () => {
      // Arrange
      mockGetTripInvitationLink.mockResolvedValue({ token: "tok-2" });
      const { result } = renderHook(() => useInvitationLink("trip-1"));
      act(() => {
        result.current.handleRenewLink();
      });

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(result.current.invitationLink).toBe("");
    });

    it("should confirm the renewal to the user when it succeeds", async () => {
      // Arrange
      mockGetTripInvitationLink.mockResolvedValue({ link: "https://x/tok-2" });
      const { result } = renderHook(() => useInvitationLink("trip-1"));
      act(() => {
        result.current.handleRenewLink();
      });

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "inviteFriends.renewSuccess",
        "inviteFriends.renewSuccessMsg",
      );
    });

    it("should alert an error and keep the previous link when the renewal fails", async () => {
      // Arrange
      mockGetTripInvitationLink.mockResolvedValueOnce({ link: "https://x/tok-1" });
      const { result } = renderHook(() => useInvitationLink("trip-1"));
      await act(async () => {
        await result.current.loadLink();
      });
      mockGetTripInvitationLink.mockRejectedValue(new Error("renew failed"));
      act(() => {
        result.current.handleRenewLink();
      });

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "inviteFriends.renewError");
      expect(result.current.invitationLink).toBe("https://x/tok-1");
    });

    it("should stay silent on a renewal failure when not running in dev mode", async () => {
      // Arrange
      withoutDevMode();
      mockGetTripInvitationLink.mockRejectedValue(new Error("renew failed"));
      const { result } = renderHook(() => useInvitationLink("trip-1"));
      act(() => {
        result.current.handleRenewLink();
      });

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
