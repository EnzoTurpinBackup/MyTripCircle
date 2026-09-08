import "./support/screenMocks";

import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import ChangePasswordScreen from "../ChangePasswordScreen";
import { lightColors, useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNetwork } from "../../contexts/NetworkContext";
import { useNavigation } from "@react-navigation/native";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({ useNavigation: jest.fn() }));

jest.mock("../../contexts/AuthContext", () => ({ useAuth: jest.fn() }));

jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: jest.fn() }));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

/** Mot de passe conforme à la politique : 8+, majuscule, minuscule, chiffre, spécial. */
const STRONG = "Nouveau1!";
const OTHER_STRONG = "Ancien1!";

const goBack = jest.fn();
const changePassword = jest.fn();

const FIELDS = {
  current: "changePassword.currentPasswordPlaceholder",
  next: "changePassword.newPasswordPlaceholder",
  confirm: "changePassword.confirmPasswordPlaceholder",
};

/** Remplit les trois champs du formulaire puis déclenche l'enregistrement. */
const submitWith = async (current: string, next: string, confirm: string) => {
  fireEvent.changeText(screen.getByPlaceholderText(FIELDS.current), current);
  fireEvent.changeText(screen.getByPlaceholderText(FIELDS.next), next);
  fireEvent.changeText(screen.getByPlaceholderText(FIELDS.confirm), confirm);
  await act(async () => {
    fireEvent.press(screen.getByText("changePassword.saveButton"));
  });
};

