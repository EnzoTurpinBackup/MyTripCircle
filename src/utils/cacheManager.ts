import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Cache persistant des données de lecture, avec durée de vie par entrée.
 *
 * Principe qui gouverne tout le fichier : le cache accélère l'affichage, il ne fait jamais
 * autorité. Toute opération échoue donc en silence et rend une valeur neutre — stockage
 * saturé, entrée corrompue, format changé entre deux versions de l'application ne doivent
 * jamais empêcher l'écran de se dessiner à partir du réseau.
 *
 * Le cache n'est pas cloisonné par utilisateur : ce sont les contextes qui l'invalident à la
 * déconnexion. Un changement de compte sans passer par cette invalidation exposerait les
 * données du compte précédent.
 */

/** Préfixe commun, seul moyen de retrouver et de purger les entrées de ce cache parmi les
 * autres clés stockées par l'application. */
const CACHE_PREFIX = "@mtc_cache/";

/** Enveloppe stockée : la durée de vie voyage avec la donnée, ce qui permet de la modifier
 * par domaine sans invalider les entrées déjà écrites sous l'ancienne valeur. */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Lit une entrée non périmée.
 *
 * @param key Clé du domaine, sans préfixe.
 * @returns La donnée, ou `null` si l'entrée est absente, périmée, illisible, ou si le
 * stockage lui-même échoue. Ces quatre cas sont indistinguables pour l'appelant, ce qui est
 * voulu : tous appellent la même réaction, aller chercher la donnée sur le réseau.
 */
async function get<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.timestamp + entry.ttl) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Lit une entrée en ignorant sa péremption.
 *
 * Support de la stratégie « périmé puis revalidé » des contextes : au démarrage, afficher
 * des voyages datés d'une heure vaut mieux qu'un écran vide, la réponse réseau les
 * remplaçant dans la foulée. La durée de vie n'est pas pour autant inutile — elle reste
 * lue par `get`, qui sert les cas où seule une donnée fraîche est acceptable.
 *
 * @param key Clé du domaine, sans préfixe.
 * @returns La donnée quel que soit son âge, ou `null` si l'entrée est absente ou illisible.
 */
// Returns cached data even if expired (stale-while-revalidate)
async function getStale<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Écrit une entrée, en horodatant l'instant de l'écriture.
 *
 * @param key Clé du domaine, sans préfixe.
 * @param data Donnée à conserver ; doit être sérialisable en JSON. Les `Date` en sortiront
 * sous forme de chaînes, à charge pour l'appelant de les ranimer à la relecture.
 * @param ttlMs Durée de validité en millisecondes, conservée dans l'entrée.
 * @returns Se résout toujours, y compris en cas d'échec d'écriture : le stockage saturé est
 * une situation courante sur mobile, et elle ne doit pas interrompre le flux applicatif.
 */
async function set<T>(key: string, data: T, ttlMs: number): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl: ttlMs };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Silently ignore write failures (storage full, etc.)
  }
}

/**
 * Supprime une entrée.
 *
 * @param key Clé du domaine, sans préfixe. Supprimer une entrée absente n'est pas une erreur.
 * @returns Se résout toujours. L'échec est silencieux, mais il n'est pas anodin ici : c'est
 * cette opération qui purge les données à la déconnexion.
 */
async function invalidate(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // Ignore
  }
}

/**
 * Supprime toutes les entrées de ce cache.
 *
 * Les clés sont énumérées puis filtrées sur le préfixe, jamais effacées en bloc : le même
 * stockage héberge la langue, le thème et le consentement aux notifications, qui ne doivent
 * pas disparaître avec les données mises en cache.
 *
 * @returns Se résout toujours ; une absence totale d'entrée n'est pas une erreur.
 */
async function clearAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
  } catch {
    // Ignore
  }
}

/** Regroupées derrière un objet unique pour que l'appel se lise `CacheManager.get` : sans ce
 * qualificatif, un `get` importé nu serait ambigu à la lecture des contextes. */
export const CacheManager = { get, getStale, set, invalidate, clearAll };

/** Domaines mis en cache. Les clés sont centralisées ici parce qu'elles sont écrites d'un
 * côté et invalidées de l'autre : une faute de frappe créerait une entrée jamais purgée. */
export const CACHE_KEYS = {
  TRIPS: "trips",
  BOOKINGS: "bookings",
  ADDRESSES: "addresses",
  FRIENDS: "friends",
  FRIEND_REQUESTS: "friend_requests",
  FRIEND_SUGGESTIONS: "friend_suggestions",
} as const;

/**
 * Durées de validité, graduées selon la vitesse à laquelle chaque domaine se démode et le
 * coût d'un affichage périmé : les demandes d'amitié tournent vite et gênent si elles
 * traînent, la liste d'amis bouge rarement. Ces durées ne concernent que `get` ; le
 * démarrage passe par `getStale` et les ignore délibérément.
 */
export const CACHE_TTL = {
  TRIPS: 15 * 60 * 1000,
  BOOKINGS: 10 * 60 * 1000,
  ADDRESSES: 15 * 60 * 1000,
  FRIENDS: 30 * 60 * 1000,
  FRIEND_REQUESTS: 5 * 60 * 1000,
  FRIEND_SUGGESTIONS: 30 * 60 * 1000,
} as const;
