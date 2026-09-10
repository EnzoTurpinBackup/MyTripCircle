import "./support/screenMocks";

import React from "react";
import { ActivityIndicator, Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";

import ConsentManagementScreen from "../ConsentManagementScreen";
import { CONSENT_KEY } from "../ConsentScreen";
import { userApi } from "../../services/api/userApi";
import { useNavigation } from "@react-navigation/native";
import { requestPermissionAndRegisterToken } from "../../hooks/usePushNotifications";
import { freezeClockAt, restoreClock } from "../../components/invitations/__tests__/frozenClock";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({ useNavigation: jest.fn() }));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
}));

jest.mock("../../services/api/userApi", () => ({
  userApi: { updateConsent: jest.fn() },
}));

// L'écran importe `CONSENT_KEY` depuis `ConsentScreen`, qui charge à son tour
// `usePushNotifications` puis `expo-notifications` : on neutralise cette
// frontière native, inutile ici.
jest.mock("../../hooks/usePushNotifications", () => ({
  requestPermissionAndRegisterToken: jest.fn(),
}));

const navigate = jest.fn();
const goBack = jest.fn();

/** `acceptedAt` est horodaté à l'enregistrement : on fige l'horloge. */
const SAVED_AT = new Date("2026-03-15T10:00:00.000Z");

type AlertButton = { text?: string; style?: string; onPress?: () => void | Promise<void> };

/**
 * Les deux interrupteurs modifiables, dans l'ordre de rendu (localisation puis
 * notifications). `Toggle` expose bien le rôle « switch », mais l'écran ne lui
 * passe aucun `accessibilityLabel` : on ne peut donc pas les désigner par leur
 * nom accessible (voir le rapport d'accessibilité).
 */
const SWITCH_INDEX = { location: 0, notifications: 1 } as const;

const switchAt = (index: number) => screen.getAllByRole("switch")[index];

/** Monte l'écran et laisse la lecture du consentement stocké se résoudre. */
const renderScreen = async () => {
  render(<ConsentManagementScreen />);
  await act(async () => {});
};

/** Récupère les boutons passés au dernier `Alert.alert`. */
const lastAlertButtons = (alert: jest.SpyInstance): AlertButton[] =>
  (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];

const save = async () => {
  await act(async () => {
    fireEvent.press(screen.getByText("consentManagement.save"));
  });
};

