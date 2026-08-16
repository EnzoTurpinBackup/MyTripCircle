import React from "react";
import { ActivityIndicator, Alert } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AddressForm } from "../AddressForm";
import { Address } from "../../types";
import { getAddressSuggestions, getPlaceDetails } from "../../services/PlacesService";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// useCurrentLocation interroge la géolocalisation native au montage : on la
// mocke pour éviter tout appel réel et rester déterministe en test.
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied" }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

// On renvoie la clé de traduction plutôt que le libellé anglais : les
// assertions restent lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// Google Places est une frontière réseau : on la mocke pour piloter
// l'autocomplétion et le chargement des détails depuis le test.
jest.mock("../../services/PlacesService", () => ({
  getAddressSuggestions: jest.fn().mockResolvedValue([]),
  getPlaceDetails: jest.fn().mockResolvedValue({}),
  hasGooglePlacesApiKey: true,
}));

// La police d'icônes charge ses glyphes de façon asynchrone : on la remplace
// par un texte porteur du nom de l'icône.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: Object.assign(
      ({ name }: { name: string }) => React.createElement(Text, null, `icon:${name}`),
      { glyphMap: {} }
    ),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parcourt récursivement l'arbre rendu (toJSON) et signale toute chaîne de
 * caractères "brute" présente directement parmi les enfants d'un nœud qui
 * n'est pas un <Text>. C'est exactement le symptôme de la fuite de valeur
 * décrite par la règle SonarCloud typescript:S6439 : `{valeur && <X/>}` rend
 * `valeur` telle quelle lorsqu'elle est falsy mais non booléenne (ex: 0).
 */
function findOrphanTextNodes(node: any, path = "root"): string[] {
  if (node == null || typeof node !== "object") return [];
  const orphans: string[] = [];
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    if (typeof child === "string") {
      if (node.type !== "Text") {
        orphans.push(`${path} > "${child}"`);
      }
      continue;
    }
    orphans.push(...findOrphanTextNodes(child, `${path} > ${child?.type ?? "?"}`));
  }
  return orphans;
}

const makeAddress = (overrides: Partial<Address> = {}): Address => ({
  id: "addr-1",
  type: "hotel",
  name: "Hôtel Central",
  address: "1 rue de Paris",
  city: "Paris",
  country: "France",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

const noop = () => {};
const noopSave = async () => {};

describe("AddressForm", () => {
  it("should not render a leaked string when creating a new address with no name yet", () => {
    // Arrange
    // Aucune adresse initiale et un nom vide : (initialAddress || form.name) vaut ""
    // avant la correction, ce qui laisse fuir la chaîne vide dans l'arbre rendu.

    // Act
    const { toJSON, queryByText } = render(
      <AddressForm visible onClose={noop} onSave={noopSave} />
    );

    // Assert
    expect(queryByText("Name")).toBeNull();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should render the name field when editing an address that already has a name", () => {
    // Arrange
    const initialAddress = makeAddress({ name: "Hôtel Central" });

    // Act
    const { getAllByDisplayValue, toJSON } = render(
      <AddressForm visible onClose={noop} onSave={noopSave} initialAddress={initialAddress} />
    );

    // Assert
    expect(getAllByDisplayValue("Hôtel Central").length).toBeGreaterThan(0);
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });
});

// ─── Interactions ─────────────────────────────────────────────────────────────

const renderForm = (props: Partial<React.ComponentProps<typeof AddressForm>> = {}) => {
  const onClose = jest.fn();
  const onSave = jest.fn().mockResolvedValue(undefined);
  render(<AddressForm visible onClose={onClose} onSave={onSave} {...props} />);
  return { onClose, onSave };
};

describe("AddressForm — en-tête et fermeture", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should title the sheet as a creation when no address is being edited", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.getByText("addresses.form.title")).toBeTruthy();
    expect(screen.queryByText("addresses.form.editTitle")).toBeNull();
  });

  it("should title the sheet as an edition when an address is being edited", () => {
    // Arrange / Act
    renderForm({ initialAddress: makeAddress() });

    // Assert
    expect(screen.getByText("addresses.form.editTitle")).toBeTruthy();
  });

  it("should render nothing when the sheet is not visible", () => {
    // Arrange / Act
    renderForm({ visible: false });

    // Assert
    expect(screen.queryByText("addresses.form.title")).toBeNull();
  });

  it("should close the sheet when the header cross is pressed", () => {
    // Arrange
    const { onClose } = renderForm();

    // Act
    fireEvent.press(screen.getByText("icon:close"));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should close the sheet when the cancel button is pressed", () => {
    // Arrange
    const { onClose } = renderForm();

    // Act
    fireEvent.press(screen.getByText("common.cancel"));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("AddressForm — saisie", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should select another address type when its button is pressed", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.press(screen.getByText("addresses.filters.restaurant"));

    // Assert — l'icône du type choisi passe en blanc sur fond terracotta
    expect(screen.getByText("addresses.filters.restaurant")).toHaveStyle({ color: "#FFFFFF" });
  });

  it.each([
    ["addresses.form.namePlaceholder", "Hôtel du Nord"],
    ["addresses.form.cityPlaceholder", "Lyon"],
    ["addresses.form.countryPlaceholder", "France"],
    ["addresses.form.phonePlaceholder", "0102030405"],
    ["addresses.form.websitePlaceholder", "example.com"],
    ["addresses.form.notesPlaceholder", "Chambre avec vue"],
  ])("should keep what the user types in the %s field", (placeholder, typed) => {
    // Arrange
    renderForm({ initialAddress: makeAddress() });

    // Act
    fireEvent.changeText(screen.getByPlaceholderText(placeholder), typed);

    // Assert
    expect(screen.getByPlaceholderText(placeholder)).toHaveProp("value", typed);
  });

  it("should keep what the user types in the address field", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.changeText(
      screen.getByPlaceholderText("Tapez le nom ou l'adresse (ex: McDonald's)"),
      "3 place Bellecour"
    );

    // Assert
    expect(
      screen.getByPlaceholderText("Tapez le nom ou l'adresse (ex: McDonald's)")
    ).toHaveProp("value", "3 place Bellecour");
  });

  it("should reveal the name field as soon as the name is filled in", () => {
    // Arrange — sans adresse initiale le champ nom reste masqué
    renderForm();
    expect(screen.queryByPlaceholderText("addresses.form.namePlaceholder")).toBeNull();

    // Act — le nom n'est saisissable qu'une fois révélé : on passe par une
    // adresse initiale pour vérifier le second terme de la condition
    screen.unmount();
    renderForm({ initialAddress: makeAddress({ name: "Chez Ana" }) });

    // Assert
    expect(screen.getByPlaceholderText("addresses.form.namePlaceholder")).toHaveProp(
      "value",
      "Chez Ana"
    );
  });
});

