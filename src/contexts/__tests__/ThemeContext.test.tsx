import React, { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ThemeProvider,
  useTheme,
  lightColors,
  darkColors,
} from "../ThemeContext";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
// `react-native` réexporte ce module en interne : le mocker par son chemin
// permet de piloter le thème système sans toucher au reste du framework.
const mockUseColorScheme = jest.requireMock(
  "react-native/Libraries/Utilities/useColorScheme",
).default as jest.Mock;

const DARK_MODE_KEY = "@mytripcircle_dark_mode";
const SATELLITE_KEY = "@mytripcircle_satellite_map";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

/** Résout la lecture de chaque clé indépendamment, comme le ferait le stockage réel. */
const givenStorage = (values: Record<string, string | null>) => {
  mockGetItem.mockImplementation((key: string) =>
    Promise.resolve(values[key] ?? null),
  );
};

const renderTheme = async () => {
  const rendered = renderHook(() => useTheme(), { wrapper });
  await act(async () => {});
  return rendered;
};

describe("ThemeContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    givenStorage({});
    mockSetItem.mockResolvedValue(undefined);
    mockUseColorScheme.mockReturnValue("light");
  });

  describe("initialisation", () => {
    it("should expose the light palette when the system scheme is light and no preference is stored", async () => {
      // Arrange
      mockUseColorScheme.mockReturnValue("light");

      // Act
      const { result } = await renderTheme();

      // Assert
      expect(result.current.isDark).toBe(false);
      expect(result.current.colors).toBe(lightColors);
    });

    it("should expose the dark palette when the system scheme is dark and no preference is stored", async () => {
      // Arrange
      mockUseColorScheme.mockReturnValue("dark");

      // Act
      const { result } = await renderTheme();

      // Assert
      expect(result.current.isDark).toBe(true);
      expect(result.current.colors).toBe(darkColors);
    });

    it("should restore the dark theme when the stored preference is true", async () => {
      // Arrange
      mockUseColorScheme.mockReturnValue("light");
      givenStorage({ [DARK_MODE_KEY]: "true" });

      // Act
      const { result } = await renderTheme();

      // Assert
      expect(result.current.isDark).toBe(true);
    });

    it("should restore the light theme when the stored preference is false even if the system is dark", async () => {
      // Arrange
      mockUseColorScheme.mockReturnValue("dark");
      givenStorage({ [DARK_MODE_KEY]: "false" });

      // Act
      const { result } = await renderTheme();

      // Assert
      expect(result.current.isDark).toBe(false);
    });

    it("should restore the satellite map when the stored preference is true", async () => {
      // Arrange
      givenStorage({ [SATELLITE_KEY]: "true" });

      // Act
      const { result } = await renderTheme();

      // Assert
      expect(result.current.satelliteMap).toBe(true);
    });

    it("should keep the satellite map disabled when nothing is stored", async () => {
      // Arrange
      givenStorage({});

      // Act
      const { result } = await renderTheme();

      // Assert
      expect(result.current.satelliteMap).toBe(false);
    });
  });

  describe("suivi du thème système", () => {
    it("should follow the system scheme change when no manual preference is stored", async () => {
      // Arrange
      mockUseColorScheme.mockReturnValue("light");
      const { result, rerender } = await renderTheme();

      // Act
      mockUseColorScheme.mockReturnValue("dark");
      rerender({});
      await act(async () => {});

      // Assert
      expect(result.current.isDark).toBe(true);
    });

    it("should ignore the system scheme change when a manual preference is stored", async () => {
      // Arrange
      mockUseColorScheme.mockReturnValue("light");
      givenStorage({ [DARK_MODE_KEY]: "false" });
      const { result, rerender } = await renderTheme();

      // Act
      mockUseColorScheme.mockReturnValue("dark");
      rerender({});
      await act(async () => {});

      // Assert
      expect(result.current.isDark).toBe(false);
    });
  });

  describe("toggleTheme", () => {
    it("should switch to dark and persist the preference when toggled from light", async () => {
      // Arrange
      const { result } = await renderTheme();

      // Act
      await act(async () => {
        result.current.toggleTheme();
      });

      // Assert
      expect(result.current.isDark).toBe(true);
      expect(result.current.colors).toBe(darkColors);
      expect(mockSetItem).toHaveBeenCalledWith(DARK_MODE_KEY, "true");
    });

    it("should switch back to light and persist the preference when toggled twice", async () => {
      // Arrange
      const { result } = await renderTheme();

      // Act
      await act(async () => {
        result.current.toggleTheme();
      });
      await act(async () => {
        result.current.toggleTheme();
      });

      // Assert
      expect(result.current.isDark).toBe(false);
      expect(mockSetItem).toHaveBeenLastCalledWith(DARK_MODE_KEY, "false");
    });
  });

  describe("toggleSatelliteMap", () => {
    it("should enable the satellite map and persist the preference when toggled", async () => {
      // Arrange
      const { result } = await renderTheme();

      // Act
      await act(async () => {
        result.current.toggleSatelliteMap();
      });

      // Assert
      expect(result.current.satelliteMap).toBe(true);
      expect(mockSetItem).toHaveBeenCalledWith(SATELLITE_KEY, "true");
    });

    it("should disable the satellite map and persist the preference when toggled twice", async () => {
      // Arrange
      const { result } = await renderTheme();

      // Act
      await act(async () => {
        result.current.toggleSatelliteMap();
      });
      await act(async () => {
        result.current.toggleSatelliteMap();
      });

      // Assert
      expect(result.current.satelliteMap).toBe(false);
      expect(mockSetItem).toHaveBeenLastCalledWith(SATELLITE_KEY, "false");
    });
  });

  describe("valeur par défaut du contexte", () => {
    it("should fall back to the light theme when used outside of a provider", () => {
      // Arrange & Act
      const { result } = renderHook(() => useTheme());

      // Assert
      expect(result.current.isDark).toBe(false);
      expect(result.current.colors).toBe(lightColors);
      expect(result.current.satelliteMap).toBe(false);
    });

    it("should expose no-op toggles that do not persist anything outside of a provider", () => {
      // Arrange
      const { result } = renderHook(() => useTheme());

      // Act
      act(() => {
        result.current.toggleTheme();
        result.current.toggleSatelliteMap();
      });

      // Assert
      expect(result.current.isDark).toBe(false);
      expect(result.current.satelliteMap).toBe(false);
      expect(mockSetItem).not.toHaveBeenCalled();
    });
  });
});
