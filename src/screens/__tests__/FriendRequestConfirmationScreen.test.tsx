import "./support/screenMocks";

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import FriendRequestConfirmationScreen from "../FriendRequestConfirmationScreen";
import { lightColors } from "../../contexts/ThemeContext";

// On renvoie la clé de traduction plutôt que le libellé : les assertions
// restent lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ replace: mockReplace, goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: () => ({ colors: jest.requireActual("../../contexts/ThemeContext").lightColors }),
}));

const mockReplace = jest.fn();
const mockGoBack = jest.fn();

// Lu à chaque rendu par la doublure de `useRoute` : les tests le réassignent.
let mockParams: Record<string, unknown> = {};

const renderScreen = (params: Record<string, unknown> = {}) => {
  mockParams = { recipientName: "Ada Lovelace", ...params };
  render(<FriendRequestConfirmationScreen />);
};

describe("FriendRequestConfirmationScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("demande en attente", () => {
    it("should announce a pending request when the recipient has not auto-accepted", () => {
      // Arrange & Act
      renderScreen({ autoAccepted: false });

      // Assert
      expect(screen.getByText("friendRequestConfirmation.titlePending")).toBeTruthy();
      // Le sous-titre concatène le nom et la suite de phrase dans un même
      // `Text` : on ancre donc l'assertion sur la fin de la chaîne rendue.
      expect(screen.getByText(/friendRequestConfirmation\.subtitlePendingRest$/)).toBeTruthy();
      expect(screen.getByText("friendRequestConfirmation.statusPending")).toBeTruthy();
    });

    it("should treat a missing autoAccepted flag as a pending request", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(screen.getByText("friendRequestConfirmation.titlePending")).toBeTruthy();
      expect(screen.queryByText("friendRequestConfirmation.statusFriend")).toBeNull();
    });
  });

  describe("demande acceptée automatiquement", () => {
    it("should announce an accepted request when the friendship was auto-accepted", () => {
      // Arrange & Act
      renderScreen({ autoAccepted: true });

      // Assert
      expect(screen.getByText("friendRequestConfirmation.titleAccepted")).toBeTruthy();
      expect(screen.getByText(/friendRequestConfirmation\.subtitleAcceptedRest$/)).toBeTruthy();
      expect(screen.getByText("friendRequestConfirmation.statusFriend")).toBeTruthy();
      expect(screen.queryByText("friendRequestConfirmation.statusPending")).toBeNull();
    });
  });

  describe("carte du destinataire", () => {
    it("should display the recipient email when the request carried one", () => {
      // Arrange & Act
      renderScreen({ recipientEmail: "ada@example.com" });

      // Assert
      expect(screen.getByText("ada@example.com")).toBeTruthy();
    });

    it("should omit the email line when the request was addressed to a phone number", () => {
      // Arrange & Act
      renderScreen({ recipientEmail: undefined });

      // Assert
      expect(screen.queryByText(/@/)).toBeNull();
    });

    it("should build the initials from the first and last name parts", () => {
      // Arrange & Act
      renderScreen({ recipientName: "Ada Lovelace" });

      // Assert
      expect(screen.getByText("AL")).toBeTruthy();
    });

    it("should build the initials from the single word when the name has no surname", () => {
      // Arrange & Act
      renderScreen({ recipientName: "ada" });

      // Assert
      expect(screen.getByText("A")).toBeTruthy();
    });

    it("should keep the middle names out of the initials", () => {
      // Arrange & Act
      renderScreen({ recipientName: "Ada Byron King" });

      // Assert
      expect(screen.getByText("AK")).toBeTruthy();
    });

    it("should still render the confirmation when the recipient has no name", () => {
      // Arrange & Act — sans premier point de code, la couleur d'avatar retombe
      // sur la première de la palette au lieu de faire échouer le rendu.
      renderScreen({ recipientName: "", recipientEmail: "ada@example.com" });

      // Assert
      expect(screen.getByText("friendRequestConfirmation.titlePending")).toBeTruthy();
      expect(screen.getByText("ada@example.com")).toBeTruthy();
    });

    it("should repeat the recipient name in the card and in the subtitle", () => {
      // Arrange & Act
      renderScreen({ recipientName: "Ada Lovelace" });

      // Assert
      expect(screen.getAllByText("Ada Lovelace")).toHaveLength(2);
    });
  });

  describe("actions", () => {
    it("should replace the screen by the add friend form when adding another friend", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("friendRequestConfirmation.addAnother"));

      // Assert
      expect(mockReplace).toHaveBeenCalledWith("AddFriend");
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it("should go back when returning to the friends list", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByText("friendRequestConfirmation.backToFriends"));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("thème", () => {
    it("should paint the surface with the light palette", () => {
      // Arrange & Act
      renderScreen();

      // Assert
      expect(screen.getByText("friendRequestConfirmation.titlePending").props.style).toEqual(
        expect.arrayContaining([{ color: lightColors.text }]),
      );
    });
  });
});
