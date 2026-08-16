/**
 * Frontières partagées par les suites d'`AddressDetailsScreen`.
 *
 * L'écran charge `react-native-maps` au chargement du module : sa disponibilité
 * ne peut donc pas varier au sein d'une même suite. Trois fichiers de test
 * distincts couvrent les trois situations (carte disponible, module résolu sans
 * composant, module introuvable) et partagent ce module de support, qui doit
 * être importé EN PREMIER pour que ses `jest.mock` précèdent le chargement de
 * l'écran.
 */

import "./screenMocks";

import type { Address } from "../../../types";

// ─── Doublures stables ────────────────────────────────────────────────────────
// Les fabriques `jest.mock` renvoient ces instances : elles survivent au
// rechargement des modules opéré par `jest.isolateModules`.
export const mockNavigate = jest.fn();
export const mockGoBack = jest.fn();
export const mockDeleteAddress = jest.fn();
export const mockGeocodeAddress = jest.fn();
export const mockGetCached = jest.fn();

const mockUseRoute = jest.fn();
const mockUseTrips = jest.fn();
const mockUseAuth = jest.fn();
const mockUseTheme = jest.fn();
const mockUseNetwork = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useRoute: () => mockUseRoute(),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock("../../../contexts/TripsContext", () => ({ useTrips: () => mockUseTrips() }));
jest.mock("../../../contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("../../../contexts/NetworkContext", () => ({ useNetwork: () => mockUseNetwork() }));
jest.mock("../../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../../contexts/ThemeContext"),
  useTheme: () => mockUseTheme(),
}));

jest.mock("../../../utils/geocoding", () => ({
  geocodeAddress: (...args: unknown[]) => mockGeocodeAddress(...args),
  getCached: (...args: unknown[]) => mockGetCached(...args),
}));

// La photo de couverture du bandeau est une frontière réseau.
jest.mock("../../../utils/destinationPhoto", () => ({
  getSyncCachedPhoto: () => null,
  getCachedDestinationPhoto: () => Promise.resolve(null),
}));

// Le dégradé n'expose rien d'interrogeable : on le remplace par une vue dont le
// `testID` porte sa palette, ce qui distingue le repli de la vignette carte du
// voile du bandeau de couverture.
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: ({ colors, children, ...rest }: { colors: string[]; children?: unknown }) =>
      React.createElement(View, { testID: `gradient:${colors.join("/")}`, ...rest }, children),
  };
});

/** Palette du repli affiché quand aucune carte native n'est disponible. */
export const MAP_PLACEHOLDER_TEST_ID = "gradient:#C8D8C0/#A8C4B0";

// ─── Jeux de données ──────────────────────────────────────────────────────────

export const OWNER_ID = "user-1";

export const makeAddress = (overrides: Partial<Address> = {}): Address =>
  ({
    id: "addr-1",
    type: "restaurant",
    name: "Chez Marcel",
    address: "12 rue des Lilas",
    city: "Lyon",
    country: "France",
    rating: 4,
    userId: OWNER_ID,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }) as Address;

interface SetupOptions {
  addresses?: Address[];
  addressId?: string;
  loading?: boolean;
  userId?: string | null;
  satelliteMap?: boolean;
  isConnected?: boolean;
  deleteAddress?: unknown;
}

/** Réarme toutes les doublures ; à appeler dans chaque `beforeEach`. */
export const setupScreenMocks = (options: SetupOptions = {}) => {
  const {
    addresses = [makeAddress()],
    addressId = "addr-1",
    loading = false,
    userId = OWNER_ID,
    satelliteMap = false,
    isConnected = true,
  } = options;
  // `undefined` est une valeur significative ici (contexte sans gestionnaire de
  // suppression) : la présence de la clé prime donc sur une valeur par défaut.
  const deleteAddress = "deleteAddress" in options ? options.deleteAddress : mockDeleteAddress;
  const { lightColors } = jest.requireActual("../../../contexts/ThemeContext");

  mockUseRoute.mockReturnValue({ params: { addressId } });
  mockUseTrips.mockReturnValue({ addresses, loading, deleteAddress });
  mockUseAuth.mockReturnValue({ user: userId ? { id: userId } : null });
  mockUseTheme.mockReturnValue({ colors: lightColors, satelliteMap });
  mockUseNetwork.mockReturnValue({ isConnected });
};
