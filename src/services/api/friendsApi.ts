/**
 * Enveloppe du graphe social.
 *
 * Le lien d'amitié conditionne la visibilité des voyages en mode `friends` et
 * alimente les suggestions de collaborateurs ; il n'est donc jamais établi
 * unilatéralement, sauf réciprocité déjà exprimée par le destinataire.
 */
import { FriendRequest, Friend, FriendSuggestion } from "../../types";
import { request } from "./apiCore";

export const friendsApi = {
  /**
   * Adresse une demande de mise en relation.
   *
   * @param data Destinataire désigné par son identifiant si le profil est déjà
   *   connu, sinon par son courriel ou son téléphone, ce qui permet de solliciter
   *   un contact du carnet d'adresses sans connaître son compte.
   * @returns `autoAccepted` à vrai quand le destinataire avait lui-même une
   *   demande en attente : le lien est alors noué immédiatement et l'écran doit
   *   annoncer une amitié établie, non une demande envoyée.
   * @throws {Error} Si le lien existe déjà, si une demande est en attente, ou si
   *   l'un des deux comptes a bloqué l'autre.
   */
  sendFriendRequest: (data: {
    recipientEmail?: string;
    recipientPhone?: string;
    recipientId?: string;
  }) => request<{ autoAccepted?: boolean }>("/friends/request", "POST", data),

  /**
   * Liste les demandes de mise en relation concernant le compte courant.
   *
   * @returns Les demandes reçues et émises encore en attente de réponse.
   */
  getFriendRequests: () => request<FriendRequest[]>("/friends/requests"),

  /**
   * Statue sur une demande reçue.
   *
   * @param requestId Demande visée.
   * @param action Suite donnée : `accept` noue le lien, `decline` clôt la
   *   demande sans en informer l'émetteur autrement que par sa disparition.
   * @returns La confirmation de traitement.
   * @throws {Error} Si la demande a déjà été traitée ou annulée entre-temps.
   */
  respondToFriendRequest: (requestId: string, action: "accept" | "decline") =>
    request<{ success: boolean }>(`/friends/requests/${requestId}`, "PUT", { action }),

  /**
   * Retire une demande que l'on a soi-même émise.
   *
   * @param requestId Demande à annuler.
   * @returns La confirmation d'annulation.
   * @throws {Error} Si la demande n'existe plus ou a déjà reçu une réponse.
   */
  cancelFriendRequest: (requestId: string) =>
    request<{ success: boolean }>(`/friends/requests/${requestId}`, "DELETE"),

  /**
   * Liste les relations établies.
   *
   * @returns Les amis du compte courant, base des partages en mode `friends`.
   */
  getFriends: () => request<Friend[]>("/friends"),

  /**
   * Rompt une relation établie.
   *
   * @param friendId Compte dont on se sépare ; la rupture est réciproque et
   *   referme aussitôt l'accès mutuel aux voyages partagés entre amis.
   * @returns La confirmation de la rupture.
   */
  removeFriend: (friendId: string) =>
    request<{ success: boolean }>(`/friends/${friendId}`, "DELETE"),

  /**
   * Propose des mises en relation plausibles.
   *
   * @returns Les profils suggérés à partir des relations communes et des
   *   voyages partagés, à l'exclusion des comptes déjà liés ou bloqués.
   */
  getFriendSuggestions: () => request<FriendSuggestion[]>("/friends/suggestions"),

  /**
   * Consulte le profil d'une relation.
   *
   * @param friendId Compte à afficher.
   * @returns Le profil et ce que ses réglages de visibilité autorisent à voir.
   * @throws {Error} Si la relation n'existe pas ou si le profil est fermé.
   */
  getFriendProfile: (friendId: string) => request<any>(`/friends/${friendId}/profile`),

  /**
   * Émet un lien d'invitation personnel à partager hors de l'application.
   *
   * Permet de convier un proche par n'importe quel canal, sans connaître au
   * préalable son courriel ni son numéro.
   *
   * @returns Le jeton d'invitation et le lien partageable correspondant.
   */
  getFriendInviteLink: () =>
    request<{ token: string; link: string }>("/friends/invite-link", "POST"),

  /**
   * Identifie l'émetteur d'un lien d'invitation avant acceptation.
   *
   * @param token Jeton extrait du lien ouvert par le destinataire.
   * @returns Le profil réduit de l'émetteur, afin que le destinataire sache à
   *   qui il se lie avant de confirmer.
   * @throws {Error} Si le lien est inconnu, expiré ou déjà consommé.
   */
  getFriendInviteByToken: (token: string) =>
    request<{ userId: string; name: string; avatar: string | null }>(`/friends/invite-link/${token}`),

  /**
   * Noue la relation portée par un lien d'invitation.
   *
   * @param token Jeton extrait du lien.
   * @returns La confirmation ; le lien est établi sans étape de validation
   *   supplémentaire, l'émetteur ayant consenti en produisant le lien.
   * @throws {Error} Si le lien est expiré, déjà utilisé, ou si l'un des comptes
   *   a bloqué l'autre.
   */
  acceptFriendInviteLink: (token: string) =>
    request<{ success: boolean }>(`/friends/invite-link/${token}/accept`, "POST"),
};
