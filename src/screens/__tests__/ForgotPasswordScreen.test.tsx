import "./support/screenMocks";

import React from "react";
import { act, render, screen } from "@testing-library/react-native";
import { useRoute } from "@react-navigation/native";

import ForgotPasswordScreen from "../ForgotPasswordScreen";
import ApiService from "../../services/ApiService";
import type { RootStackParamList } from "../../types";

// On renvoie la clé de traduction plutôt que le libellé : les assertions
// restent lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

jest.mock("@react-navigation/native", () => ({
  useRoute: jest.fn(),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ loginWithToken: jest.fn() }),
}));

jest.mock("../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../contexts/ThemeContext");
  return { ...actual, useTheme: () => ({ colors: actual.lightColors }) };
});

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: {
    verifyResetToken: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

const RESET_CODE = "reset-code-123";

/**
 * Verrou de compilation : le paramètre lu par l'écran est celui que
 * `RootStackParamList` déclare et que le `parse` du navigateur extrait du lien
 * `mytripcircle://reset-password?code=…`. Renommer le paramètre d'un seul côté
 * de la chaîne fait échouer la vérification de types de cette déclaration.
 */
const ROUTE_PARAMS: RootStackParamList["ForgotPassword"] = { code: RESET_CODE };

const mockUseRoute = useRoute as jest.Mock;
const mockVerifyResetToken = (ApiService as unknown as { verifyResetToken: jest.Mock })
  .verifyResetToken;

/** Monte l'écran avec les paramètres de route donnés et laisse la vérification aboutir. */
const renderScreen = async (params?: Record<string, string>) => {
  mockUseRoute.mockReturnValue({ params });
  render(<ForgotPasswordScreen />);
  await act(async () => {});
};

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyResetToken.mockResolvedValue({ success: true });
  });

  describe("mode « choix du nouveau mot de passe »", () => {
    it("should show the new password form when the route carries a reset code", async () => {
      // Arrange & Act
      await renderScreen(ROUTE_PARAMS);

      // Assert
      expect(screen.getByText("forgotPassword.newPasswordLabel")).toBeTruthy();
    });

    it("should title the screen as a reset when the route carries a reset code", async () => {
      // Arrange & Act
      await renderScreen(ROUTE_PARAMS);

      // Assert
      expect(screen.getByText("forgotPassword.resetPasswordTitle")).toBeTruthy();
    });

    it("should verify the reset code with the server when the route carries one", async () => {
      // Arrange & Act
      await renderScreen(ROUTE_PARAMS);

      // Assert
      expect(mockVerifyResetToken).toHaveBeenCalledWith(RESET_CODE);
    });

    it("should announce a dead link when the server rejects the reset code", async () => {
      // Arrange
      mockVerifyResetToken.mockResolvedValue({ success: false });

      // Act
      await renderScreen(ROUTE_PARAMS);

      // Assert
      expect(screen.getByText("forgotPassword.invalidLinkTitle")).toBeTruthy();
    });
  });

  describe("mode « demande d'envoi »", () => {
    it("should show the request form when the route carries no parameter", async () => {
      // Arrange & Act
      await renderScreen(undefined);

      // Assert
      expect(screen.getByText("forgotPassword.sendResetLink")).toBeTruthy();
    });

    it("should show no new password form when the route carries no parameter", async () => {
      // Arrange & Act
      await renderScreen(undefined);

      // Assert
      expect(screen.queryByText("forgotPassword.newPasswordLabel")).toBeNull();
    });

    it("should call no verification when the route carries no parameter", async () => {
      // Arrange & Act
      await renderScreen(undefined);

      // Assert
      expect(mockVerifyResetToken).not.toHaveBeenCalled();
    });

    // Le lien du courriel a longtemps été lu sous le nom `token`, qui n'était
    // jamais transmis : l'utilisateur retombait alors sur le formulaire de
    // demande. Ce nom ne doit plus rien déclencher.
    it("should show the request form when the route carries a parameter named token", async () => {
      // Arrange & Act
      await renderScreen({ token: RESET_CODE });

      // Assert
      expect(screen.getByText("forgotPassword.sendResetLink")).toBeTruthy();
    });
  });
});
