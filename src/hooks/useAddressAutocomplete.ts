import { useState } from "react";
import {
  getAddressSuggestions,
  hasGooglePlacesApiKey,
  type AddressSuggestion,
} from "../services/PlacesService";
import { useCurrentLocation } from "./useCurrentLocation";

interface UseAddressAutocompleteReturn {
  addressSuggestions: AddressSuggestion[];
  showAddressSuggestions: boolean;
  handleAddressChange: (text: string, onTextChange: (text: string) => void) => Promise<void>;
  handleSelectAddress: (suggestion: AddressSuggestion, onSelect: (description: string) => void) => void;
}

/**
 * Propose des adresses au fil de la frappe afin d'éviter la saisie manuelle
 * d'une adresse complète, source d'erreurs qui empêchent ensuite le géocodage.
 * Le champ de saisie reste contrôlé par l'appelant : ce hook ne gère que la
 * liste de suggestions qui l'accompagne.
 *
 * @returns Les suggestions courantes, l'indicateur `showAddressSuggestions`
 * pilotant l'affichage de la liste, et les deux gestionnaires à brancher sur la
 * frappe et sur le choix d'une suggestion.
 *
 * @remarks Les suggestions sont biaisées vers la position de l'appareil quand
 * elle est disponible, les adresses recherchées étant le plus souvent proches.
 * En l'absence de clé Google Places, la complétion se désactive silencieusement
 * et la saisie libre reste possible : c'est un confort, jamais un prérequis.
 */
const useAddressAutocomplete = (): UseAddressAutocompleteReturn => {
  const currentLocation = useCurrentLocation();
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);

  const handleAddressChange = async (text: string, onTextChange: (text: string) => void) => {
    onTextChange(text);
    if (!hasGooglePlacesApiKey || !text.trim()) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }
    try {
      const controller = new AbortController();
      const results = await getAddressSuggestions(text.trim(), controller.signal, currentLocation ?? undefined);
      setAddressSuggestions(results);
      setShowAddressSuggestions(results.length > 0);
    } catch (error) {
      if ((error as Error).name !== "AbortError") console.error("Address suggestions error:", error);
    }
  };

  const handleSelectAddress = (suggestion: AddressSuggestion, onSelect: (description: string) => void) => {
    onSelect(suggestion.description);
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
  };

  return { addressSuggestions, showAddressSuggestions, handleAddressChange, handleSelectAddress };
};

export default useAddressAutocomplete;
