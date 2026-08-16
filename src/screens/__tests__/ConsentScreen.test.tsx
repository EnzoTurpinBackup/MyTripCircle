import "./support/screenMocks";

import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import ConsentScreen, { CONSENT_KEY } from "../ConsentScreen";
import { lightColors } from "../../contexts/ThemeContext";
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

jest.mock("../../hooks/usePushNotifications", () => ({
  requestPermissionAndRegisterToken: jest.fn(),
}));

const navigate = jest.fn();
const onConsentGiven = jest.fn();

/** `acceptedAt` est horodaté au clic : on fige l'horloge pour l'assertion. */
const ACCEPTED_AT = new Date("2026-03-15T10:00:00.000Z");

/**
 * Index des interrupteurs dans l'ordre de rendu (données, localisation,
 * notifications).
 *
 * Ces trois `TouchableOpacity` ne portent ni `accessibilityRole` ni
 * `accessibilityLabel` : aucun nom accessible ne permet de les désigner (voir
 * le rapport d'accessibilité). Faute de prise sémantique, on retombe sur le
 * type de nœud — à remplacer par `getByRole("switch", { name })` dès que
 * l'écran exposera ces libellés.
 */
const TOGGLE_INDEX = { data: 0, location: 1, notifications: 2 } as const;

const toggleAt = (index: number) =>
  screen.UNSAFE_getAllByType(TouchableOpacity)[index];

const press = (index: number) => fireEvent.press(toggleAt(index));

/** Préférences réellement écrites dans le stockage local. */
const storedPreferences = () => {
  const call = (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1);
  return JSON.parse(call[1]);
};

describe("ConsentScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    freezeClockAt(ACCEPTED_AT);
    (useNavigation as jest.Mock).mockReturnValue({ navigate });
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (requestPermissionAndRegisterToken as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    restoreClock();
  });

  describe("présentation", () => {
    it("should introduce the three consent topics", () => {
      // Arrange & Act
      render(<ConsentScreen />);

      // Assert
      expect(screen.getByText("consent.title")).toBeTruthy();
      expect(screen.getByText("consent.subtitle")).toBeTruthy();
      expect(screen.getByText("consent.dataTitle")).toBeTruthy();
      expect(screen.getByText("consent.locationTitle")).toBeTruthy();
      expect(screen.getByText("consent.notificationsTitle")).toBeTruthy();
    });

    it("should mark the data topic as required and the two others as optional", () => {
      // Arrange & Act
      render(<ConsentScreen />);

      // Assert
      expect(screen.getByText("consent.requiredBadge")).toBeTruthy();
      expect(screen.getAllByText("consent.optionalBadge")).toHaveLength(2);
    });

    it("should show every topic as enabled on first display", () => {
      // Arrange & Act
      render(<ConsentScreen />);

      // Assert — piste teintée « terra » = interrupteur actif.
      Object.values(TOGGLE_INDEX).forEach((index) => {
        expect(StyleSheet.flatten(toggleAt(index).props.style).backgroundColor)
          .toBe(lightColors.terra);
      });
    });

    it("should grey out the data toggle once it is turned off", () => {
      // Arrange
      render(<ConsentScreen />);

      // Act
      press(TOGGLE_INDEX.data);

      // Assert
      expect(StyleSheet.flatten(toggleAt(TOGGLE_INDEX.data).props.style).backgroundColor)
        .toBe(lightColors.bgDark);
    });
  });

  describe("tout accepter", () => {
    const acceptAll = async () => {
      await act(async () => {
        fireEvent.press(screen.getByText("consent.acceptAll"));
      });
    };

    it("should persist every consent and request both permissions", async () => {
      // Arrange
      render(<ConsentScreen />);

      // Act
      await acceptAll();

      // Assert
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(CONSENT_KEY, expect.any(String));
      expect(storedPreferences()).toEqual({
        data: true,
        location: true,
        notifications: true,
        acceptedAt: ACCEPTED_AT.toISOString(),
      });
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(requestPermissionAndRegisterToken).toHaveBeenCalledTimes(1);
    });

    it("should hand control back to the caller once the consent is stored", async () => {
      // Arrange
      render(<ConsentScreen onConsentGiven={onConsentGiven} />);

      // Act
      await acceptAll();

      // Assert
      expect(onConsentGiven).toHaveBeenCalledTimes(1);
    });

    it("should not ask for the location permission when that topic is turned off", async () => {
      // Arrange
      render(<ConsentScreen />);
      press(TOGGLE_INDEX.location);

      // Act
      await acceptAll();

      // Assert
      expect(storedPreferences().location).toBe(false);
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
      expect(requestPermissionAndRegisterToken).toHaveBeenCalledTimes(1);
    });

    it("should not register a push token when notifications are turned off", async () => {
      // Arrange
      render(<ConsentScreen />);
      press(TOGGLE_INDEX.notifications);

      // Act
      await acceptAll();

      // Assert
      expect(storedPreferences().notifications).toBe(false);
      expect(requestPermissionAndRegisterToken).not.toHaveBeenCalled();
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe("accepter le strict nécessaire", () => {
    const acceptRequired = async () => {
      await act(async () => {
        fireEvent.press(screen.getByText("consent.acceptRequired"));
      });
    };

    it("should store a refusal for both optional topics", async () => {
      // Arrange
      render(<ConsentScreen onConsentGiven={onConsentGiven} />);

      // Act
      await acceptRequired();

      // Assert
      expect(storedPreferences()).toEqual({
        data: true,
        location: false,
        notifications: false,
        acceptedAt: ACCEPTED_AT.toISOString(),
      });
      expect(onConsentGiven).toHaveBeenCalledTimes(1);
    });

    it("should request neither permission even when both toggles are left on", async () => {
      // Arrange
      render(<ConsentScreen />);

      // Act
      await acceptRequired();

      // Assert
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
      expect(requestPermissionAndRegisterToken).not.toHaveBeenCalled();
    });
  });

  describe("refus du traitement des données", () => {
    it("should refuse to store anything when the required topic is turned off", async () => {
      // Arrange
      render(<ConsentScreen onConsentGiven={onConsentGiven} />);
      press(TOGGLE_INDEX.data);

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("consent.acceptAll"));
        fireEvent.press(screen.getByText("consent.acceptRequired"));
      });

      // Assert
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      expect(onConsentGiven).not.toHaveBeenCalled();
    });
  });

  describe("liens légaux", () => {
    it.each([
      ["consent.viewPrivacy", "Privacy"],
      ["consent.viewTerms", "Terms"],
    ])("should navigate to %s when the link is pressed", (label, target) => {
      // Arrange
      render(<ConsentScreen />);

      // Act
      fireEvent.press(screen.getByText(label));

      // Assert
      expect(navigate).toHaveBeenCalledWith(target);
    });
  });
});
