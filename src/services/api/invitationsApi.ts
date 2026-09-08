/**
 * Enveloppe des invitations à collaborer sur un voyage.
 *
 * À ne pas confondre avec les demandes d'amitié : une invitation porte des
 * droits sur un voyage précis et n'implique aucun lien social durable.
 */
import { request } from "./apiCore";

export const invitationsApi = {
  /**
   * Invite une personne à rejoindre un voyage.
   *
   * @param invitation Voyage concerné, coordonnées du destinataire (courriel ou
   *   téléphone), message d'accompagnement facultatif, et droits accordés. En
   *   l'absence de `permissions`, le serveur applique le rôle le plus restreint
   *   plutôt que d'accorder l'édition par défaut.
   * @returns L'invitation créée, avec son jeton d'acceptation.
   * @throws {Error} Si le compte n'a pas le droit d'inviter sur ce voyage, ou
   *   si le destinataire y est déjà convié.
   */
  createInvitation: (invitation: {
    tripId: string;
    inviteeEmail?: string;
    inviteePhone?: string;
    message?: string;
    permissions?: {
      role: "viewer" | "editor";
      canEdit: boolean;
      canInvite: boolean;
      canDelete: boolean;
    };
  }) => request<any>("/invitations", "POST", invitation),

  /**
   * Liste les invitations reçues à une adresse donnée.
   *
   * @param email Adresse destinataire des invitations.
   * @param status Filtre facultatif sur l'état, pour ne présenter par exemple
   *   que celles restant à traiter.
   * @returns Les invitations correspondantes.
   */
  getUserInvitations: (email: string, status?: string) => {
    const query = status ? `?status=${status}` : "";
    return request<any[]>(`/invitations/user/${email}${query}`);
  },

  /**
   * Liste les invitations émises par l'utilisateur connecté.
   *
   * @param _userId Conservé pour la compatibilité des appelants ; l'émetteur est
   *   désormais déduit du jeton d'authentification, afin qu'un client ne puisse
   *   pas consulter les invitations d'un tiers en changeant ce paramètre.
   * @param status Filtre facultatif sur l'état des invitations.
   * @returns Les invitations émises correspondantes.
   */
  getSentInvitations: (_userId: string, status?: string) => {
    const query = status ? `?status=${status}` : "";
    return request<any[]>(`/invitations/sent${query}`);
  },

  /**
   * Présente une invitation à partir du jeton contenu dans le lien reçu.
   *
   * @param token Jeton extrait du lien d'invitation.
   * @returns L'invitation et le voyage concerné, de quoi décider avant
   *   d'accepter.
   * @throws {Error} Si le jeton est inconnu, expiré ou déjà consommé.
   */
  getInvitationByToken: (token: string) =>
    request<any>(`/invitations/token/${token}`),

  /**
   * Statue sur une invitation reçue.
   *
   * @param token Jeton identifiant l'invitation.
   * @param action Suite donnée : `accept` inscrit le compte parmi les
   *   collaborateurs avec les droits prévus, `decline` clôt l'invitation.
   * @param userId Compte acceptant, à préciser lorsque l'invitation visait une
   *   adresse et non un compte déjà identifié.
   * @returns L'invitation dans son état final.
   * @throws {Error} Si l'invitation a expiré, a déjà reçu une réponse, ou si le
   *   voyage a été supprimé entre-temps.
   */
  respondToInvitation: (token: string, action: "accept" | "decline", userId?: string) =>
    request<any>(`/invitations/${token}`, "PUT", { action, userId }),

  /**
   * Obtient un lien d'invitation ouvert pour un voyage.
   *
   * @param tripId Voyage à partager.
   * @param force Émet un lien neuf et invalide le précédent ; réservé au cas où
   *   un lien a circulé plus loin que voulu, puisque les destinataires légitimes
   *   du premier lien perdent alors leur accès.
   * @returns Le jeton et le lien partageable.
   * @throws {Error} Si le compte n'a pas le droit d'inviter sur ce voyage.
   */
  getTripInvitationLink: (tripId: string, force = false) =>
    request<{ token: string; link: string }>(`/invitations/trip-link/${tripId}`, "POST", { force }),

  /**
   * Retire une invitation avant que le destinataire n'y réponde.
   *
   * @param invitationId Invitation à annuler.
   * @returns La confirmation d'annulation.
   * @throws {Error} Si l'invitation a déjà été acceptée ; il faut alors retirer
   *   le collaborateur du voyage.
   */
  cancelInvitation: (invitationId: string) =>
    request<{ success: boolean }>(`/invitations/${invitationId}`, "DELETE"),
};
