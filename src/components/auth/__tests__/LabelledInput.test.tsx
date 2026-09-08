import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import LabelledInput from "../LabelledInput";
import { lightColors } from "../../../contexts/ThemeContext";

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

// Le TextInput de React Native est remplacé par un composant factice en test :
// sa méthode `focus` est ce mock partagé, seul point d'observation du focus.
const MockNativeMethods = (
  jest.requireActual("react-native/jest/MockNativeMethods") as {
    default: { focus: jest.Mock };
  }
).default;

type Props = React.ComponentProps<typeof LabelledInput>;

const renderInput = (overrides: Partial<Props> = {}) => {
  const onChangeText = jest.fn();
  render(
    <LabelledInput
      label="Adresse e-mail"
      value=""
      onChangeText={onChangeText}
      colors={lightColors}
      {...overrides}
    />
  );
  return { onChangeText };
};

describe("LabelledInput (auth)", () => {
  it("should apply the neutral defaults when only the required props are given", () => {
    // Arrange / Act
    renderInput();

    // Assert
    const input = screen.getByLabelText("Adresse e-mail");
    expect(input).toHaveProp("keyboardType", "default");
    expect(input).toHaveProp("autoCapitalize", "none");
    expect(input).toHaveProp("secureTextEntry", false);
    expect(input).toHaveProp("autoFocus", false);
    expect(input).toHaveProp("textContentType", "none");
    expect(screen.queryByText(/^icon:/)).toBeNull();
  });

  it("should forward the keyboard and content options when they are given", () => {
    // Arrange / Act
    renderInput({
      keyboardType: "email-address",
      autoCapitalize: "words",
      autoFocus: true,
      textContentType: "emailAddress",
    });

    // Assert
    const input = screen.getByLabelText("Adresse e-mail");
    expect(input).toHaveProp("keyboardType", "email-address");
    expect(input).toHaveProp("autoCapitalize", "words");
    expect(input).toHaveProp("autoFocus", true);
    expect(input).toHaveProp("textContentType", "emailAddress");
  });

  it("should report every keystroke to the parent", () => {
    // Arrange
    const { onChangeText } = renderInput();

    // Act
    fireEvent.changeText(screen.getByLabelText("Adresse e-mail"), "ana@example.com");

    // Assert
    expect(onChangeText).toHaveBeenCalledWith("ana@example.com");
  });

  it("should notify the parent when the field loses focus", () => {
    // Arrange
    const onBlur = jest.fn();
    renderInput({ onBlur });

    // Act
    fireEvent(screen.getByLabelText("Adresse e-mail"), "blur");

    // Assert
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("should focus the input when the surrounding box is pressed", () => {
    // Arrange
    MockNativeMethods.focus.mockClear();
    renderInput();

    // Act — le libellé est hors du champ : la pression doit remonter à la boîte
    fireEvent.press(screen.getByText("Adresse e-mail"));

    // Assert
    expect(MockNativeMethods.focus).toHaveBeenCalledTimes(1);
  });

  it("should mask the value when secureTextEntry is on and the value is hidden", () => {
    // Arrange / Act
    renderInput({ secureTextEntry: true, showValue: false });

    // Assert
    expect(screen.getByLabelText("Adresse e-mail")).toHaveProp("secureTextEntry", true);
  });

  it("should unmask the value when secureTextEntry is on but the value is revealed", () => {
    // Arrange / Act
    renderInput({ secureTextEntry: true, showValue: true });

    // Assert
    expect(screen.getByLabelText("Adresse e-mail")).toHaveProp("secureTextEntry", false);
  });

  it("should not render the reveal button when no toggle handler is provided", () => {
    // Arrange / Act
    renderInput({ secureTextEntry: true, showToggle: true });

    // Assert
    expect(screen.queryByLabelText("common.a11y.showPassword")).toBeNull();
    expect(screen.queryByText(/^icon:/)).toBeNull();
  });

  it("should offer to reveal the password when the value is hidden", () => {
    // Arrange
    const onToggleShow = jest.fn();
    renderInput({ secureTextEntry: true, showToggle: true, showValue: false, onToggleShow });

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
    renderInput({ errorText: "Adresse invalide" });

    // Assert
    expect(screen.queryByText("Adresse invalide")).toBeNull();
    expect(screen.UNSAFE_queryAllByProps({ accessibilityLiveRegion: "polite" })).toHaveLength(0);
  });

  it("should announce the error message when the field is in error", () => {
    // Arrange / Act
    renderInput({ hasError: true, errorText: "Adresse invalide" });

    // Assert
    const message = screen.getByText("Adresse invalide");
    expect(message).toHaveStyle({ color: lightColors.danger });
    expect(message).toHaveProp("accessibilityLiveRegion", "polite");
  });

  it("should render no message when the field is in error but carries no text", () => {
    // Arrange / Act
    renderInput({ hasError: true });

    // Assert — l'état d'erreur ne doit pas produire de message vide
    expect(screen.getByLabelText("Adresse e-mail")).toBeTruthy();
    expect(screen.UNSAFE_queryAllByProps({ accessibilityLiveRegion: "polite" })).toHaveLength(0);
  });
});
