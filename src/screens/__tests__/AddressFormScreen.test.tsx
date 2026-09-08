// Branche volontairement non couverte :
//   - l. 108 `behavior={Platform.OS === "ios" ? "padding" : undefined}` : le
//     comportement du `KeyboardAvoidingView` ne produit aucune différence
//     observable pour l'utilisateur en test. La couvrir supposerait soit une
//     suite Android sans assertion propre, soit une inspection des props d'un
//     nœud interne : deux choses que ce dépôt s'interdit.

import "./support/screenMocks";

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import AddressFormScreen from "../AddressFormScreen";
import { lightColors } from "../../contexts/ThemeContext";
import { useAddressForm } from "../../hooks/useAddressForm";
import { DISABLED_OPACITY } from "../../theme";
import type { Address } from "../../types";

// `src/utils/i18n`, tiré transitivement par le hook réel, branche
// `initReactI18next` sur i18next au chargement : la doublure doit l'exposer.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// `AddressTypeSelector` importe `ADDRESS_TYPES` et `getTypeIcon` de ce même
// module : seul le hook est remplacé.
jest.mock("../../hooks/useAddressForm", () => ({
  ...jest.requireActual("../../hooks/useAddressForm"),
  useAddressForm: jest.fn(),
}));

const mockUseNetwork = jest.fn();
jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: () => mockUseNetwork() }));

const mockUseAddressForm = useAddressForm as jest.Mock;

const mockGoBack = jest.fn();
const handlers = {
  handleInputChange: jest.fn(),
  handleSuggestionPress: jest.fn(),
  handleSubmit: jest.fn(),
};

const SUGGESTION = { placeId: "place-1", description: "12 rue des Lilas, Lyon" };

const EMPTY_FORM = {
  type: "restaurant" as Address["type"],
  name: "",
  address: "",
  city: "",
  country: "",
  phone: "",
  website: "",
  notes: "",
};

interface HookOverrides {
  form?: typeof EMPTY_FORM;
  googleRating?: number | null;
  initialized?: boolean;
  submitting?: boolean;
  suggestions?: (typeof SUGGESTION)[];
  loadingSuggestions?: boolean;
  fetchingPlaceDetails?: boolean;
  contextLoading?: boolean;
  addressId?: string | null;
  existingAddress?: Address | null;
  isConnected?: boolean;
}

const setupHook = (overrides: HookOverrides = {}) => {
  const {
    form = EMPTY_FORM,
    googleRating = null,
    initialized = true,
    submitting = false,
    suggestions = [],
    loadingSuggestions = false,
    fetchingPlaceDetails = false,
    contextLoading = false,
    addressId = null,
    existingAddress = null,
    isConnected = true,
  } = overrides;

  mockUseNetwork.mockReturnValue({ isConnected });
  mockUseAddressForm.mockReturnValue({
    form,
    googleRating,
    initialized,
    submitting,
    suggestions,
    loadingSuggestions,
    fetchingPlaceDetails,
    contextLoading,
    addressId,
    existingAddress,
    screenTitle: "addresses.form.createTitle",
    handleInputChange: handlers.handleInputChange,
    handleSuggestionPress: handlers.handleSuggestionPress,
    handleSubmit: handlers.handleSubmit,
    navigation: { goBack: mockGoBack },
  });
};

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/** Opacité effective d'un élément, portée par un ancêtre pressable. */
const opacityOf = (element: { props: { style?: unknown }; parent: unknown } | null) => {
  let current = element;
  while (current) {
    const { opacity } = flatten(current.props.style);
    if (typeof opacity === "number") return opacity;
    current = current.parent as typeof current;
  }
  return undefined;
};

