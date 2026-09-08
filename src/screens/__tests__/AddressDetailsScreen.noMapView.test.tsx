// Suite dédiée au cas où `react-native-maps` se résout SANS exposer de
// composant de carte : c'est exactement ce que produit l'alias Metro utilisé
// pour le bundle web. Le `require` réussit, donc le `try/catch` ne se déclenche
// pas — seul `mapsAvailable = !!MapView` évite alors le rendu d'un composant
// nul. Le chargement du module n'ayant lieu qu'une fois par fichier, ce cas ne
// peut pas cohabiter avec la suite principale.

jest.mock("react-native-maps", () => ({ __esModule: true, default: undefined }));

import {
  MAP_PLACEHOLDER_TEST_ID,
  setupScreenMocks,
  mockGetCached,
} from "./support/addressDetailsMocks";

import React from "react";
import { act, render, screen } from "@testing-library/react-native";

import AddressDetailsScreen from "../AddressDetailsScreen";

const COORDS = { latitude: 45.75, longitude: 4.85 };

describe("AddressDetailsScreen sans composant de carte", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    setupScreenMocks();
    mockGetCached.mockReturnValue(COORDS);
    render(<AddressDetailsScreen />);
    await act(async () => {});
  });

  it("should fall back to the gradient placeholder even when coordinates are known", () => {
    // Arrange & Act : montage effectué par le `beforeEach`.

    // Assert
    expect(screen.getByTestId(MAP_PLACEHOLDER_TEST_ID)).toBeTruthy();
  });

  it("should keep the directions button usable without a native map", () => {
    // Arrange & Act : montage effectué par le `beforeEach`.

    // Assert
    expect(screen.getByText("addresses.details.openInMaps")).toBeTruthy();
  });

  it("should still render the rest of the address details", () => {
    // Arrange & Act : montage effectué par le `beforeEach`.

    // Assert
    expect(screen.getByText("📍 12 rue des Lilas, Lyon")).toBeTruthy();
  });
});
