/**
 * Enveloppe des recours de modération.
 *
 * Deux registres distincts y cohabitent : le signalement, qui alerte l'équipe
 * de modération sans effet immédiat, et le blocage, qui produit un effet
 * instantané pour le seul utilisateur qui le déclenche. Les présenter ensemble
 * garde ce contraste explicite pour les écrans de sécurité.
 */
import { request } from "./apiCore";

/** Motifs de signalement recevables, alignés sur les catégories de traitement. */
export type ReportReason = "inappropriate" | "spam" | "harassment" | "fake" | "other";

export const moderationApi = {
  /**
   * Signale un compte à la modération.
   *
   * @param userId Compte visé par le signalement.
   * @param reason Motif invoqué, qui oriente la priorité de traitement.
   * @returns La confirmation d'enregistrement ; le signalement n'a aucun effet
   *   visible immédiat, l'appelant doit donc l'annoncer comme une alerte
   *   transmise et non comme une sanction.
   * @throws {Error} Si un signalement du même compte est déjà en cours d'examen.
   */
  reportUser: (userId: string, reason: ReportReason) =>
    request<{ success: boolean }>("/moderation/report", "POST", {
      targetType: "user",
      targetId: userId,
      reason,
    }),

  /**
   * Signale un voyage publié à la modération.
   *
   * @param tripId Voyage visé par le signalement.
   * @param reason Motif invoqué.
   * @returns La confirmation d'enregistrement.
   * @throws {Error} Si un signalement du même voyage est déjà en cours d'examen.
   */
  reportTrip: (tripId: string, reason: ReportReason) =>
    request<{ success: boolean }>("/moderation/report", "POST", {
      targetType: "trip",
      targetId: tripId,
      reason,
    }),

  /**
   * Bloque un compte.
   *
   * @param userId Compte à bloquer ; le blocage coupe la relation dans les deux
   *   sens et retire les contenus concernés des listes et suggestions, sans
   *   attendre l'examen d'un signalement.
   * @returns La confirmation du blocage.
   */
  blockUser: (userId: string) =>
    request<{ success: boolean }>(`/moderation/block/${userId}`, "POST"),

  /**
   * Lève un blocage.
   *
   * @param userId Compte à débloquer ; la relation d'amitié éventuellement
   *   rompue au moment du blocage n'est pas rétablie pour autant.
   * @returns La confirmation de la levée.
   */
  unblockUser: (userId: string) =>
    request<{ success: boolean }>(`/moderation/block/${userId}`, "DELETE"),
};
