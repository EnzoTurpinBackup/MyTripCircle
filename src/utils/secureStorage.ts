import * as SecureStore from "expo-secure-store";

/**
 * Accès au stockage chiffré du système, réservé aux secrets de session.
 *
 * Enveloppe volontairement étroite : seules trois clés sont admises, et cette liste blanche
 * est une décision de conception. Le magasin sécurisé est lent et de capacité réduite ; y
 * ranger des données ordinaires le transformerait en stockage général et diluerait la
 * garantie qu'il porte.
 *
 * Les modes d'échec sont asymétriques, et c'est l'essentiel à savoir avant d'appeler ces
 * fonctions : écrire une clé non autorisée lève, la lire ou la supprimer est un no-op
 * silencieux. Une écriture hors liste est une erreur de programmation qu'il faut voir tout
 * de suite ; une lecture, elle, doit pouvoir se solder par « rien », résultat légitime.
 */

// Clés stockées de façon sécurisée (Keychain iOS / Keystore Android)
const SECURE_KEYS = ["token", "refreshToken", "user"] as const;
type SecureKey = (typeof SECURE_KEYS)[number];

function isSecureKey(key: string): key is SecureKey {
  return (SECURE_KEYS as readonly string[]).includes(key);
}

/**
 * Écrit une valeur dans le stockage chiffré.
 *
 * @param key Clé à écrire ; doit appartenir à la liste autorisée.
 * @param value Valeur, déjà sérialisée par l'appelant.
 * @throws Error si la clé n'est pas autorisée. L'échec est bruyant à dessein : écrire
 * ailleurs qu'ici passerait inaperçu et laisserait un secret dans un stockage en clair.
 */
export async function setItem(key: string, value: string): Promise<void> {
  if (isSecureKey(key)) {
    await SecureStore.setItemAsync(key, value);
  } else {
    throw new Error(`secureStorage: clé non autorisée "${key}"`);
  }
}

/**
 * Lit une valeur du stockage chiffré.
 *
 * @param key Clé à lire.
 * @returns La valeur, ou `null` si la clé est absente du magasin — ou hors liste, cas
 * indiscernable du précédent. Les appelants traitent déjà `null` comme « pas de session » ;
 * lever les obligerait à distinguer deux situations qui appellent la même réaction.
 */
export async function getItem(key: string): Promise<string | null> {
  if (isSecureKey(key)) {
    return SecureStore.getItemAsync(key);
  }
  return null;
}

/**
 * Supprime une valeur du stockage chiffré.
 *
 * @param key Clé à supprimer. Une clé hors liste, comme une clé déjà absente, est ignorée
 * sans erreur : la suppression est idempotente, et la déconnexion doit aboutir quel que soit
 * l'état du magasin.
 */
export async function removeItem(key: string): Promise<void> {
  if (isSecureKey(key)) {
    await SecureStore.deleteItemAsync(key);
  }
}

/**
 * Supprime plusieurs valeurs, en parallèle.
 *
 * Utilisé à la déconnexion, où les trois secrets doivent partir ensemble. L'ordre est sans
 * importance, aucune clé ne dépendant des autres.
 *
 * @param keys Clés à supprimer ; celles hors liste sont ignorées.
 * @returns Se résout quand toutes les suppressions ont abouti. Un rejet du magasin est
 * propagé : c'est le seul moyen pour l'appelant de savoir qu'un secret a survécu.
 */
export async function multiRemove(keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => removeItem(k)));
}
