import React from "react";
import { Platform } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import SocialAuthButtons from "../SocialAuthButtons";
import { lightColors } from "../../../contexts/ThemeContext";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

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

type Props = React.ComponentProps<typeof SocialAuthButtons>;

const renderButtons = (overrides: Partial<Props> = {}) => {
  const onGooglePress = jest.fn();
  const onApplePress = jest.fn();
  render(
    <SocialAuthButtons
      onGooglePress={onGooglePress}
      onApplePress={onApplePress}
      googleDisabled={false}
      busy={false}
      colors={lightColors}
      {...overrides}
    />
  );
  return { onGooglePress, onApplePress };
};

describe("SocialAuthButtons", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it("should trigger the Google sign-in when the Google button is pressed", () => {
    // Arrange
    const { onGooglePress } = renderButtons();

    // Act
    fireEvent.press(screen.getByText("auth.googleButton"));

    // Assert
    expect(onGooglePress).toHaveBeenCalledTimes(1);
  });

  it("should ignore the Google button while the provider is unavailable", () => {
    // Arrange
    const { onGooglePress } = renderButtons({ googleDisabled: true });

    // Act
    fireEvent.press(screen.getByText("auth.googleButton"));

    // Assert
    expect(onGooglePress).not.toHaveBeenCalled();
  });

  it("should ignore both providers while a request is already running", () => {
    // Arrange
    const { onGooglePress, onApplePress } = renderButtons({ busy: true });

    // Act
    fireEvent.press(screen.getByText("auth.googleButton"));
    fireEvent.press(screen.getByText("auth.appleButton"));

    // Assert
    expect(onGooglePress).not.toHaveBeenCalled();
    expect(onApplePress).not.toHaveBeenCalled();
  });

  it("should expose both buttons as enabled when nothing blocks them", () => {
    // Arrange / Act
    renderButtons();

    // Assert
    expect(screen.getByText("auth.googleButton")).toBeEnabled();
    expect(screen.getByText("auth.appleButton")).toBeEnabled();
    expect(screen.getByText("auth.orDivider")).toBeTruthy();
  });

  it("should expose both buttons as disabled while a request is running", () => {
    // Arrange / Act
    renderButtons({ busy: true });

    // Assert
    expect(screen.getByText("auth.googleButton")).toBeDisabled();
    expect(screen.getByText("auth.appleButton")).toBeDisabled();
  });

  it("should disable only the Google button when the provider is unavailable", () => {
    // Arrange / Act
    renderButtons({ googleDisabled: true });

    // Assert
    expect(screen.getByText("auth.googleButton")).toBeDisabled();
    expect(screen.getByText("auth.appleButton")).toBeEnabled();
  });

  it("should offer the Apple sign-in on iOS", () => {
    // Arrange
    Platform.OS = "ios";
    const { onApplePress } = renderButtons();

    // Act
    fireEvent.press(screen.getByText("auth.appleButton"));

    // Assert
    expect(onApplePress).toHaveBeenCalledTimes(1);
  });

  it("should not offer the Apple sign-in on Android", () => {
    // Arrange
    Platform.OS = "android";

    // Act
    renderButtons();

    // Assert
    expect(screen.queryByText("auth.appleButton")).toBeNull();
    expect(screen.getByText("auth.googleButton")).toBeTruthy();
  });
});
