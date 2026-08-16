// Suite dédiée au repli de `useAddresses` quand `react-native-maps` est absent
// (Expo Go, build sans le module natif). Le repli s'exécute à l'import du
// module : il ne peut donc pas être couvert depuis la suite principale, qui
// charge le module avec la carte disponible.

jest.mock("react-native-maps", () => {
  throw new Error("react-native-maps indisponible");
});

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../contexts/TripsContext", () => ({ useTrips: jest.fn() }));
jest.mock("../../contexts/ThemeContext", () => ({ useTheme: jest.fn() }));
jest.mock("../../utils/geocoding", () => ({
  geocodeAddress: jest.fn(),
  getCached: jest.fn(),
}));
jest.mock("../useCurrentLocation", () => ({ useCurrentLocation: jest.fn() }));

type HookModule = typeof import("../useAddresses");

const loadHookModule = (): HookModule => {
  let loaded!: HookModule;
  jest.isolateModules(() => {
    loaded = require("../useAddresses");
  });
  return loaded;
};

describe("useAddresses sans react-native-maps", () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
  });

  it("should report the map as unavailable when the native module cannot be loaded", () => {
    // Arrange & Act
    const { mapsAvailable, MapView, Marker } = loadHookModule();

    // Assert
    expect(mapsAvailable).toBe(false);
    expect(MapView).toBeNull();
    expect(Marker).toBeNull();
  });

  it("should warn about the missing module in development builds", () => {
    // Arrange & Act
    loadHookModule();

    // Assert
    expect(warn).toHaveBeenCalledWith(
      "[useAddresses] react-native-maps non disponible:",
      expect.any(Error)
    );
  });

  it("should stay silent about the missing module outside development builds", () => {
    // Arrange
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;

    // Act
    const { mapsAvailable } = loadHookModule();

    // Assert
    expect(mapsAvailable).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});
