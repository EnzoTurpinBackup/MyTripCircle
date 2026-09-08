import "./support/nativeMocks";

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import LegalScreen from "../LegalScreen";

const mockGoBack = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

const sections = [
  { title: "Collecte des données", body: "Nous collectons le strict nécessaire." },
  { title: "Vos droits", body: "Vous pouvez demander la suppression." },
];

describe("LegalScreen", () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it("should render the header title", () => {
    render(
      <LegalScreen
        headerTitle="Confidentialité"
        lastUpdated="Mis à jour le 1er mars 2026"
        sections={sections}
      />,
    );

    expect(screen.getByText("Confidentialité")).toBeTruthy();
  });

  it("should render the last updated notice", () => {
    render(
      <LegalScreen
        headerTitle="Confidentialité"
        lastUpdated="Mis à jour le 1er mars 2026"
        sections={sections}
      />,
    );

    expect(screen.getByText("Mis à jour le 1er mars 2026")).toBeTruthy();
  });

  it("should render the title and body of every section", () => {
    render(
      <LegalScreen headerTitle="Confidentialité" lastUpdated="—" sections={sections} />,
    );

    expect(screen.getByText("Collecte des données")).toBeTruthy();
    expect(screen.getByText("Nous collectons le strict nécessaire.")).toBeTruthy();
    expect(screen.getByText("Vos droits")).toBeTruthy();
    expect(screen.getByText("Vous pouvez demander la suppression.")).toBeTruthy();
  });

  it("should render no section when the list is empty", () => {
    render(<LegalScreen headerTitle="Confidentialité" lastUpdated="—" sections={[]} />);

    expect(screen.queryByText("Vos droits")).toBeNull();
    expect(screen.getByText("Confidentialité")).toBeTruthy();
  });

  it("should navigate back when the back button is pressed", () => {
    render(
      <LegalScreen headerTitle="Confidentialité" lastUpdated="—" sections={sections} />,
    );

    fireEvent.press(screen.getByLabelText("common.a11y.back"));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
