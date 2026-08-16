/**
 * Frontières partagées par les suites de `FullMapScreen`.
 *
 * L'écran charge `react-native-maps` au chargement du module : sa disponibilité
 * ne peut pas varier au sein d'une même suite. Deux fichiers de test couvrent
 * les deux situations (carte disponible, module introuvable) et partagent ce
 * module de support, à importer EN PREMIER pour que ses `jest.mock` précèdent le
 * chargement de l'écran.
 */

import "./screenMocks";

import type { Address } from "../../../types";

export const mockNavigate = jest.fn();
export const mockGoBack = jest.fn();
export const mockToggleSatelliteMap = jest.fn();

const mockUseTrips = jest.fn();
const mockUseTheme = jest.fn();
const mockUseAddressGeocoding = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock("../../../contexts/TripsContext", () => ({ useTrips: () => mockUseTrips() }));
jest.mock("../../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../../contexts/ThemeContext"),
  useTheme: () => mockUseTheme(),
}));

jest.mock("../../../hooks/useAddressGeocoding", () => ({
  useAddressGeocoding: (...args: unknown[]) => mockUseAddressGeocoding(...args),
}));

export const makeAddress = (overrides: Partial<Address> = {}): Address =>
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

export const COORDS = { latitude: 45.75, longitude: 4.85 };

interface SetupOptions {
  addresses?: Address[];
  mapCoords?: Record<string, { latitude: number; longitude: number }>;
  isGeocoding?: boolean;
  isDark?: boolean;
  satelliteMap?: boolean;
}

/** Réarme toutes les doublures ; à appeler dans chaque `beforeEach`. */
export const setupScreenMocks = (options: SetupOptions = {}) => {
  const {
    addresses = [makeAddress()],
    mapCoords = { "addr-1": COORDS },
    isGeocoding = false,
    isDark = false,
    satelliteMap = false,
  } = options;
  const { lightColors } = jest.requireActual("../../../contexts/ThemeContext");

  mockUseTrips.mockReturnValue({ addresses });
  mockUseTheme.mockReturnValue({
    colors: lightColors,
    isDark,
    satelliteMap,
    toggleSatelliteMap: mockToggleSatelliteMap,
  });
  mockUseAddressGeocoding.mockReturnValue({ mapCoords, isGeocoding });
};
