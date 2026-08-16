import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useFriendProfileActions } from "../useFriendProfileActions";
import { ApiService } from "../../services/ApiService";
import { moderationApi } from "../../services/api/moderationApi";
import { getAvatarColor, getInitials } from "../../utils/avatarUtils";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { friendId: "friend-1", friendName: "Ana Fallback" } }),
}));

const mockRemoveFriend = jest.fn();
const mockSendFriendRequest = jest.fn();
jest.mock("../../contexts/FriendsContext", () => ({
  useFriends: () => ({
    removeFriend: mockRemoveFriend,
    sendFriendRequest: mockSendFriendRequest,
  }),
}));

jest.mock("../../services/ApiService", () => ({
  ApiService: { getFriendProfile: jest.fn() },
}));

jest.mock("../../services/api/moderationApi", () => ({
  moderationApi: { reportUser: jest.fn(), blockUser: jest.fn() },
}));

jest.mock("../../utils/i18n", () => ({
  parseApiError: jest.fn((error: unknown) => (error as Error)?.message ?? ""),
}));

const mockGetFriendProfile = (ApiService as unknown as { getFriendProfile: jest.Mock })
  .getFriendProfile;
const mockModeration = moderationApi as unknown as { reportUser: jest.Mock; blockUser: jest.Mock };
const INITIAL_DEV = (globalThis as unknown as { __DEV__: boolean }).__DEV__;

const PROFILE = { name: "Ana Réelle", email: "ana@example.com", isFriend: true };

/** Récupère le bouton de confirmation du dernier Alert.alert déclenché. */
function lastConfirmButton() {
  const alertMock = Alert.alert as unknown as jest.Mock;
  const buttons = alertMock.mock.calls[alertMock.mock.calls.length - 1][2];
  return buttons[1];
}

/** Monte le hook après avoir laissé le chargement initial du profil se résoudre. */
async function setupLoaded(profile: unknown = PROFILE) {
  mockGetFriendProfile.mockResolvedValue(profile);
  const hook = renderHook(() => useFriendProfileActions());
  await act(async () => {});
  return hook;
}