describe("AddressFormScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHook();
  });

  describe("états d'attente", () => {
    it("should show the skeleton while the trips context is still loading", () => {
      // Arrange
      setupHook({ initialized: false, contextLoading: true });

      // Act
      render(<AddressFormScreen />);

      // Assert
      expect(screen.queryByText("common.save")).toBeNull();
      expect(screen.queryByText("addresses.details.notFound")).toBeNull();
    });

    it("should keep showing the form while the context reloads after initialisation", () => {
      // Arrange
      setupHook({ initialized: true, contextLoading: true });

      // Act
      render(<AddressFormScreen />);

      // Assert
      expect(screen.getByText("common.save")).toBeTruthy();
    });

    it("should report a missing address when the edited address no longer exists", () => {
      // Arrange
      setupHook({ addressId: "addr-1", existingAddress: null });

      // Act
      render(<AddressFormScreen />);

      // Assert
      expect(screen.getByText("addresses.details.notFound")).toBeTruthy();
    });

    it("should render the form when the edited address exists", () => {
      // Arrange
      setupHook({ addressId: "addr-1", existingAddress: { id: "addr-1" } as Address });

      // Act
      render(<AddressFormScreen />);

      // Assert
      expect(screen.getByText("addresses.form.createTitle")).toBeTruthy();
    });
  });

  describe("saisie des champs", () => {
    it.each([
      ["addresses.form.namePlaceholder", "name", "Chez Marcel"],
      ["addresses.form.cityPlaceholder", "city", "Lyon"],
      ["addresses.form.countryPlaceholder", "country", "France"],
      ["addresses.form.phonePlaceholder", "phone", "+33478000000"],
      ["addresses.form.websitePlaceholder", "website", "https://marcel.fr"],
      ["addresses.form.notesPlaceholder", "notes", "Terrasse"],
    ])("should forward the %s field to the form handler", (placeholder, field, value) => {
      // Arrange
      render(<AddressFormScreen />);

      // Act
      fireEvent.changeText(screen.getByPlaceholderText(placeholder), value);

      // Assert
      expect(handlers.handleInputChange).toHaveBeenCalledWith(field, value);
    });

    it("should forward the typed address to the form handler", () => {
      // Arrange
      render(<AddressFormScreen />);

      // Act
      fireEvent.changeText(
        screen.getByPlaceholderText("Tapez le nom ou l'adresse (ex: McDonald's)"),
        "12 rue des Lilas",
      );

      // Assert
      expect(handlers.handleInputChange).toHaveBeenCalledWith("address", "12 rue des Lilas");
    });

    it("should change the address type when another type is picked", () => {
      // Arrange
      render(<AddressFormScreen />);

      // Act
      fireEvent.press(screen.getByText("addresses.filters.hotel"));

      // Assert
      expect(handlers.handleInputChange).toHaveBeenCalledWith("type", "hotel");
    });

    it("should apply the suggestion picked in the autocomplete list", () => {
      // Arrange
      setupHook({ suggestions: [SUGGESTION] });
      render(<AddressFormScreen />);

      // Act
      fireEvent.press(screen.getByText("12 rue des Lilas, Lyon"));

      // Assert
      expect(handlers.handleSuggestionPress).toHaveBeenCalledWith(SUGGESTION);
    });
  });

  describe("note Google", () => {
    it("should hide the rating row when the place carries no rating", () => {
      // Arrange & Act
      render(<AddressFormScreen />);

      // Assert
      expect(screen.queryByText("Note Google :")).toBeNull();
    });

    it("should fill as many stars as the rounded rating", () => {
      // Arrange
      setupHook({ googleRating: 4.4 });

      // Act
      render(<AddressFormScreen />);

      // Assert
      const filled = screen
        .getAllByText("★")
        .filter((star) => flatten(star.props.style).color === lightColors.terra);
      expect(filled).toHaveLength(4);
    });

    it("should display the rating with a single decimal", () => {
      // Arrange
      setupHook({ googleRating: 4.4 });

      // Act
      render(<AddressFormScreen />);

      // Assert
      expect(screen.getByText("4.4")).toBeTruthy();
    });
  });

  describe("pied de page", () => {
    it("should submit the form when the save button is pressed", () => {
      // Arrange
      render(<AddressFormScreen />);

      // Act
      fireEvent.press(screen.getByText("common.save"));

      // Assert
      expect(handlers.handleSubmit).toHaveBeenCalledTimes(1);
    });

    it("should go back when the cancel button is pressed", () => {
      // Arrange
      render(<AddressFormScreen />);

      // Act
      fireEvent.press(screen.getByText("common.cancel"));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should go back when the top bar back button is pressed", () => {
      // Arrange
      render(<AddressFormScreen />);

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it("should replace the save label by a spinner while submitting", () => {
      // Arrange
      setupHook({ submitting: true });

      // Act
      render(<AddressFormScreen />);

      // Assert
      expect(screen.queryByText("common.save")).toBeNull();
    });

    it("should replace the save label by a spinner while the place details are fetched", () => {
      // Arrange
      setupHook({ fetchingPlaceDetails: true });

      // Act
      render(<AddressFormScreen />);

      // Assert
      expect(screen.queryByText("common.save")).toBeNull();
    });

    it("should disable the cancel button while submitting", () => {
      // Arrange
      setupHook({ submitting: true });

      // Act
      render(<AddressFormScreen />);

      // Assert
      expect(screen.getByText("common.cancel")).toBeDisabled();
    });

    it("should disable the save button while the device is offline", () => {
      // Arrange
      setupHook({ isConnected: false });

      // Act
      render(<AddressFormScreen />);

      // Assert
      expect(screen.getByText("common.save")).toBeDisabled();
    });

    it("should dim the save button while the device is offline", () => {
      // Arrange
      setupHook({ isConnected: false });

      // Act
      render(<AddressFormScreen />);

      // Assert
      expect(opacityOf(screen.getByText("common.save"))).toBe(DISABLED_OPACITY);
    });

    it("should keep the save button at full opacity when everything is ready", () => {
      // Arrange & Act
      render(<AddressFormScreen />);

      // Assert
      expect(opacityOf(screen.getByText("common.save"))).toBe(1);
    });
  });
});
