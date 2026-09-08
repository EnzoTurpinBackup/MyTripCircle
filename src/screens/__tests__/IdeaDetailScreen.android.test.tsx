// Suite dédiée à la variante Android. Deux différences y sont observables :
//   - le sélecteur de date natif se referme dès qu'une date est choisie, ce que
//     l'écran câble via `onCloseDatePicker` ;
//   - la marge basse du bandeau d'action est choisie au chargement du module,
//     hors de portée de la suite principale, qui s'exécute sur la plateforme iOS
//     par défaut de jest-expo.

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

import { mockDatePicker, resetDatePicker } from "./support/uiMocks";
import { PICKED_DATE, handlers, setupHook } from "./support/ideaDetailMocks";

import React from "react";
import { render, screen } from "@testing-library/react-native";

import IdeaDetailScreen from "../IdeaDetailScreen";

describe("IdeaDetailScreen sur Android", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDatePicker();
    setupHook({ modalVisible: true, showDatePicker: true });
    render(<IdeaDetailScreen />);
  });

  it("should dismiss the date picker as soon as a date is picked", () => {
    // Arrange & Act
    mockDatePicker.onChange?.({}, PICKED_DATE);

    // Assert
    expect(handlers.setShowDatePicker).toHaveBeenCalledWith(false);
  });

  it("should still store the date picked on the native android picker", () => {
    // Arrange & Act
    mockDatePicker.onChange?.({}, PICKED_DATE);

    // Assert
    expect(handlers.setStartDate).toHaveBeenCalledWith(PICKED_DATE);
  });

  it("should keep the add-to-trip call to action reachable", () => {
    // Arrange & Act : montage effectué par le `beforeEach`.

    // Assert
    expect(screen.getByText("ideas.detail.addToTrips")).toBeTruthy();
  });
});