describe("useFriendProfileActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = INITIAL_DEV;
    jest.restoreAllMocks();
  });

  describe("initial load", () => {
    it("should fetch the profile of the friend passed in the route params", async () => {
      // Arrange & Act
      const { result } = await setupLoaded();

      // Assert
      expect(mockGetFriendProfile).toHaveBeenCalledWith("friend-1");
      expect(result.current.profile).toEqual(PROFILE);
      expect(result.current.loading).toBe(false);
    });

    it("should expose the route params as-is", async () => {
      // Arrange & Act
      const { result } = await setupLoaded();

      // Assert
      expect(result.current.friendId).toBe("friend-1");
      expect(result.current.friendName).toBe("Ana Fallback");
    });

    it("should derive the name, initials and avatar color from the loaded profile", async () => {
      // Arrange & Act
      const { result } = await setupLoaded();

      // Assert
      expect(result.current.name).toBe("Ana Réelle");
      expect(result.current.initials).toBe(getInitials("Ana Réelle"));
      expect(result.current.avatarColor).toBe(getAvatarColor("Ana Réelle"));
    });

    it("should fall back to the route name when the profile has none", async () => {
      // Arrange & Act
      const { result } = await setupLoaded({ email: "ana@example.com" });

      // Assert
      expect(result.current.name).toBe("Ana Fallback");
    });

    it("should report a not-friend state when the profile omits the flag", async () => {
      // Arrange & Act
      const { result } = await setupLoaded({ name: "Ana" });

      // Assert
      expect(result.current.isFriend).toBe(false);
    });

    it("should alert the user and stop loading when the profile cannot be fetched", async () => {
      // Arrange
      mockGetFriendProfile.mockRejectedValue(new Error("not found"));

      // Act
      const { result } = renderHook(() => useFriendProfileActions());
      await act(async () => {});

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "friendProfile.loadError");
      expect(result.current.loading).toBe(false);
    });
  });

  describe("handleRemove", () => {
    it("should ask for confirmation using the loaded profile name", async () => {
      // Arrange
      const { result } = await setupLoaded();

      // Act
      act(() => result.current.handleRemove());

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "friendProfile.removeTitle",
        'friendProfile.removeMsg:{"name":"Ana Réelle"}',
        expect.any(Array),
      );
    });

    it("should remove the friend and navigate back when confirmed", async () => {
      // Arrange
      mockRemoveFriend.mockResolvedValue(undefined);
      const { result } = await setupLoaded();
      act(() => result.current.handleRemove());

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(mockRemoveFriend).toHaveBeenCalledWith("friend-1");
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should alert and stay on the screen when the removal fails", async () => {
      // Arrange
      mockRemoveFriend.mockRejectedValue(new Error("removal failed"));
      const { result } = await setupLoaded();
      act(() => result.current.handleRemove());

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "friendProfile.removeError");
    });

    it("should stay silent on a removal failure when not running in dev mode", async () => {
      // Arrange
      mockRemoveFriend.mockRejectedValue(new Error("removal failed"));
      const { result } = await setupLoaded();
      act(() => result.current.handleRemove());
      (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe("handleAddFriend", () => {
    it("should send the friend request to the email of the loaded profile", async () => {
      // Arrange
      mockSendFriendRequest.mockResolvedValue({ autoAccepted: false });
      const { result } = await setupLoaded();

      // Act
      await act(async () => {
        await result.current.handleAddFriend();
      });

      // Assert
      expect(mockSendFriendRequest).toHaveBeenCalledWith({ recipientEmail: "ana@example.com" });
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "friends.success",
        "friendProfile.successRequestSent",
      );
    });

    it("should offer to reload the profile when the request is auto-accepted", async () => {
      // Arrange
      mockSendFriendRequest.mockResolvedValue({ autoAccepted: true });
      const { result } = await setupLoaded();

      // Act
      await act(async () => {
        await result.current.handleAddFriend();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith(
        "friends.success",
        "friendProfile.successNowFriends",
        expect.any(Array),
      );
    });

    it("should reload the profile when the auto-accept confirmation is acknowledged", async () => {
      // Arrange
      mockSendFriendRequest.mockResolvedValue({ autoAccepted: true });
      const { result } = await setupLoaded();
      await act(async () => {
        await result.current.handleAddFriend();
      });
      mockGetFriendProfile.mockClear();

      // Act
      await act(async () => {
        const buttons = (Alert.alert as unknown as jest.Mock).mock.calls.slice(-1)[0][2];
        buttons[0].onPress();
      });

      // Assert
      expect(mockGetFriendProfile).toHaveBeenCalledWith("friend-1");
    });

    it("should surface the parsed error when the request fails", async () => {
      // Arrange
      mockSendFriendRequest.mockRejectedValue(new Error("already pending"));
      const { result } = await setupLoaded();

      // Act
      await act(async () => {
        await result.current.handleAddFriend();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "already pending");
    });

    it("should fall back to a generic message when the failure cannot be parsed", async () => {
      // Arrange
      mockSendFriendRequest.mockRejectedValue(new Error(""));
      const { result } = await setupLoaded();

      // Act
      await act(async () => {
        await result.current.handleAddFriend();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "friendProfile.errorDefault");
    });

    it("should clear the sending flag once the request settles", async () => {
      // Arrange
      mockSendFriendRequest.mockResolvedValue({});
      const { result } = await setupLoaded();

      // Act
      await act(async () => {
        await result.current.handleAddFriend();
      });

      // Assert
      expect(result.current.sending).toBe(false);
    });
  });

  describe("handleReport", () => {
    it("should report the friend with the chosen reason", async () => {
      // Arrange
      mockModeration.reportUser.mockResolvedValue(undefined);
      const { result } = await setupLoaded();

      // Act
      await act(async () => {
        await result.current.handleReport("spam");
      });

      // Assert
      expect(mockModeration.reportUser).toHaveBeenCalledWith("friend-1", "spam");
      expect(Alert.alert).toHaveBeenLastCalledWith("friends.success", "friendProfile.reportedSuccess");
    });

    it("should alert the user when the report fails", async () => {
      // Arrange
      mockModeration.reportUser.mockRejectedValue(new Error("report failed"));
      const { result } = await setupLoaded();

      // Act
      await act(async () => {
        await result.current.handleReport("spam");
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "friendProfile.reportError");
    });

    it("should stay silent on a report failure when not running in dev mode", async () => {
      // Arrange
      mockModeration.reportUser.mockRejectedValue(new Error("report failed"));
      const { result } = await setupLoaded();
      (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

      // Act
      await act(async () => {
        await result.current.handleReport("spam");
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe("handleBlock", () => {
    it("should ask for confirmation using the displayed name", async () => {
      // Arrange
      const { result } = await setupLoaded();

      // Act
      act(() => result.current.handleBlock());

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith(
        'friendProfile.blockConfirmTitle:{"name":"Ana Réelle"}',
        "friendProfile.blockConfirmMsg",
        expect.any(Array),
      );
    });

    it("should block the friend and navigate back once acknowledged", async () => {
      // Arrange
      mockModeration.blockUser.mockResolvedValue(undefined);
      const { result } = await setupLoaded();
      act(() => result.current.handleBlock());

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });
      act(() => {
        const buttons = (Alert.alert as unknown as jest.Mock).mock.calls.slice(-1)[0][2];
        buttons[0].onPress();
      });

      // Assert
      expect(mockModeration.blockUser).toHaveBeenCalledWith("friend-1");
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should alert the user when the block fails", async () => {
      // Arrange
      mockModeration.blockUser.mockRejectedValue(new Error("block failed"));
      const { result } = await setupLoaded();
      act(() => result.current.handleBlock());

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(Alert.alert).toHaveBeenLastCalledWith("common.error", "friendProfile.blockError");
    });

    it("should stay silent on a block failure when not running in dev mode", async () => {
      // Arrange
      mockModeration.blockUser.mockRejectedValue(new Error("block failed"));
      const { result } = await setupLoaded();
      act(() => result.current.handleBlock());
      (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

      // Act
      await act(async () => {
        await lastConfirmButton().onPress();
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe("navigation shortcuts", () => {
    it("should navigate to the public view of a trip", async () => {
      // Arrange
      const { result } = await setupLoaded();

      // Act
      act(() => result.current.goToTrip("trip-1"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("TripPublicView", { tripId: "trip-1" });
    });

    it("should navigate to the invite screen with the friend preselected", async () => {
      // Arrange
      const { result } = await setupLoaded();

      // Act
      act(() => result.current.navigateInvite());

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("InviteFriends", { preselectedFriend: "friend-1" });
    });

    it("should navigate back when the back shortcut is used", async () => {
      // Arrange
      const { result } = await setupLoaded();

      // Act
      act(() => result.current.goBack());

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
