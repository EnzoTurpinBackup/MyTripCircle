import { useCallback } from "react";
import { Address } from "../types";
import ApiService from "../services/ApiService";
import { mapAddress } from "../utils/tripMappers";

interface AddressesSetters {
  setAddresses: React.Dispatch<React.SetStateAction<Address[]>>;
}

/**
 * Volet « adresses » de la façade d'accès distant : chaque opération enchaîne
 * l'appel au serveur et la mise à jour de la liste détenue par le contexte,
 * pour que l'interface reflète le changement sans rechargement global.
 *
 * @param setters.setAddresses Mise à jour de la liste d'adresses du contexte.
 * @returns Les trois opérations de création, modification et suppression.
 *
 * @remarks Les réponses brutes du serveur passent par `mapAddress` avant d'être
 * stockées, la représentation persistée différant du modèle manipulé par
 * l'interface. La création et la modification propagent l'erreur, l'écran
 * devant conserver la saisie et pouvoir la resoumettre ; la suppression renvoie
 * au contraire un booléen, son échec ne remettant en cause aucune saisie.
 */
export function useTripsApiAddresses({ setAddresses }: AddressesSetters) {
  const createAddress = useCallback(
    async (address: Omit<Address, "id" | "createdAt" | "updatedAt">): Promise<Address> => {
      try {
        const result = await ApiService.createAddress(address);
        const mappedAddress = mapAddress(result);
        setAddresses((prev) => [...prev, mappedAddress]);
        return mappedAddress;
      } catch (error) {
        console.error("Error creating address:", error);
        throw error;
      }
    },
    [setAddresses]
  );

  const updateAddress = useCallback(
    async (addressId: string, updates: Partial<Address>): Promise<Address | null> => {
      try {
        const result = await ApiService.updateAddress(addressId, updates);
        if (!result) return null;
        const mappedAddress = mapAddress(result);
        setAddresses((prev) =>
          prev.map((a) => (a.id === addressId ? mappedAddress : a))
        );
        return mappedAddress;
      } catch (error) {
        console.error("Error updating address:", error);
        throw error;
      }
    },
    [setAddresses]
  );

  const deleteAddress = useCallback(
    async (addressId: string): Promise<boolean> => {
      try {
        await ApiService.deleteAddress(addressId);
        setAddresses((prev) => prev.filter((a) => a.id !== addressId));
        return true;
      } catch (error) {
        console.error("Error deleting address:", error);
        return false;
      }
    },
    [setAddresses]
  );

  return { createAddress, updateAddress, deleteAddress };
}
