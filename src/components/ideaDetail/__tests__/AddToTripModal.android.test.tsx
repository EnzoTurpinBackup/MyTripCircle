// Suite dédiée à la variante Android de la feuille `AddToTripModal`. Le retrait
// bas est calculé dans `StyleSheet.create`, donc au chargement du module : il ne
// peut pas être couvert depuis la suite principale, qui s'exécute sur la
// plateforme iOS par défaut de jest-expo.

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

import "../../__tests__/support/nativeMocks";

import React from "react";
import { Animated, KeyboardAvoidingView, View } from "react-native";
import { render, screen } from "@testing-library/react-native";
import AddToTripModal from "../AddToTripModal";
import { lightColors } from "../../../contexts/ThemeContext";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: () => null,
}));

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/** La feuille est la seule vue dont le coin haut-gauche est arrondi à 28. */
const sheetView = () =>
  screen
    .UNSAFE_getAllByType(View)
    .find((view) => flatten(view.props.style).borderTopLeftRadius === 28)!;

const renderModal = () =>
  render(
    <AddToTripModal
      visible
      destinationName="Kyoto"
      customDays={5}
      tripTitle="Escapade à Kyoto"
      startDate={new Date("2026-06-01T00:00:00Z")}
      endDate={new Date("2026-06-05T00:00:00Z")}
      showDatePicker={false}
      creating={false}
      backdropOpacity={new Animated.Value(1)}
      sheetTranslateY={new Animated.Value(0)}
      colors={lightColors}
      isDark={false}
      onClose={jest.fn()}
      onChangeTripTitle={jest.fn()}
      onOpenDatePicker={jest.fn()}
      onCloseDatePicker={jest.fn()}
      onChangeDate={jest.fn()}
      onCreate={jest.fn()}
      formatDate={(d: Date) => d.toISOString().slice(0, 10)}
    />,
  );

describe("AddToTripModal on Android", () => {
  it("should use the compact bottom padding of the sheet", () => {
    renderModal();

    expect(flatten(sheetView().props.style).paddingBottom).toBe(28);
  });

  it("should let the keyboard resize the sheet rather than pad it", () => {
    renderModal();

    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe("height");
  });
});
