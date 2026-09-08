import "./support/screenMocks";

import React from "react";
import { Linking } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import HelpSupportScreen from "../HelpSupportScreen";
import { darkColors, lightColors } from "../../contexts/ThemeContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import { statusBarInset } from "./support/layout";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({ useNavigation: jest.fn() }));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

const goBack = jest.fn();

const FAQ_QUESTIONS = [
  "helpSupport.faq1Question",
  "helpSupport.faq2Question",
  "helpSupport.faq3Question",
  "helpSupport.faq4Question",
];

const answerOf = (question: string) => question.replace("Question", "Answer");

describe("HelpSupportScreen", () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    (useNavigation as jest.Mock).mockReturnValue({ goBack });
    (useTheme as jest.Mock).mockReturnValue({ colors: lightColors, isDark: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("présentation", () => {
    it("should render the header and the introduction card", () => {
      // Arrange & Act
      render(<HelpSupportScreen />);

      // Assert
      expect(screen.getByText("helpSupport.title")).toBeTruthy();
      expect(screen.getByText("helpSupport.needHelp")).toBeTruthy();
      expect(screen.getByText("helpSupport.description")).toBeTruthy();
    });

    it("should publish the support address and its availability", () => {
      // Arrange & Act
      render(<HelpSupportScreen />);

      // Assert
      expect(screen.getByText("support@mytripcircle.com")).toBeTruthy();
      expect(screen.getByText("helpSupport.availability")).toBeTruthy();
    });

    it.each(FAQ_QUESTIONS)("should list the %s entry", (question) => {
      // Arrange & Act
      render(<HelpSupportScreen />);

      // Assert
      expect(screen.getByText(question)).toBeTruthy();
    });

    it("should reserve the iOS status bar height in the header", () => {
      // Arrange & Act
      render(<HelpSupportScreen />);

      // Assert — contrepartie iOS de `StatusScreens.android.test.tsx`.
      expect(statusBarInset()).toBe(60);
    });

    it("should keep every answer collapsed on first display", () => {
      // Arrange & Act
      render(<HelpSupportScreen />);

      // Assert
      FAQ_QUESTIONS.forEach((question) => {
        expect(screen.queryByText(answerOf(question))).toBeNull();
      });
      // Icône décorative : l'information est portée par le texte qui
      // l'accompagne, aussi sort-elle du parcours des lecteurs d'écran, que
      // les requêtes ignorent par défaut. Ce cas observe son rendu visuel.
      expect(
        screen.getAllByText("icon:chevron-down", { includeHiddenElements: true }),
      ).toHaveLength(FAQ_QUESTIONS.length);
    });
  });

  describe("dépliage de la FAQ", () => {
    it.each(FAQ_QUESTIONS)("should reveal the answer when %s is pressed", (question) => {
      // Arrange
      render(<HelpSupportScreen />);

      // Act
      fireEvent.press(screen.getByText(question));

      // Assert
      expect(screen.getByText(answerOf(question))).toBeTruthy();
      expect(screen.getByText("icon:chevron-up", { includeHiddenElements: true })).toBeTruthy();
    });

    it("should collapse the answer when the same entry is pressed twice", () => {
      // Arrange
      render(<HelpSupportScreen />);
      fireEvent.press(screen.getByText(FAQ_QUESTIONS[0]));

      // Act
      fireEvent.press(screen.getByText(FAQ_QUESTIONS[0]));

      // Assert
      expect(screen.queryByText(answerOf(FAQ_QUESTIONS[0]))).toBeNull();
    });

    it("should keep only one answer open at a time", () => {
      // Arrange
      render(<HelpSupportScreen />);
      fireEvent.press(screen.getByText(FAQ_QUESTIONS[0]));

      // Act
      fireEvent.press(screen.getByText(FAQ_QUESTIONS[1]));

      // Assert
      expect(screen.queryByText(answerOf(FAQ_QUESTIONS[0]))).toBeNull();
      expect(screen.getByText(answerOf(FAQ_QUESTIONS[1]))).toBeTruthy();
    });
  });

  describe("contact du support", () => {
    it("should open a prefilled mail draft when the contact button is pressed", () => {
      // Arrange
      render(<HelpSupportScreen />);

      // Act
      fireEvent.press(screen.getByText("helpSupport.contactSupport"));

      // Assert
      expect(openURL).toHaveBeenCalledWith(
        "mailto:support@mytripcircle.com?subject=helpSupport.emailSubject",
      );
    });
  });

  describe("navigation", () => {
    it("should go back when the back button is pressed", () => {
      // Arrange
      render(<HelpSupportScreen />);

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("accents de la FAQ selon le thème", () => {
    // Deux entrées portent un accent codé en dur, décliné clair/sombre : c'est
    // la seule différence observable entre les deux thèmes sur cet écran.
    const iconColorOf = (name: string) =>
      screen.UNSAFE_getByProps({ name }).props.color;

    it("should use the light accents when the light palette is active", () => {
      // Arrange & Act
      render(<HelpSupportScreen />);

      // Assert
      expect(iconColorOf("people-outline")).toBe("#6B8C5A");
      expect(iconColorOf("calendar-outline")).toBe("#5A8FAA");
    });

    it("should use the lighter accents when the dark palette is active", () => {
      // Arrange
      (useTheme as jest.Mock).mockReturnValue({ colors: darkColors, isDark: true });

      // Act
      render(<HelpSupportScreen />);

      // Assert
      expect(iconColorOf("people-outline")).toBe("#8BBF76");
      expect(iconColorOf("calendar-outline")).toBe("#76AACC");
    });

    it("should still list the whole FAQ when the dark palette is active", () => {
      // Arrange
      (useTheme as jest.Mock).mockReturnValue({ colors: darkColors, isDark: true });

      // Act
      render(<HelpSupportScreen />);

      // Assert
      FAQ_QUESTIONS.forEach((question) => {
        expect(screen.getByText(question)).toBeTruthy();
      });
    });
  });
});
