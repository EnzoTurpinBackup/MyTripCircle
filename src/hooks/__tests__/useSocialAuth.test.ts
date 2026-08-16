import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import useSocialAuth from "../useSocialAuth";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("expo-apple-authentication", () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

const mockLoginWithGoogle = jest.fn();
const mockLoginWithApple = jest.fn();
jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    loginWithGoogle: mockLoginWithGoogle,
    loginWithApple: mockLoginWithApple,
  }),
}));

jest.mock("../../utils/i18n", () => ({
  parseApiError: jest.fn((error: unknown) => (error as Error)?.message ?? ""),
}));

const mockSignInAsync = AppleAuthentication.signInAsync as unknown as jest.Mock;
const INITIAL_DEV = (globalThis as unknown as { __DEV__: boolean }).__DEV__;

const APPLE_CREDENTIAL = {
  identityToken: "apple-token",
  email: "ana@example.com",
  fullName: { givenName: "Ana" },
};

describe("useSocialAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = INITIAL_DEV;
    jest.restoreAllMocks();
  });

  describe("handleGoogleToken", () => {
    it("should default to the register mode when no mode is given", async () => {
      // Arrange
      mockLoginWithGoogle.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleGoogleToken("google-token");
      });

      // Assert
      expect(mockLoginWithGoogle).toHaveBeenCalledWith("google-token", "register");
    });

    it("should forward the login mode when it is given", async () => {
      // Arrange
      mockLoginWithGoogle.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useSocialAuth("login"));

      // Act
      await act(async () => {
        await result.current.handleGoogleToken("google-token");
      });

      // Assert
      expect(mockLoginWithGoogle).toHaveBeenCalledWith("google-token", "login");
    });

    it("should not alert the user when the login succeeds", async () => {
      // Arrange
      mockLoginWithGoogle.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleGoogleToken("google-token");
      });

      // Assert
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it("should surface the parsed server error when the login is refused with a reason", async () => {
      // Arrange
      mockLoginWithGoogle.mockResolvedValue({ success: false, error: "Account disabled" });
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleGoogleToken("google-token");
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "Account disabled");
    });

    it("should fall back to a generic message when the login is refused without a reason", async () => {
      // Arrange
      mockLoginWithGoogle.mockResolvedValue({ success: false });
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleGoogleToken("google-token");
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "common.unexpectedError");
    });

    it("should alert a generic error when the login throws", async () => {
      // Arrange
      mockLoginWithGoogle.mockRejectedValue(new Error("network down"));
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleGoogleToken("google-token");
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "common.unexpectedError");
    });

    it("should stay silent in the console when the login throws outside dev mode", async () => {
      // Arrange
      (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
      mockLoginWithGoogle.mockRejectedValue(new Error("network down"));
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleGoogleToken("google-token");
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
    });

    it("should clear the submitting flag once the login settles", async () => {
      // Arrange
      mockLoginWithGoogle.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleGoogleToken("google-token");
      });

      // Assert
      expect(result.current.isSocialSubmitting).toBe(false);
    });
  });

  describe("handleAppleSignIn", () => {
    it("should request the full name and email scopes", async () => {
      // Arrange
      mockSignInAsync.mockResolvedValue(APPLE_CREDENTIAL);
      mockLoginWithApple.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleAppleSignIn();
      });

      // Assert
      expect(mockSignInAsync).toHaveBeenCalledWith({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    });

    it("should forward the identity token, email and full name when Apple returns them", async () => {
      // Arrange
      mockSignInAsync.mockResolvedValue(APPLE_CREDENTIAL);
      mockLoginWithApple.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useSocialAuth("login"));

      // Act
      await act(async () => {
        await result.current.handleAppleSignIn();
      });

      // Assert
      expect(mockLoginWithApple).toHaveBeenCalledWith(
        "apple-token",
        "ana@example.com",
        { givenName: "Ana" },
        "login",
      );
    });

    it("should send undefined instead of null when Apple hides the email and full name", async () => {
      // Arrange
      mockSignInAsync.mockResolvedValue({ identityToken: "apple-token", email: null, fullName: null });
      mockLoginWithApple.mockResolvedValue({ success: true });
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleAppleSignIn();
      });

      // Assert
      expect(mockLoginWithApple).toHaveBeenCalledWith("apple-token", undefined, undefined, "register");
    });

    it("should not attempt a login when Apple returns no identity token", async () => {
      // Arrange
      mockSignInAsync.mockResolvedValue({ identityToken: null });
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleAppleSignIn();
      });

      // Assert
      expect(mockLoginWithApple).not.toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it("should surface the parsed server error when the login is refused with a reason", async () => {
      // Arrange
      mockSignInAsync.mockResolvedValue(APPLE_CREDENTIAL);
      mockLoginWithApple.mockResolvedValue({ success: false, error: "Apple account blocked" });
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleAppleSignIn();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "Apple account blocked");
    });

    it("should fall back to a generic message when the login is refused without a reason", async () => {
      // Arrange
      mockSignInAsync.mockResolvedValue(APPLE_CREDENTIAL);
      mockLoginWithApple.mockResolvedValue({ success: false });
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleAppleSignIn();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "common.unexpectedError");
    });

    it("should stay silent when the user cancels the Apple prompt", async () => {
      // Arrange
      mockSignInAsync.mockRejectedValue(Object.assign(new Error("cancelled"), { code: "ERR_CANCELED" }));
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleAppleSignIn();
      });

      // Assert
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it("should surface the parsed error when the Apple prompt fails for another reason", async () => {
      // Arrange
      mockSignInAsync.mockRejectedValue(Object.assign(new Error("Apple is down"), { code: "ERR_UNKNOWN" }));
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleAppleSignIn();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "Apple is down");
    });

    it("should fall back to a generic message when the thrown error cannot be parsed", async () => {
      // Arrange
      mockSignInAsync.mockRejectedValue(Object.assign(new Error(""), { code: "ERR_UNKNOWN" }));
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleAppleSignIn();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith("common.error", "common.unexpectedError");
    });

    it("should clear the submitting flag once the Apple flow settles", async () => {
      // Arrange
      mockSignInAsync.mockRejectedValue(Object.assign(new Error("cancelled"), { code: "ERR_CANCELED" }));
      const { result } = renderHook(() => useSocialAuth());

      // Act
      await act(async () => {
        await result.current.handleAppleSignIn();
      });

      // Assert
      expect(result.current.isSocialSubmitting).toBe(false);
    });
  });
});
