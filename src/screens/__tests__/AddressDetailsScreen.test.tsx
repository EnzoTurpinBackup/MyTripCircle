// Suite principale : `react-native-maps` expose bien un composant de carte.
// Les deux situations de repli (module résolu sans composant, module
// introuvable) sont couvertes par les suites voisines, le chargement du module
// n'ayant lieu qu'une fois par fichier.
//
// Branches volontairement non couvertes, toutes inatteignables depuis l'IHM :
//   - l. 77  `if (!cancelled)` du chemin « coordonnées en cache » : la lecture
//            du cache est synchrone, l'effet ne peut pas être nettoyé entre
//            temps ;
//   - l. 112/113 gardes `address?.phone` / `address?.website` : les pastilles
//            qui déclenchent ces gestionnaires ne sont rendues que si le champ
//            correspondant existe ;
//   - l. 115 garde `if (!address)` de l'itinéraire : le bouton n'existe pas
//            tant qu'aucune adresse n'est chargée.

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children, ...props }: { children?: unknown }) =>
      React.createElement(View, { testID: "map-view", ...props }, children),
    Marker: ({ children, ...props }: { children?: unknown }) =>
      React.createElement(View, { testID: "map-marker", ...props }, children),
  };
});

import {
  MAP_PLACEHOLDER_TEST_ID,
  makeAddress,
  mockDeleteAddress,
  mockGeocodeAddress,
  mockGetCached,
  mockGoBack,
  mockNavigate,
  setupScreenMocks,
} from "./support/addressDetailsMocks";

import React from "react";
import { Alert, Linking } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import AddressDetailsScreen from "../AddressDetailsScreen";
import { lightColors } from "../../contexts/ThemeContext";
import { OFFLINE_OPACITY } from "../../hooks/useOfflineDisabled";

const COORDS = { latitude: 45.75, longitude: 4.85 };

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

type AlertButton = { text?: string; onPress?: () => void | Promise<void> };

/**
 * Opacité effective d'un élément : le voile « hors ligne » est posé sur le
 * bouton pressable, plusieurs niveaux au-dessus du libellé interrogé.
 */
const opacityOf = (element: { props: { style?: unknown }; parent: unknown } | null) => {
  let current = element;
  while (current) {
    const { opacity } = flatten(current.props.style);
    if (typeof opacity === "number") return opacity;
    current = current.parent as typeof current;
  }
  return undefined;
};

/** Monte l'écran et laisse le géocodage se résoudre. */
const renderScreen = async () => {
  render(<AddressDetailsScreen />);
  await act(async () => {});
};

