/**
 * Enveloppe des voyages, entité pivot de l'application : réservations, adresses
 * et invitations s'y rattachent, et les droits accordés sur un voyage
 * gouvernent l'accès à tout ce qu'il contient.
 */
import { request } from "./apiCore";

export const tripsApi = {
  /**
   * Liste les voyages accessibles à l'utilisateur connecté.
   *
   * @returns Les voyages dont il est propriétaire ou collaborateur.
   */
  getTrips: () => request<any[]>("/trips"),

  /**
   * Récupère le détail d'un voyage.
   *
   * @param id Voyage à consulter.
   * @returns Le voyage complet, participants et statistiques compris.
   * @throws {Error} Si le voyage est introuvable ou si sa visibilité en interdit
   *   l'accès au compte courant.
   */
  getTripById: (id: string) => request<any>(`/trips/${id}`),

  /**
   * Crée un voyage.
   *
   * @param trip Description du séjour. `visibility` arbitre l'exposition du
   *   voyage, `isPublic` étant conservé pour les clients antérieurs à ce
   *   réglage ; `location` porte les coordonnées permettant les recherches de
   *   proximité, et `stats` les compteurs d'affichage.
   * @returns Le voyage créé, muni de son identifiant.
   * @throws {Error} Si les dates sont incohérentes ou si le quota de voyages du
   *   compte est atteint.
   */
  createTrip: (trip: {
    title: string;
    description?: string;
    destination: string;
    startDate: Date;
    endDate: Date;
    collaborators?: any[];
    isPublic?: boolean;
    visibility?: "private" | "friends" | "public";
    coverImage?: string;
    tags?: string[];
    stats?: { totalBookings: number; totalAddresses: number; totalCollaborators: number };
    location?: { type: "Point"; coordinates: [number, number] };
  }) => request<any>("/trips", "POST", trip),

  /**
   * Met à jour un voyage.
   *
   * @param tripId Voyage à modifier.
   * @param updates Champs révisés uniquement ; le passage de `status` de
   *   `draft` à `validated` fige le programme et le rend visible aux
   *   participants selon la visibilité retenue.
   * @returns Le voyage après mise à jour.
   * @throws {Error} Si le compte est simple lecteur sur ce voyage.
   */
  updateTrip: (
    tripId: string,
    updates: {
      title?: string;
      description?: string;
      destination?: string;
      startDate?: Date;
      endDate?: Date;
      isPublic?: boolean;
      visibility?: "private" | "friends" | "public";
      status?: "draft" | "validated";
      coverImage?: string;
      tags?: string[];
    },
  ) => request<any>(`/trips/${tripId}`, "PUT", updates),

  /**
   * Supprime un voyage.
   *
   * @param tripId Voyage à supprimer, avec les réservations, adresses et
   *   invitations qui en dépendent ; l'opération concerne aussi les
   *   contributions des collaborateurs, ce que l'écran doit signaler avant
   *   confirmation.
   * @returns La confirmation de suppression.
   * @throws {Error} Si le compte n'est pas propriétaire du voyage.
   */
  deleteTrip: (tripId: string) => request<any>(`/trips/${tripId}`, "DELETE"),

  /**
   * Retire un participant d'un voyage.
   *
   * @param tripId Voyage concerné.
   * @param userId Participant à écarter ; il perd immédiatement l'accès, tandis
   *   que ses contributions restent attachées au voyage.
   * @returns La confirmation du retrait.
   * @throws {Error} Si le compte n'a pas autorité sur les participants, ou si la
   *   cible est le propriétaire.
   */
  removeTripCollaborator: (tripId: string, userId: string) =>
    request<{ success: boolean }>(`/trips/${tripId}/collaborators/${userId}`, "DELETE"),

  /**
   * Confie la propriété d'un voyage à un autre participant.
   *
   * Évite qu'un voyage devienne ingérable lorsque son créateur quitte le
   * groupe : la suppression et la gestion des participants restent réservées au
   * propriétaire.
   *
   * @param tripId Voyage concerné.
   * @param newOwnerId Participant qui reprend la propriété ; l'ancien
   *   propriétaire redevient collaborateur.
   * @returns La confirmation du transfert.
   * @throws {Error} Si le compte n'est pas propriétaire, ou si la cible ne
   *   participe pas au voyage.
   */
  transferTripOwnership: (tripId: string, newOwnerId: string) =>
    request<{ success: boolean }>(`/trips/${tripId}/transfer-ownership`, "PUT", { newOwnerId }),
};