describe("AddressForm — enregistrement", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should refuse to save while the required fields are empty", () => {
    // Arrange
    const { onSave, onClose } = renderForm();

    // Act
    fireEvent.press(screen.getByText("common.save"));

    // Assert
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith("common.error", "addresses.form.requiredFields");
  });

  it("should hand the filled address to the parent and close the sheet", async () => {
    // Arrange
    const { onSave, onClose } = renderForm({ initialAddress: makeAddress() });

    // Act
    fireEvent.press(screen.getByText("common.save"));

    // Assert
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "hotel",
        name: "Hôtel Central",
        address: "1 rue de Paris",
        city: "Paris",
        country: "France",
      })
    );
  });

  it("should show a spinner and block the button while the address is being saved", async () => {
    // Arrange
    let release: () => void = () => {};
    const onSave = jest.fn(
      () => new Promise<void>((resolve) => { release = resolve; })
    );
    render(
      <AddressForm visible onClose={noop} onSave={onSave} initialAddress={makeAddress()} />
    );

    // Act
    fireEvent.press(screen.getByText("common.save"));

    // Assert
    await waitFor(() => expect(screen.UNSAFE_queryByType(ActivityIndicator)).not.toBeNull());
    expect(screen.queryByText("common.save")).toBeNull();
    await act(async () => { release(); });
  });
});

describe("AddressForm — autocomplétion", () => {
  const SUGGESTION = { placeId: "p1", description: "12 rue de Rivoli, Paris" };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (getAddressSuggestions as jest.Mock).mockResolvedValue([SUGGESTION]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    (getAddressSuggestions as jest.Mock).mockResolvedValue([]);
    (getPlaceDetails as jest.Mock).mockResolvedValue({});
  });

  /** Laisse passer l'anti-rebond de 400 ms de l'autocomplétion. */
  const flushDebounce = async () => {
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
  };

  it("should list the suggestions returned for the typed address", async () => {
    // Arrange
    renderForm({ initialAddress: makeAddress() });

    // Act
    await flushDebounce();

    // Assert
    expect(screen.getByText(SUGGESTION.description)).toBeTruthy();
  });

  it("should block the save button while the chosen place is being fetched", async () => {
    // Arrange
    let release: (v: Record<string, string>) => void = () => {};
    (getPlaceDetails as jest.Mock).mockReturnValue(
      new Promise((resolve) => { release = resolve; })
    );
    renderForm({ initialAddress: makeAddress() });
    await flushDebounce();

    // Act
    fireEvent.press(screen.getByText(SUGGESTION.description));

    // Assert — le bouton reste visible mais refuse toute nouvelle pression
    expect(screen.getByText("common.save")).toBeDisabled();
    await act(async () => { release({ name: "Le Rivoli", formattedAddress: "12 rue de Rivoli" }); });
    expect(screen.getByText("common.save")).toBeEnabled();
  });
});
