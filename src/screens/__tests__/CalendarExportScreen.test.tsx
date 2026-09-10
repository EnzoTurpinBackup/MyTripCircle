// Branche volontairement non couverte :
//   - l. 132 garde `if (!calendarUrl) return` de `handleCopy` : le bouton
//     « copier » n'est rendu que dans la branche `calendarUrl` de
//     `renderUrlSection`, la garde est donc inatteignable depuis l'IHM.
//
// Dette technique relevée : l'écran importe `Clipboard` depuis `react-native`,
// module déprécié et voué à disparaître du cœur. Les tests remplacent
// l'accesseur tel quel, sans corriger la production.

import "./support/screenMocks";

import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import CalendarExportScreen from "../CalendarExportScreen";
import { calendarApi } from "../../services/api/calendarApi";
import { API_BASE_URL } from "../../config/api";

const mockGoBack = jest.fn();

// Les listes d'instructions sont demandées en `returnObjects` : le `t` de test
// doit donc rendre de vrais tableaux, sinon l'écran appelle `.map` sur `undefined`.
const OBJECT_KEYS: Record<string, string[]> = {
  "calendar.iosSteps": ["Réglages", "Comptes", "Ajouter un abonnement"],
  "calendar.androidSteps": ["Google Agenda", "Autres agendas"],
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { returnObjects?: boolean }) =>
      options?.returnObjects ? (OBJECT_KEYS[key] ?? []) : key,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock("../../services/api/calendarApi", () => ({
  calendarApi: { getToken: jest.fn(), generateToken: jest.fn() },
}));

const getToken = calendarApi.getToken as jest.Mock;
const generateToken = calendarApi.generateToken as jest.Mock;

type AlertButton = { text?: string; onPress?: () => void | Promise<void> };

/** Monte l'écran et laisse la récupération du jeton se résoudre. */
const renderScreen = async () => {
  render(<CalendarExportScreen />);
  await act(async () => {});
};

