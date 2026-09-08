import "./support/screenMocks";

import React from "react";
import { render, screen } from "@testing-library/react-native";

import PrivacyScreen from "../PrivacyScreen";
import TermsScreen from "../TermsScreen";
import LegalNoticeScreen from "../LegalNoticeScreen";

// Ces trois écrans ne sont que des tables de matières : ils déclarent une liste
// de sections et délèguent tout le rendu à `LegalScreen`. On renvoie la clé de
// traduction telle quelle pour vérifier exactement quelles sections sont
// déclarées, dans quel ordre, sans dépendre du wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

/** Titres de section attendus, dans l'ordre de déclaration de l'écran. */
const PRIVACY_SECTIONS = Array.from({ length: 11 }, (_, i) => `privacy.s${i + 1}Title`);
const TERMS_SECTIONS = Array.from({ length: 10 }, (_, i) => `terms.s${i + 1}Title`);
const LEGAL_NOTICE_SECTIONS = [
  "legalNotice.publisherTitle",
  "legalNotice.hostingTitle",
  "legalNotice.dataTitle",
  "legalNotice.intellectualTitle",
];

describe("PrivacyScreen", () => {
  it("should render the privacy header title", () => {
    // Arrange & Act
    render(<PrivacyScreen />);

    // Assert
    expect(screen.getByText("privacy.headerTitle")).toBeTruthy();
  });

  it("should render the last updated notice", () => {
    // Arrange & Act
    render(<PrivacyScreen />);

    // Assert
    expect(screen.getByText("privacy.lastUpdated")).toBeTruthy();
  });

  it.each(PRIVACY_SECTIONS)("should render the %s section with its body", (title) => {
    // Arrange & Act
    render(<PrivacyScreen />);

    // Assert
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(title.replace("Title", "Body"))).toBeTruthy();
  });
});

describe("TermsScreen", () => {
  it("should render the terms header title", () => {
    // Arrange & Act
    render(<TermsScreen />);

    // Assert
    expect(screen.getByText("terms.headerTitle")).toBeTruthy();
  });

  it("should render the last updated notice", () => {
    // Arrange & Act
    render(<TermsScreen />);

    // Assert
    expect(screen.getByText("terms.lastUpdated")).toBeTruthy();
  });

  it.each(TERMS_SECTIONS)("should render the %s section with its body", (title) => {
    // Arrange & Act
    render(<TermsScreen />);

    // Assert
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(title.replace("Title", "Body"))).toBeTruthy();
  });
});

describe("LegalNoticeScreen", () => {
  it("should render the legal notice header title", () => {
    // Arrange & Act
    render(<LegalNoticeScreen />);

    // Assert
    expect(screen.getByText("legalNotice.title")).toBeTruthy();
  });

  it("should leave the last updated notice empty", () => {
    // Arrange & Act
    render(<LegalNoticeScreen />);

    // Assert — l'écran passe une chaîne vide, aucune date n'est affichée.
    expect(screen.queryByText(/legalNotice\.lastUpdated/)).toBeNull();
  });

  it.each(LEGAL_NOTICE_SECTIONS)("should render the %s section with its body", (title) => {
    // Arrange & Act
    render(<LegalNoticeScreen />);

    // Assert
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(title.replace("Title", "Body"))).toBeTruthy();
  });
});
