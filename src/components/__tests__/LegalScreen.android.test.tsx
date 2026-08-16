// Suite dédiée à la variante Android de l'en-tête de `LegalScreen`. Le retrait
// supplémentaire est calculé dans `StyleSheet.create`, donc au chargement du
// module : il ne peut pas être couvert depuis la suite principale, qui s'exécute
// sur la plateforme iOS par défaut de jest-expo.

jest.mock("react-native/Libraries/Utilities/Platform", () => {
  const actual = jest.requireActual("react-native/Libraries/Utilities/Platform");
  const base = actual.default ?? actual;
  const android = {
    ...base,
    OS: "android",
    select: (options: Record<string, unknown>) =>
      "android" in options ? options.android : options.default,
  };
  return { __esModule: true, default: android, ...android };
});

import "./support/nativeMocks";

import React from "react";
import { View } from "react-native";
import { render, screen } from "@testing-library/react-native";
import LegalScreen from "../LegalScreen";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/** L'en-tête est la seule vue porteuse d'une bordure inférieure. */
const headerView = () =>
  screen
    .UNSAFE_getAllByType(View)
    .find((view) => flatten(view.props.style).borderBottomWidth === 1)!;

describe("LegalScreen on Android", () => {
  it("should add extra top padding to the header", () => {
    render(<LegalScreen headerTitle="Confidentialité" lastUpdated="—" sections={[]} />);

    expect(flatten(headerView().props.style).paddingTop).toBe(16);
  });
});
