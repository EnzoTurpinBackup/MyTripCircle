import React from "react";
import { ActivityIndicator } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import AddressAutocompleteField from "../AddressAutocompleteField";
import { AddressSuggestion } from "../../../services/PlacesService";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// i18next n'est pas initialisé en test : on renvoie la clé pour garder des
// libellés déterministes.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// La police d'icônes charge ses glyphes de façon asynchrone : on la remplace
// par un texte porteur du nom de l'icône.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, `icon:${name}`),
  };
});

const SUGGESTIONS: AddressSuggestion[] = [
  { placeId: "p1", description: "12 rue de Rivoli, Paris" } as AddressSuggestion,
  { placeId: "p2", description: "8 avenue de l'Opéra, Paris" } as AddressSuggestion,
];

const PLACEHOLDER = "Tapez le nom ou l'adresse (ex: McDonald's)";

const renderField = (
  overrides: Partial<React.ComponentProps<typeof AddressAutocompleteField>> = {}
) => {
  const onChange = jest.fn();
  const onSuggestionPress = jest.fn();
  render(
    <AddressAutocompleteField
      value=""
      onChange={onChange}
      suggestions={[]}
      loadingSuggestions={false}
      fetchingPlaceDetails={false}
      onSuggestionPress={onSuggestionPress}
      {...overrides}
    />
  );
  return { onChange, onSuggestionPress };
};

describe("AddressAutocompleteField", () => {
  it("should render the label and the search field at rest", () => {
    // Arrange / Act
    renderField();

    // Assert
    // Le libellé est suivi d'un astérisque signalant un champ obligatoire
    expect(screen.getByText("addresses.form.address *")).toBeTruthy();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeTruthy();
    expect(screen.queryByText("common.loading")).toBeNull();
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });

  it("should report every keystroke to the parent", () => {
    // Arrange
    const { onChange } = renderField();

    // Act
    fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), "12 rue");

    // Assert
    expect(onChange).toHaveBeenCalledWith("12 rue");
  });

  it("should show a spinner while the suggestions are being fetched", () => {
    // Arrange / Act
    renderField({ loadingSuggestions: true });

    // Assert
    expect(screen.getByText("common.loading")).toBeTruthy();
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it("should show a spinner while the chosen place details are being fetched", () => {
    // Arrange / Act
    renderField({ fetchingPlaceDetails: true });

    // Assert
    expect(screen.getByText("common.loading")).toBeTruthy();
  });

  it("should list every suggestion returned by the service", () => {
    // Arrange / Act
    renderField({ suggestions: SUGGESTIONS });

    // Assert
    expect(screen.getByText("12 rue de Rivoli, Paris")).toBeTruthy();
    expect(screen.getByText("8 avenue de l'Opéra, Paris")).toBeTruthy();
  });

  it("should report the chosen suggestion when it is pressed", () => {
    // Arrange
    const { onSuggestionPress } = renderField({ suggestions: SUGGESTIONS });

    // Act
    fireEvent.press(screen.getByText("8 avenue de l'Opéra, Paris"));

    // Assert
    expect(onSuggestionPress).toHaveBeenCalledWith(SUGGESTIONS[1]);
  });

  it("should render no suggestion list when the service returned nothing", () => {
    // Arrange / Act
    renderField({ suggestions: [], value: "adresse introuvable" });

    // Assert
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveProp(
      "value",
      "adresse introuvable"
    );
    expect(screen.queryByText("12 rue de Rivoli, Paris")).toBeNull();
  });
});
