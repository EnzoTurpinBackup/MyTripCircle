/**
 * Enveloppe du compte : profil, préférences et opérations relevant du RGPD.
 */
import { request } from "./apiCore";

/**
 * Consentements recueillis auprès de l'utilisateur.
 *
 * Le traitement des données du compte est typé `true` et non `boolean` : il
 * conditionne l'usage du service et ne peut donc pas être refusé, tandis que la
 * localisation et les notifications restent facultatives. Le type interdit
 * ainsi, dès la compilation, de transmettre un refus qui n'a pas de sens
 * fonctionnel.
 */
export interface ConsentPayload {
  data: true;
  location: boolean;
  notifications: boolean;
}

export const userApi = {
  /**
   * Enregistre les consentements exprimés par l'utilisateur.
   *
   * La version du texte et l'origine de la collecte accompagnent la réponse afin
   * de pouvoir démontrer, à posteriori, à quoi l'utilisateur a consenti et quand.
   *
   * @param consents Choix exprimés dans l'écran de confidentialité.
   * @returns La confirmation d'enregistrement.
   */
  updateConsent: (consents: ConsentPayload) =>
    request<{ success: boolean }>("/users/consent", "POST", {
      consents,
      version: "1.0",
      source: "mobile",
    }),

  /**
   * Met à jour l'identité affichée du compte.
   *
   * @param data Nom affiché et adresse de courriel.
   * @returns Le profil actualisé, que l'appelant substitue à sa copie en cache.
   * @throws {Error} Si l'adresse est déjà rattachée à un autre compte.
   */
  updateProfile: (data: { name: string; email: string }) =>
    request<{ success: boolean; user: any }>("/users/me", "PUT", data),

  /**
   * Met à jour les préférences de visibilité du compte.
   *
   * @param data `isPublicProfile` ouvre le profil aux personnes hors du cercle
   *   d'amis ; le fermer restreint également les suggestions dont le compte fait
   *   l'objet.
   * @returns Le profil actualisé.
   */
  updateSettings: (data: { isPublicProfile: boolean }) =>
    request<{ success: boolean; user: any }>("/users/settings", "PUT", data),

  /**
   * Remplace la photo de profil.
   *
   * @param avatar Image encodée, transmise dans le corps de la requête : la
   *   couche d'accès n'émet que du JSON, ce qui évite un chemin de transport
   *   distinct pour ce seul cas.
   * @returns Le profil actualisé.
   * @throws {Error} Si l'image dépasse la taille admise par le serveur.
   */
  uploadAvatar: (avatar: string) =>
    request<{ success: boolean; user: any }>("/users/avatar", "PUT", { avatar }),

  /**
   * Enregistre la langue retenue par l'utilisateur.
   *
   * Le choix est conservé côté serveur, et non seulement dans l'application, afin
   * que les courriels et notifications émis hors session soient rédigés dans la
   * bonne langue.
   *
   * @param language Langue retenue parmi celles prises en charge.
   * @returns La langue effectivement enregistrée.
   */
  updateLanguage: (language: "en" | "fr") =>
    request<{ success: boolean; language: string }>("/users/language", "PUT", { language }),

  /**
   * Change le mot de passe du compte.
   *
   * @param data Mot de passe actuel, exigé pour établir que la personne devant
   *   l'appareil est bien le titulaire, et mot de passe choisi.
   * @returns La confirmation du changement.
   * @throws {Error} Si le mot de passe actuel est erroné ou si le nouveau est
   *   refusé par la politique du serveur.
   */
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean }>("/users/change-password", "PUT", data),

  /**
   * Demande la suppression du compte et des données associées.
   *
   * @returns La confirmation de prise en compte ; l'appelant doit ensuite purger
   *   la session locale, les jetons devenant inopérants.
   * @throws {Error} Si le compte est propriétaire de voyages partagés dont la
   *   propriété doit d'abord être transférée.
   */
  deleteAccount: () => request<{ success: boolean }>("/users/me", "DELETE"),

  /**
   * Rattache un jeton de notification à l'appareil courant.
   *
   * @param token Jeton délivré par le service de notifications, renouvelable à
   *   tout moment par la plateforme : l'appel est donc rejoué à chaque démarrage
   *   plutôt qu'à la seule première autorisation.
   * @returns La confirmation d'enregistrement.
   */
  registerPushToken: (token: string) =>
    request<{ success: boolean }>("/users/push-token", "POST", { token, platform: "expo" }),
};
