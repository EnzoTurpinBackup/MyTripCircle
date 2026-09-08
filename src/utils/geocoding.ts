export interface GeoCoords {
  latitude: number;
  longitude: number;
}

// Cache mémoire — persiste pendant la session de l'app
const _cache = new Map<string, GeoCoords | null>();

const cacheKey = (address: string, city: string, country: string): string =>
  `${address}||${city}||${country}`.toLowerCase().trim();

/**
 * Vérifie le cache synchroniquement.
 * - undefined → non encore géocodé (requête réseau nécessaire)
 * - null → géocodage tenté mais sans résultat
 * - GeoCoords → coordonnées disponibles
 *
 * Cette distinction à trois états est le point sensible de la fonction : `null` et
 * `undefined` ont ici des sens opposés. Confondre les deux ferait relancer indéfiniment le
 * géocodage d'adresses dont on sait déjà qu'elles n'aboutissent pas — précisément les plus
 * coûteuses, puisqu'elles émettent deux requêtes.
 *
 * @param address Ligne d'adresse.
 * @param city Ville.
 * @param country Pays.
 * @returns Les coordonnées, `null` si le géocodage a déjà échoué, `undefined` s'il n'a pas
 * encore été tenté.
 */
export const getCached = (
  address: string,
  city: string,
  country: string
): GeoCoords | null | undefined => {
  const key = cacheKey(address, city, country);
  return _cache.has(key) ? (_cache.get(key) ?? null) : undefined;
};

// Requête brute vers Nominatim (sans cache)
const _fetchNominatim = async (query: string): Promise<GeoCoords | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "MyTripCircle/1.0",
          "Accept-Language": "fr,en",
        },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return {
      latitude: Number.parseFloat(data[0].lat),
      longitude: Number.parseFloat(data[0].lon),
    };
  } catch (e) {
    if (__DEV__) console.warn("[geocoding] Erreur géocodage:", e);
    return null;
  }
};

/**
 * Géocode une adresse via Nominatim (OpenStreetMap).
 * Essaie d'abord l'adresse complète, puis se replie sur ville+pays.
 * Résultats mis en cache pour la session.
 * NOTE : Respecter la limite Nominatim côté appelant (max 1 req/s).
 * Cette fonction peut émettre 2 requêtes si la première échoue.
 *
 * Le repli sur ville et pays existe parce que Nominatim est strict sur les numéros et les
 * types de voie : une adresse exacte mais mal orthographiée ne rend rien, alors que la ville
 * seule suffit à centrer la carte, ce qui est le besoin réel. La temporisation d'une seconde
 * entre les deux essais respecte la limite d'usage du service public.
 *
 * L'échec est mémorisé au même titre que le succès : sans cela, une adresse qui n'aboutit
 * pas relancerait deux requêtes à chaque affichage de la carte.
 *
 * @param address Ligne d'adresse ; peut être vide, le repli prend alors le relais.
 * @param city Ville — le second essai n'a lieu que si ville et pays sont tous deux fournis.
 * @param country Pays.
 * @returns Les coordonnées, ou `null` si aucun des deux essais n'aboutit. Une erreur réseau
 * est traitée comme une absence de résultat et mémorisée comme telle : une adresse géocodée
 * pendant une coupure restera sans coordonnées jusqu'au redémarrage de l'application, le
 * cache ne vivant que le temps de la session.
 */
export const geocodeAddress = async (
  address: string,
  city: string,
  country: string
): Promise<GeoCoords | null> => {
  const key = cacheKey(address, city, country);
  if (_cache.has(key)) return _cache.get(key) ?? null;

  // Essai 1 : adresse complète
  let coords = await _fetchNominatim(`${address}, ${city}, ${country}`);

  // Essai 2 : ville + pays seulement (plus tolérant avec Nominatim)
  if (!coords && city && country) {
    await new Promise<void>((r) => setTimeout(r, 1100));
    coords = await _fetchNominatim(`${city}, ${country}`);
  }

  _cache.set(key, coords);
  return coords;
};