describe("AddressDetailsScreen", () => {
  let alert: jest.SpyInstance;
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    setupScreenMocks();
    mockGetCached.mockReturnValue(COORDS);
    mockGeocodeAddress.mockResolvedValue(COORDS);
    mockDeleteAddress.mockResolvedValue(undefined);
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("états de chargement", () => {
    it("should show the skeleton while the addresses are loading", async () => {
      // Arrange
      setupScreenMocks({ loading: true });

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("Chez Marcel")).toBeNull();
      expect(screen.queryByText("addresses.details.notFound")).toBeNull();
    });

    it("should report a missing address when no address matches the route id", async () => {
      // Arrange
      setupScreenMocks({ addresses: [] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("addresses.details.notFound")).toBeTruthy();
    });
  });

  describe("informations de l'adresse", () => {
    it("should display the street and the city of the address", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("📍 12 rue des Lilas, Lyon")).toBeTruthy();
    });

    it("should fill as many stars as the rounded rating", async () => {
      // Arrange
      setupScreenMocks({ addresses: [makeAddress({ rating: 3.6 })] });

      // Act
      await renderScreen();

      // Assert
      const filled = screen
        .getAllByText("★")
        .filter((star) => flatten(star.props.style).color === lightColors.terra);
      expect(filled).toHaveLength(4);
    });

    it("should leave every star empty when the address has no rating", async () => {
      // Arrange
      setupScreenMocks({ addresses: [makeAddress({ rating: undefined })] });

      // Act
      await renderScreen();

      // Assert
      const filled = screen
        .getAllByText("★")
        .filter((star) => flatten(star.props.style).color === lightColors.terra);
      expect(filled).toHaveLength(0);
    });

    it("should display the notes of the address", async () => {
      // Arrange
      setupScreenMocks({ addresses: [makeAddress({ notes: "Réserver côté terrasse" })] });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("Réserver côté terrasse")).toBeTruthy();
    });

    it("should display a placeholder when the address has no notes", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("addresses.details.noNotes")).toBeTruthy();
    });
  });

  describe("moyens de contact", () => {
    it("should dial the phone number when the phone chip is pressed", async () => {
      // Arrange
      setupScreenMocks({ addresses: [makeAddress({ phone: "+33 4 78 00 00 00" })] });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("📞 +33 4 78 00 00 00"));

      // Assert
      expect(openURL).toHaveBeenCalledWith("tel:+33 4 78 00 00 00");
    });

    it("should open the website when the website chip is pressed", async () => {
      // Arrange
      setupScreenMocks({ addresses: [makeAddress({ website: "https://chez-marcel.fr" })] });
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("🌐 addresses.details.websiteChip"));

      // Assert
      expect(openURL).toHaveBeenCalledWith("https://chez-marcel.fr");
    });

    it("should hide the contact chips when the address has neither phone nor website", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("🌐 addresses.details.websiteChip")).toBeNull();
    });

    it("should open the directions in the maps website when the button is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("addresses.details.openInMaps"));

      // Assert
      expect(openURL).toHaveBeenCalledWith(
        "https://maps.google.com/maps?daddr=12%20rue%20des%20Lilas%2C%20Lyon%2C%20France",
      );
    });
  });

  describe("vignette carte", () => {
    it("should render the native map on the cached coordinates", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByTestId("map-view").props.region).toMatchObject(COORDS);
      expect(screen.getByTestId("map-marker").props.coordinate).toEqual(COORDS);
      expect(mockGeocodeAddress).not.toHaveBeenCalled();
    });

    it("should geocode the address when no coordinates are cached", async () => {
      // Arrange
      mockGetCached.mockReturnValue(undefined);

      // Act
      await renderScreen();

      // Assert
      expect(mockGeocodeAddress).toHaveBeenCalledWith("12 rue des Lilas", "Lyon", "France");
      await waitFor(() => expect(screen.getByTestId("map-view")).toBeTruthy());
    });

    it("should show the placeholder when the address cannot be geocoded", async () => {
      // Arrange
      mockGetCached.mockReturnValue(undefined);
      mockGeocodeAddress.mockResolvedValue(null);

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryByTestId("map-view")).toBeNull();
      expect(screen.getByTestId(MAP_PLACEHOLDER_TEST_ID)).toBeTruthy();
    });

    it("should keep the placeholder when the geocoding service rejects", async () => {
      // Arrange
      mockGetCached.mockReturnValue(undefined);
      mockGeocodeAddress.mockRejectedValue(new Error("service indisponible"));

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryByTestId("map-view")).toBeNull();
      expect(screen.getByTestId(MAP_PLACEHOLDER_TEST_ID)).toBeTruthy();
    });

    it("should use the standard map type by default", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByTestId("map-view").props.mapType).toBe("standard");
    });

    it("should use the hybrid map type when satellite maps are enabled", async () => {
      // Arrange
      setupScreenMocks({ satelliteMap: true });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByTestId("map-view").props.mapType).toBe("hybrid");
    });
  });

  describe("actions du propriétaire", () => {
    it("should offer the edit and delete actions to the owner of the address", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("addresses.details.editButton")).toBeTruthy();
      expect(screen.getByText("addresses.details.deleteButton")).toBeTruthy();
    });

    it("should hide the actions from a user who does not own the address", async () => {
      // Arrange
      setupScreenMocks({ userId: "someone-else" });

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("addresses.details.editButton")).toBeNull();
    });

    it("should hide the actions when nobody is signed in", async () => {
      // Arrange
      setupScreenMocks({ userId: null });

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("addresses.details.editButton")).toBeNull();
    });

    it("should open the address form when the edit action is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("addresses.details.editButton"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("AddressForm", { addressId: "addr-1" });
    });

    it("should disable the actions while the device is offline", async () => {
      // Arrange
      setupScreenMocks({ isConnected: false });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("addresses.details.editButton")).toBeDisabled();
      expect(screen.getByText("addresses.details.deleteButton")).toBeDisabled();
    });

    it("should dim the actions while the device is offline", async () => {
      // Arrange
      setupScreenMocks({ isConnected: false });

      // Act
      await renderScreen();

      // Assert
      expect(opacityOf(screen.getByText("addresses.details.editButton"))).toBe(OFFLINE_OPACITY);
    });

    it("should go back when the cover back button is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("suppression de l'adresse", () => {
    const confirmDeletion = async () => {
      fireEvent.press(screen.getByText("addresses.details.deleteButton"));
      const buttons = (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
      await act(async () => {
        await buttons[1].onPress?.();
      });
    };

    it("should ask for confirmation before deleting the address", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("addresses.details.deleteButton"));

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "addresses.details.deleteTitle",
        "addresses.details.deleteConfirm",
        expect.any(Array),
      );
      expect(mockDeleteAddress).not.toHaveBeenCalled();
    });

    it("should delete the address and go back once the deletion is confirmed", async () => {
      // Arrange
      await renderScreen();

      // Act
      await confirmDeletion();

      // Assert
      expect(mockDeleteAddress).toHaveBeenCalledWith("addr-1");
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should still go back when the context exposes no deletion handler", async () => {
      // Arrange
      setupScreenMocks({ deleteAddress: undefined });
      await renderScreen();

      // Act
      await confirmDeletion();

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should keep the user on the screen when the deletion fails", async () => {
      // Arrange
      const error = jest.spyOn(console, "error").mockImplementation(() => {});
      mockDeleteAddress.mockRejectedValue(new Error("suppression refusée"));
      await renderScreen();

      // Act
      await confirmDeletion();

      // Assert
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith("Delete address error:", expect.any(Error));
    });
  });

  it("should ignore a stale geocoding result once the address has changed", async () => {
    // Arrange : le premier géocodage reste en attente, le second aboutit.
    const staleCoords = { latitude: 0, longitude: 0 };
    const freshCoords = { latitude: 48.86, longitude: 2.35 };
    let resolveFirst: (value: unknown) => void = () => {};
    mockGetCached.mockReturnValue(undefined);
    mockGeocodeAddress
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(freshCoords);
    render(<AddressDetailsScreen />);
    await act(async () => {});

    // Act : l'adresse affichée change, puis le géocodage périmé se résout.
    setupScreenMocks({ addresses: [makeAddress({ address: "5 avenue Foch" })] });
    screen.rerender(<AddressDetailsScreen />);
    await act(async () => {});
    await act(async () => {
      resolveFirst(staleCoords);
    });

    // Assert
    expect(screen.getByTestId("map-view").props.region).toMatchObject(freshCoords);
  });
});