describe("CalendarExportScreen", () => {
  let alert: jest.SpyInstance;
  let setString: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    getToken.mockResolvedValue({ success: true, token: "jeton-abc" });
    generateToken.mockResolvedValue({ success: true, token: "jeton-neuf" });
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    setString = jest.fn();
    // `Clipboard` est un accesseur du baril `react-native` qui avertit de sa
    // dépréciation puis touche le module natif : on le remplace en amont. Le
    // `require` est nécessaire : un `import * as` produirait une copie de
    // l'espace de noms, sur laquelle l'écran ne lirait rien.
    jest.spyOn(require("react-native"), "Clipboard", "get").mockReturnValue({ setString });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("récupération du jeton", () => {
    it("should show a loading placeholder while the token is being fetched", async () => {
      // Arrange
      getToken.mockReturnValue(new Promise(() => {}));

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("common.loading")).toBeTruthy();
    });

    it("should display the calendar url built from the fetched token", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText(`${API_BASE_URL}/calendar/jeton-abc`)).toBeTruthy();
    });

    it("should offer the generate button when the account has no token yet", async () => {
      // Arrange
      getToken.mockResolvedValue({ success: true, token: null });

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("calendar.generateBtn")).toBeTruthy();
      expect(screen.queryByText("calendar.copyBtn")).toBeNull();
    });

    it("should not offer the generate button when the token request fails", async () => {
      // Arrange — défaut D-03 : générer révoquerait le jeton déjà collé dans les agendas
      getToken.mockRejectedValue(new Error("réseau indisponible"));

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("calendar.errorLoad")).toBeTruthy();
      expect(screen.queryByText("calendar.generateBtn")).toBeNull();
    });

    it("should fetch the token again when the user retries after a failure", async () => {
      // Arrange
      getToken.mockRejectedValueOnce(new Error("réseau indisponible"));
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("calendar.retryBtn"));
      await act(async () => {});

      // Assert
      expect(getToken).toHaveBeenCalledTimes(2);
      expect(screen.getByText(`${API_BASE_URL}/calendar/jeton-abc`)).toBeTruthy();
    });
  });

  describe("génération du jeton", () => {
    beforeEach(() => {
      getToken.mockResolvedValue({ success: true, token: null });
    });

    it("should display the freshly generated url when the generation succeeds", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("calendar.generateBtn"));
      await act(async () => {});

      // Assert
      expect(screen.getByText(`${API_BASE_URL}/calendar/jeton-neuf`)).toBeTruthy();
    });

    it("should label the button as generating while the request is pending", async () => {
      // Arrange
      generateToken.mockReturnValue(new Promise(() => {}));
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("calendar.generateBtn"));

      // Assert
      await waitFor(() => expect(screen.getByText("calendar.generating")).toBeTruthy());
    });

    it("should alert the user when the generation fails", async () => {
      // Arrange
      generateToken.mockRejectedValue(new Error("quota dépassé"));
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("calendar.generateBtn"));
      await act(async () => {});

      // Assert
      expect(alert).toHaveBeenCalledWith("calendar.errorTitle", "calendar.errorGenerate");
      expect(screen.getByText("calendar.generateBtn")).toBeTruthy();
    });
  });

  describe("régénération du jeton", () => {
    const confirmRegeneration = async () => {
      fireEvent.press(screen.getByText("calendar.regenerateBtn"));
      const buttons = (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
      // La promesse du gestionnaire n'est délibérément pas attendue : l'un des
      // cas de test laisse la génération en suspens pour observer l'état
      // intermédiaire, et l'attendre bloquerait la suite.
      await act(async () => {
        void buttons[1].onPress?.();
      });
    };

    it("should warn the user before revoking the current token", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("calendar.regenerateBtn"));

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "calendar.regenerateTitle",
        "calendar.regenerateWarning",
        expect.any(Array),
      );
      expect(generateToken).not.toHaveBeenCalled();
    });

    it("should replace the url once the regeneration is confirmed", async () => {
      // Arrange
      await renderScreen();

      // Act
      await confirmRegeneration();

      // Assert
      expect(screen.getByText(`${API_BASE_URL}/calendar/jeton-neuf`)).toBeTruthy();
    });

    it("should label the secondary button as generating while the request is pending", async () => {
      // Arrange
      generateToken.mockReturnValue(new Promise(() => {}));
      await renderScreen();

      // Act
      await confirmRegeneration();

      // Assert
      expect(screen.getByText("calendar.generating")).toBeTruthy();
      expect(screen.queryByText("calendar.regenerateBtn")).toBeNull();
    });

    it("should keep the previous url when the regeneration fails", async () => {
      // Arrange
      generateToken.mockRejectedValue(new Error("quota dépassé"));
      await renderScreen();

      // Act
      await confirmRegeneration();

      // Assert
      expect(screen.getByText(`${API_BASE_URL}/calendar/jeton-abc`)).toBeTruthy();
      expect(alert).toHaveBeenLastCalledWith("calendar.errorTitle", "calendar.errorGenerate");
    });
  });

  describe("copie de l'adresse", () => {
    it("should put the calendar url into the clipboard", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("calendar.copyBtn"));

      // Assert
      expect(setString).toHaveBeenCalledWith(`${API_BASE_URL}/calendar/jeton-abc`);
    });

    it("should confirm the copy to the user", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("calendar.copyBtn"));

      // Assert
      expect(alert).toHaveBeenCalledWith("calendar.copiedTitle", "calendar.copiedMessage");
    });
  });

  describe("mode d'emploi", () => {
    it("should number every iOS instruction step", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("Ajouter un abonnement")).toBeTruthy();
      expect(screen.getAllByText("3")).toHaveLength(1);
    });

    it("should list the Android instruction steps", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("Google Agenda")).toBeTruthy();
      expect(screen.getByText("Autres agendas")).toBeTruthy();
    });
  });

  it("should go back when the header back button is pressed", async () => {
    // Arrange
    await renderScreen();

    // Act
    fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

    // Assert
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
