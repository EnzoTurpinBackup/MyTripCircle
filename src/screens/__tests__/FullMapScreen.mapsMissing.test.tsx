// Suite dédiée au cas où `react-native-maps` est introuvable (Expo Go, build
// sans le module natif) : le `require` lève, et le `catch` du chargement
// conditionnel doit maintenir l'écran fonctionnel. Le chargement du module
// n'ayant lieu qu'une fois par fichier, ce cas ne peut pas cohabiter avec la
// suite principale.

jest.mock("react-native-maps", () => {
  throw new Error("react-native-maps indisponible");
});

import { makeAddress, setupScreenMocks } from "./support/fullMapMocks";

import React from "react";
import { render, screen } from "@testing-library/react-native";

// L'écran émet son avertissement au chargement du module : on le charge donc
// explicitement, avertisseur déjà muselé, plutôt que par un `import` statique
// qui polluerait la sortie de test.
const bootWarn = jest.spyOn(console, "warn").mockImplementation(() => {});
const FullMapScreen = require("../FullMapScreen").default as React.ComponentType;
bootWarn.mockRestore();

/**
 * Recharge le module pour rejouer le `require` protégé. Le rendu est exclu de
 * ce chemin : un registre isolé fournit une seconde instance de React,
 * incompatible avec le moteur de rendu de la suite.
 */
const reloadScreenModule = () => {
  jest.isolateModules(() => {
    require("../FullMapScreen");
  });
};

describe("FullMapScreen sans react-native-maps", () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    setupScreenMocks();
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
  });

  it("should tell the user that the map is unavailable", () => {
    // Arrange & Act
    render(<FullMapScreen />);

    // Assert
    expect(screen.getByText("Carte non disponible")).toBeTruthy();
  });

  it("should hide the satellite toggle without a native map", () => {
    // Arrange & Act
    render(<FullMapScreen />);

    // Assert
    expect(screen.queryByText("icon:globe-outline")).toBeNull();
  });

  it("should keep the type filters usable without a native map", () => {
    // Arrange
    setupScreenMocks({ addresses: [makeAddress()] });

    // Act
    render(<FullMapScreen />);

    // Assert
    expect(screen.getByText("addresses.filters.restaurant")).toBeTruthy();
  });

  it("should warn about the missing module in development builds", () => {
    // Arrange & Act
    reloadScreenModule();

    // Assert
    expect(warn).toHaveBeenCalledWith(
      "[FullMapScreen] react-native-maps non disponible:",
      expect.any(Error),
    );
  });

  it("should stay silent about the missing module outside development builds", () => {
    // Arrange
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

    // Act
    reloadScreenModule();

    // Assert
    expect(warn).not.toHaveBeenCalled();
  });
});
