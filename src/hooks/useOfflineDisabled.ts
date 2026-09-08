import { useNetwork } from "../contexts/NetworkContext";

/**
 * Opacité appliquée aux commandes neutralisées hors connexion. Constante
 * partagée pour que tous les écrans dégradent leur interface de la même
 * manière plutôt que de choisir chacun leur propre valeur.
 */
export const OFFLINE_OPACITY = 0.4;

/**
 * Neutralise les commandes qui exigent le réseau lorsque l'appareil est hors
 * ligne. L'application reste consultable sans connexion : plutôt que de masquer
 * les actions indisponibles, on les désactive en les grisant, ce qui évite de
 * réorganiser la mise en page selon l'état du réseau.
 *
 * @returns `disabled`, à passer à la propriété homonyme du composant tactile,
 * et `style`, à concaténer au style existant pour signaler visuellement
 * l'indisponibilité.
 */
export function useOfflineDisabled() {
  const { isConnected } = useNetwork();
  return {
    disabled: !isConnected,
    style: isConnected ? {} : { opacity: OFFLINE_OPACITY },
  };
}
