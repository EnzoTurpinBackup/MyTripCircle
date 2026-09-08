/**
 * Enveloppe de l'abonnement calendrier.
 *
 * Un agenda tiers ne peut pas présenter le jeton de session de l'application :
 * l'accès au flux repose donc sur un jeton dédié, révocable indépendamment,
 * dont la compromission n'expose que la lecture du planning.
 */
import { request } from "./apiCore";

export const calendarApi = {
  /**
   * Lit le jeton d'abonnement en vigueur.
   *
   * @returns Le jeton, ou `null` si aucun abonnement n'a encore été ouvert :
   *   l'écran peut ainsi proposer la création plutôt qu'un lien de partage.
   */
  getToken: () =>
    request<{ success: boolean; token: string | null }>("/users/calendar/token", "GET"),

  /**
   * Émet un jeton d'abonnement, en remplacement de tout jeton précédent.
   *
   * @returns Le nouveau jeton ; les agendas abonnés avec l'ancien cessent d'être
   *   servis, ce qui en fait le geste de reprise en main après un partage
   *   involontaire.
   */
  generateToken: () =>
    request<{ success: boolean; token: string }>("/users/calendar/token", "POST"),

  /**
   * Ferme l'abonnement calendrier sans en rouvrir un autre.
   *
   * @returns La confirmation de révocation.
   */
  revokeToken: () =>
    request<{ success: boolean }>("/users/calendar/token", "DELETE"),
};
