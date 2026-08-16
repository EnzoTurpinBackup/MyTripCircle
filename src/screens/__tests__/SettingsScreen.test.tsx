import "./support/screenMocks";

import React from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import SettingsScreen from "../SettingsScreen";
import { lightColors } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import { changeLanguage } from "../../utils/i18n";

// On renvoie la clé de traduction plutôt que le libellé : les assertions
// restent lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: mockLanguage } }),
}));

jest.mock("@react-navigation/native", () => ({ useNavigation: jest.fn() }));

jest.mock("../../contexts/AuthContext", () => ({ useAuth: jest.fn() }));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

jest.mock("../../utils/i18n", () => ({ changeLanguage: jest.fn() }));

// Piloté par les tests : `useTranslation` étant appelé au rendu, la valeur est
// lue à chaque montage.
let mockLanguage = "fr";

const NOTIF_KEYS = {
  push: "@mytripcircle_notif_push",
  email: "@mytripcircle_notif_email",
  friends: "@mytripcircle_notif_friends",
};

type AlertButton = { text?: string; onPress?: () => void | Promise<void> };

const navigate = jest.fn();
const goBack = jest.fn();
const updateSettings = jest.fn();
const deleteAccount = jest.fn();
const toggleTheme = jest.fn();
const toggleSatelliteMap = jest.fn();

const setAuth = (overrides: Record<string, unknown> = {}) => {
  (useAuth as jest.Mock).mockReturnValue({
    user: { id: "u1", isPublicProfile: false },
    updateSettings,
    deleteAccount,
    ...overrides,
  });
};

const setTheme = (overrides: Record<string, unknown> = {}) => {
  (useTheme as jest.Mock).mockReturnValue({
    isDark: false,
    colors: lightColors,
    toggleTheme,
    satelliteMap: false,
    toggleSatelliteMap,
    ...overrides,
  });
};

/** Monte l'écran et laisse la lecture des préférences stockées se résoudre. */
const renderScreen = async () => {
  render(<SettingsScreen />);
  await act(async () => {});
};

/** Récupère les boutons passés au dernier `Alert.alert`. */
const lastAlertButtons = (alert: jest.SpyInstance): AlertButton[] =>
  (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];

