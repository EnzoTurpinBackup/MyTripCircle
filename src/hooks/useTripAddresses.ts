import { useState } from "react";
import { Alert } from "react-native";
import { Address } from "../types";
import { parseApiError } from "../utils/i18n";

type AddressOmitKeys = "id" | "createdAt" | "updatedAt";

interface UseTripAddressesParams {
  tripId: string;
  createAddress: (data: Omit<Address, AddressOmitKeys>) => Promise<Address>;
  updateAddress: (id: string, data: Partial<Address>) => Promise<Address | null>;
  deleteAddress: (id: string) => Promise<boolean>;
  t: (key: string) => string;
}

/**
 * Contrat de la gestion des adresses d'un voyage. Exporté parce qu'il entre
 * dans le type de retour de l'écran de modification, qui aplatit cet état avec
 * le sien.
 */
export interface UseTripAddressesReturn {
  addresses: Address[];
  setAddresses: React.Dispatch<React.SetStateAction<Address[]>>;
  showAddressForm: boolean;
  editingAddress: Address | undefined;
  handleAddAddress: () => void;
  handleEditAddress: (index: number) => void;
  handleDeleteAddress: (index: number) => void;
  handleSaveAddress: (address: Omit<Address, AddressOmitKeys>) => Promise<void>;
  closeAddressForm: () => void;
}

/**
 * Pendant de la gestion des réservations pour le carnet d'adresses d'un
 * voyage : liste des lieux et état du formulaire qui les saisit.
 *
 * @param params.tripId Voyage auquel rattacher les adresses créées.
 * @param params.createAddress Opération distante de création, injectée pour
 * découpler ce hook de la couche d'accès aux données.
 * @param params.updateAddress Opération distante de modification.
 * @param params.deleteAddress Opération distante de suppression.
 * @param params.t Fonction de traduction des messages de confirmation.
 * @returns La liste et son accesseur, l'état d'ouverture du formulaire,
 * `editingAddress` déjà résolue pour préremplir la saisie, et les gestionnaires
 * d'ajout, d'édition, de suppression, d'enregistrement et de fermeture.
 *
 * @remarks Contrairement aux réservations, c'est l'adresse résolue qui est
 * exposée et non son index : le formulaire d'adresse est préremplissable et n'a
 * pas besoin de connaître la position de l'élément dans la liste.
 */
const useTripAddresses = ({
  tripId,
  createAddress,
  updateAddress,
  deleteAddress,
  t,
}: UseTripAddressesParams): UseTripAddressesReturn => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);

  const editingAddress =
    editingAddressIndex === null ? undefined : addresses[editingAddressIndex];

  const handleAddAddress = () => {
    setEditingAddressIndex(null);
    setShowAddressForm(true);
  };

  const handleEditAddress = (index: number) => {
    setEditingAddressIndex(index);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = (index: number) => {
    const address = addresses[index];
    const removeAtIndex = (prev: Address[]) => prev.filter((_, i) => i !== index);

    const onConfirm = async () => {
      if (address.id) await deleteAddress(address.id);
      setAddresses(removeAtIndex);
    };

    Alert.alert(t("common.confirm"), t("addresses.details.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.ok"), style: "destructive", onPress: onConfirm },
    ]);
  };

  const handleSaveAddress = async (address: Omit<Address, AddressOmitKeys>) => {
    try {
      if (editingAddressIndex === null) {
        const newAddress = await createAddress({ ...address, tripId });
        setAddresses((prev) => [...prev, newAddress]);
      } else {
        const existing = addresses[editingAddressIndex];
        if (existing.id) {
          await updateAddress(existing.id, address);
          setAddresses((prev) =>
            prev.map((a, i) =>
              i === editingAddressIndex ? { ...a, ...address, updatedAt: new Date() } : a
            )
          );
        }
      }
      setShowAddressForm(false);
      setEditingAddressIndex(null);
    } catch (error) {
      Alert.alert(t("common.error"), parseApiError(error) || t("addresses.form.submitError"));
    }
  };

  const closeAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressIndex(null);
  };

  return {
    addresses,
    setAddresses,
    showAddressForm,
    editingAddress,
    handleAddAddress,
    handleEditAddress,
    handleDeleteAddress,
    handleSaveAddress,
    closeAddressForm,
  };
};

export default useTripAddresses;
