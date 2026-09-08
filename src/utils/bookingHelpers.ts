import { Booking } from "../types";

/**
 * Correspondances entre les types et statuts de réservation et leur habillage visuel.
 *
 * Deux conventions de repli coexistent volontairement dans ce fichier, et les confondre est
 * la principale source d'erreur à sa lecture :
 * - les fonctions de liste rendent `null` sur une valeur inconnue, ce qui laisse l'appelant
 *   afficher la ligne sans liseré ni pastille plutôt que d'inventer une couleur ;
 * - les fonctions de détail rendent toujours un couple neutre, l'écran de détail devant
 *   remplir une surface qui ne peut pas rester vide.
 *
 * Dans les deux cas, une valeur inconnue est un cas normal et non une anomalie : les types
 * de réservation évoluent, et une donnée créée par une version plus récente doit rester
 * affichable par une version plus ancienne.
 */

// ─── Couleurs non-thémifiables ─────────────────────────────────────────────────
const MOSS       = '#6B8C5A';
const MOSS_LIGHT = '#E2EDD9';
const SKY        = '#5A8FAA';
const SKY_LIGHT  = '#DCF0F5';

// ─── Icône par type de réservation ────────────────────────────────────────────
/**
 * Retourne le nom de l'icône illustrant un type de réservation.
 *
 * @param type Type de la réservation.
 * @returns Un nom d'icône du jeu embarqué. Un type inconnu rend `"receipt"`, générique mais
 * toujours pertinent : toute réservation est d'abord un justificatif.
 */
export const getBookingTypeIcon = (type: Booking["type"]): string => {
  switch (type) {
    case "flight":     return "airplane";
    case "train":      return "train";
    case "hotel":      return "bed";
    case "restaurant": return "restaurant";
    case "activity":   return "ticket";
    default:           return "receipt";
  }
};

// ─── Couleurs carte/liste (adaptées light/dark) ───────────────────────────────
/**
 * Retourne le liseré et le fond d'une carte de réservation dans une liste.
 *
 * Le thème sombre ne réutilise pas les fonds clairs mais des versions translucides de la
 * couleur d'accent : un aplat pastel sur fond sombre paraîtrait lumineux et attirerait
 * l'œil plus que le contenu de la carte.
 *
 * @param type Type de la réservation.
 * @param isDark Thème sombre actif. Par défaut `false` — un appelant qui oublie de le
 * transmettre obtient les couleurs claires, dégradation visible mais sans plantage.
 * @returns Le couple de couleurs, ou `null` pour un type inconnu, l'appelant devant alors
 * rendre la carte sans habillage de type.
 */
export const getBookingTypeColors = (
  type: Booking["type"],
  isDark = false,
): { stripe: string; bg: string } | null => {
  if (isDark) {
    switch (type) {
      case "flight":     return { stripe: SKY,       bg: 'rgba(90,143,170,0.22)' };
      case "hotel":      return { stripe: MOSS,      bg: 'rgba(107,140,90,0.22)' };
      case "train":      return { stripe: '#C4714A', bg: 'rgba(196,113,74,0.22)' };
      case "restaurant": return { stripe: '#C4714A', bg: 'rgba(196,113,74,0.22)' };
      case "activity":   return { stripe: '#8B70C0', bg: 'rgba(139,112,192,0.22)' };
      default:           return null;
    }
  }
  switch (type) {
    case "flight":     return { stripe: SKY,       bg: SKY_LIGHT };
    case "hotel":      return { stripe: MOSS,      bg: MOSS_LIGHT };
    case "train":      return { stripe: '#C4714A', bg: '#F5E5DC' };
    case "restaurant": return { stripe: '#C4714A', bg: '#F5E5DC' };
    case "activity":   return { stripe: '#8B70C0', bg: '#EDE8F5' };
    default:           return null;
  }
};

/**
 * Retourne les couleurs de la pastille de statut dans une liste.
 *
 * Les trois statuts sont distingués par le libellé autant que par la couleur : la teinte
 * seule ne porte jamais l'information, contrainte d'accessibilité pour les daltonismes.
 *
 * @param status Statut de la réservation.
 * @param isDark Thème sombre actif ; par défaut `false`.
 * @returns Le couple de couleurs, ou `null` pour un statut inconnu — la pastille est alors
 * omise plutôt que rendue dans une couleur arbitraire qui suggérerait un état faux.
 */