describe("ChangePasswordScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (useNavigation as jest.Mock).mockReturnValue({ goBack });
    (useTheme as jest.Mock).mockReturnValue({ colors: lightColors });
    (useNetwork as jest.Mock).mockReturnValue({ isConnected: true });
    (useAuth as jest.Mock).mockReturnValue({ changePassword });
    changePassword.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("champs de saisie", () => {
    it("should mask every password field on first render", () => {
      // Arrange & Act
      render(<ChangePasswordScreen />);

      // Assert
      expect(screen.getByPlaceholderText(FIELDS.current).props.secureTextEntry).toBe(true);
      expect(screen.getByPlaceholderText(FIELDS.next).props.secureTextEntry).toBe(true);
      expect(screen.getByPlaceholderText(FIELDS.confirm).props.secureTextEntry).toBe(true);
    });

    it("should reveal only the field whose eye toggle is pressed", () => {
      // Arrange
      render(<ChangePasswordScreen />);

      // Act
      fireEvent.press(screen.getAllByText("icon:eye-off-outline")[0]);

      // Assert
      expect(screen.getByPlaceholderText(FIELDS.current).props.secureTextEntry).toBe(false);
      expect(screen.getByPlaceholderText(FIELDS.next).props.secureTextEntry).toBe(true);
    });

    it("should mask the field again when its eye toggle is pressed twice", () => {
      // Arrange
      render(<ChangePasswordScreen />);
      fireEvent.press(screen.getAllByText("icon:eye-off-outline")[0]);

      // Act
      fireEvent.press(screen.getByText("icon:eye-outline"));

      // Assert
      expect(screen.getByPlaceholderText(FIELDS.current).props.secureTextEntry).toBe(true);
    });
  });

  describe("validation avant envoi", () => {
    it("should refuse an incomplete form without calling the API", async () => {
      // Arrange
      render(<ChangePasswordScreen />);

      // Act
      await submitWith("", STRONG, STRONG);

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "changePassword.fillAllFields");
      expect(changePassword).not.toHaveBeenCalled();
    });

    it("should refuse a new password that does not meet the strength policy", async () => {
      // Arrange
      render(<ChangePasswordScreen />);

      // Act
      await submitWith(OTHER_STRONG, "tropfaible", "tropfaible");

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "common.invalidPassword");
      expect(changePassword).not.toHaveBeenCalled();
    });

    it("should refuse a confirmation that differs from the new password", async () => {
      // Arrange
      render(<ChangePasswordScreen />);

      // Act
      await submitWith(OTHER_STRONG, STRONG, `${STRONG}x`);

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "changePassword.passwordsDontMatch");
      expect(changePassword).not.toHaveBeenCalled();
    });

    it("should refuse a new password identical to the current one", async () => {
      // Arrange
      render(<ChangePasswordScreen />);

      // Act
      await submitWith(STRONG, STRONG, STRONG);

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "changePassword.passwordMustBeDifferent");
      expect(changePassword).not.toHaveBeenCalled();
    });
  });

  describe("envoi du changement", () => {
    it("should send the current and the new password to the API when the form is valid", async () => {
      // Arrange
      render(<ChangePasswordScreen />);

      // Act
      await submitWith(OTHER_STRONG, STRONG, STRONG);

      // Assert
      expect(changePassword).toHaveBeenCalledWith(OTHER_STRONG, STRONG);
    });

    it("should confirm, clear the form and leave the screen when the API accepts", async () => {
      // Arrange
      render(<ChangePasswordScreen />);

      // Act
      await submitWith(OTHER_STRONG, STRONG, STRONG);

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "changePassword.successTitle",
        "changePassword.successMessage",
      );
      expect(screen.getByPlaceholderText(FIELDS.current).props.value).toBe("");
      expect(screen.getByPlaceholderText(FIELDS.next).props.value).toBe("");
      expect(screen.getByPlaceholderText(FIELDS.confirm).props.value).toBe("");
      expect(goBack).toHaveBeenCalledTimes(1);
    });

    it("should report an error and stay on the screen when the API refuses", async () => {
      // Arrange
      changePassword.mockResolvedValue(false);
      render(<ChangePasswordScreen />);

      // Act
      await submitWith(OTHER_STRONG, STRONG, STRONG);

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "changePassword.errorMessage");
      expect(goBack).not.toHaveBeenCalled();
      expect(screen.getByPlaceholderText(FIELDS.current).props.value).toBe(OTHER_STRONG);
    });

    it("should announce the pending state while the API call is in flight", async () => {
      // Arrange
      let resolveCall: (value: boolean) => void = () => {};
      changePassword.mockReturnValue(new Promise<boolean>((r) => { resolveCall = r; }));
      render(<ChangePasswordScreen />);
      fireEvent.changeText(screen.getByPlaceholderText(FIELDS.current), OTHER_STRONG);
      fireEvent.changeText(screen.getByPlaceholderText(FIELDS.next), STRONG);
      fireEvent.changeText(screen.getByPlaceholderText(FIELDS.confirm), STRONG);

      // Act
      fireEvent.press(screen.getByText("changePassword.saveButton"));

      // Assert
      expect(screen.getByText("changePassword.saving")).toBeTruthy();
      await act(async () => { resolveCall(true); });
      expect(screen.getByText("changePassword.saveButton")).toBeTruthy();
    });

    it("should ignore a press while the API call is already in flight", async () => {
      // Arrange
      let resolveCall: (value: boolean) => void = () => {};
      changePassword.mockReturnValue(new Promise<boolean>((r) => { resolveCall = r; }));
      render(<ChangePasswordScreen />);
      fireEvent.changeText(screen.getByPlaceholderText(FIELDS.current), OTHER_STRONG);
      fireEvent.changeText(screen.getByPlaceholderText(FIELDS.next), STRONG);
      fireEvent.changeText(screen.getByPlaceholderText(FIELDS.confirm), STRONG);
      fireEvent.press(screen.getByText("changePassword.saveButton"));

      // Act
      fireEvent.press(screen.getByText("changePassword.saving"));

      // Assert
      expect(changePassword).toHaveBeenCalledTimes(1);
      await act(async () => { resolveCall(true); });
    });
  });

  describe("mode hors ligne", () => {
    it("should block the submit button when the device has no connection", async () => {
      // Arrange
      (useNetwork as jest.Mock).mockReturnValue({ isConnected: false });
      render(<ChangePasswordScreen />);
      fireEvent.changeText(screen.getByPlaceholderText(FIELDS.current), OTHER_STRONG);
      fireEvent.changeText(screen.getByPlaceholderText(FIELDS.next), STRONG);
      fireEvent.changeText(screen.getByPlaceholderText(FIELDS.confirm), STRONG);

      // Act
      fireEvent.press(screen.getByText("changePassword.saveButton"));

      // Assert
      await waitFor(() => {
        expect(changePassword).not.toHaveBeenCalled();
      });
    });
  });

  describe("navigation", () => {
    it("should go back when the back button is pressed", () => {
      // Arrange
      render(<ChangePasswordScreen />);

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });
});
