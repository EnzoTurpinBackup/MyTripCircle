import React from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import LoginForm from "../LoginForm";
import { lightColors } from "../../../contexts/ThemeContext";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// useSafeAreaInsets a besoin d'un SafeAreaProvider ayant reçu ses métriques
// via un événement natif, ce qui n'arrive jamais en environnement de test.
jest.mock("react-native-safe-area-context", () => {
  const mock = require("react-native-safe-area-context/jest/mock");
  return mock.default ?? mock;
});

// i18next n'est pas initialisé en test : on renvoie la clé pour garder des
// libellés déterministes.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// La police d'icônes charge ses glyphes de façon asynchrone, ce qui déclenche
// des mises à jour hors act() : on la remplace par un simple texte.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, `icon:${name}`),
  };
});

type Props = React.ComponentProps<typeof LoginForm>;

const handlers = () => ({
  setEmail: jest.fn(),
  setEmailError: jest.fn(),
  setPassword: jest.fn(),
  setPasswordError: jest.fn(),
  setShowPassword: jest.fn(),
  onSubmit: jest.fn(),
  onSwitchToRegister: jest.fn(),
  onForgotPassword: jest.fn(),
  onBackToWelcome: jest.fn(),
  onGooglePress: jest.fn(),
  onApplePress: jest.fn(),
  validateEmail: jest.fn().mockReturnValue(true),
  validatePasswordRequired: jest.fn().mockReturnValue(true),
});

const renderForm = (overrides: Partial<Props> = {}) => {
  const spies = handlers();
  render(
    <LoginForm
      email=""
      emailError=""
      password=""
      passwordError=""
      showPassword={false}
      busy={false}
      googleDisabled={false}
      colors={lightColors}
      {...spies}
      {...overrides}
    />
  );
  return spies;
};

describe("LoginForm", () => {
  it("should show the sign-in label while no request is running", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.getByText("common.signIn")).toBeTruthy();
    expect(screen.queryByText("common.pleaseWait")).toBeNull();
  });

  it("should show a waiting label and block the button while a request is running", () => {
    // Arrange
    const spies = renderForm({ busy: true });

    // Act
    fireEvent.press(screen.getByText("common.pleaseWait"));

    // Assert
    expect(spies.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("common.pleaseWait")).toBeDisabled();
  });

  it("should submit the credentials when the primary button is pressed", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByText("common.signIn"));

    // Assert
    expect(spies.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("should store the typed e-mail without clearing an error that does not exist", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.changeText(screen.getByLabelText("common.email"), "ana@example.com");

    // Assert
    expect(spies.setEmail).toHaveBeenCalledWith("ana@example.com");
    expect(spies.setEmailError).not.toHaveBeenCalled();
  });

  it("should clear the e-mail error as soon as the user types again", () => {
    // Arrange
    const spies = renderForm({ emailError: "auth.invalidEmail" });

    // Act
    fireEvent.changeText(screen.getByLabelText("common.email"), "a");

    // Assert
    expect(spies.setEmailError).toHaveBeenCalledWith("");
    expect(screen.getByText("auth.invalidEmail")).toBeTruthy();
  });

  it("should validate the e-mail when the field loses focus", () => {
    // Arrange
    const spies = renderForm({ email: "ana@example.com" });

    // Act
    fireEvent(screen.getByLabelText("common.email"), "blur");

    // Assert
    expect(spies.validateEmail).toHaveBeenCalledWith("ana@example.com");
  });

  it("should store the typed password without clearing an error that does not exist", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.changeText(screen.getByLabelText("common.password"), "s3cret");

    // Assert
    expect(spies.setPassword).toHaveBeenCalledWith("s3cret");
    expect(spies.setPasswordError).not.toHaveBeenCalled();
  });

  it("should clear the password error as soon as the user types again", () => {
    // Arrange
    const spies = renderForm({ passwordError: "auth.passwordRequired" });

    // Act
    fireEvent.changeText(screen.getByLabelText("common.password"), "s");

    // Assert
    expect(spies.setPasswordError).toHaveBeenCalledWith("");
    expect(screen.getByText("auth.passwordRequired")).toBeTruthy();
  });

  it("should validate the password when the field loses focus", () => {
    // Arrange
    const spies = renderForm({ password: "s3cret" });

    // Act
    fireEvent(screen.getByLabelText("common.password"), "blur");

    // Assert
    expect(spies.validatePasswordRequired).toHaveBeenCalledWith("s3cret");
  });

  it("should reveal the password when the eye button is pressed", () => {
    // Arrange
    const spies = renderForm({ showPassword: false });

    // Act
    fireEvent.press(screen.getByLabelText("common.a11y.showPassword"));

    // Assert
    expect(spies.setShowPassword).toHaveBeenCalledWith(true);
  });

  it("should hide the password again when it is already revealed", () => {
    // Arrange
    const spies = renderForm({ showPassword: true });

    // Act
    fireEvent.press(screen.getByLabelText("common.a11y.hidePassword"));

    // Assert
    expect(spies.setShowPassword).toHaveBeenCalledWith(false);
  });

  it("should open the password recovery flow when the link is pressed", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByText("common.forgotPassword"));

    // Assert
    expect(spies.onForgotPassword).toHaveBeenCalledTimes(1);
  });

  it("should switch to the registration screen when the footer link is pressed", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByText("common.signUp"));

    // Assert
    expect(spies.onSwitchToRegister).toHaveBeenCalledTimes(1);
  });

  it("should go back to the welcome screen when the back button is pressed", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByLabelText("common.a11y.back"));

    // Assert
    expect(spies.onBackToWelcome).toHaveBeenCalledTimes(1);
  });

  it("should delegate the social sign-in to its own handlers", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByText("auth.googleButton"));

    // Assert
    expect(spies.onGooglePress).toHaveBeenCalledTimes(1);
  });
});

describe("LoginForm — keyboard avoidance", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it("should push the content up when the keyboard opens on iOS", () => {
    // Arrange
    Platform.OS = "ios";

    // Act
    renderForm();

    // Assert
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe("padding");
  });

  it("should shrink the content when the keyboard opens on Android", () => {
    // Arrange
    Platform.OS = "android";

    // Act
    renderForm();

    // Assert
    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe("height");
  });
});
