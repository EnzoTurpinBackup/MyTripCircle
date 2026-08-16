import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import LabelledInput from "../LabelledInput";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// i18next n'est pas initialisé en test : on renvoie la clé, ce qui garde les
// libellés d'accessibilité déterministes et lisibles dans les assertions.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// La police d'icônes ne laisse qu'un glyphe illisible dans l'arbre rendu :
// on la remplace par un texte porteur du nom de l'icône.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, `icon:${name}`),
  };
});

type Props = React.ComponentProps<typeof LabelledInput>;

const renderInput = (overrides: Partial<Props> = {}) => {
  const onChangeText = jest.fn();
  render(
    <LabelledInput
      label="Nouveau mot de passe"
      value=""
      onChangeText={onChangeText}
      {...overrides}
    />
  );
  return { onChangeText };
};

describe("LabelledInput (forgotPassword)", () => {
  it("should use the default keyboard and no masking when only the required props are given", () => {
    // Arrange / Act
    renderInput();

    // Assert
    const input = screen.getByLabelText("Nouveau mot de passe");
    expect(input).toHaveProp("keyboardType", "default");
    expect(input).toHaveProp("secureTextEntry", false);
    expect(input).toHaveProp("autoCapitalize", "none");
  });

  it("should forward the e-mail keyboard when it is requested", () => {
    // Arrange / Act
    renderInput({ keyboardType: "email-address" });

    // Assert
    expect(screen.getByLabelText("Nouveau mot de passe")).toHaveProp(
      "keyboardType",
      "email-address"
    );
  });

  it("should report every keystroke to the parent", () => {
    // Arrange
    const { onChangeText } = renderInput();

    // Act
    fireEvent.changeText(screen.getByLabelText("Nouveau mot de passe"), "s3cret");

    // Assert
    expect(onChangeText).toHaveBeenCalledWith("s3cret");
  });

  it("should notify the parent when the field loses focus", () => {
    // Arrange
    const onBlur = jest.fn();
    renderInput({ onBlur });

    // Act
    fireEvent(screen.getByLabelText("Nouveau mot de passe"), "blur");

    // Assert
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("should mask the value when secureTextEntry is on and the value is hidden", () => {
    // Arrange / Act
    renderInput({ secureTextEntry: true });

    // Assert
    expect(screen.getByLabelText("Nouveau mot de passe")).toHaveProp("secureTextEntry", true);
  });

  it("should unmask the value when secureTextEntry is on but the value is revealed", () => {
    // Arrange / Act
    renderInput({ secureTextEntry: true, showValue: true });

    // Assert
    expect(screen.getByLabelText("Nouveau mot de passe")).toHaveProp("secureTextEntry", false);
  });

  it("should not render the reveal button when no toggle handler is provided", () => {
    // Arrange / Act
    renderInput({ secureTextEntry: true, showToggle: true });

    // Assert
    expect(screen.queryByLabelText("common.a11y.showPassword")).toBeNull();
  });

  it("should offer to reveal the password when the value is hidden", () => {
    // Arrange
    const onToggleShow = jest.fn();
    renderInput({ secureTextEntry: true, showToggle: true, onToggleShow });

    // Act
    fireEvent.press(screen.getByLabelText("common.a11y.showPassword"));

    // Assert
    expect(screen.getByText("icon:eye-off-outline")).toBeTruthy();
    expect(onToggleShow).toHaveBeenCalledTimes(1);
  });

  it("should offer to hide the password when the value is revealed", () => {
    // Arrange / Act
    renderInput({
      secureTextEntry: true,
      showToggle: true,
      showValue: true,
      onToggleShow: jest.fn(),
    });

    // Assert
    expect(screen.getByLabelText("common.a11y.hidePassword")).toBeTruthy();
    expect(screen.getByText("icon:eye-outline")).toBeTruthy();
  });

  it("should hide the message while the field carries no error", () => {
    // Arrange / Act
    renderInput({ errorText: "Mot de passe trop court" });

    // Assert
    expect(screen.queryByText("Mot de passe trop court")).toBeNull();
  });

  it("should announce the error message when the field is in error", () => {
    // Arrange / Act
    renderInput({ hasError: true, errorText: "Mot de passe trop court" });

    // Assert
    const message = screen.getByText("Mot de passe trop court");
    expect(message).toHaveStyle({ color: "#C04040" });
    expect(message).toHaveProp("accessibilityLiveRegion", "polite");
  });

  it("should render no message when the field is in error but carries no text", () => {
    // Arrange / Act
    renderInput({ hasError: true });

    // Assert — l'état d'erreur ne doit pas produire de message vide
    expect(screen.getByLabelText("Nouveau mot de passe")).toBeTruthy();
    expect(screen.UNSAFE_queryAllByProps({ accessibilityLiveRegion: "polite" })).toHaveLength(0);
  });
});
