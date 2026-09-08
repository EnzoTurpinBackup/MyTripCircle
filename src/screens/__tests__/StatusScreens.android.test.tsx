import "./support/androidPlatform";
import "./support/screenMocks";

import React from "react";
import { render, screen } from "@testing-library/react-native";

import ErrorScreen from "../ErrorScreen";
import NotFoundScreen from "../NotFoundScreen";
import HelpSupportScreen from "../HelpSupportScreen";
import { statusBarInset } from "./support/layout";

// Ces écrans réservent la hauteur de la barre de statut au chargement du module
// (`Platform.OS === "ios" ? 60 : 20`). Sur Android, la barre est gérée par le
// système : la marge tombe à 20. La suite principale s'exécutant sur la
// plateforme iOS par défaut de jest-expo, seule cette suite couvre ce choix.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

describe("marges de barre de statut sur Android", () => {
  it("should reserve the Android status bar height on ErrorScreen", () => {
    // Arrange & Act
    render(<ErrorScreen />);

    // Assert
    expect(screen.getByText("errorScreen.title")).toBeTruthy();
    expect(statusBarInset()).toBe(20);
  });

  it("should reserve the Android status bar height on NotFoundScreen", () => {
    // Arrange & Act
    render(<NotFoundScreen />);

    // Assert
    expect(screen.getByText("404")).toBeTruthy();
    expect(statusBarInset()).toBe(20);
  });

  it("should reserve the Android status bar height on HelpSupportScreen", () => {
    // Arrange & Act
    render(<HelpSupportScreen />);

    // Assert
    expect(screen.getByText("helpSupport.title")).toBeTruthy();
    expect(statusBarInset()).toBe(20);
  });
});
