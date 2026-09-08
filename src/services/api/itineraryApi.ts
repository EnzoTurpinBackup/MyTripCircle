/**
 * Enveloppe de la suggestion d'itinéraire.
 *
 * La génération est confiée au serveur : la clé du service tiers y reste
 * confinée, et la mutualisation du cache entre utilisateurs évite de refacturer
 * une même ville deux fois.
 */
import { request } from "./apiCore";

export const itineraryApi = {
  /**
   * Demande une proposition de programme pour une destination.
   *
   * @param data Ville visitée et nombre de jours à couvrir, qui déterminent le
   *   découpage du programme.
   * @returns Le programme suggéré, `cached` indiquant qu'il provient du cache
   *   serveur : l'écran peut alors afficher sans attente perceptible.
   * @throws {Error} Si le quota du compte est épuisé ou si le service de
   *   génération est indisponible.
   */
  generateItinerary: (data: { city: string; days: number }) =>
    request<{ cached: boolean; itinerary: any }>("/itinerary/generate", "POST", data),
};
