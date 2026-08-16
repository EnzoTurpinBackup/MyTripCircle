import React from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import RegisterForm from "../RegisterForm";
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

type Props = React.ComponentProps<typeof RegisterForm>;

const handlers = () => ({
  setName: jest.fn(),
  setNameError: jest.fn(),
  setEmail: jest.fn(),
  setEmailError: jest.fn(),
  handlePhoneChange: jest.fn(),
  setPassword: jest.fn(),
  setPasswordError: jest.fn(),
  setConfirmPassword: jest.fn(),
  setConfirmPasswordError: jest.fn(),
  setShowPassword: jest.fn(),
  setShowConfirmPassword: jest.fn(),
  setTermsAccepted: jest.fn(),
  onSubmit: jest.fn(),
  onSwitchToLogin: jest.fn(),
  onBackToWelcome: jest.fn(),
  onNavigateTerms: jest.fn(),
  onNavigatePrivacy: jest.fn(),
  onGooglePress: jest.fn(),
  onApplePress: jest.fn(),
  validateEmail: jest.fn().mockReturnValue(true),
  validatePasswordStrong: jest.fn().mockReturnValue(true),
  validateName: jest.fn().mockReturnValue(true),
  validatePhone: jest.fn().mockReturnValue(true),
  validateConfirmPassword: jest.fn().mockReturnValue(true),
});

const renderForm = (overrides: Partial<Props> = {}) => {
  const spies = handlers();
  render(
    <RegisterForm
      name=""
      nameError=""
      email=""
      emailError=""
      phone=""
      phoneError=""
      password=""
      passwordError=""
      confirmPassword=""
      confirmPasswordError=""
      showPassword={false}
      showConfirmPassword={false}
      termsAccepted
      busy={false}
      googleDisabled={false}
      colors={lightColors}
      {...spies}
      {...overrides}
    />
  );
  return spies;
};

