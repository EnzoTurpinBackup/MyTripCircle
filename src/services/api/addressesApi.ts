/**
 * Enveloppe du carnet d'adresses : lieux repérés par l'utilisateur, rattachés
 * ou non à un voyage. Une adresse sans `tripId` reste dans le carnet personnel
 * et peut être reprise sur un voyage ultérieur.
 */
import { request } from "./apiCore";

export const addressesApi = {
  /**
   * Liste les adresses du carnet personnel de l'utilisateur connecté.
   *
   * @returns Les adresses visibles par le compte courant.
   */
  getAddresses: () => request<any[]>("/addresses"),

  /**
   * Liste les adresses rattachées à un voyage.
   *
   * @param tripId Voyage dont on veut les lieux, y compris ceux ajoutés par les
   *   collaborateurs.
   * @returns Les adresses associées à ce voyage.
   * @throws {Error} Si le compte n'a pas accès au voyage.
   */
  getAddressesByTripId: (tripId: string) => request<any[]>(`/addresses/trip/${tripId}`),

  /**
   * Récupère le détail d'une adresse.
   *
   * @param id Adresse à consulter.
   * @returns L'adresse complète, coordonnées et notes comprises.
   * @throws {Error} Si l'adresse n'existe pas ou n'est pas accessible au compte.
   */
  getAddressById: (id: string) => request<any>(`/addresses/${id}`),

  /**
   * Ajoute une adresse au carnet.
   *
   * @param address Fiche du lieu : sa catégorie oriente l'affichage sur la
   *   carte et l'itinéraire ; `tripId` la rattache à un voyage, son absence la
   *   conserve dans le carnet personnel.
   * @returns L'adresse créée, munie de son identifiant.
   * @throws {Error} Si un champ obligatoire manque ou si le voyage visé est
   *   inaccessible.
   */
  createAddress: (address: {
    type: "hotel" | "restaurant" | "activity" | "transport" | "other";
    name: string;
    address: string;
    city: string;
    country: string;
    phone?: string;
    website?: string;
    notes?: string;
    rating?: number;
    tripId?: string;
  }) => request<any>("/addresses", "POST", address),

  /**
   * Met à jour une adresse existante.
   *
   * @param addressId Adresse à modifier.
   * @param updates Champs révisés uniquement ; l'envoi partiel évite d'écraser
   *   les modifications concurrentes d'un collaborateur sur les autres champs.
   * @returns L'adresse après mise à jour.
   * @throws {Error} Si le compte n'a pas le droit de modifier cette adresse.
   */
  updateAddress: (
    addressId: string,
    updates: {
      type?: "hotel" | "restaurant" | "activity" | "transport" | "other";
      name?: string;
      address?: string;
      city?: string;
      country?: string;
      phone?: string;
      website?: string;
      notes?: string;
      rating?: number;
    },
  ) => request<any>(`/addresses/${addressId}`, "PUT", updates),

  /**
   * Supprime une adresse.
   *
   * @param addressId Adresse à retirer du carnet et des voyages qui la citent.
   * @returns La confirmation de suppression.
   * @throws {Error} Si le compte n'est pas autorisé à la supprimer.
   */
  deleteAddress: (addressId: string) => request<any>(`/addresses/${addressId}`, "DELETE"),
};
