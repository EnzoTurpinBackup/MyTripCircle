import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUserProfile } from "../useUserProfile";
import ApiService from "../../services/ApiService";
import type { User } from "../../types";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: {
    updateProfile: jest.fn(),
    uploadAvatar: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

const mockApi = ApiService as unknown as Record<string, jest.Mock>;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

const UPDATED_USER = { id: "user-1", name: "Ana", email: "ana@example.com" } as User;

function setup() {
  const onUserUpdated = jest.fn();
  const { result } = renderHook(() => useUserProfile({ onUserUpdated }));
  return { result, onUserUpdated };
}

describe("useUserProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateUser", () => {
    it("should strip undefined fields before calling the API", async () => {
      // Arrange
      mockApi.updateProfile.mockResolvedValue({ success: true, user: UPDATED_USER });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.updateUser({ name: "Ana", email: undefined });
      });

      // Assert
      expect(mockApi.updateProfile).toHaveBeenCalledWith({ name: "Ana" });
    });

    it("should persist the returned user and notify the caller when the update succeeds", async () => {
      // Arrange
      mockApi.updateProfile.mockResolvedValue({ success: true, user: UPDATED_USER });
      const { result, onUserUpdated } = setup();

      // Act
      await act(async () => {
        await result.current.updateUser({ name: "Ana" });
      });

      // Assert
      expect(mockSetItem).toHaveBeenCalledWith("user", JSON.stringify(UPDATED_USER));
      expect(onUserUpdated).toHaveBeenCalledWith(UPDATED_USER);
    });

    it("should neither persist nor notify when the API reports a failure", async () => {
      // Arrange
      mockApi.updateProfile.mockResolvedValue({ success: false });
      const { result, onUserUpdated } = setup();

      // Act
      await act(async () => {
        await result.current.updateUser({ name: "Ana" });
      });

      // Assert
      expect(mockSetItem).not.toHaveBeenCalled();
      expect(onUserUpdated).not.toHaveBeenCalled();
    });
  });

  describe("updateAvatar", () => {
    it("should persist the returned user and notify the caller when the upload succeeds", async () => {
      // Arrange
      mockApi.uploadAvatar.mockResolvedValue({ success: true, user: UPDATED_USER });
      const { result, onUserUpdated } = setup();

      // Act
      await act(async () => {
        await result.current.updateAvatar("data:image/png;base64,AAA");
      });

      // Assert
      expect(mockApi.uploadAvatar).toHaveBeenCalledWith("data:image/png;base64,AAA");
      expect(mockSetItem).toHaveBeenCalledWith("user", JSON.stringify(UPDATED_USER));
      expect(onUserUpdated).toHaveBeenCalledWith(UPDATED_USER);
    });

    it("should neither persist nor notify when the API reports a failure", async () => {
      // Arrange
      mockApi.uploadAvatar.mockResolvedValue({ success: false });
      const { result, onUserUpdated } = setup();

      // Act
      await act(async () => {
        await result.current.updateAvatar("data:image/png;base64,AAA");
      });

      // Assert
      expect(mockSetItem).not.toHaveBeenCalled();
      expect(onUserUpdated).not.toHaveBeenCalled();
    });
  });

  describe("updateSettings", () => {
    it("should persist the returned user and notify the caller when the update succeeds", async () => {
      // Arrange
      mockApi.updateSettings.mockResolvedValue({ success: true, user: UPDATED_USER });
      const { result, onUserUpdated } = setup();

      // Act
      await act(async () => {
        await result.current.updateSettings({ isPublicProfile: true });
      });

      // Assert
      expect(mockApi.updateSettings).toHaveBeenCalledWith({ isPublicProfile: true });
      expect(onUserUpdated).toHaveBeenCalledWith(UPDATED_USER);
    });

    it("should neither persist nor notify when the API reports a failure", async () => {
      // Arrange
      mockApi.updateSettings.mockResolvedValue({ success: false });
      const { result, onUserUpdated } = setup();

      // Act
      await act(async () => {
        await result.current.updateSettings({ isPublicProfile: false });
      });

      // Assert
      expect(mockSetItem).not.toHaveBeenCalled();
      expect(onUserUpdated).not.toHaveBeenCalled();
    });
  });
});