export const getBookingStatusColors = (
  status: Booking["status"],
  isDark = false,
): { color: string; bg: string } | null => {
  if (isDark) {
    switch (status) {
      case "confirmed": return { color: '#7BC88A', bg: 'rgba(107,200,138,0.22)' };
      case "pending":   return { color: '#E8B870', bg: 'rgba(232,184,112,0.22)' };
      case "cancelled": return { color: '#E08080', bg: 'rgba(224,128,128,0.22)' };
      default:          return null;
    }
  }
  switch (status) {
    case "confirmed": return { color: MOSS,      bg: MOSS_LIGHT };
    case "pending":   return { color: '#C4714A', bg: '#F5E5DC' };
    case "cancelled": return { color: '#C04040', bg: '#FDEAEA' };
    default:          return null;
  }
};

// ─── Couleurs détail (fond sombre / rgba) ─────────────────────────────────────
/**
 * Retourne le liseré et le fond du bloc de type sur l'écran de détail.
 *
 * L'écran de détail est toujours dessiné sur une bannière sombre, quel que soit le thème :
 * il n'y a donc pas de variante claire, et les teintes diffèrent de celles des listes pour
 * conserver leur contraste sur ce fond.
 *
 * @param type Type de la réservation.
 * @returns Toujours un couple de couleurs — un gris neutre pour un type inconnu, jamais
 * `null`, contrairement à la variante de liste.
 */
export const getBookingTypeColorsDetail = (
  type: Booking["type"]
): { stripe: string; bg: string } => {
  switch (type) {
    case "flight":     return { stripe: SKY,       bg: 'rgba(90,143,170,0.22)' };
    case "hotel":      return { stripe: MOSS,      bg: 'rgba(107,140,90,0.22)' };
    case "train":      return { stripe: '#C8A870', bg: 'rgba(200,168,112,0.22)' };
    case "restaurant": return { stripe: '#D08070', bg: 'rgba(208,128,112,0.22)' };
    case "activity":   return { stripe: '#A080D0', bg: 'rgba(160,128,208,0.22)' };
    default:           return { stripe: '#B0A090', bg: 'rgba(176,160,144,0.22)' };
  }
};

/**
 * Retourne les couleurs de la pastille de statut sur l'écran de détail.
 *
 * @param status Statut de la réservation.
 * @returns Toujours un couple de couleurs — un gris neutre pour un statut inconnu. La
 * pastille reste donc affichée avec le libellé brut du statut, ce qui vaut mieux, sur un
 * écran de détail, que de masquer une information que l'utilisateur y cherche.
 */
export const getBookingStatusColorsDetail = (
  status: Booking["status"]
): { color: string; bg: string } => {
  switch (status) {
    case "confirmed": return { color: '#7BC88A', bg: 'rgba(107,200,138,0.22)' };
    case "pending":   return { color: '#E8B870', bg: 'rgba(232,184,112,0.22)' };
    case "cancelled": return { color: '#E08080', bg: 'rgba(224,128,128,0.22)' };
    default:          return { color: '#B0A090', bg: 'rgba(176,160,144,0.22)' };
  }
};

/**
 * Retourne le dégradé de la bannière d'une réservation, en trois teintes.
 *
 * @param type Type de la réservation.
 * @returns Un triplet de couleurs hexadécimales, avec un dégradé neutre pour un type
 * inconnu. Jamais `null` : le composant de dégradé destinataire exige trois valeurs.
 */
export const getBookingHeroGradient = (
  type: Booking["type"]
): [string, string, string] => {
  switch (type) {
    case "flight":     return ['#1A3A5C', '#0D2540', '#1E4A70'];
    case "hotel":      return ['#1E3A2A', '#0D2418', '#2A4A35'];
    case "train":      return ['#3A2818', '#1E1408', '#4A3020'];
    case "restaurant": return ['#3A1A18', '#1E0E0C', '#4A2820'];
    case "activity":   return ['#2A1A3C', '#150E24', '#382A4E'];
    default:           return ['#2A2318', '#1A1610', '#3A3028'];
  }
};