describe("SettingsScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(async () => {
    mockLanguage = "fr";
    await AsyncStorage.clear();
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (useNavigation as jest.Mock).mockReturnValue({ navigate, goBack });
    setAuth();
    setTheme();
    updateSettings.mockResolvedValue(undefined);
    deleteAccount.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("accessibilité des interrupteurs", () => {
    // La correction WCAG 2.1 AA de la PR : chaque interrupteur porte un nom
    // accessible, seul moyen pour un lecteur d'écran de le désigner.
    const SWITCH_LABELS = [
      "settings.pushNotifications",
      "settings.emailReminders",
      "settings.friendInvitations",
      "settings.publicProfile",
      "settings.darkMode",
      "settings.satelliteMap",
    ];

    it.each(SWITCH_LABELS)(
      "should expose a switch reachable by its accessible name when the label is %s",
      async (label) => {
        // Arrange & Act
        await renderScreen();

        // Assert
        expect(screen.getByLabelText(label)).toBeTruthy();
        expect(screen.getByRole("switch", { name: label })).toBeTruthy();
      },
    );

    it("should expose exactly six named switches", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getAllByRole("switch")).toHaveLength(SWITCH_LABELS.length);
    });
  });

  describe("préférences de notification", () => {
    it("should enable every notification switch when nothing is stored", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByRole("switch", { name: "settings.pushNotifications" })).toBeChecked();
      expect(screen.getByRole("switch", { name: "settings.emailReminders" })).toBeChecked();
      expect(screen.getByRole("switch", { name: "settings.friendInvitations" })).toBeChecked();
    });

    it("should restore the stored notification preferences on mount", async () => {
      // Arrange
      await AsyncStorage.setItem(NOTIF_KEYS.push, "false");
      await AsyncStorage.setItem(NOTIF_KEYS.email, "false");
      await AsyncStorage.setItem(NOTIF_KEYS.friends, "true");

      // Act
      render(<SettingsScreen />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole("switch", { name: "settings.pushNotifications" })).not.toBeChecked();
      });
      expect(screen.getByRole("switch", { name: "settings.emailReminders" })).not.toBeChecked();
      expect(screen.getByRole("switch", { name: "settings.friendInvitations" })).toBeChecked();
    });

    it("should persist the push preference when its switch is toggled", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("switch", { name: "settings.pushNotifications" }));

      // Assert
      expect(screen.getByRole("switch", { name: "settings.pushNotifications" })).not.toBeChecked();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(NOTIF_KEYS.push, "false");
    });

    it("should persist the email preference when its switch is toggled", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("switch", { name: "settings.emailReminders" }));

      // Assert
      expect(screen.getByRole("switch", { name: "settings.emailReminders" })).not.toBeChecked();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(NOTIF_KEYS.email, "false");
    });

    it("should persist the friend invitations preference when its switch is toggled", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("switch", { name: "settings.friendInvitations" }));

      // Assert
      expect(screen.getByRole("switch", { name: "settings.friendInvitations" })).not.toBeChecked();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(NOTIF_KEYS.friends, "false");
    });
  });

  describe("profil public", () => {
    it("should reflect the stored profile visibility of the user", async () => {
      // Arrange
      setAuth({ user: { id: "u1", isPublicProfile: true } });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByRole("switch", { name: "settings.publicProfile" })).toBeChecked();
    });

    it("should default to a private profile when no user is signed in", async () => {
      // Arrange
      setAuth({ user: null });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByRole("switch", { name: "settings.publicProfile" })).not.toBeChecked();
    });

    it("should send the new visibility to the API when the switch is toggled", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("switch", { name: "settings.publicProfile" }));

      // Assert
      await waitFor(() => {
        expect(updateSettings).toHaveBeenCalledWith({ isPublicProfile: true });
      });
      expect(screen.getByRole("switch", { name: "settings.publicProfile" })).toBeChecked();
    });

    it("should roll the switch back when the API call fails", async () => {
      // Arrange
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      updateSettings.mockRejectedValue(new Error("réseau indisponible"));
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("switch", { name: "settings.publicProfile" }));

      // Assert
      await waitFor(() => {
        expect(screen.getByRole("switch", { name: "settings.publicProfile" })).not.toBeChecked();
      });
      expect(warn).toHaveBeenCalledWith(
        "[SettingsScreen] Erreur mise à jour profil public:",
        expect.any(Error),
      );
    });

    it("should stay silent about the failure outside development builds", async () => {
      // Arrange
      const dev = globalThis as unknown as { __DEV__: boolean };
      const previous = dev.__DEV__;
      dev.__DEV__ = false;
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      updateSettings.mockRejectedValue(new Error("réseau indisponible"));
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("switch", { name: "settings.publicProfile" }));

      // Assert
      await waitFor(() => {
        expect(screen.getByRole("switch", { name: "settings.publicProfile" })).not.toBeChecked();
      });
      expect(warn).not.toHaveBeenCalled();
      dev.__DEV__ = previous;
    });
  });

  describe("apparence", () => {
    it("should delegate to the theme context when the dark mode switch is toggled", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("switch", { name: "settings.darkMode" }));

      // Assert
      expect(toggleTheme).toHaveBeenCalledTimes(1);
    });

    it("should show the dark mode switch as checked when the dark theme is active", async () => {
      // Arrange
      setTheme({ isDark: true });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByRole("switch", { name: "settings.darkMode" })).toBeChecked();
      expect(screen.getByText("🌙")).toBeTruthy();
    });

    it("should show the sun emoji when the light theme is active", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("☀️")).toBeTruthy();
    });

    it("should delegate to the theme context when the satellite switch is toggled", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("switch", { name: "settings.satelliteMap" }));

      // Assert
      expect(toggleSatelliteMap).toHaveBeenCalledTimes(1);
    });

    it("should show the satellite switch as checked when satellite maps are active", async () => {
      // Arrange
      setTheme({ satelliteMap: true });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByRole("switch", { name: "settings.satelliteMap" })).toBeChecked();
    });
  });

  describe("langue", () => {
    it("should display the French label when the current language is French", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("settings.languageFr")).toBeTruthy();
    });

    it("should display the English label when the current language is English", async () => {
      // Arrange
      mockLanguage = "en";

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("settings.languageEn")).toBeTruthy();
    });

    it("should switch to French when the French option is chosen", async () => {
      // Arrange
      await renderScreen();
      fireEvent.press(screen.getByText("settings.language"));

      // Act
      lastAlertButtons(alert)[0].onPress?.();

      // Assert
      expect(changeLanguage).toHaveBeenCalledWith("fr");
    });

    it("should switch to English when the English option is chosen", async () => {
      // Arrange
      await renderScreen();
      fireEvent.press(screen.getByText("settings.language"));

      // Act
      lastAlertButtons(alert)[1].onPress?.();

      // Assert
      expect(changeLanguage).toHaveBeenCalledWith("en");
    });

    it("should offer a cancel option that changes nothing", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("settings.language"));

      // Assert
      expect(lastAlertButtons(alert)[2]).toMatchObject({ text: "common.cancel", style: "cancel" });
      expect(changeLanguage).not.toHaveBeenCalled();
    });
  });

  describe("navigation", () => {
    it.each([
      ["settings.myConsents", "ConsentManagement"],
      ["settings.privacyPolicy", "Privacy"],
      ["settings.legalNotice", "LegalNotice"],
    ])("should navigate to %s target when the row is pressed", async (label, target) => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText(label));

      // Assert
      expect(navigate).toHaveBeenCalledWith(target);
    });

    it("should go back when the back button is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("suppression du compte", () => {
    const confirmDeletion = async () => {
      fireEvent.press(screen.getByText("settings.deleteAccount"));
      await act(async () => {
        await lastAlertButtons(alert)[1].onPress?.();
      });
    };

    it("should ask for confirmation before deleting the account", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("settings.deleteAccount"));

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "settings.deleteAccountTitle",
        "settings.deleteAccountMessage",
        expect.any(Array),
      );
      expect(deleteAccount).not.toHaveBeenCalled();
    });

    it("should confirm the scheduled deletion when the API accepts it", async () => {
      // Arrange
      await renderScreen();

      // Act
      await confirmDeletion();

      // Assert
      expect(deleteAccount).toHaveBeenCalledTimes(1);
      expect(alert).toHaveBeenLastCalledWith(
        "settings.deleteAccountScheduledTitle",
        "settings.deleteAccountScheduledMessage",
        [{ text: "common.ok" }],
      );
    });

    it("should report an error when the deletion is refused", async () => {
      // Arrange
      deleteAccount.mockResolvedValue({ success: false });
      await renderScreen();

      // Act
      await confirmDeletion();

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "settings.deleteAccountError");
    });
  });
});
