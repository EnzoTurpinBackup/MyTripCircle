import AsyncStorage from "@react-native-async-storage/async-storage";
import { request } from "../services/api/apiCore";
import { API_BASE_URL } from "../config/api";

const STORAGE_PREFIX = "destination_photo::";

// Cache en mémoire pour éviter les lectures AsyncStorage répétées dans la session
const memCache = new Map<string, string>();

/**
 * Retourne la photo en cache mémoire de façon synchrone, ou null si absente.
 * Permet d'initialiser l'état d'un composant sans flash lors d'un re-mount.
 *
 * @param destination Nom de la destination ; la casse et les espaces de bordure sont
 * normalisés, `"Lisbonne"` et `" lisbonne "` désignent la même entrée.
 * @returns L'URL, ou `null` si le cache mémoire ne la contient pas. Ce `null` ne signifie
 * pas qu'il n'existe pas de photo : l'entrée peut se trouver dans le stockage persistant,
 * que seule la variante asynchrone consulte. L'appelant doit donc l'enchaîner, non conclure.
 */
export function getSyncCachedPhoto(destination: string): string | null {
  const key = destination.trim().toLowerCase();
  return memCache.get(key) ?? null;
}

/**
 * Retourne la photo d'une destination en cherchant dans cet ordre :
 * 1. Cache mémoire (session)
 * 2. AsyncStorage (persistant entre sessions)
 * 3. Fetch via le proxy backend Google Places
 *
 * Une fois fetchée, l'URL est sauvegardée en mémoire et dans AsyncStorage
 * pour garantir que la même photo s'affiche toujours pour une destination donnée.
 *
 * Cette stabilité est le vrai motif du cache, avant la performance : la recherche de lieux
 * ne garantit pas de renvoyer la même photo d'un appel à l'autre, et la couverture d'un
 * voyage changerait d'elle-même à chaque rafraîchissement.
 *
 * @param destination Nom de la destination, normalisé comme ci-dessus.
 * @returns L'URL, ou `null` si la destination est vide ou qu'aucune photo n'a été trouvée.
 * Un échec de lecture ou d'écriture du cache persistant n'interrompt pas la résolution : il
 * est journalisé en développement et la recherche se poursuit, au prix d'un cache inopérant.
 * Une absence de photo n'est pas mémorisée — chaque appel relancera la recherche.
 */
export async function getCachedDestinationPhoto(destination: string): Promise<string | null> {
  const key = destination.trim().toLowerCase();
  if (!key) return null;

  // 1. Cache mémoire
  if (memCache.has(key)) return memCache.get(key)!;

  // 2. AsyncStorage
  try {
    const stored = await AsyncStorage.getItem(STORAGE_PREFIX + key);
    if (stored) {
      memCache.set(key, stored);
      return stored;
    }
  } catch (e) {
    if (__DEV__) console.warn("[destinationPhoto] Erreur lecture cache:", e);
  }

  // 3. Fetch
  const url = await fetchDestinationPhotoUrl(destination);
  if (url) {
    memCache.set(key, url);
    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + key, url);
    } catch (e) {
      if (__DEV__) console.warn("[destinationPhoto] Erreur écriture cache:", e);
    }
  }
  return url;
}

/**
 * Retourne l'URL d'une photo via le proxy backend pour la destination donnée,
 * ou null si aucune photo n'est disponible / en cas d'erreur.
 * La clé Google Places n'est jamais exposée côté client.
 *
 * @param destination Nom de la destination ; une chaîne vide ou faite d'espaces court-circuite
 * l'appel réseau, une recherche sans terme ne pouvant rien donner d'utile.
 * @returns L'URL absolue de la photo, ou `null`. Trois issues mènent à `null` sans être
 * distinguées : aucun résultat, un premier résultat sans photo, ou une erreur réseau. Toutes
 * appellent la même réaction chez l'appelant — retomber sur une illustration par défaut.
 */
export async function fetchDestinationPhotoUrl(destination: string): Promise<string | null> {
  if (!destination.trim()) return null;

  try {
    const data = await request<{ results: any[] }>(
      `/places/textsearch?query=${encodeURIComponent(destination.trim())}&language=fr`
    );
    if (!data.results?.length) return null;

    const photoUrl: string | undefined = data.results[0]?.photoUrl;
    if (!photoUrl) return null;

    // photoUrl est déjà une URL proxifiée (/places/photo?ref=...) retournée par le backend
    return `${API_BASE_URL}${photoUrl}`;
  } catch (e) {
    if (__DEV__) console.warn("[destinationPhoto] Erreur fetchDestinationPhotoUrl:", e);
    return null;
  }
}
