// Suite principale : `react-native-maps` expose bien un composant de carte. Le
// cas du module introuvable est couvert par la suite voisine, le chargement du
// module n'ayant lieu qu'une fois par fichier.
//
// Branche volontairement non couverte :
//   - l. 114 garde `if (!coords) return` de `handleMarkerPress` : les marqueurs
//     ne sont rendus que pour les adresses présentes dans `mapCoords`, et le
//     gestionnaire relit ce même dictionnaire dans la même passe de rendu. Aucun
//     marqueur pressable ne peut donc être dépourvu de coordonnées.

const mockMapHandle = {
  fitToCoordinates: jest.fn(),
  animateCamera: jest.fn(),
};

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => mockMapHandle);
    return React.createElement(View, { testID: "map-view", ...props }, props.children);
  });
  return {
    __esModule: true,
    default: MapView,
    Marker: ({ children, ...props }: { children?: unknown }) =>
      React.createElement(View, { testID: "map-marker", ...props }, children),
  };
});

import {
  COORDS,
  makeAddress,
  mockGoBack,
  mockNavigate,
  mockToggleSatelliteMap,
  setupScreenMocks,
} from "./support/fullMapMocks";

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import FullMapScreen from "../FullMapScreen";

const HOTEL = makeAddress({ id: "addr-2", type: "hotel", name: "Hôtel Bellecour" });
const ACTIVITY = makeAddress({ id: "addr-3", type: "activity", name: "Musée" });
const TRANSPORT = makeAddress({ id: "addr-4", type: "transport", name: "Gare" });
const OTHER = makeAddress({ id: "addr-5", type: "other", name: "Divers" });

const OTHER_COORDS = { latitude: 48.86, longitude: 2.35 };

