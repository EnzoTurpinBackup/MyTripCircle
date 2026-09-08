import { useState, useEffect, useRef } from "react";
import { Address } from "../types";
import { geocodeAddress, getCached, GeoCoords } from "../utils/geocoding";

/**
 * Convertit en coordonnées les adresses enregistrées sous forme textuelle, afin
 * de pouvoir les placer sur la carte du voyage.
 *
 * @param addresses Adresses à positionner ; seules celles encore inconnues
 * déclenchent un traitement.
 * @returns `mapCoords`, table des coordonnées indexée par identifiant
 * d'adresse, que l'appelant parcourt pour poser ses marqueurs, et
 * `isGeocoding`, vrai tant que la file n'est pas épuisée.
 *
 * @remarks Les adresses sont traitées en série et espacées d'un peu plus d'une
 * seconde, la politique d'usage de Nominatim limitant l'appelant à une requête
 * par seconde ; les résultats déjà en cache court-circuitent cette attente. Une
 * adresse déjà soumise n'est jamais resoumise, y compris après un rendu, ce qui
 * évite de reconstituer la file à chaque changement de la liste. Les
 * coordonnées arrivent progressivement : la carte se remplit au fil de l'eau
 * plutôt qu'en une fois.
 */
export function useAddressGeocoding(addresses: Address[]) {
  const [mapCoords, setMapCoords]     = useState<Record<string, GeoCoords>>({});
  const [isGeocoding, setIsGeocoding] = useState(false);
  const geocodedQueueRef              = useRef(new Set<string>());

  const addressIdsKey = addresses.map((a) => a.id).join(",");

  useEffect(() => {
    const toGeocode = addresses.filter((a) => !geocodedQueueRef.current.has(a.id));
    if (toGeocode.length === 0) return;
    toGeocode.forEach((a) => geocodedQueueRef.current.add(a.id));

    let cancelled = false;
    setIsGeocoding(true);

    const geocodeViaNetwork = async (address: Address, lastMs: number): Promise<number> => {
      const delay = Math.max(0, 1100 - (Date.now() - lastMs));
      if (lastMs > 0 && delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
      if (cancelled) return lastMs;
      const coords = await geocodeAddress(address.address, address.city, address.country);
      const now = Date.now();
      if (coords && !cancelled) setMapCoords((prev) => ({ ...prev, [address.id]: coords }));
      return now;
    };

    const run = async () => {
      let lastNetworkRequest = 0;
      for (const address of toGeocode) {
        if (cancelled) break;
        const cached = getCached(address.address, address.city, address.country);
        if (cached !== undefined) {
          if (cached) setMapCoords((prev) => ({ ...prev, [address.id]: cached }));
          continue;
        }
        lastNetworkRequest = await geocodeViaNetwork(address, lastNetworkRequest);
      }
      if (!cancelled) setIsGeocoding(false);
    };

    run().catch(() => { if (!cancelled) setIsGeocoding(false); });
    return () => { cancelled = true; };
  }, [addressIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { mapCoords, isGeocoding };
}
