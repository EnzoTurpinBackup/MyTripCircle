import "./support/screenMocks";

import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import ForgotPasswordScreen from "../ForgotPasswordScreen";
import { lightColors, useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import ApiService from "../../services/ApiService";
import { parseApiError } from "../../utils/i18n";
import type { RootStackParamList } from "../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}|${Object.values(options).join(",")}` : key,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock("../../contexts/AuthContext", () => ({ useAuth: jest.fn() }));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

jest.mock("../../utils/i18n", () => ({ parseApiError: jest.fn() }));

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: {
    verifyResetToken: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

type AlertButton = { text?: string; onPress?: () => void };

const api = ApiService as unknown as {
  verifyResetToken: jest.Mock;
  requestPasswordReset: jest.Mock;
  resetPassword: jest.Mock;
};

const navigate = jest.fn();
const goBack = jest.fn();
const loginWithToken = jest.fn();

const RESET_CODE = "code-de-reinitialisation";
/**
 * Verrou de compilation : le paramètre lu par l'écran est celui que
 * `RootStackParamList` déclare et que le `parse` du navigateur extrait du lien
 * `mytripcircle://reset-password?code=…`. Renommer le paramètre d'un seul côté
 * de la chaîne fait échouer la vérification de types de cette déclaration.
 */
const ROUTE_PARAMS: RootStackParamList["ForgotPassword"] = { code: RESET_CODE };
const EMAIL = "voyageur@exemple.test";
/** Mot de passe conforme : 8+, majuscule, minuscule, chiffre, spécial. */
const STRONG = "Nouveau1!";

/** Monte l'écran en mode « demander un lien » (aucun code dans l'URL). */
const renderRequestMode = () => {
  (useRoute as jest.Mock).mockReturnValue({ params: undefined });
  render(<ForgotPasswordScreen />);
};

/** Monte l'écran en mode « choisir un nouveau mot de passe » et attend la vérification du code. */
const renderResetMode = async () => {
  (useRoute as jest.Mock).mockReturnValue({ params: ROUTE_PARAMS });
  render(<ForgotPasswordScreen />);
  await act(async () => {});
};

const lastAlertButtons = (alert: jest.SpyInstance): AlertButton[] =>
  (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];

describe("ForgotPasswordScreen", () => {
  let alert: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    error = jest.spyOn(console, "error").mockImplementation(() => {});
    (useNavigation as jest.Mock).mockReturnValue({ navigate, goBack });
    (useTheme as jest.Mock).mockReturnValue({ colors: lightColors });
    (useAuth as jest.Mock).mockReturnValue({ loginWithToken });
    (parseApiError as jest.Mock).mockReturnValue("");
    api.verifyResetToken.mockResolvedValue({ success: true });
    api.requestPasswordReset.mockResolvedValue(undefined);
    api.resetPassword.mockResolvedValue({});
    loginWithToken.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("demande de lien de réinitialisation", () => {
    it("should show the request heading when no reset code is present", () => {
      // Arrange & Act
      renderRequestMode();

      // Assert
      expect(screen.getByText("forgotPassword.title")).toBeTruthy();
      expect(screen.getByText("forgotPassword.subtitle")).toBeTruthy();
      expect(screen.getByText("forgotPassword.spamHint")).toBeTruthy();
      expect(api.verifyResetToken).not.toHaveBeenCalled();
    });

    it("should refuse an empty address without calling the API", () => {
      // Arrange
      renderRequestMode();

      // Act
      fireEvent.press(screen.getByText("forgotPassword.sendResetLink"));

      // Assert
      expect(screen.getByText("common.fillAllFields")).toBeTruthy();
      expect(api.requestPasswordReset).not.toHaveBeenCalled();
    });

    it("should refuse a malformed address without calling the API", () => {
      // Arrange
      renderRequestMode();

      // Act
      fireEvent.changeText(screen.getByLabelText("common.email"), "pas-une-adresse");
      fireEvent.press(screen.getByText("forgotPassword.sendResetLink"));

      // Assert
      expect(screen.getByText("common.invalidEmail")).toBeTruthy();
      expect(api.requestPasswordReset).not.toHaveBeenCalled();
    });

    it("should validate the address when the field loses focus", () => {
      // Arrange
      renderRequestMode();

      // Act
      fireEvent(screen.getByLabelText("common.email"), "blur");

      // Assert
      expect(screen.getByText("common.fillAllFields")).toBeTruthy();
    });

    it("should clear the pending error as soon as the address is edited again", () => {
      // Arrange
      renderRequestMode();
      fireEvent(screen.getByLabelText("common.email"), "blur");

      // Act
      fireEvent.changeText(screen.getByLabelText("common.email"), EMAIL);

      // Assert
      expect(screen.queryByText("common.fillAllFields")).toBeNull();
    });

    it("should confirm the sending and switch to the success panel when the API accepts", async () => {
      // Arrange
      renderRequestMode();
      fireEvent.changeText(screen.getByLabelText("common.email"), EMAIL);

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("forgotPassword.sendResetLink"));
      });

      // Assert
      expect(api.requestPasswordReset).toHaveBeenCalledWith(EMAIL);
      expect(alert).toHaveBeenCalledWith(
        "forgotPassword.emailSentTitle",
        `forgotPassword.emailSentMessage|${EMAIL}`,
      );
      expect(screen.getByText("forgotPassword.checkEmailHint")).toBeTruthy();
      expect(screen.queryByLabelText("common.email")).toBeNull();
    });

    it("should surface the translated API message when the request fails", async () => {
      // Arrange
      (parseApiError as jest.Mock).mockReturnValue("compte introuvable");
      api.requestPasswordReset.mockRejectedValue(new Error("404"));
      renderRequestMode();
      fireEvent.changeText(screen.getByLabelText("common.email"), EMAIL);

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("forgotPassword.sendResetLink"));
      });

      // Assert
      expect(screen.getByText("compte introuvable")).toBeTruthy();
      expect(error).toHaveBeenCalledWith("Error requesting password reset:", expect.any(Error));
    });

    it("should fall back to a generic message when the API error cannot be translated", async () => {
      // Arrange
      api.requestPasswordReset.mockRejectedValue(new Error("boom"));
      renderRequestMode();
      fireEvent.changeText(screen.getByLabelText("common.email"), EMAIL);

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("forgotPassword.sendResetLink"));
      });

      // Assert
      expect(screen.getByText("forgotPassword.requestError")).toBeTruthy();
    });

    it("should announce the pending state while the request is in flight", async () => {
      // Arrange
      let release: () => void = () => {};
      api.requestPasswordReset.mockReturnValue(new Promise<void>((r) => { release = r; }));
      renderRequestMode();
      fireEvent.changeText(screen.getByLabelText("common.email"), EMAIL);

      // Act
      fireEvent.press(screen.getByText("forgotPassword.sendResetLink"));

      // Assert
      expect(screen.getByText("common.pleaseWait")).toBeTruthy();
      await act(async () => { release(); });
    });

    it("should go back when the back button is pressed", () => {
      // Arrange
      renderRequestMode();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(goBack).toHaveBeenCalledTimes(1);
    });

    // Le lien du courriel a longtemps été lu sous le nom `token`, qui n'était
    // jamais transmis : l'utilisateur retombait alors sur le formulaire de
    // demande. Ce nom ne doit plus rien déclencher.
    it("should show the request form when the route carries a parameter named token", () => {
      // Arrange
      (useRoute as jest.Mock).mockReturnValue({ params: { token: RESET_CODE } });

      // Act
      render(<ForgotPasswordScreen />);

      // Assert
      expect(screen.getByText("forgotPassword.sendResetLink")).toBeTruthy();
      expect(api.verifyResetToken).not.toHaveBeenCalled();
    });
  });

  describe("vérification du code reçu par courriel", () => {
    it("should show a verifying placeholder while the reset code is being checked", () => {
      // Arrange
      api.verifyResetToken.mockReturnValue(new Promise(() => {}));
      (useRoute as jest.Mock).mockReturnValue({ params: ROUTE_PARAMS });

      // Act
      render(<ForgotPasswordScreen />);

      // Assert
      expect(screen.getByText("forgotPassword.verifyingToken")).toBeTruthy();
      expect(api.verifyResetToken).toHaveBeenCalledWith(RESET_CODE);
    });

    it("should show the reset form once the code is accepted", async () => {
      // Arrange & Act
      await renderResetMode();

      // Assert
      expect(screen.getByText("forgotPassword.resetPasswordTitle")).toBeTruthy();
      expect(screen.getByLabelText("forgotPassword.newPasswordLabel")).toBeTruthy();
    });

    it("should show the expired link panel when the code is refused", async () => {
      // Arrange
      api.verifyResetToken.mockResolvedValue({ success: false });

      // Act
      await renderResetMode();

      // Assert
      expect(screen.getByText("forgotPassword.invalidLinkTitle")).toBeTruthy();
      expect(screen.getByText("forgotPassword.invalidLinkMessage")).toBeTruthy();
    });

    it("should show the expired link panel when the verification request fails", async () => {
      // Arrange
      api.verifyResetToken.mockRejectedValue(new Error("réseau"));

      // Act
      await renderResetMode();

      // Assert
      expect(screen.getByText("forgotPassword.invalidLinkTitle")).toBeTruthy();
    });

    it("should send the user back to the login screen from the expired link panel", async () => {
      // Arrange
      api.verifyResetToken.mockResolvedValue({ success: false });
      await renderResetMode();

      // Act
      fireEvent.press(screen.getByText("forgotPassword.backToLogin"));

      // Assert
      expect(navigate).toHaveBeenCalledWith("Auth");
    });
  });

  describe("choix du nouveau mot de passe", () => {
    const fillReset = (next: string, confirm: string) => {
      fireEvent.changeText(screen.getByLabelText("forgotPassword.newPasswordLabel"), next);
      fireEvent.changeText(screen.getByLabelText("forgotPassword.confirmPasswordLabel"), confirm);
    };

    const submitReset = async () => {
      await act(async () => {
        fireEvent.press(screen.getByText("forgotPassword.resetPassword"));
      });
    };

    it("should refuse an empty password without calling the API", async () => {
      // Arrange
      await renderResetMode();

      // Act
      await submitReset();

      // Assert
      expect(screen.getAllByText("common.fillAllFields")).toHaveLength(2);
      expect(api.resetPassword).not.toHaveBeenCalled();
    });

    it("should refuse a password that does not meet the strength policy", async () => {
      // Arrange
      await renderResetMode();
      fillReset("tropfaible", "tropfaible");

      // Act
      await submitReset();

      // Assert
      expect(screen.getByText("common.invalidPassword")).toBeTruthy();
      expect(api.resetPassword).not.toHaveBeenCalled();
    });

    it("should refuse a confirmation that differs from the new password", async () => {
      // Arrange
      await renderResetMode();
      fillReset(STRONG, `${STRONG}x`);

      // Act
      await submitReset();

      // Assert
      expect(screen.getByText("forgotPassword.passwordsDontMatch")).toBeTruthy();
      expect(api.resetPassword).not.toHaveBeenCalled();
    });

    it("should validate the strength as soon as the password field loses focus", async () => {
      // Arrange
      await renderResetMode();
      fireEvent.changeText(screen.getByLabelText("forgotPassword.newPasswordLabel"), "faible");

      // Act
      fireEvent(screen.getByLabelText("forgotPassword.newPasswordLabel"), "blur");

      // Assert
      expect(screen.getByText("common.invalidPassword")).toBeTruthy();
    });

    it("should clear the password error as soon as the field is edited again", async () => {
      // Arrange
      await renderResetMode();
      fireEvent.changeText(screen.getByLabelText("forgotPassword.newPasswordLabel"), "faible");
      fireEvent(screen.getByLabelText("forgotPassword.newPasswordLabel"), "blur");

      // Act
      fireEvent.changeText(screen.getByLabelText("forgotPassword.newPasswordLabel"), STRONG);

      // Assert
      expect(screen.queryByText("common.invalidPassword")).toBeNull();
    });

    it("should clear the confirmation error as soon as the field is edited again", async () => {
      // Arrange
      await renderResetMode();
      fillReset(STRONG, `${STRONG}x`);
      await submitReset();

      // Act
      fireEvent.changeText(screen.getByLabelText("forgotPassword.confirmPasswordLabel"), STRONG);

      // Assert
      expect(screen.queryByText("forgotPassword.passwordsDontMatch")).toBeNull();
    });

    it("should sign the user in directly when the API returns a session", async () => {
      // Arrange
      const user = { id: "u1", name: "Ada" };
      api.resetPassword.mockResolvedValue({ token: "jeton-de-session", user });
      await renderResetMode();
      fillReset(STRONG, STRONG);

      // Act
      await submitReset();

      // Assert
      expect(api.resetPassword).toHaveBeenCalledWith(RESET_CODE, STRONG);
      expect(loginWithToken).toHaveBeenCalledWith("jeton-de-session", user);
      expect(alert).not.toHaveBeenCalled();
    });

    it("should ask the user to sign in again when the API returns no session", async () => {
      // Arrange
      await renderResetMode();
      fillReset(STRONG, STRONG);

      // Act
      await submitReset();

      // Assert
      expect(loginWithToken).not.toHaveBeenCalled();
      expect(alert).toHaveBeenCalledWith(
        "forgotPassword.successTitle",
        "forgotPassword.successMessage",
        expect.any(Array),
      );

      // Act — l'utilisateur acquitte la confirmation
      lastAlertButtons(alert)[0].onPress?.();

      // Assert
      expect(navigate).toHaveBeenCalledWith("Auth");
    });

    it("should surface the translated API message when the reset fails", async () => {
      // Arrange
      (parseApiError as jest.Mock).mockReturnValue("lien expiré");
      api.resetPassword.mockRejectedValue(new Error("410"));
      await renderResetMode();
      fillReset(STRONG, STRONG);

      // Act
      await submitReset();

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "lien expiré");
      expect(error).toHaveBeenCalledWith("Error resetting password:", expect.any(Error));
    });

    it("should fall back to a generic message when the reset error cannot be translated", async () => {
      // Arrange
      api.resetPassword.mockRejectedValue(new Error("boom"));
      await renderResetMode();
      fillReset(STRONG, STRONG);

      // Act
      await submitReset();

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "forgotPassword.resetError");
    });

    it("should announce the pending state while the reset is in flight", async () => {
      // Arrange
      let release: (value: unknown) => void = () => {};
      api.resetPassword.mockReturnValue(new Promise((r) => { release = r; }));
      await renderResetMode();
      fillReset(STRONG, STRONG);

      // Act
      fireEvent.press(screen.getByText("forgotPassword.resetPassword"));

      // Assert
      await waitFor(() => {
        expect(screen.getByText("common.pleaseWait")).toBeTruthy();
      });
      await act(async () => { release({}); });
    });

    it("should reveal the new password when its eye toggle is pressed", async () => {
      // Arrange
      await renderResetMode();

      // Act
      fireEvent.press(screen.getAllByRole("button", { name: "common.a11y.showPassword" })[0]);

      // Assert
      expect(
        screen.getByLabelText("forgotPassword.newPasswordLabel").props.secureTextEntry,
      ).toBe(false);
      expect(screen.getByRole("button", { name: "common.a11y.hidePassword" })).toBeTruthy();
    });

    it("should reveal the confirmation password when its eye toggle is pressed", async () => {
      // Arrange
      await renderResetMode();

      // Act
      fireEvent.press(screen.getAllByRole("button", { name: "common.a11y.showPassword" })[1]);

      // Assert
      expect(
        screen.getByLabelText("forgotPassword.confirmPasswordLabel").props.secureTextEntry,
      ).toBe(false);
    });
  });
});
