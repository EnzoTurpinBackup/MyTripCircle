import "./support/screenMocks";

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import ErrorScreen from "../ErrorScreen";
import { lightColors } from "../../contexts/ThemeContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { statusBarInset } from "./support/layout";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

const navigate = jest.fn();
const goBack = jest.fn();

/** Monte l'écran avec les paramètres de route fournis (`undefined` = aucun). */
const renderScreen = (params?: Record<string, unknown>) => {
  (useRoute as jest.Mock).mockReturnValue({ params });
  render(<ErrorScreen />);
};

describe("ErrorScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate, goBack });
    (useTheme as jest.Mock).mockReturnValue({ colors: lightColors });
  });

  describe("message affiché", () => {
    it("should show the default message when no message is passed", () => {
      // Arrange & Act
      renderScreen({});

      // Assert
      expect(screen.getByText("errorScreen.title")).toBeTruthy();
      expect(screen.getByText("errorScreen.defaultMessage")).toBeTruthy();
    });

    it("should show the message carried by the route when one is passed", () => {
      // Arrange & Act
      renderScreen({ message: "La passerelle de paiement est injoignable" });

      // Assert
      expect(screen.getByText("La passerelle de paiement est injoignable")).toBeTruthy();
      expect(screen.queryByText("errorScreen.defaultMessage")).toBeNull();
    });

    it("should fall back to the default message when the route carries no params at all", () => {
      // Arrange & Act
      renderScreen(undefined);

      // Assert
      expect(screen.getByText("errorScreen.defaultMessage")).toBeTruthy();
    });

    it("should show the alert icon", () => {
      // Arrange & Act
      renderScreen({});

      // Assert
      expect(screen.getByText("icon:alert-circle-outline")).toBeTruthy();
    });

    it("should reserve the iOS status bar height", () => {
      // Arrange & Act
      renderScreen({});

      // Assert — contrepartie iOS de `StatusScreens.android.test.tsx`.
      expect(statusBarInset()).toBe(60);
    });
  });

  describe("bouton retour secondaire", () => {
    it("should offer a back button when the route does not forbid it", () => {
      // Arrange & Act
      renderScreen({});

      // Assert
      expect(screen.getByText("errorScreen.goBack")).toBeTruthy();
    });

    it("should hide the back button when the route sets canGoBack to false", () => {
      // Arrange & Act
      renderScreen({ canGoBack: false });

      // Assert
      expect(screen.queryByText("errorScreen.goBack")).toBeNull();
    });

    it("should go back when the back button is pressed", () => {
      // Arrange
      renderScreen({});

      // Act
      fireEvent.press(screen.getByText("errorScreen.goBack"));

      // Assert
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("retour à l'accueil", () => {
    it("should navigate to the main stack when the home button is pressed", () => {
      // Arrange
      renderScreen({});

      // Act
      fireEvent.press(screen.getByText("errorScreen.goHome"));

      // Assert
      expect(navigate).toHaveBeenCalledWith("Main");
    });
  });

  describe("palette incomplète", () => {
    // `AppColors` garantit `danger` et `dangerLight` : les `??` de l'écran sont
    // des garde-fous défensifs. On vérifie qu'ils tiennent malgré tout, plutôt
    // que de laisser deux branches non mesurées.
    it("should still render when the palette declares no danger colors", () => {
      // Arrange
      const { danger, dangerLight, ...withoutDanger } = lightColors;
      (useTheme as jest.Mock).mockReturnValue({ colors: withoutDanger });

      // Act
      renderScreen({});

      // Assert
      expect(screen.getByText("errorScreen.title")).toBeTruthy();
      expect(screen.getByText("icon:alert-circle-outline")).toBeTruthy();
    });
  });
});
