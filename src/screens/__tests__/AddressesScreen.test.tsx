import "./support/screenMocks";

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import AddressesScreen from "../AddressesScreen";
import type { Address } from "../../types";

// La cartographie native est chargée au chargement du module par
// `useAddresses` : on la remplace par des vues neutres, l'aperçu n'étant pas le
// sujet de cette suite.
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

// Le conteneur de balayage dépend de Gesture Handler : il est neutralisé et
// rend son contenu tel quel.
jest.mock("../../hooks/useSwipeToNavigate", () => ({
  SwipeToNavigate: ({ children }: { children: React.ReactNode }) => children,
}));

// On renvoie la clé de traduction plutôt que le libellé : les assertions
// restent lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // La prise de focus est rejouée une fois au montage, comme à l'arrivée sur
  // l'onglet.
  useFocusEffect: (callback: () => void) => require("react").useEffect(callback, [callback]),
}));

jest.mock("../../contexts/TripsContext", () => ({ useTrips: () => mockUseTrips() }));
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: () => ({ isConnected: true }) }));
jest.mock("../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../contexts/ThemeContext");
  return { ...actual, useTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});

// Le géocodeur est une frontière réseau : le cache répond pour toutes les
// adresses, ce qui évite toute requête et tout minuteur pendant les tests.
jest.mock("../../utils/geocoding", () => ({
  geocodeAddress: jest.fn(),
  getCached: () => ({ latitude: 45.75, longitude: 4.85 }),
}));

jest.mock("../../hooks/useCurrentLocation", () => ({ useCurrentLocation: () => null }));

const mockNavigate = jest.fn();
const mockUseTrips = jest.fn();
const mockUseAuth = jest.fn();

const OWNER_ID = "user-1";
const OTHER_MEMBER_ID = "user-2";

const makeAddress = (overrides: Partial<Address> = {}): Address =>
  ({
    id: "addr-1",
    type: "restaurant",
    name: "Chez Marcel",
    address: "12 rue des Lilas",
    city: "Lyon",
    country: "France",
    userId: OWNER_ID,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }) as Address;

/** Réarme les doublures de contexte pour un carnet d'une seule adresse. */
const setupScreenMocks = ({ addressUserId = OWNER_ID } = {}) => {
  mockUseTrips.mockReturnValue({
    addresses: [makeAddress({ userId: addressUserId })],
    loading: false,
    deleteAddress: jest.fn(),
    refreshData: jest.fn(),
  });
  mockUseAuth.mockReturnValue({ user: { id: OWNER_ID } });
};

/** Monte l'écran et ouvre la feuille d'actions sur l'unique adresse du carnet. */
const openActionSheet = () => {
  render(<AddressesScreen />);
  fireEvent.press(screen.getByText("Chez Marcel"));
};

describe("AddressesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupScreenMocks();
  });

  describe("feuille d'actions", () => {
    it("should open the action sheet when an address card is pressed", () => {
      // Arrange & Act
      openActionSheet();

      // Assert
      expect(screen.getByLabelText("common.a11y.actionsFor")).toBeTruthy();
    });
  });

  // Une adresse rattachée à un voyage partagé est visible par tous ses membres
  // mais ne se modifie que par celui qui l'a ajoutée : la feuille doit refléter
  // cette règle plutôt que de retomber sur ses valeurs par défaut.
  describe("droits sur l'adresse du carnet", () => {
    it("should offer the edit action when the address belongs to the current user", () => {
      // Arrange & Act
      openActionSheet();

      // Assert
      expect(screen.getByText("common.edit")).toBeTruthy();
    });

    it("should offer the delete action when the address belongs to the current user", () => {
      // Arrange & Act
      openActionSheet();

      // Assert
      expect(screen.getByText("common.delete")).toBeTruthy();
    });

    it("should still open the sheet when the address belongs to another member", () => {
      // Arrange
      setupScreenMocks({ addressUserId: OTHER_MEMBER_ID });

      // Act
      openActionSheet();

      // Assert
      expect(screen.getByLabelText("common.a11y.actionsFor")).toBeTruthy();
    });

    it("should hide the edit action when the address belongs to another member", () => {
      // Arrange
      setupScreenMocks({ addressUserId: OTHER_MEMBER_ID });

      // Act
      openActionSheet();

      // Assert
      expect(screen.queryByText("common.edit")).toBeNull();
    });

    it("should hide the delete action when the address belongs to another member", () => {
      // Arrange
      setupScreenMocks({ addressUserId: OTHER_MEMBER_ID });

      // Act
      openActionSheet();

      // Assert
      expect(screen.queryByText("common.delete")).toBeNull();
    });
  });
});
