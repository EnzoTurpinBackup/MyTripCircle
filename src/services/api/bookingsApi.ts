/**
 * Enveloppe des réservations : transports, hébergements et activités déjà
 * retenus. Ce sont ces éléments, et non les adresses, qui alimentent la frise
 * chronologique du voyage et l'export calendrier.
 */
import { request } from "./apiCore";

export const bookingsApi = {
  /**
   * Liste toutes les réservations de l'utilisateur, tous voyages confondus.
   *
   * @returns Les réservations visibles par le compte courant.
   */
  getBookings: () => request<any[]>("/bookings"),

  /**
   * Récupère le détail d'une réservation.
   *
   * @param id Réservation à consulter.
   * @returns La réservation complète, pièces jointes comprises.
   * @throws {Error} Si la réservation est inconnue ou hors du périmètre du compte.
   */
  getBookingById: (id: string) => request<any>(`/bookings/${id}`),

  /**
   * Liste les réservations d'un voyage.
   *
   * @param tripId Voyage dont on veut le programme réservé.
   * @returns Les réservations rattachées à ce voyage.
   * @throws {Error} Si le compte n'a pas accès au voyage.
   */
  getBookingsByTripId: (tripId: string) => request<any[]>(`/bookings/trip/${tripId}`),

  /**
   * Enregistre une réservation sur un voyage.
   *
   * @param booking Détail de la réservation : la catégorie détermine son
   *   traitement dans la frise, `date` et `endDate` cadrent les séjours
   *   s'étalant sur plusieurs jours, et `status` distingue une option d'une
   *   réservation ferme.
   * @returns La réservation créée, munie de son identifiant.
   * @throws {Error} Si le voyage visé est inaccessible ou si un champ requis
   *   manque.
   */
  createBooking: (booking: {
    tripId: string;
    type: "flight" | "train" | "hotel" | "restaurant" | "activity";
    title: string;
    description?: string;
    date: Date;
    endDate?: Date;
    time?: string;
    address?: string;
    confirmationNumber?: string;
    price?: number;
    currency?: string;
    status?: "confirmed" | "pending" | "cancelled";
    attachments?: string[];
  }) => request<any>("/bookings", "POST", booking),

  /**
   * Met à jour une réservation existante.
   *
   * @param bookingId Réservation à modifier.
   * @param updates Champs révisés uniquement, ce qui couvre le cas courant du
   *   simple passage de `pending` à `confirmed` sans renvoyer la fiche entière.
   * @returns La réservation après mise à jour.
   * @throws {Error} Si le compte n'a pas le droit de modifier cette réservation.
   */
  updateBooking: (
    bookingId: string,
    updates: {
      tripId?: string;
      type?: "flight" | "train" | "hotel" | "restaurant" | "activity";
      title?: string;
      description?: string;
      date?: Date;
      endDate?: Date;
      time?: string;
      address?: string;
      confirmationNumber?: string;
      price?: number;
      currency?: string;
      status?: "confirmed" | "pending" | "cancelled";
      attachments?: string[];
    },
  ) => request<any>(`/bookings/${bookingId}`, "PUT", updates),

  /**
   * Supprime une réservation.
   *
   * @param bookingId Réservation à retirer du programme du voyage.
   * @returns La confirmation de suppression.
   * @throws {Error} Si le compte n'est pas autorisé à la supprimer.
   */
  deleteBooking: (bookingId: string) => request<any>(`/bookings/${bookingId}`, "DELETE"),
};
