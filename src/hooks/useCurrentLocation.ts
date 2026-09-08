import { useEffect, useState } from "react";
import * as Location from "expo-location";

/** Position géographique exprimée dans la convention `lat`/`lng` des cartes. */
export interface Coords {
  lat: number;
  lng: number;
}

/**
 * Fournit la position courante de l'appareil pour centrer les cartes et
 * ordonner les adresses par proximité.
 *
 * @returns Les coordonnées de l'appareil, ou `null` tant qu'elles ne sont pas
 * connues. L'appelant traite ce `null` comme une absence définitive et se
 * replie sur un centrage par défaut.
 *
 * @remarks La permission est seulement lue, jamais demandée : la sollicitation
 * est faite au moment où l'utilisateur active explicitement la géolocalisation,
 * pour ne pas afficher une invite système au premier rendu d'un écran.
 */
export const useCurrentLocation = (): Coords | null => {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    })();
  }, []);

  return coords;
};