describe("RegisterForm", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should show the create-account label while no request is running", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.getByText("auth.createMyAccount")).toBeTruthy();
    expect(screen.getByText("auth.createMyAccount")).toBeEnabled();
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

  it("should block the submission while the terms are not accepted", () => {
    // Arrange
    const spies = renderForm({ termsAccepted: false });

    // Act
    fireEvent.press(screen.getByText("auth.createMyAccount"));

    // Assert
    expect(spies.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("auth.createMyAccount")).toBeDisabled();
  });

  it("should submit the registration once the terms are accepted", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByText("auth.createMyAccount"));

    // Assert
    expect(spies.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("should leave the terms box empty while the terms are refused", () => {
    // Arrange / Act
    renderForm({ termsAccepted: false });

    // Assert
    expect(screen.queryByText("icon:checkmark")).toBeNull();
  });

  it("should tick the terms box once the terms are accepted", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.getByText("icon:checkmark")).toBeTruthy();
  });

  it("should untick the terms box when the checkmark is pressed", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByText("icon:checkmark"));

    // Assert
    expect(spies.setTermsAccepted).toHaveBeenCalledWith(false);
  });

  it("should warn instead of starting Google sign-in while the terms are refused", () => {
    // Arrange
    const spies = renderForm({ termsAccepted: false });

    // Act
    fireEvent.press(screen.getByText("auth.googleButton"));

    // Assert
    expect(spies.onGooglePress).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith("common.error", "auth.termsRequired");
  });

  it("should warn instead of starting Apple sign-in while the terms are refused", () => {
    // Arrange
    const spies = renderForm({ termsAccepted: false });

    // Act
    fireEvent.press(screen.getByText("auth.appleButton"));

    // Assert
    expect(spies.onApplePress).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith("common.error", "auth.termsRequired");
  });

  it("should start the Google sign-in once the terms are accepted", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByText("auth.googleButton"));

    // Assert
    expect(spies.onGooglePress).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("should start the Apple sign-in once the terms are accepted", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByText("auth.appleButton"));

    // Assert
    expect(spies.onApplePress).toHaveBeenCalledTimes(1);
  });

  it("should open the terms page when the terms link is pressed", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByText("auth.termsLink"));

    // Assert
    expect(spies.onNavigateTerms).toHaveBeenCalledTimes(1);
  });

  it("should open the privacy page when the privacy link is pressed", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByText("auth.privacyLink"));

    // Assert
    expect(spies.onNavigatePrivacy).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["common.fullName", "setName", "setNameError", "Ana"],
    ["common.email", "setEmail", "setEmailError", "ana@example.com"],
    ["common.password", "setPassword", "setPasswordError", "s3cret"],
    ["common.confirmPassword", "setConfirmPassword", "setConfirmPasswordError", "s3cret"],
  ] as const)(
    "should store %s without clearing an error that does not exist",
    (label, setter, errorSetter, typed) => {
      // Arrange
      const spies = renderForm();

      // Act
      fireEvent.changeText(screen.getByLabelText(label), typed);

      // Assert
      expect(spies[setter]).toHaveBeenCalledWith(typed);
      expect(spies[errorSetter]).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["common.fullName", "nameError", "setNameError"],
    ["common.email", "emailError", "setEmailError"],
    ["common.password", "passwordError", "setPasswordError"],
    ["common.confirmPassword", "confirmPasswordError", "setConfirmPasswordError"],
  ] as const)("should clear the %s error as soon as the user types again", (label, errorProp, errorSetter) => {
    // Arrange
    const spies = renderForm({ [errorProp]: "auth.fieldInvalid" } as Partial<Props>);

    // Act
    fireEvent.changeText(screen.getByLabelText(label), "x");

    // Assert
    expect(spies[errorSetter]).toHaveBeenCalledWith("");
    expect(screen.getAllByText("auth.fieldInvalid").length).toBeGreaterThan(0);
  });

  it("should hand the raw phone input to the dedicated formatter", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.changeText(screen.getByLabelText("common.phoneOptional"), "0612345678");

    // Assert
    expect(spies.handlePhoneChange).toHaveBeenCalledWith("0612345678");
  });

  it.each([
    ["common.fullName", "validateName", "Ana"],
    ["common.email", "validateEmail", "ana@example.com"],
    ["common.phoneOptional", "validatePhone", "0612345678"],
    ["common.password", "validatePasswordStrong", "s3cret"],
    ["common.confirmPassword", "validateConfirmPassword", "s3cret"],
  ] as const)("should validate %s when the field loses focus", (label, validator, value) => {
    // Arrange
    const valueProp = {
      "common.fullName": "name",
      "common.email": "email",
      "common.phoneOptional": "phone",
      "common.password": "password",
      "common.confirmPassword": "confirmPassword",
    }[label];
    const spies = renderForm({ [valueProp]: value } as Partial<Props>);

    // Act
    fireEvent(screen.getByLabelText(label), "blur");

    // Assert
    expect(spies[validator]).toHaveBeenCalledWith(value);
  });

  it("should reveal the password when its eye button is pressed", () => {
    // Arrange
    const spies = renderForm();

    // Act — deux champs masqués : le premier bouton est celui du mot de passe
    fireEvent.press(screen.getAllByLabelText("common.a11y.showPassword")[0]);

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

  it("should reveal the confirmation field when its eye button is pressed", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getAllByLabelText("common.a11y.showPassword")[1]);

    // Assert
    expect(spies.setShowConfirmPassword).toHaveBeenCalledWith(true);
  });

  it("should hide the confirmation field again when it is already revealed", () => {
    // Arrange
    const spies = renderForm({ showConfirmPassword: true });

    // Act
    fireEvent.press(screen.getByLabelText("common.a11y.hidePassword"));

    // Assert
    expect(spies.setShowConfirmPassword).toHaveBeenCalledWith(false);
  });

  it("should switch to the login screen when the footer link is pressed", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByText("common.signIn"));

    // Assert
    expect(spies.onSwitchToLogin).toHaveBeenCalledTimes(1);
  });

  it("should go back to the welcome screen when the back button is pressed", () => {
    // Arrange
    const spies = renderForm();

    // Act
    fireEvent.press(screen.getByLabelText("common.a11y.back"));

    // Assert
    expect(spies.onBackToWelcome).toHaveBeenCalledTimes(1);
  });
});

describe("RegisterForm — keyboard avoidance", () => {
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
