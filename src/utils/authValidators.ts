/**
 * Validateurs de formulaire : ils servent le retour immédiat à la saisie, pas la sécurité —
 * le serveur revalide tout. D'où leur permissivité assumée : refuser une saisie légitime
 * coûte un abandon d'inscription, en laisser passer une douteuse coûte un aller-retour.
 */

/** Longueurs bornées d'après la RFC 5321 : 64 caractères de partie locale, 253 de domaine. */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,}$/;
/** Quatre classes de caractères et huit caractères au minimum, alignés sur la règle serveur. */
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
/** Espaces, points, parenthèses et tirets tolérés : chacun saisit son numéro à la forme de
 * son pays, la normalisation revient au serveur. */
const PHONE_REGEX = /^[+]?[\d\s().-]{7,20}$/;

/**
 * Vérifie qu'une adresse e-mail a une forme plausible.
 *
 * @param email Adresse saisie, non normalisée : un espace de bordure fait échouer la
 * validation ici plutôt qu'à l'envoi du code de vérification, plus tard et sans explication.
 * @returns `false` sur une chaîne vide, une adresse sans arobase ou sans domaine de premier
 * niveau, ou dont la partie locale ou le domaine excède les longueurs admises.
 */
export const isEmailValid = (email: string): boolean => EMAIL_REGEX.test(email);

/**
 * Vérifie la simple présence d'un mot de passe, à la connexion.
 *
 * Exiger la robustesse ici interdirait de se connecter à un compte créé sous une règle
 * antérieure plus souple.
 *
 * @param password Mot de passe saisi ; les espaces sont significatifs et non retirés, une
 * saisie faite uniquement d'espaces compte donc comme présente.
 * @returns `true` si la chaîne n'est pas vide.
 */
export const isPasswordPresent = (password: string): boolean => password.length > 0;

/**
 * Vérifie la robustesse d'un mot de passe : minuscule, majuscule, chiffre, caractère non
 * alphanumérique, et huit caractères au moins.
 *
 * @param password Mot de passe saisi, jamais journalisé.
 * @returns `false` dès qu'une des cinq conditions manque, sans dire laquelle : c'est à
 * l'écran d'afficher la liste complète des exigences.
 */
export const isPasswordStrong = (password: string): boolean => STRONG_PASSWORD_REGEX.test(password);

/**
 * Vérifie qu'un nom d'affichage comporte au moins deux caractères significatifs.
 *
 * @param name Nom saisi.
 * @returns `false` sur une chaîne vide, un caractère unique, ou une saisie faite uniquement
 * d'espaces — retirés avant la mesure, sans quoi `"  "` passerait.
 */
export const isNameValid = (name: string): boolean => name.trim().length >= 2;

/**
 * Vérifie un numéro de téléphone, champ facultatif.
 *
 * @param phone Numéro saisi.
 * @returns `true` sur une chaîne vide ou faite d'espaces — le champ étant optionnel, ne pas
 * le remplir est valide et ne doit pas bloquer le formulaire. Un numéro réellement saisi doit
 * en revanche satisfaire le format.
 */
export const isPhoneValid = (phone: string): boolean => {
  const value = phone.trim();
  if (!value) return true; // phone is optional
  return PHONE_REGEX.test(value);
};

/**
 * Met en forme un numéro à la saisie, par groupes de deux chiffres.
 *
 * Appliquée à chaque frappe : elle repart des seuls chiffres au lieu d'insérer un espace au
 * bon endroit, ce qui la rend idempotente et absorbe le collage d'un numéro déjà ponctué. Le
 * format visé est français, à dix chiffres ; les chiffres au-delà sont écartés en silence,
 * ce qui interdit de fait la saisie d'un numéro international complet.
 *
 * @param text Contenu brut du champ, ponctuation et espaces compris.
 * @returns Les chiffres regroupés par deux ; la chaîne vide si l'entrée n'en contient aucun,
 * ce qui efface une saisie non numérique.
 *
 * @example
 * formatPhoneNumber("+33 (0)6.12.34.56.78"); // "33 06 12 34 56"
 * formatPhoneNumber("abc");                  // ""
 */
export const formatPhoneNumber = (text: string): string => {
  const cleaned = text.replaceAll(/\D/g, "");
  const trimmed = cleaned.slice(0, 10);
  return trimmed.replaceAll(/(\d{2})(?=\d)/g, "$1 ");
};
