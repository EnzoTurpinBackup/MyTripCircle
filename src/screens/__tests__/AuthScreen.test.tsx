import "./support/screenMocks";

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import AuthScreen from "../AuthScreen";
import { lightColors, useTheme } from "../../contexts/ThemeContext";
import { useAuthForm } from "../../hooks/useAuthForm";
import { useNavigation } from "@react-navigation/native";

jest.mock("@react-navigation/native", () => ({ useNavigation: jest.fn() }));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

jest.mock("../../hooks/useAuthForm", () => ({ useAuthForm: jest.fn() }));

jest.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: jest.fn() }));

jest.mock("expo-auth-session/providers/google", () => ({ useAuthRequest: jest.fn() }));

jest.mock("../../components/auth/LoginForm", () =>
  require("./support/authFormStub").createFormStub("login", [
    "onSubmit",
    "onSwitchToRegister",
    "onForgotPassword",
    "onBackToWelcome",
    "onGooglePress",
    "onApplePress",
  ]),
);

jest.mock("../../components/auth/RegisterForm", () =>
  require("./support/authFormStub").createFormStub("register", [
    "onSubmit",
    "onSwitchToLogin",
    "onBackToWelcome",
    "onNavigateTerms",
    "onNavigatePrivacy",
    "onGooglePress",
    "onApplePress",
  ]),
);

// Relevé à l'évaluation du module, avant que `jest.clearAllMocks()` n'efface
// l'appel émis au chargement d'`AuthScreen`.
const browserSessionCompletions = (WebBrowser.maybeCompleteAuthSession as jest.Mock).mock.calls.length;

const navigate = jest.fn();
const handleSubmit = jest.fn();
const handleGoogleToken = jest.fn();
const handleAppleSignIn = jest.fn();
const switchMode = jest.fn();
const googlePromptAsync = jest.fn();

const ACCESS_TOKEN = "jeton-google";

// Pilotés par les tests : `useAuthRequest` est appelé à chaque rendu.
let googleRequest: unknown = { clientId: "id-de-test" };
let googleResponse: unknown = null;

const press = (label: string) => fireEvent.press(screen.getByRole("button", { name: label }));

const renderScreen = (initialMode?: "login" | "register") =>
  render(<AuthScreen route={initialMode ? { params: { initialMode } } : undefined} />);

