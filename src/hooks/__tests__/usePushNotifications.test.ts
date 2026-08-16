import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { userApi } from "../../services/api/userApi";
import {
  clearStoredPushToken,
  requestPermissionAndRegisterToken,
} from "../usePushNotifications";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: null, easConfig: null },
}));

jest.mock("../../services/api/userApi", () => ({
  userApi: { registerPushToken: jest.fn() },
}));

const PUSH_TOKEN_KEY = "@mytripcircle_push_token_v1";

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockGetToken = Notifications.getExpoPushTokenAsync as jest.Mock;
const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;
const mockRegisterPushToken = userApi.registerPushToken as jest.Mock;

const mutableConstants = Constants as unknown as {
  expoConfig: unknown;
  easConfig: unknown;
};

const setPlatform = (os: string) => {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
};

// Le module installe le gestionnaire de notifications à l'import : on capture
// l'appel avant que `clearAllMocks` ne vide l'historique.
const handlerRegistrations = (Notifications.setNotificationHandler as jest.Mock)
  .mock.calls.length;
const registeredHandler = (Notifications.setNotificationHandler as jest.Mock)
  .mock.calls[0]?.[0];

describe("usePushNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform("ios");
    mutableConstants.expoConfig = null;
    mutableConstants.easConfig = null;
    mockGetPermissions.mockResolvedValue({ status: "granted" });
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    mockGetToken.mockResolvedValue({ data: "ExponentPushToken[abc]" });
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
    mockRegisterPushToken.mockResolvedValue(undefined);
  });

  afterAll(() => {
    setPlatform("ios");
  });

  describe("requestPermissionAndRegisterToken", () => {
    it("should register the notification handler when the module loads", () => {
      // Arrange & Act — l'enregistrement a lieu à l'import du module

      // Assert
      expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    });

    it("should show alerts, play sound and set the badge when handling a notification", async () => {
      // Arrange
      const [{ handleNotification }] = (
        Notifications.setNotificationHandler as jest.Mock
      ).mock.calls[0];

      // Act
      const behaviour = await handleNotification();

      // Assert
      expect(behaviour).toEqual({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      });
    });

    it("should do nothing on the web platform", async () => {
      // Arrange
      setPlatform("web");

      // Act
      await requestPermissionAndRegisterToken();

      // Assert
      expect(mockGetPermissions).not.toHaveBeenCalled();
    });

    it("should skip the permission prompt when it is already granted", async () => {
      // Arrange
      mockGetPermissions.mockResolvedValue({ status: "granted" });

      // Act
      await requestPermissionAndRegisterToken();

      // Assert
      expect(mockRequestPermissions).not.toHaveBeenCalled();
      expect(mockRegisterPushToken).toHaveBeenCalledTimes(1);
    });

    it("should prompt for the permission when it has not been granted yet", async () => {
      // Arrange
      mockGetPermissions.mockResolvedValue({ status: "undetermined" });

      // Act
      await requestPermissionAndRegisterToken();

      // Assert
      expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
      expect(mockRegisterPushToken).toHaveBeenCalledTimes(1);
    });

    it("should not read any token when the permission is refused", async () => {
      // Arrange
      mockGetPermissions.mockResolvedValue({ status: "undetermined" });
      mockRequestPermissions.mockResolvedValue({ status: "denied" });

      // Act
      await requestPermissionAndRegisterToken();

      // Assert
      expect(mockGetToken).not.toHaveBeenCalled();
      expect(mockRegisterPushToken).not.toHaveBeenCalled();
    });

    it("should request the token with the EAS project id from the Expo config", async () => {
      // Arrange
      mutableConstants.expoConfig = { extra: { eas: { projectId: "proj-1" } } };

      // Act
      await requestPermissionAndRegisterToken();

      // Assert
      expect(mockGetToken).toHaveBeenCalledWith({ projectId: "proj-1" });
    });

    it("should fall back to the EAS config project id when the Expo config has none", async () => {
      // Arrange
      mutableConstants.expoConfig = { extra: {} };
      mutableConstants.easConfig = { projectId: "proj-2" };

      // Act
      await requestPermissionAndRegisterToken();

      // Assert
      expect(mockGetToken).toHaveBeenCalledWith({ projectId: "proj-2" });
    });

    it("should request the token without options when no project id is known", async () => {
      // Arrange — expoConfig et easConfig restent nuls

      // Act
      await requestPermissionAndRegisterToken();

      // Assert
      expect(mockGetToken).toHaveBeenCalledWith(undefined);
    });

    it("should register and persist the token when it is new", async () => {
      // Arrange
      mockGetItem.mockResolvedValue(null);

      // Act
      await requestPermissionAndRegisterToken();

      // Assert
      expect(mockRegisterPushToken).toHaveBeenCalledWith(
        "ExponentPushToken[abc]"
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        PUSH_TOKEN_KEY,
        "ExponentPushToken[abc]"
      );
    });

    it("should not register the token again when it is already stored", async () => {
      // Arrange
      mockGetItem.mockResolvedValue("ExponentPushToken[abc]");

      // Act
      await requestPermissionAndRegisterToken();

      // Assert
      expect(mockRegisterPushToken).not.toHaveBeenCalled();
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it("should swallow the failure when the push token cannot be read", async () => {
      // Arrange — cas du simulateur ou d'Expo Go sans entitlement aps-environment
      mockGetToken.mockRejectedValue(new Error("no aps-environment"));

      // Act & Assert
      await expect(requestPermissionAndRegisterToken()).resolves.toBeUndefined();
      expect(mockRegisterPushToken).not.toHaveBeenCalled();
    });

    it("should swallow the failure when the backend registration fails", async () => {
      // Arrange
      mockRegisterPushToken.mockRejectedValue(new Error("500"));

      // Act & Assert
      await expect(requestPermissionAndRegisterToken()).resolves.toBeUndefined();
      expect(mockSetItem).not.toHaveBeenCalled();
    });
  });

  describe("clearStoredPushToken", () => {
    it("should drop the stored push token", async () => {
      // Arrange & Act
      await clearStoredPushToken();

      // Assert
      expect(mockRemoveItem).toHaveBeenCalledWith(PUSH_TOKEN_KEY);
    });
  });
});
