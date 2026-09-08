// Suite dédiée au cas où `react-native-maps` est introuvable (Expo Go, build
// sans le module natif) : le `require` lève, et le `catch` du chargement
// conditionnel doit maintenir l'écran fonctionnel. Le chargement du module
// n'ayant lieu qu'une fois par fichier, ce cas ne peut pas cohabiter avec la
// suite principale.

jest.mock("react-native-maps", () => {
  throw new Error("react-native-maps indisponible");
});

import {
  MAP_PLACEHOLDER_TEST_ID,
  setupScreenMocks,
  mockGetCached,
} from "./support/addressDetailsMocks";

import React from "react";
import { act, render, screen } from "@testing-library/react-native";

const COORDS = { latitude: 45.75, longitude: 4.85 };

// L'écran émet son avertissement au chargement du module : on le charge donc
// explicitement, avertisseur déjà muselé, plutôt que par un `import` statique
// qui polluerait la sortie de test.
const bootWarn = jest.spyOn(console, "warn").mockImplementation(() => {});
const AddressDetailsScreen = require("../AddressDetailsScreen").default as React.ComponentType;
bootWarn.mockRestore();

/**
 * Recharge le module pour rejouer le `require` protégé. Le rendu est exclu de
 * ce chemin : un registre isolé fournit une seconde instance de React,
 * incompatible avec le moteur de rendu de la suite.
 */
const reloadScreenModule = () => {
  jest.isolateModules(() => {
    require("../AddressDetailsScreen");
  });
};

describe("AddressDetailsScreen sans react-native-maps", () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    setupScreenMocks();
    mockGetCached.mockReturnValue(COORDS);
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
  });

  it("should fall back to the gradient placeholder when the native module is missing", async () => {
    // Arrange & Act
    render(<AddressDetailsScreen />);
    await act(async () => {});

    // Assert
    expect(screen.getByTestId(MAP_PLACEHOLDER_TEST_ID)).toBeTruthy();
  });

  it("should keep the directions button usable when the native module is missing", async () => {
    // Arrange & Act
    render(<AddressDetailsScreen />);
    await act(async () => {});

    // Assert
    expect(screen.getByText("addresses.details.openInMaps")).toBeTruthy();
  });

  it("should warn about the missing module in development builds", () => {
    // Arrange & Act
    reloadScreenModule();

    // Assert
    expect(warn).toHaveBeenCalledWith(
      "[AddressDetailsScreen] react-native-maps non disponible:",
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
