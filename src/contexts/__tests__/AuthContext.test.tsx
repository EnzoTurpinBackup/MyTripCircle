import React, { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "../AuthContext";
import * as secureStorage from "../../utils/secureStorage";
import ApiService from "../../services/ApiService";
import {
  setUnauthorizedCallback,
  clearUnauthorizedCallback,
} from "../../services/api/apiCore";
import { parseApiError as translateApiMessage } from "../../utils/i18n";
import { useUserProfile } from "../../hooks/useUserProfile";

jest.mock("../../utils/secureStorage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock("../../services/ApiService", () => {
  const api = {
    login: jest.fn(),
    register: jest.fn(),
    loginWithGoogle: jest.fn(),
    loginWithApple: jest.fn(),
    logout: jest.fn(),
    verifyOtp: jest.fn(),
    deleteAccount: jest.fn(),
    changePassword: jest.fn(),
  };
  return { __esModule: true, default: api, ApiService: api };
});

jest.mock("../../services/api/apiCore", () => ({
  setUnauthorizedCallback: jest.fn(),
  clearUnauthorizedCallback: jest.fn(),
}));

jest.mock("../../utils/i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
  parseApiError: jest.fn(() => "message traduit"),
}));

jest.mock("../../hooks/useUserProfile", () => ({
  useUserProfile: jest.fn(),
}));

const mockStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockApi = ApiService as unknown as {
  login: jest.Mock;
  register: jest.Mock;
  loginWithGoogle: jest.Mock;
  loginWithApple: jest.Mock;
  logout: jest.Mock;
  verifyOtp: jest.Mock;
  deleteAccount: jest.Mock;
  changePassword: jest.Mock;
};
const mockUseUserProfile = useUserProfile as jest.Mock;
const mockTranslateApiMessage = translateApiMessage as jest.Mock;

const RAW_USER = {
  id: "user-1",
  name: "Ada",
  email: "ada@example.com",
  createdAt: "2024-03-01T10:00:00.000Z",
};

const profileHandlers = {
  updateUser: jest.fn(),
  updateAvatar: jest.fn(),
  updateSettings: jest.fn(),
};