describe("FullMapScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupScreenMocks();
  });

  describe("en-tête et filtres", () => {
    it("should go back when the header back button is pressed", () => {
      // Arrange
      render(<FullMapScreen />);

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should offer one chip per address type", () => {
      // Arrange & Act
      render(<FullMapScreen />);

      // Assert
      expect(screen.getByText("addresses.filters.all")).toBeTruthy();
      expect(screen.getByText("addresses.filters.other")).toBeTruthy();
    });

    it("should keep only the addresses matching the selected filter", () => {
      // Arrange
      setupScreenMocks({
        addresses: [makeAddress(), HOTEL],
        mapCoords: { "addr-1": COORDS, "addr-2": OTHER_COORDS },
      });
      render(<FullMapScreen />);

      // Act
      fireEvent.press(screen.getByText("addresses.filters.hotel"));

      // Assert
      expect(screen.getAllByTestId("map-marker")).toHaveLength(1);
    });

    it("should highlight the selected filter chip in white", () => {
      // Arrange
      render(<FullMapScreen />);

      // Act
      fireEvent.press(screen.getByText("addresses.filters.hotel"));

      // Assert
      const flatten = (style: unknown) =>
        Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
      expect(flatten(screen.getByText("addresses.filters.hotel").props.style).color).toBe("#FFFFFF");
      expect(flatten(screen.getByText("addresses.filters.all").props.style).color).not.toBe("#FFFFFF");
    });
  });

  describe("marqueurs", () => {
    it("should place one marker per geocoded address", () => {
      // Arrange
      setupScreenMocks({
        addresses: [makeAddress(), HOTEL],
        mapCoords: { "addr-1": COORDS, "addr-2": OTHER_COORDS },
      });

      // Act
      render(<FullMapScreen />);

      // Assert
      expect(screen.getAllByTestId("map-marker")).toHaveLength(2);
    });

    it("should skip the addresses that could not be geocoded", () => {
      // Arrange
      setupScreenMocks({ addresses: [makeAddress(), HOTEL], mapCoords: { "addr-1": COORDS } });

      // Act
      render(<FullMapScreen />);

      // Assert
      expect(screen.getAllByTestId("map-marker")).toHaveLength(1);
    });

    it.each([
      [makeAddress(), "icon:restaurant-outline"],
      [HOTEL, "icon:bed-outline"],
      [ACTIVITY, "icon:ticket-outline"],
      [TRANSPORT, "icon:car-outline"],
      [OTHER, "icon:location-outline"],
    ])("should draw the pin icon matching the address type", (address, icon) => {
      // Arrange
      setupScreenMocks({ addresses: [address], mapCoords: { [address.id]: COORDS } });

      // Act
      render(<FullMapScreen />);

      // Assert
      // L'icône du marqueur est décorative : le type de l'adresse est déjà
      // annoncé par le libellé du marqueur, aussi l'icône est-elle retirée du
      // parcours des lecteurs d'écran — que les requêtes ignorent par défaut.
      // C'est bien son rendu visuel que ce cas observe.
      expect(screen.getAllByText(icon, { includeHiddenElements: true }).length).toBeGreaterThan(0);
    });

    it("should fit the map to the markers once it is ready", async () => {
      // Arrange
      render(<FullMapScreen />);

      // Act
      fireEvent(screen.getByTestId("map-view"), "mapReady");

      // Assert
      await waitFor(() => expect(mockMapHandle.fitToCoordinates).toHaveBeenCalledWith(
        [COORDS],
        expect.objectContaining({ animated: true }),
      ));
    });

    it("should not fit the map when no address is geocoded", async () => {
      // Arrange
      setupScreenMocks({ mapCoords: {} });
      render(<FullMapScreen />);

      // Act
      fireEvent(screen.getByTestId("map-view"), "mapReady");

      // Assert
      await new Promise((resolve) => setTimeout(resolve, 350));
      expect(mockMapHandle.fitToCoordinates).not.toHaveBeenCalled();
    });

    it("should give up fitting the map when the screen is left before the delay", async () => {
      // Arrange
      const view = render(<FullMapScreen />);
      fireEvent(screen.getByTestId("map-view"), "mapReady");

      // Act
      view.unmount();
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Assert
      expect(mockMapHandle.fitToCoordinates).not.toHaveBeenCalled();
    });
  });

  describe("popup d'une adresse", () => {
    it("should open the popup of the pressed marker", () => {
      // Arrange
      render(<FullMapScreen />);

      // Act
      fireEvent.press(screen.getByTestId("map-marker"));

      // Assert
      expect(screen.getByText("Voir les détails")).toBeTruthy();
    });

    it("should remove the marker when the address loses its coordinates", () => {
      // Arrange
      setupScreenMocks({ addresses: [makeAddress(), HOTEL], mapCoords: { "addr-1": COORDS } });
      render(<FullMapScreen />);
      setupScreenMocks({ addresses: [makeAddress(), HOTEL], mapCoords: {} });
      screen.rerender(<FullMapScreen />);

      // Act & Assert : plus aucun marqueur ne subsiste à presser.
      expect(screen.queryByTestId("map-marker")).toBeNull();
      expect(screen.queryByText("Voir les détails")).toBeNull();
    });

    it("should recenter the camera below the pressed marker", () => {
      // Arrange
      render(<FullMapScreen />);
      fireEvent(screen.getByTestId("map-view"), "regionChangeComplete", {
        latitude: 45.75,
        longitude: 4.85,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      });

      // Act
      fireEvent.press(screen.getByTestId("map-marker"));

      // Assert : le marqueur est décalé d'un cinquième du delta vers le sud.
      expect(mockMapHandle.animateCamera).toHaveBeenCalledWith(
        { center: { latitude: 45.65, longitude: 4.85 } },
        { duration: 350 },
      );
    });

    it("should freeze the map gestures while the popup is open", () => {
      // Arrange
      render(<FullMapScreen />);

      // Act
      fireEvent.press(screen.getByTestId("map-marker"));

      // Assert
      expect(screen.getByTestId("map-view").props.scrollEnabled).toBe(false);
    });

    it("should close the popup when its close button is pressed", () => {
      // Arrange
      render(<FullMapScreen />);
      fireEvent.press(screen.getByTestId("map-marker"));

      // Act
      fireEvent.press(screen.getByText("icon:close"));

      // Assert
      expect(screen.queryByText("Voir les détails")).toBeNull();
    });

    it("should open the address details from the popup", () => {
      // Arrange
      render(<FullMapScreen />);
      fireEvent.press(screen.getByTestId("map-marker"));

      // Act
      fireEvent.press(screen.getByText("Voir les détails"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("AddressDetails", { addressId: "addr-1" });
    });

    it("should close the popup when navigating to the address details", () => {
      // Arrange
      render(<FullMapScreen />);
      fireEvent.press(screen.getByTestId("map-marker"));

      // Act
      fireEvent.press(screen.getByText("Voir les détails"));

      // Assert
      expect(screen.queryByText("Voir les détails")).toBeNull();
    });
  });

  describe("fond de carte", () => {
    it("should use the standard map type by default", () => {
      // Arrange & Act
      render(<FullMapScreen />);

      // Assert
      expect(screen.getByTestId("map-view").props.mapType).toBe("standard");
    });

    it("should use the hybrid map type when satellite maps are enabled", () => {
      // Arrange
      setupScreenMocks({ satelliteMap: true });

      // Act
      render(<FullMapScreen />);

      // Assert
      expect(screen.getByTestId("map-view").props.mapType).toBe("hybrid");
    });

    it("should apply the dark map style in dark mode", () => {
      // Arrange
      setupScreenMocks({ isDark: true });

      // Act
      render(<FullMapScreen />);

      // Assert
      expect(screen.getByTestId("map-view").props.customMapStyle.length).toBeGreaterThan(0);
    });

    it("should drop the dark map style when satellite maps are enabled", () => {
      // Arrange
      setupScreenMocks({ isDark: true, satelliteMap: true });

      // Act
      render(<FullMapScreen />);

      // Assert
      expect(screen.getByTestId("map-view").props.customMapStyle).toEqual([]);
    });

    it("should toggle the satellite view from the dedicated button", () => {
      // Arrange
      render(<FullMapScreen />);

      // Act
      fireEvent.press(screen.getByText("icon:globe-outline"));

      // Assert
      expect(mockToggleSatelliteMap).toHaveBeenCalledTimes(1);
    });

    it("should offer to go back to the plan view while in satellite mode", () => {
      // Arrange
      setupScreenMocks({ satelliteMap: true });

      // Act
      render(<FullMapScreen />);

      // Assert
      expect(screen.getByText("icon:map-outline")).toBeTruthy();
    });
  });

  describe("absence de marqueur", () => {
    it("should tell the user that no address can be displayed", () => {
      // Arrange
      setupScreenMocks({ addresses: [], mapCoords: {} });

      // Act
      render(<FullMapScreen />);

      // Assert
      expect(screen.getByText("Aucune adresse à afficher")).toBeTruthy();
    });

    it("should report the geocoding in progress instead", () => {
      // Arrange
      setupScreenMocks({ addresses: [makeAddress()], mapCoords: {}, isGeocoding: true });

      // Act
      render(<FullMapScreen />);

      // Assert
      expect(screen.getByText("Géocodage en cours…")).toBeTruthy();
      expect(screen.queryByText("Aucune adresse à afficher")).toBeNull();
    });

    it("should hide the badge as soon as one marker is displayed", () => {
      // Arrange & Act
      render(<FullMapScreen />);

      // Assert
      expect(screen.queryByText("Aucune adresse à afficher")).toBeNull();
    });
  });
});
