import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import TripVisibilityPicker from "../TripVisibilityPicker";
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

// La police d'icônes charge ses glyphes de façon asynchrone : on la remplace
// par un texte porteur du nom de l'icône.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, `icon:${name}`),
  };
});

const renderPicker = (
  overrides: Partial<React.ComponentProps<typeof TripVisibilityPicker>> = {}
) => {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  render(
    <TripVisibilityPicker
      visible
      currentVisibility="private"
      colors={lightColors}
      onSelect={onSelect}
      onClose={onClose}
      {...overrides}
    />
  );
  return { onSelect, onClose };
};

// L'option sélectionnée se distingue par son fond : la zone tactile ne porte
// ni testID ni rôle, on lit donc son style.
const optionStyle = (index: number) =>
  StyleSheet.flatten(screen.UNSAFE_getAllByType(TouchableOpacity)[index + 1].props.style);

describe("TripVisibilityPicker", () => {
  it("should render the three visibility options with the modal title", () => {
    // Arrange / Act
    renderPicker();

    // Assert
    expect(screen.getByText("createTrip.visibilityLabel")).toBeTruthy();
    expect(screen.getByText("createTrip.visibilityPrivate")).toBeTruthy();
    expect(screen.getByText("createTrip.visibilityFriends")).toBeTruthy();
    expect(screen.getByText("createTrip.visibilityPublic")).toBeTruthy();
  });

  it("should render nothing when it is not visible", () => {
    // Arrange / Act
    renderPicker({ visible: false });

    // Assert
    expect(screen.queryByText("createTrip.visibilityLabel")).toBeNull();
  });

  it("should mark only the current visibility with a checkmark", () => {
    // Arrange / Act
    renderPicker();

    // Assert
    // Les pictogrammes décoratifs sont retirés de l'arbre d'accessibilité :
    // les interroger suppose désormais d'inclure explicitement les éléments masqués.
    expect(screen.getAllByText("icon:checkmark", { includeHiddenElements: true })).toHaveLength(1);
    expect(optionStyle(0).backgroundColor).toBe(lightColors.terraLight);
    expect(optionStyle(1).backgroundColor).toBe(lightColors.bgMid);
  });

  it("should highlight the label of the current visibility", () => {
    // Arrange / Act
    renderPicker();

    // Assert
    expect(screen.getByText("createTrip.visibilityPrivate")).toHaveStyle({
      color: lightColors.terraDark,
    });
    expect(screen.getByText("createTrip.visibilityFriends")).toHaveStyle({
      color: lightColors.text,
    });
  });

  it("should move the checkmark when another visibility is current", () => {
    // Arrange / Act
    renderPicker({ currentVisibility: "public" });

    // Assert
    expect(optionStyle(2).backgroundColor).toBe(lightColors.terraLight);
    expect(optionStyle(0).backgroundColor).toBe(lightColors.bgMid);
  });

  it("should report the chosen visibility when an option is pressed", () => {
    // Arrange
    const { onSelect } = renderPicker();

    // Act
    fireEvent.press(screen.getByText("createTrip.visibilityFriends"));

    // Assert
    expect(onSelect).toHaveBeenCalledWith("friends");
  });

  it("should close when the backdrop is pressed", () => {
    // Arrange
    const { onClose } = renderPicker();

    // Act — la première zone tactile est le fond translucide
    fireEvent.press(screen.UNSAFE_getAllByType(TouchableOpacity)[0]);

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
