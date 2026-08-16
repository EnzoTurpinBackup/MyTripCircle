import "../screens/__tests__/support/screenMocks";

import React from "react";
import { StyleSheet, View } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { useFonts } from "@expo-google-fonts/sora";

import App from "../../App";
import { initLanguage } from "../utils/i18n";

jest.mock("@expo-google-fonts/sora", () => ({
  useFonts: jest.fn(),
  Sora_300Light: "Sora_300Light",
  Sora_400Regular: "Sora_400Regular",
  Sora_500Medium: "Sora_500Medium",
  Sora_600SemiBold: "Sora_600SemiBold",
  Sora_700Bold: "Sora_700Bold",
}));

jest.mock("../utils/i18n", () => ({ initLanguage: jest.fn() }));

/**
 * Chaîne d'imbrication observée au rendu, du fournisseur le plus externe au
 * plus interne. Remplie par les doubles installés ci-dessous.
 */
const mockNesting: string[] = [];

/**
 * Fabrique un double de fournisseur qui note son passage puis rend ses enfants.
 *
 * Déclarée comme fonction (et non comme constante) pour être hissée au-dessus
 * des `jest.mock`, appelés dès le chargement de `App`.
 */
function mockProvider(name: string) {
  const React = require("react");
  return ({ children }: { children: React.ReactNode }) => {
    mockNesting.push(name);
    return children;
  };
}

jest.mock("../contexts/NetworkContext", () => ({
  NetworkProvider: mockProvider("NetworkProvider"),
}));
jest.mock("../contexts/ThemeContext", () => ({
  ThemeProvider: mockProvider("ThemeProvider"),
}));
jest.mock("../contexts/AuthContext", () => ({
  AuthProvider: mockProvider("AuthProvider"),
}));
jest.mock("../contexts/TripsContext", () => ({
  TripsProvider: mockProvider("TripsProvider"),
}));
jest.mock("../contexts/NotificationContext", () => ({
  NotificationProvider: mockProvider("NotificationProvider"),
}));
jest.mock("../contexts/FriendsContext", () => ({
  FriendsProvider: mockProvider("FriendsProvider"),
}));
jest.mock("../contexts/SubscriptionContext", () => ({
  SubscriptionProvider: mockProvider("SubscriptionProvider"),
}));

jest.mock("../navigation/AppNavigator", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { __esModule: true, default: () => React.createElement(Text, null, "navigateur") };
});

/** Ordre d'imbrication attendu, du plus externe au plus interne. */
const EXPECTED_NESTING = [
  "NetworkProvider",
  "ThemeProvider",
  "AuthProvider",
  "TripsProvider",
  "NotificationProvider",
  "FriendsProvider",
  "SubscriptionProvider",
];

const loadFonts = useFonts as unknown as jest.Mock;

describe("App", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNesting.length = 0;
    loadFonts.mockReturnValue([true]);
  });

  describe("chargement des polices", () => {
    it("should hold a neutral splash while the fonts are loading", () => {
      // Arrange
      loadFonts.mockReturnValue([false]);

      // Act
      render(<App />);

      // Assert — un fond crème plein écran, sans navigateur derrière.
      expect(screen.queryByText("navigateur")).toBeNull();
      const splash = StyleSheet.flatten(screen.UNSAFE_getAllByType(View)[0].props.style);
      expect(splash).toMatchObject({ flex: 1, backgroundColor: "#F5F0E8" });
    });

    it("should mount the navigator once the fonts are loaded", () => {
      // Arrange & Act
      render(<App />);

      // Assert
      expect(screen.getByText("navigateur")).toBeTruthy();
    });

    it("should request the five Sora weights the design system relies on", () => {
      // Arrange & Act
      render(<App />);

      // Assert
      expect(loadFonts).toHaveBeenCalledWith({
        Sora_300Light: "Sora_300Light",
        Sora_400Regular: "Sora_400Regular",
        Sora_500Medium: "Sora_500Medium",
        Sora_600SemiBold: "Sora_600SemiBold",
        Sora_700Bold: "Sora_700Bold",
      });
    });
  });

  describe("initialisation de la langue", () => {
    it("should restore the stored language once on mount", () => {
      // Arrange & Act
      render(<App />);

      // Assert
      expect(initLanguage).toHaveBeenCalledTimes(1);
    });

    it("should not restore the language again on a re-render", () => {
      // Arrange
      const view = render(<App />);

      // Act
      view.rerender(<App />);

      // Assert
      expect(initLanguage).toHaveBeenCalledTimes(1);
    });

    it("should restore the language even while the fonts are still loading", () => {
      // Arrange
      loadFonts.mockReturnValue([false]);

      // Act
      render(<App />);

      // Assert
      expect(initLanguage).toHaveBeenCalledTimes(1);
    });
  });

  describe("empilement des fournisseurs", () => {
    it("should nest every provider in the documented order", () => {
      // Arrange & Act
      render(<App />);

      // Assert — le réseau englobe le thème, qui englobe la session : chaque
      // fournisseur interne peut donc consommer les précédents.
      expect(mockNesting).toEqual(EXPECTED_NESTING);
    });

    it("should delay every provider until the fonts are loaded", () => {
      // Arrange
      loadFonts.mockReturnValue([false]);

      // Act
      render(<App />);

      // Assert — l'écran d'attente court-circuite l'arbre : aucun contexte
      // n'est monté, donc aucune requête réseau n'est lancée trop tôt.
      expect(mockNesting).toEqual([]);
    });
  });
});