/** Dernier `onUserUpdated` transmis à useUserProfile, pour simuler une mise à jour de profil. */
let lastProfileOptions: { onUserUpdated: (user: unknown) => void };

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const renderAuth = async () => {
  const rendered = renderHook(() => useAuth(), { wrapper });
  await act(async () => {});
  return rendered;
};

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});

    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
    mockStorage.multiRemove.mockResolvedValue(undefined);
    mockUseUserProfile.mockImplementation((options) => {
      lastProfileOptions = options;
      return profileHandlers;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("useAuth", () => {
    it("should throw when used outside of an AuthProvider", () => {
      // Arrange
      jest.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert
      expect(() => renderHook(() => useAuth())).toThrow(
        "useAuth must be used within an AuthProvider",
      );
    });
  });

  describe("restauration de session au démarrage", () => {
    it("should stay in a loading state while the stored session is being read", () => {
      // Arrange
      mockStorage.getItem.mockReturnValue(new Promise(() => {}));

      // Act
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Assert
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
    });

    it("should restore the stored user and revive its creation date when a session exists", async () => {
      // Arrange
      mockStorage.getItem.mockResolvedValue(JSON.stringify(RAW_USER));

      // Act
      const { result } = await renderAuth();

      // Assert
      expect(result.current.user).toEqual({
        ...RAW_USER,
        createdAt: new Date(RAW_USER.createdAt),
      });
      expect(result.current.loading).toBe(false);
    });

    it("should leave the user null when no session is stored", async () => {
      // Arrange
      mockStorage.getItem.mockResolvedValue(null);

      // Act
      const { result } = await renderAuth();

      // Assert
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("should finish loading without a user when reading the stored session fails", async () => {
      // Arrange
      mockStorage.getItem.mockRejectedValue(new Error("keychain indisponible"));

      // Act
      const { result } = await renderAuth();

      // Assert
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe("déconnexion forcée sur réponse non autorisée", () => {
    it("should clear the user when the API signals an unauthorized response", async () => {
      // Arrange
      mockStorage.getItem.mockResolvedValue(JSON.stringify(RAW_USER));
      const { result } = await renderAuth();
      const onUnauthorized = (setUnauthorizedCallback as jest.Mock).mock.calls[0][0];

      // Act
      await act(async () => {
        onUnauthorized();
      });

      // Assert
      expect(result.current.user).toBeNull();
    });

    it("should unregister the unauthorized callback on unmount", async () => {
      // Arrange
      const { unmount } = await renderAuth();

      // Act
      unmount();

      // Assert
      expect(clearUnauthorizedCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("login", () => {
    it("should persist the session and expose the user when the credentials are valid", async () => {
      // Arrange
      mockApi.login.mockResolvedValue({
        success: true,
        token: "jwt-token",
        refreshToken: "refresh-token",
        user: RAW_USER,
      });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({ success: true });
      expect(mockStorage.setItem).toHaveBeenCalledWith("token", "jwt-token");
      expect(mockStorage.setItem).toHaveBeenCalledWith("refreshToken", "refresh-token");
      expect(mockStorage.setItem).toHaveBeenCalledWith("user", JSON.stringify(RAW_USER));
      expect(result.current.user).toEqual({
        ...RAW_USER,
        createdAt: new Date(RAW_USER.createdAt),
      });
    });

    it("should not persist a refresh token when the API does not return one", async () => {
      // Arrange
      mockApi.login.mockResolvedValue({ success: true, token: "jwt-token", user: RAW_USER });
      const { result } = await renderAuth();

      // Act
      await act(async () => {
        await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(mockStorage.setItem).not.toHaveBeenCalledWith("refreshToken", expect.anything());
    });

    it("should ask for an OTP when the API answers that the account is not verified", async () => {
      // Arrange
      mockApi.login.mockResolvedValue({
        requiresOtp: true,
        userId: "user-1",
        error: "Compte non vérifié",
      });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({
        success: false,
        error: "Compte non vérifié",
        requiresOtp: true,
        userId: "user-1",
      });
      expect(result.current.user).toBeNull();
    });

    it("should use the default OTP message when the API omits the error text", async () => {
      // Arrange
      mockApi.login.mockResolvedValue({ requiresOtp: true, userId: "user-1" });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toMatchObject({ error: "common.requiresOtp" });
    });

    it("should fail when the API answers without a token", async () => {
      // Arrange
      mockApi.login.mockResolvedValue({ success: true, user: RAW_USER });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "common.loginFailed" });
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it("should fail when the API answers with no response at all", async () => {
      // Arrange
      mockApi.login.mockResolvedValue(null);
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "common.loginFailed" });
    });

    it("should expose the faulty field when the API rejects with a structured error", async () => {
      // Arrange
      mockApi.login.mockRejectedValue(
        new Error(JSON.stringify({ error: "Mot de passe incorrect", field: "password" })),
      );
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({
        success: false,
        error: "Mot de passe incorrect",
        field: "password",
      });
    });

    it("should ask for an OTP when the rejected payload requires one", async () => {
      // Arrange
      mockApi.login.mockRejectedValue(
        new Error(JSON.stringify({ error: "Vérification requise", requiresOtp: true, userId: "user-9" })),
      );
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({
        success: false,
        error: "Vérification requise",
        requiresOtp: true,
        userId: "user-9",
      });
    });
  });

  describe("parseApiError", () => {
    it("should use the message property when the payload has no error property", async () => {
      // Arrange
      mockApi.login.mockRejectedValue(new Error(JSON.stringify({ message: "Serveur indisponible" })));
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toMatchObject({ error: "Serveur indisponible" });
    });

    it("should fall back to the generic message when the payload carries no text", async () => {
      // Arrange
      mockApi.login.mockRejectedValue(new Error(JSON.stringify({ field: "email" })));
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toMatchObject({ error: "common.unexpectedError", field: "email" });
    });

    it("should keep the raw message when the rejection is not a JSON payload", async () => {
      // Arrange
      mockApi.login.mockRejectedValue(new Error("Timeout réseau"));
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "Timeout réseau", field: undefined });
    });

    it("should stringify a rejection that is not an Error instance", async () => {
      // Arrange
      mockApi.login.mockRejectedValue("panne totale");
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toMatchObject({ error: "panne totale" });
    });

    it("should fall back to the generic message when the rejection carries an empty message", async () => {
      // Arrange
      mockApi.login.mockRejectedValue(new Error(""));
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toMatchObject({ error: "common.unexpectedError" });
    });

    it("should warn about the unparsable payload when running in development", async () => {
      // Arrange
      mockApi.login.mockRejectedValue(new Error("Timeout réseau"));
      const { result } = await renderAuth();

      // Act
      await act(async () => {
        await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(console.warn).toHaveBeenCalledWith(
        "[AuthContext] parseError JSON invalide:",
        expect.any(Error),
      );
    });

    it("should stay silent about the unparsable payload when not running in development", async () => {
      // Arrange
      const originalDev = (global as { __DEV__: boolean }).__DEV__;
      (global as { __DEV__: boolean }).__DEV__ = false;
      mockApi.login.mockRejectedValue(new Error("Timeout réseau"));
      const { result } = await renderAuth();

      // Act
      await act(async () => {
        await result.current.login("ada@example.com", "secret");
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
      (global as { __DEV__: boolean }).__DEV__ = originalDev;
    });
  });

  describe("register", () => {
    it("should persist the session when the API returns a token right away", async () => {
      // Arrange
      mockApi.register.mockResolvedValue({
        success: true,
        token: "jwt-token",
        refreshToken: "refresh-token",
        user: RAW_USER,
      });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.register("Ada", "ada@example.com", "secret", "0600000000");
      });

      // Assert
      expect(mockApi.register).toHaveBeenCalledWith({
        name: "Ada",
        email: "ada@example.com",
        password: "secret",
        phone: "0600000000",
      });
      expect(outcome).toEqual({ success: true, userId: undefined });
      expect(result.current.user).toEqual({
        ...RAW_USER,
        createdAt: new Date(RAW_USER.createdAt),
      });
    });

    it("should not persist a refresh token when the API does not return one", async () => {
      // Arrange
      mockApi.register.mockResolvedValue({ success: true, token: "jwt-token", user: RAW_USER });
      const { result } = await renderAuth();

      // Act
      await act(async () => {
        await result.current.register("Ada", "ada@example.com", "secret");
      });

      // Assert
      expect(mockStorage.setItem).not.toHaveBeenCalledWith("refreshToken", expect.anything());
    });

    it("should return the user id without opening a session when an OTP is expected", async () => {
      // Arrange
      mockApi.register.mockResolvedValue({ success: true, userId: "user-42" });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.register("Ada", "ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({ success: true, userId: "user-42" });
      expect(result.current.user).toBeNull();
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it("should not open a session when the API returns a token without a user", async () => {
      // Arrange
      mockApi.register.mockResolvedValue({ success: true, token: "jwt-token" });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.register("Ada", "ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({ success: true, userId: undefined });
      expect(result.current.user).toBeNull();
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it("should ask for an OTP when the API refuses an unverified pending account", async () => {
      // Arrange
      mockApi.register.mockResolvedValue({
        success: false,
        requiresOtp: true,
        userId: "user-42",
        error: "Compte déjà créé mais non vérifié",
      });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.register("Ada", "ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({
        success: false,
        error: "Compte déjà créé mais non vérifié",
        requiresOtp: true,
        userId: "user-42",
      });
    });

    it("should use the default OTP message when the refusal carries no error text", async () => {
      // Arrange
      mockApi.register.mockResolvedValue({ success: false, requiresOtp: true, userId: "user-42" });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.register("Ada", "ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toMatchObject({ error: "common.requiresOtp" });
    });

    it("should surface the API error when the registration is refused", async () => {
      // Arrange
      mockApi.register.mockResolvedValue({ success: false, error: "Email déjà utilisé" });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.register("Ada", "ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "Email déjà utilisé" });
    });

    it("should use the default registration message when the API answers nothing", async () => {
      // Arrange
      mockApi.register.mockResolvedValue(null);
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.register("Ada", "ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "common.registerFailed" });
    });

    it("should map the rejection to a message and a field when the API rejects", async () => {
      // Arrange
      mockApi.register.mockRejectedValue(
        new Error(JSON.stringify({ error: "Email invalide", field: "email" })),
      );
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.register("Ada", "ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "Email invalide", field: "email" });
    });

    it("should ask for an OTP when the rejected payload requires one", async () => {
      // Arrange
      mockApi.register.mockRejectedValue(
        new Error(JSON.stringify({ error: "Vérification requise", requiresOtp: true, userId: "user-7" })),
      );
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.register("Ada", "ada@example.com", "secret");
      });

      // Assert
      expect(outcome).toEqual({
        success: false,
        error: "Vérification requise",
        requiresOtp: true,
        userId: "user-7",
      });
    });
  });

  describe("loginWithGoogle", () => {
    it("should persist the session when the Google exchange succeeds", async () => {
      // Arrange
      mockApi.loginWithGoogle.mockResolvedValue({
        success: true,
        token: "jwt-token",
        refreshToken: "refresh-token",
        user: RAW_USER,
      });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.loginWithGoogle("google-token", "login");
      });

      // Assert
      expect(mockApi.loginWithGoogle).toHaveBeenCalledWith({
        accessToken: "google-token",
        mode: "login",
      });
      expect(outcome).toEqual({ success: true });
      expect(result.current.user).toEqual({
        ...RAW_USER,
        createdAt: new Date(RAW_USER.createdAt),
      });
    });

    it("should not persist a refresh token when the Google exchange omits it", async () => {
      // Arrange
      mockApi.loginWithGoogle.mockResolvedValue({ success: true, token: "jwt", user: RAW_USER });
      const { result } = await renderAuth();

      // Act
      await act(async () => {
        await result.current.loginWithGoogle("google-token", "login");
      });

      // Assert
      expect(mockStorage.setItem).not.toHaveBeenCalledWith("refreshToken", expect.anything());
    });

    it("should surface the API error when the Google exchange is refused", async () => {
      // Arrange
      mockApi.loginWithGoogle.mockResolvedValue({ success: false, error: "Compte inconnu" });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.loginWithGoogle("google-token", "login");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "Compte inconnu" });
    });

    it("should use the default Google message when the API answers nothing", async () => {
      // Arrange
      mockApi.loginWithGoogle.mockResolvedValue(null);
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.loginWithGoogle("google-token", "register");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "apiErrors.googleAuthFailed" });
    });

    it("should map the rejection to a message when the Google exchange fails", async () => {
      // Arrange
      mockApi.loginWithGoogle.mockRejectedValue(
        new Error(JSON.stringify({ error: "Jeton Google expiré" })),
      );
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.loginWithGoogle("google-token", "login");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "Jeton Google expiré" });
    });
  });

  describe("loginWithApple", () => {
    it("should persist the session when the Apple exchange succeeds", async () => {
      // Arrange
      mockApi.loginWithApple.mockResolvedValue({
        success: true,
        token: "jwt-token",
        refreshToken: "refresh-token",
        user: RAW_USER,
      });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.loginWithApple(
          "identity-token",
          "ada@example.com",
          { givenName: "Ada", familyName: "Lovelace" },
          "login",
        );
      });

      // Assert
      expect(mockApi.loginWithApple).toHaveBeenCalledWith({
        identityToken: "identity-token",
        email: "ada@example.com",
        fullName: { givenName: "Ada", familyName: "Lovelace" },
        mode: "login",
      });
      expect(outcome).toEqual({ success: true });
      expect(result.current.user).toEqual({
        ...RAW_USER,
        createdAt: new Date(RAW_USER.createdAt),
      });
    });

    it("should default to the register mode when the caller omits it", async () => {
      // Arrange
      mockApi.loginWithApple.mockResolvedValue({ success: true, token: "jwt", user: RAW_USER });
      const { result } = await renderAuth();

      // Act
      await act(async () => {
        await result.current.loginWithApple("identity-token");
      });

      // Assert
      expect(mockApi.loginWithApple).toHaveBeenCalledWith({
        identityToken: "identity-token",
        email: undefined,
        fullName: undefined,
        mode: "register",
      });
      expect(mockStorage.setItem).not.toHaveBeenCalledWith("refreshToken", expect.anything());
    });

    it("should surface the API error when the Apple exchange is refused", async () => {
      // Arrange
      mockApi.loginWithApple.mockResolvedValue({ success: false, error: "Compte Apple inconnu" });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.loginWithApple("identity-token");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "Compte Apple inconnu" });
    });

    it("should use the default Apple message when the API answers nothing", async () => {
      // Arrange
      mockApi.loginWithApple.mockResolvedValue(null);
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.loginWithApple("identity-token");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "apiErrors.appleAuthFailed" });
    });

    it("should map the rejection to a message when the Apple exchange fails", async () => {
      // Arrange
      mockApi.loginWithApple.mockRejectedValue(
        new Error(JSON.stringify({ error: "Jeton Apple invalide" })),
      );
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.loginWithApple("identity-token");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "Jeton Apple invalide" });
    });
  });

  describe("logout", () => {
    it("should revoke the refresh token and clear the session when a refresh token is stored", async () => {
      // Arrange
      mockStorage.getItem.mockImplementation((key: string) =>
        Promise.resolve(key === "refreshToken" ? "refresh-token" : JSON.stringify(RAW_USER)),
      );
      mockApi.logout.mockResolvedValue({ success: true });
      const { result } = await renderAuth();

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(mockApi.logout).toHaveBeenCalledWith({ refreshToken: "refresh-token" });
      expect(mockStorage.multiRemove).toHaveBeenCalledWith(["token", "refreshToken", "user"]);
      expect(result.current.user).toBeNull();
    });

    it("should clear the session without calling the API when no refresh token is stored", async () => {
      // Arrange
      mockStorage.getItem.mockImplementation((key: string) =>
        Promise.resolve(key === "refreshToken" ? null : JSON.stringify(RAW_USER)),
      );
      const { result } = await renderAuth();

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(mockApi.logout).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });

    it("should still clear the local session when the server revocation fails", async () => {
      // Arrange
      mockStorage.getItem.mockResolvedValue("refresh-token");
      mockApi.logout.mockRejectedValue(new Error("serveur indisponible"));
      const { result } = await renderAuth();

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(mockStorage.multiRemove).toHaveBeenCalledWith(["token", "refreshToken", "user"]);
      expect(result.current.user).toBeNull();
    });

    it("should keep the user signed in when clearing the secure storage fails", async () => {
      // Arrange
      mockStorage.getItem.mockResolvedValue(JSON.stringify(RAW_USER));
      mockStorage.multiRemove.mockRejectedValue(new Error("keychain verrouillé"));
      const { result } = await renderAuth();

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(console.error).toHaveBeenCalledWith("Logout error:", expect.any(Error));
      expect(result.current.user).not.toBeNull();
    });
  });

  describe("mise à jour du profil", () => {
    it("should expose the profile handlers provided by the profile hook", async () => {
      // Arrange & Act
      const { result } = await renderAuth();

      // Assert
      expect(result.current.updateUser).toBe(profileHandlers.updateUser);
      expect(result.current.updateAvatar).toBe(profileHandlers.updateAvatar);
      expect(result.current.updateSettings).toBe(profileHandlers.updateSettings);
    });

    it("should refresh the exposed user when the profile hook reports an update", async () => {
      // Arrange
      const { result } = await renderAuth();
      const updatedUser = { ...RAW_USER, name: "Ada Lovelace" };

      // Act
      await act(async () => {
        lastProfileOptions.onUserUpdated(updatedUser);
      });

      // Assert
      expect(result.current.user).toEqual(updatedUser);
    });
  });

  describe("verifyOtp", () => {
    it("should open the session when the code is valid and a token is returned", async () => {
      // Arrange
      mockApi.verifyOtp.mockResolvedValue({
        success: true,
        token: "jwt-token",
        refreshToken: "refresh-token",
        user: RAW_USER,
      });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.verifyOtp("user-1", "123456");
      });

      // Assert
      expect(outcome).toEqual({ success: true });
      expect(mockStorage.setItem).toHaveBeenCalledWith("token", "jwt-token");
      expect(result.current.user).toEqual({
        ...RAW_USER,
        createdAt: new Date(RAW_USER.createdAt),
      });
    });

    it("should not persist a refresh token when the verification omits it", async () => {
      // Arrange
      mockApi.verifyOtp.mockResolvedValue({ success: true, token: "jwt", user: RAW_USER });
      const { result } = await renderAuth();

      // Act
      await act(async () => {
        await result.current.verifyOtp("user-1", "123456");
      });

      // Assert
      expect(mockStorage.setItem).not.toHaveBeenCalledWith("refreshToken", expect.anything());
    });

    it("should succeed without opening a session when no token is returned", async () => {
      // Arrange
      mockApi.verifyOtp.mockResolvedValue({ success: true });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.verifyOtp("user-1", "123456");
      });

      // Assert
      expect(outcome).toEqual({ success: true });
      expect(result.current.user).toBeNull();
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it("should surface the API error when the code is refused", async () => {
      // Arrange
      mockApi.verifyOtp.mockResolvedValue({ success: false, error: "Code expiré" });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.verifyOtp("user-1", "000000");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "Code expiré" });
    });

    it("should use the default verification message when the API answers nothing", async () => {
      // Arrange
      mockApi.verifyOtp.mockResolvedValue(null);
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.verifyOtp("user-1", "000000");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "otp.genericVerifyError" });
    });

    it("should translate the rejection when the verification request fails", async () => {
      // Arrange
      mockApi.verifyOtp.mockRejectedValue(new Error("boom"));
      mockTranslateApiMessage.mockReturnValue("Erreur traduite");
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.verifyOtp("user-1", "000000");
      });

      // Assert
      expect(outcome).toEqual({ success: false, error: "Erreur traduite" });
    });
  });

  describe("loginWithToken", () => {
    it("should persist the provided session and expose the user", async () => {
      // Arrange
      const { result } = await renderAuth();
      const user = { ...RAW_USER, createdAt: new Date(RAW_USER.createdAt) };

      // Act
      await act(async () => {
        await result.current.loginWithToken("magic-token", user);
      });

      // Assert
      expect(mockStorage.setItem).toHaveBeenCalledWith("token", "magic-token");
      expect(mockStorage.setItem).toHaveBeenCalledWith("user", JSON.stringify(user));
      expect(result.current.user).toEqual(user);
    });
  });

  describe("deleteAccount", () => {
    it("should clear the session and return the scheduled date when the deletion is planned", async () => {
      // Arrange
      mockStorage.getItem.mockResolvedValue(JSON.stringify(RAW_USER));
      mockApi.deleteAccount.mockResolvedValue({ scheduledAt: "2026-01-08T00:00:00.000Z" });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.deleteAccount();
      });

      // Assert
      expect(outcome).toEqual({
        success: true,
        scheduledAt: new Date("2026-01-08T00:00:00.000Z"),
      });
      expect(mockStorage.multiRemove).toHaveBeenCalledWith(["token", "refreshToken", "user"]);
      expect(result.current.user).toBeNull();
    });

    it("should clear the session without a scheduled date when the API omits it", async () => {
      // Arrange
      mockApi.deleteAccount.mockResolvedValue({});
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.deleteAccount();
      });

      // Assert
      expect(outcome).toEqual({ success: true, scheduledAt: undefined });
    });

    it("should report a failure and keep the session when the deletion request fails", async () => {
      // Arrange
      mockStorage.getItem.mockResolvedValue(JSON.stringify(RAW_USER));
      mockApi.deleteAccount.mockRejectedValue(new Error("serveur indisponible"));
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.deleteAccount();
      });

      // Assert
      expect(outcome).toEqual({ success: false });
      expect(result.current.user).not.toBeNull();
    });
  });

  describe("changePassword", () => {
    it("should succeed when the API confirms the change", async () => {
      // Arrange
      mockApi.changePassword.mockResolvedValue({ success: true });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.changePassword("ancien", "nouveau");
      });

      // Assert
      expect(mockApi.changePassword).toHaveBeenCalledWith({
        currentPassword: "ancien",
        newPassword: "nouveau",
      });
      expect(outcome).toBe(true);
    });

    it("should fail when the API does not confirm the change", async () => {
      // Arrange
      mockApi.changePassword.mockResolvedValue({ success: false });
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.changePassword("ancien", "nouveau");
      });

      // Assert
      expect(outcome).toBe(false);
    });

    it("should fail when the change request rejects", async () => {
      // Arrange
      mockApi.changePassword.mockRejectedValue(new Error("mot de passe actuel invalide"));
      const { result } = await renderAuth();

      // Act
      let outcome;
      await act(async () => {
        outcome = await result.current.changePassword("ancien", "nouveau");
      });

      // Assert
      expect(outcome).toBe(false);
    });
  });
});