describe("AuthScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    googleRequest = { clientId: "id-de-test" };
    googleResponse = null;
    (useNavigation as jest.Mock).mockReturnValue({ navigate });
    (useTheme as jest.Mock).mockReturnValue({ colors: lightColors });
    (Google.useAuthRequest as jest.Mock).mockImplementation(() => [
      googleRequest,
      googleResponse,
      googlePromptAsync,
    ]);
    (useAuthForm as jest.Mock).mockReturnValue({
      email: "",
      password: "",
      errors: { email: "", password: "", confirmPassword: "", name: "", phone: "" },
      busy: false,
      handleSubmit,
      handleGoogleToken,
      handleAppleSignIn,
      switchMode,
    });
  });

  describe("choix du formulaire", () => {
    it("should complete any pending browser session when the module is loaded", () => {
      // Assert — sans quoi la fenêtre OAuth resterait ouverte après le retour
      // dans l'application.
      expect(browserSessionCompletions).toBe(1);
    });

    it("should open the login form when the screen is reached without parameters", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(screen.getByRole("button", { name: "login:onSubmit" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "register:onSubmit" })).toBeNull();
    });

    it("should open the login form when the login mode is requested", () => {
      // Arrange & Act
      renderScreen("login");

      // Assert
      expect(screen.getByRole("button", { name: "login:onSubmit" })).toBeTruthy();
    });

    it("should open the registration form when the register mode is requested", () => {
      // Arrange & Act
      renderScreen("register");

      // Assert
      expect(screen.getByRole("button", { name: "register:onSubmit" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "login:onSubmit" })).toBeNull();
    });

    it("should swap to the registration form and reset the shared state", () => {
      // Arrange
      renderScreen();

      // Act
      press("login:onSwitchToRegister");

      // Assert
      expect(screen.getByRole("button", { name: "register:onSubmit" })).toBeTruthy();
      expect(switchMode).toHaveBeenCalledTimes(1);
    });

    it("should swap back to the login form and reset the shared state", () => {
      // Arrange
      renderScreen("register");

      // Act
      press("register:onSwitchToLogin");

      // Assert
      expect(screen.getByRole("button", { name: "login:onSubmit" })).toBeTruthy();
      expect(switchMode).toHaveBeenCalledTimes(1);
    });
  });

  describe("soumission", () => {
    it("should submit the login form in login mode", () => {
      // Arrange
      renderScreen();

      // Act
      press("login:onSubmit");

      // Assert
      expect(handleSubmit).toHaveBeenCalledWith(true, expect.any(Function));
    });

    it("should submit the registration form in register mode", () => {
      // Arrange
      renderScreen("register");

      // Act
      press("register:onSubmit");

      // Assert
      expect(handleSubmit).toHaveBeenCalledWith(false, expect.any(Function));
    });

    it("should route an unverified account to the code verification screen", () => {
      // Arrange
      renderScreen();
      press("login:onSubmit");
      const onOtpRedirect = handleSubmit.mock.calls[0][1] as (id: string, mail: string) => void;

      // Act
      onOtpRedirect("utilisateur-1", "voyageur@exemple.test");

      // Assert
      expect(navigate).toHaveBeenCalledWith("Otp", {
        userId: "utilisateur-1",
        email: "voyageur@exemple.test",
      });
    });
  });

  describe("navigation annexe", () => {
    it("should open the password recovery screen from the login form", () => {
      // Arrange
      renderScreen();

      // Act
      press("login:onForgotPassword");

      // Assert
      expect(navigate).toHaveBeenCalledWith("ForgotPassword", {});
    });

    it("should return to the welcome screen from the login form", () => {
      // Arrange
      renderScreen();

      // Act
      press("login:onBackToWelcome");

      // Assert
      expect(navigate).toHaveBeenCalledWith("Welcome");
    });

    it("should return to the welcome screen from the registration form", () => {
      // Arrange
      renderScreen("register");

      // Act
      press("register:onBackToWelcome");

      // Assert
      expect(navigate).toHaveBeenCalledWith("Welcome");
    });

    it("should open the terms of use from the registration form", () => {
      // Arrange
      renderScreen("register");

      // Act
      press("register:onNavigateTerms");

      // Assert
      expect(navigate).toHaveBeenCalledWith("Terms");
    });

    it("should open the privacy policy from the registration form", () => {
      // Arrange
      renderScreen("register");

      // Act
      press("register:onNavigatePrivacy");

      // Assert
      expect(navigate).toHaveBeenCalledWith("Privacy");
    });
  });

  describe("authentification sociale", () => {
    it("should start the Google consent flow from the login form", () => {
      // Arrange
      renderScreen();

      // Act
      press("login:onGooglePress");

      // Assert
      expect(googlePromptAsync).toHaveBeenCalledTimes(1);
    });

    it("should start the Google consent flow from the registration form", () => {
      // Arrange
      renderScreen("register");

      // Act
      press("register:onGooglePress");

      // Assert
      expect(googlePromptAsync).toHaveBeenCalledTimes(1);
    });

    it("should delegate the Apple sign in to the form logic", () => {
      // Arrange
      renderScreen();

      // Act
      press("login:onApplePress");

      // Assert
      expect(handleAppleSignIn).toHaveBeenCalledTimes(1);
    });

    it("should offer the Google button once the authorisation request is ready", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(screen.getByText("login:googleDisabled=false")).toBeTruthy();
    });

    it("should disable the Google button while the authorisation request is not ready", () => {
      // Arrange
      googleRequest = null;

      // Act
      renderScreen();

      // Assert
      expect(screen.getByText("login:googleDisabled=true")).toBeTruthy();
    });

    it("should exchange the Google access token for a session when consent is granted", () => {
      // Arrange
      googleResponse = { type: "success", authentication: { accessToken: ACCESS_TOKEN } };

      // Act
      renderScreen();

      // Assert
      expect(handleGoogleToken).toHaveBeenCalledWith(ACCESS_TOKEN);
    });

    it("should ignore a granted consent that carries no access token", () => {
      // Arrange
      googleResponse = { type: "success", authentication: null };

      // Act
      renderScreen();

      // Assert
      expect(handleGoogleToken).not.toHaveBeenCalled();
    });

    it("should ignore a consent the user dismissed", () => {
      // Arrange
      googleResponse = { type: "dismiss" };

      // Act
      renderScreen();

      // Assert
      expect(handleGoogleToken).not.toHaveBeenCalled();
    });

    it("should ignore the absence of any answer from Google", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(handleGoogleToken).not.toHaveBeenCalled();
    });
  });
});