describe("ConsentManagementScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    freezeClockAt(SAVED_AT);
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (useNavigation as jest.Mock).mockReturnValue({ navigate, goBack });
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (userApi.updateConsent as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    restoreClock();
    jest.restoreAllMocks();
  });

  describe("chargement des consentements stockés", () => {
    it("should show a loader until the stored consent has been read", async () => {
      // Arrange & Act
      render(<ConsentManagementScreen />);

      // Assert
      expect(screen.UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
      expect(screen.queryAllByRole("switch")).toHaveLength(0);
      // La lecture du stockage est laissée se résoudre avant le démontage.
      await act(async () => {});
    });

    it("should restore both stored consents on mount", async () => {
      // Arrange
      await AsyncStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({ data: true, location: true, notifications: false, acceptedAt: "" }),
      );

      // Act
      await renderScreen();

      // Assert
      expect(switchAt(SWITCH_INDEX.location)).toBeChecked();
      expect(switchAt(SWITCH_INDEX.notifications)).not.toBeChecked();
    });

    it("should default both optional consents to a refusal when nothing is stored", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(switchAt(SWITCH_INDEX.location)).not.toBeChecked();
      expect(switchAt(SWITCH_INDEX.notifications)).not.toBeChecked();
    });

    it("should leave the loader and default to a refusal when the stored entry is corrupted", async () => {
      // Arrange — défaut D-04 : un JSON illisible figeait l'écran en chargement
      await AsyncStorage.setItem(CONSENT_KEY, "{pas du json");
      jest.spyOn(console, "warn").mockImplementation(() => {});

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryAllByRole("switch")).toHaveLength(2);
      expect(switchAt(SWITCH_INDEX.notifications)).not.toBeChecked();
      expect(screen.getByText("consentManagement.save")).toBeTruthy();
    });

    it("should leave the loader when the storage read itself fails", async () => {
      // Arrange
      jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("stockage indisponible"));
      jest.spyOn(console, "warn").mockImplementation(() => {});

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryAllByRole("switch")).toHaveLength(2);
    });

    it("should describe the mandatory data processing as non negotiable", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("consent.dataTitle")).toBeTruthy();
      expect(screen.getByText("consentManagement.required")).toBeTruthy();
      // Seuls les deux consentements optionnels sont modifiables.
      expect(screen.getAllByRole("switch")).toHaveLength(2);
    });
  });

  describe("enregistrement", () => {
    it("should persist and publish the refusal of both optional consents", async () => {
      // Arrange
      await renderScreen();

      // Act
      await save();

      // Assert
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        CONSENT_KEY,
        JSON.stringify({
          data: true,
          location: false,
          notifications: false,
          acceptedAt: SAVED_AT.toISOString(),
        }),
      );
      expect(userApi.updateConsent).toHaveBeenCalledWith({
        data: true,
        location: false,
        notifications: false,
      });
    });

    it("should publish the notification consent without asking for a permission", async () => {
      // Arrange
      await renderScreen();
      fireEvent.press(switchAt(SWITCH_INDEX.notifications));

      // Act
      await save();

      // Assert
      expect(userApi.updateConsent).toHaveBeenCalledWith({
        data: true,
        location: false,
        notifications: true,
      });
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it("should request the push permission and register the token when notifications are enabled", async () => {
      // Arrange — défaut D-06 : l'activation depuis les réglages n'enregistrait rien
      await renderScreen();
      fireEvent.press(switchAt(SWITCH_INDEX.notifications));

      // Act
      await save();

      // Assert
      expect(requestPermissionAndRegisterToken).toHaveBeenCalledTimes(1);
    });

    it("should not touch the push registration when notifications stay disabled", async () => {
      // Arrange
      await renderScreen();

      // Act
      await save();

      // Assert
      expect(requestPermissionAndRegisterToken).not.toHaveBeenCalled();
    });

    it("should ask for the location permission when that consent is granted", async () => {
      // Arrange
      await renderScreen();
      fireEvent.press(switchAt(SWITCH_INDEX.location));

      // Act
      await save();

      // Assert
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(userApi.updateConsent).toHaveBeenCalledWith({
        data: true,
        location: true,
        notifications: false,
      });
    });

    it("should confirm the save and go back when the user acknowledges it", async () => {
      // Arrange
      await renderScreen();

      // Act
      await save();
      await act(async () => {
        await lastAlertButtons(alert)[0].onPress?.();
      });

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "consentManagement.savedTitle",
        "consentManagement.savedMessage",
        expect.any(Array),
      );
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("permission de localisation refusée", () => {
    const denyLocation = async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "denied",
      });
      await renderScreen();
      fireEvent.press(switchAt(SWITCH_INDEX.location));
      await save();
    };

    it("should abort the save when the system refuses the location permission", async () => {
      // Arrange & Act
      await denyLocation();

      // Assert
      expect(userApi.updateConsent).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it("should roll the location switch back to a refusal", async () => {
      // Arrange & Act
      await denyLocation();

      // Assert
      expect(switchAt(SWITCH_INDEX.location)).not.toBeChecked();
    });

    it("should offer to open the system settings", async () => {
      // Arrange
      const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
      await denyLocation();

      // Act
      lastAlertButtons(alert)[1].onPress?.();

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "consentManagement.locationDeniedTitle",
        "consentManagement.locationDeniedMessage",
        expect.any(Array),
      );
      expect(openSettings).toHaveBeenCalledTimes(1);
    });

    it("should offer a cancel option that opens nothing", async () => {
      // Arrange
      const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);

      // Act
      await denyLocation();

      // Assert
      expect(lastAlertButtons(alert)[0]).toMatchObject({
        text: "common.cancel",
        style: "cancel",
      });
      expect(openSettings).not.toHaveBeenCalled();
    });

    it("should let the user try again after the refusal", async () => {
      // Arrange
      await denyLocation();

      // Act — le bouton doit être redevenu actif.
      await save();

      // Assert
      expect(userApi.updateConsent).toHaveBeenCalledWith({
        data: true,
        location: false,
        notifications: false,
      });
    });
  });

  describe("échec réseau", () => {
    it("should report the failure without losing the screen", async () => {
      // Arrange
      jest.spyOn(console, "warn").mockImplementation(() => {});
      (userApi.updateConsent as jest.Mock).mockRejectedValue(new Error("réseau indisponible"));
      await renderScreen();

      // Act
      await save();

      // Assert
      expect(alert).toHaveBeenLastCalledWith("common.error", "consentManagement.saveError");
      expect(screen.getByText("consentManagement.save")).toBeTruthy();
    });

    it("should log the cause in development builds", async () => {
      // Arrange
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const cause = new Error("réseau indisponible");
      (userApi.updateConsent as jest.Mock).mockRejectedValue(cause);
      await renderScreen();

      // Act
      await save();

      // Assert
      expect(warn).toHaveBeenCalledWith(
        "[ConsentManagementScreen] Erreur sauvegarde consentements:",
        cause,
      );
    });

    it("should stay silent about the cause outside development builds", async () => {
      // Arrange
      const dev = globalThis as unknown as { __DEV__: boolean };
      const previous = dev.__DEV__;
      dev.__DEV__ = false;
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      (userApi.updateConsent as jest.Mock).mockRejectedValue(new Error("réseau indisponible"));
      await renderScreen();

      // Act
      await save();

      // Assert
      expect(warn).not.toHaveBeenCalled();
      expect(alert).toHaveBeenLastCalledWith("common.error", "consentManagement.saveError");
      dev.__DEV__ = previous;
    });
  });

  describe("enregistrement en cours", () => {
    it("should replace the save label by a spinner while the API answers", async () => {
      // Arrange
      let release: () => void = () => {};
      (userApi.updateConsent as jest.Mock).mockReturnValue(
        new Promise<void>((resolve) => {
          release = resolve;
        }),
      );
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("consentManagement.save"));

      // Assert
      await waitFor(() => {
        expect(screen.queryByText("consentManagement.save")).toBeNull();
      });
      expect(screen.UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
      await act(async () => {
        release();
      });
    });
  });

  describe("navigation", () => {
    it("should go back when the back button is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(goBack).toHaveBeenCalledTimes(1);
    });

    it("should open the privacy policy when its link is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("consent.viewPrivacy"));

      // Assert
      expect(navigate).toHaveBeenCalledWith("Privacy");
    });
  });
});
