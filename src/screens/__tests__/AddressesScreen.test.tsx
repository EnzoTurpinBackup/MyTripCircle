// Branche volontairement non couverte :
//   - l. 47 garde `if (!actionAddress) return` de `handleDeletePress` : la
//     feuille d'actions est un `Modal` monté `visible={!!actionAddress}`, et un
//     `Modal` masqué ne rend pas ses enfants. Le bouton « supprimer » n'existe
//     donc jamais tant qu'aucune adresse n'est sélectionnée.

import "./support/screenMocks";

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

import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import AddressesScreen from "../AddressesScreen";
import { lightColors } from "../../contexts/ThemeContext";
import { useAddresses } from "../../hooks/useAddresses";
import { OFFLINE_OPACITY } from "../../hooks/useOfflineDisabled";
import type { Address } from "../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// `AddressMapWidget` et `AddressFilterBar` tirent `MapView`, `Marker` et
// `mapsAvailable` de ce module : seul le hook est remplacé.
jest.mock("../../hooks/useAddresses", () => ({
  ...jest.requireActual("../../hooks/useAddresses"),
  useAddresses: jest.fn(),
}));

const mockUseNetwork = jest.fn();
jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: () => mockUseNetwork() }));

// Le geste de navigation entre onglets repose sur `react-native-gesture-handler` :
// il n'apporte rien au rendu et son détecteur natif n'est pas monté en test.
jest.mock("../../hooks/useSwipeToNavigate", () => ({
  SwipeToNavigate: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseAddresses = useAddresses as jest.Mock;

const WIDGET_REGION = {
  latitude: 45.75,
  longitude: 4.85,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const makeAddress = (overrides: Partial<Address> = {}): Address =>
  ({
    id: "addr-1",
    type: "restaurant",
    name: "Chez Marcel",
    address: "12 rue des Lilas",
    city: "Lyon",
    country: "France",
    userId: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }) as Address;

const handlers = {
  setSelectedFilter: jest.fn(),
  setActionAddress: jest.fn(),
  handleAddressPress: jest.fn(),
  handleEditAddress: jest.fn(),
  handleDeleteAddress: jest.fn(),
  handleAddAddress: jest.fn(),
  handleOpenFullMap: jest.fn(),
};

interface HookOverrides {
  addresses?: Address[];
  loading?: boolean;
  selectedFilter?: string;
  filteredAddresses?: Address[];
  eyebrow?: string;
  actionAddress?: Address | null;
  isGeocoding?: boolean;
  isConnected?: boolean;
}

const setupHook = (overrides: HookOverrides = {}) => {
  const {
    addresses = [makeAddress()],
    loading = false,
    selectedFilter = "all",
    eyebrow = "3 addresses.eyebrow",
    actionAddress = null,
    isGeocoding = false,
    isConnected = true,
  } = overrides;
  const filteredAddresses = overrides.filteredAddresses ?? addresses;

  mockUseNetwork.mockReturnValue({ isConnected });
  mockUseAddresses.mockReturnValue({
    t: (key: string) => key,
    colors: lightColors,
    isDark: false,
    addresses,
    loading,
    selectedFilter,
    setSelectedFilter: handlers.setSelectedFilter,
    mapCoords: {},
    isGeocoding,
    widgetRegion: WIDGET_REGION,
    filteredAddresses,
    eyebrow,
    actionAddress,
    setActionAddress: handlers.setActionAddress,
    handleAddressPress: handlers.handleAddressPress,
    handleEditAddress: handlers.handleEditAddress,
    handleDeleteAddress: handlers.handleDeleteAddress,
    handleAddAddress: handlers.handleAddAddress,
    handleOpenFullMap: handlers.handleOpenFullMap,
  });
};

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/** Opacité effective d'un élément, portée par un ancêtre pressable. */
const opacityOf = (element: { props: { style?: unknown }; parent: unknown } | null) => {
  let current = element;
  while (current) {
    const { opacity } = flatten(current.props.style);
    if (typeof opacity === "number") return opacity;
    current = current.parent as typeof current;
  }
  return undefined;
};

type AlertButton = { text?: string; onPress?: () => void | Promise<void> };

describe("AddressesScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    setupHook();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("chargement", () => {
    it("should hide the address list behind a skeleton while loading", () => {
      // Arrange
      setupHook({ loading: true });

      // Act
      render(<AddressesScreen />);

      // Assert
      expect(screen.queryByText("addresses.header")).toBeNull();
      expect(screen.queryByText("Chez Marcel")).toBeNull();
    });
  });

  describe("en-tête", () => {
    it("should display the eyebrow provided by the hook", () => {
      // Arrange & Act
      render(<AddressesScreen />);

      // Assert
      expect(screen.getByText("3 addresses.eyebrow")).toBeTruthy();
    });

    it("should omit the eyebrow when the hook provides none", () => {
      // Arrange
      setupHook({ eyebrow: "" });

      // Act
      render(<AddressesScreen />);

      // Assert
      expect(screen.getByText("addresses.header")).toBeTruthy();
      expect(screen.queryByText("3 addresses.eyebrow")).toBeNull();
    });

    it("should start the address creation from the header button", () => {
      // Arrange
      render(<AddressesScreen />);

      // Act
      fireEvent.press(screen.getByText("icon:add"));

      // Assert
      expect(handlers.handleAddAddress).toHaveBeenCalledTimes(1);
    });

    it("should disable the creation button while the device is offline", () => {
      // Arrange
      setupHook({ isConnected: false });

      // Act
      render(<AddressesScreen />);

      // Assert
      expect(screen.getByText("icon:add")).toBeDisabled();
    });

    it("should dim the creation button while the device is offline", () => {
      // Arrange
      setupHook({ isConnected: false });

      // Act
      render(<AddressesScreen />);

      // Assert
      expect(opacityOf(screen.getByText("icon:add"))).toBe(OFFLINE_OPACITY);
    });
  });

  describe("filtres et carte", () => {
    it("should apply the filter picked in the filter bar", () => {
      // Arrange
      render(<AddressesScreen />);

      // Act
      fireEvent.press(screen.getByText("addresses.filters.hotel"));

      // Assert
      expect(handlers.setSelectedFilter).toHaveBeenCalledWith("hotel");
    });

    it("should center the map widget on the region computed by the hook", () => {
      // Arrange & Act
      render(<AddressesScreen />);

      // Assert
      expect(screen.getByTestId("map-view").props.initialRegion).toEqual(WIDGET_REGION);
    });

    it("should open the full map when the see-all shortcut is pressed", () => {
      // Arrange
      render(<AddressesScreen />);

      // Act
      fireEvent.press(screen.getByText("addresses.seeMap →"));

      // Assert
      expect(handlers.handleOpenFullMap).toHaveBeenCalledTimes(1);
    });
  });

  describe("liste vide", () => {
    it("should invite the user to add a first address when no filter is active", () => {
      // Arrange
      setupHook({ addresses: [], filteredAddresses: [] });

      // Act
      render(<AddressesScreen />);

      // Assert
      expect(screen.getByText("addresses.emptyAll")).toBeTruthy();
    });

    it("should explain that the active filter matches nothing", () => {
      // Arrange
      setupHook({ addresses: [], filteredAddresses: [], selectedFilter: "hotel" });

      // Act
      render(<AddressesScreen />);

      // Assert
      expect(screen.getByText("addresses.emptyFiltered")).toBeTruthy();
    });

    it("should start the address creation from the empty state", () => {
      // Arrange
      setupHook({ addresses: [], filteredAddresses: [] });
      render(<AddressesScreen />);

      // Act
      fireEvent.press(screen.getByText("addresses.addAddress"));

      // Assert
      expect(handlers.handleAddAddress).toHaveBeenCalledTimes(1);
    });

    it("should disable the empty state button while the device is offline", () => {
      // Arrange
      setupHook({ addresses: [], filteredAddresses: [], isConnected: false });

      // Act
      render(<AddressesScreen />);

      // Assert
      expect(screen.getByText("addresses.addAddress")).toBeDisabled();
    });
  });

  describe("liste des adresses", () => {
    it("should display every filtered address", () => {
      // Arrange
      setupHook({
        addresses: [makeAddress(), makeAddress({ id: "addr-2", name: "Le Perchoir" })],
      });

      // Act
      render(<AddressesScreen />);

      // Assert
      expect(screen.getByText("Chez Marcel")).toBeTruthy();
      expect(screen.getByText("Le Perchoir")).toBeTruthy();
    });

    it("should open the address details when a card is pressed", () => {
      // Arrange
      render(<AddressesScreen />);

      // Act
      fireEvent.press(screen.getByText("Chez Marcel"));

      // Assert
      expect(handlers.handleAddressPress).toHaveBeenCalledWith(
        expect.objectContaining({ id: "addr-1" }),
      );
    });
  });

  describe("feuille d'actions", () => {
    it("should stay hidden while no address is selected", () => {
      // Arrange & Act
      render(<AddressesScreen />);

      // Assert
      expect(screen.queryByText("common.edit")).toBeNull();
    });

    it("should name the selected address and its city", () => {
      // Arrange
      setupHook({ actionAddress: makeAddress({ id: "addr-2", city: "Paris" }) });

      // Act
      render(<AddressesScreen />);

      // Assert
      expect(screen.getByText("Paris, France")).toBeTruthy();
    });

    it("should close itself when the cancel button is pressed", () => {
      // Arrange
      setupHook({ actionAddress: makeAddress() });
      render(<AddressesScreen />);

      // Act
      fireEvent.press(screen.getByText("common.cancel"));

      // Assert
      expect(handlers.setActionAddress).toHaveBeenCalledWith(null);
    });

    it("should start the edition of the selected address", () => {
      // Arrange
      setupHook({ actionAddress: makeAddress() });
      render(<AddressesScreen />);

      // Act
      fireEvent.press(screen.getByText("common.edit"));

      // Assert
      expect(handlers.handleEditAddress).toHaveBeenCalledTimes(1);
    });
  });

  describe("suppression d'une adresse", () => {
    const pressDelete = () => {
      setupHook({ actionAddress: makeAddress() });
      render(<AddressesScreen />);
      fireEvent.press(screen.getByText("common.delete"));
    };

    it("should close the action sheet before asking for confirmation", () => {
      // Arrange & Act
      pressDelete();

      // Assert
      expect(handlers.setActionAddress).toHaveBeenCalledWith(null);
    });

    it("should ask for confirmation before deleting", () => {
      // Arrange & Act
      pressDelete();

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "addresses.details.deleteTitle",
        "addresses.details.deleteConfirm",
        expect.any(Array),
      );
      expect(handlers.handleDeleteAddress).not.toHaveBeenCalled();
    });

    it("should delete the address once the confirmation is accepted", async () => {
      // Arrange
      pressDelete();
      const buttons = (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];

      // Act
      await act(async () => {
        await buttons[1].onPress?.();
      });

      // Assert
      expect(handlers.handleDeleteAddress).toHaveBeenCalledWith("addr-1");
    });
  });
});
