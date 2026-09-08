import { Address } from "../types";

/**
 * Retourne le dégradé de la bannière d'une adresse, en trois teintes, choisi selon le type
 * de lieu.
 *
 * Les teintes restent sombres dans les deux thèmes : le titre de l'adresse est écrit en
 * blanc par-dessus la photo, et une variante claire ruinerait le contraste du texte.
 *
 * @param type Type de l'adresse.
 * @returns Un triplet de couleurs hexadécimales. Un type inconnu — champ absent ou valeur
 * héritée d'une version antérieure — rend le dégradé neutre de `other`, jamais `undefined` :
 * l'appelant transmet ce triplet à un composant de dégradé qui n'accepte pas de trou.
 */
export const getAddressHeroGradient = (type: Address["type"]): [string, string, string] => {
  switch (type) {
    case "restaurant": return ["#3A1E14", "#1E0E08", "#4A2E1A"];
    case "hotel":      return ["#1A2C3A", "#0E1C28", "#2A3C4A"];
    case "activity":   return ["#1A3020", "#0E1E14", "#2A4030"];
    case "transport":  return ["#2A2A3A", "#14141E", "#3A3A4E"];
    case "other":      return ["#2A2010", "#14100A", "#3A2E18"];
    default:           return ["#2A2010", "#14100A", "#3A2E18"];
  }
};

/**
 * Retourne l'emoji et le libellé traduit du badge de type d'une adresse.
 *
 * La fonction de traduction est injectée plutôt qu'importée : les composants appelants
 * disposent déjà de celle liée au rendu, seule à provoquer un nouveau rendu au changement de
 * langue. Une instance importée ici rendrait les badges sourds à ce changement.
 *
 * @param type Type de l'adresse.
 * @param t Fonction de traduction, appelée avec une clé de filtre d'adresses.
 * @returns Le couple emoji / libellé. Un type inconnu retombe sur le badge générique de
 * `other` : un badge imprécis reste plus lisible qu'un badge vide.
 */
export const getAddressTypeBadge = (
  type: Address["type"],
  t: (k: string) => string,
): { label: string; emoji: string } => {
  switch (type) {
    case "restaurant": return { emoji: "🍽", label: t("addresses.filters.restaurant") };
    case "hotel":      return { emoji: "🏨", label: t("addresses.filters.hotel") };
    case "activity":   return { emoji: "🏄", label: t("addresses.filters.activity") };
    case "transport":  return { emoji: "🚗", label: t("addresses.filters.transport") };
    case "other":      return { emoji: "📍", label: t("addresses.filters.other") };
    default:           return { emoji: "📍", label: t("addresses.filters.other") };
  }
};
