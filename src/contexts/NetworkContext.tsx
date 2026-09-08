/**
 * Contexte de réseau — disponibilité de l'API telle que l'application la constate.
 *
 * Global parce qu'une coupure concerne toute l'application : le bandeau hors ligne est rendu
 * au niveau de la navigation, et plusieurs écrans y conditionnent leurs actions d'écriture.
 * Sonder par écran multiplierait les requêtes de contrôle pour des verdicts divergents.
 *
 * Ne dépend pas de la session, donc ne se réinitialise jamais ; la scrutation est en revanche
 * suspendue en arrière-plan et reprise par un sondage immédiat au retour.
 *
 * Ce que cet état garantit, et ce qu'il ne garantit pas : il mesure l'accessibilité du point
 * de contrôle de l'API, non la présence d'une interface réseau — un portail captif ou un
 * backend en panne est déclaré hors ligne, ce qui est le verdict utile ici. Mais la détection
 * n'est pas instantanée : entre deux sondages une coupure reste invisible, et une requête peut
 * échouer alors que `isConnected` vaut encore `true`. Ce contexte informe l'utilisateur, il ne
 * dispense pas les appels de leur propre gestion d'erreur.
 */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { API_BASE_URL } from "../config/api";

interface NetworkContextValue {
  isConnected: boolean;
}

// Le défaut est « connecté » : hors provider, ou avant le premier sondage, mieux vaut
// laisser l'utilisateur tenter son action et traiter l'échec réel que de le bloquer sur la
// foi d'une mesure qui n'a pas encore eu lieu.
const NetworkContext = createContext<NetworkContextValue>({ isConnected: true });

/** Période de scrutation : assez courte pour que le bandeau suive, assez longue pour ne pas
 * réveiller la radio en continu et peser sur la batterie. */
const CHECK_INTERVAL_MS = 8000;
/** Délai au-delà duquel le sondage est abandonné — inférieur à la période, pour qu'un
 * sondage lent ne chevauche jamais le suivant. */
const TIMEOUT_MS = 5000;

/**
 * Interroge le point de contrôle de santé de l'API.
 *
 * L'abandon explicite après délai est indispensable : sur un réseau qui accepte la connexion
 * sans jamais répondre — portail captif, serveur saturé — la requête resterait pendante et
 * la scrutation se figerait sur son dernier verdict.
 *
 * @returns `true` uniquement sur une réponse de statut favorable. Toute autre issue — statut
 * d'erreur, délai dépassé, exception réseau — est rendue comme hors ligne, sans distinction :
 * du point de vue de l'interface, un serveur qui répond mal et un serveur injoignable
 * autorisent les mêmes actions.
 */
async function probeApi(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(`${API_BASE_URL}/health`, { method: "GET", signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fournit l'état de connectivité et pilote la scrutation.
 *
 * Le minuteur est tenu dans une référence : en état, chaque démarrage ou arrêt de scrutation
 * provoquerait un rendu, précisément aux moments où rien de visible ne change. Le nettoyage
 * au démontage retire le minuteur *et* l'abonnement au cycle de vie — en oublier un laisse
 * une scrutation orpheline s'exécuter indéfiniment.
 */
export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = async () => {
    const online = await probeApi();
    setIsConnected(online);
  };

  // Un sondage immédiat précède la mise en place du minuteur : au retour d'arrière-plan,
  // attendre la période complète laisserait afficher un état vieux de plusieurs minutes.
  const startPolling = () => {
    check();
    intervalRef.current = setInterval(check, CHECK_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    startPolling();

    // Le passage à l'avant-plan arrête puis relance la scrutation au lieu de la reprendre :
    // c'est ce qui garantit un sondage immédiat et écarte tout minuteur resté en vie après
    // une suspension du système, qui produirait deux séries de sondages superposées.
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        stopPolling();
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      sub.remove();
    };
  }, []);

  const value = useMemo(() => ({ isConnected }), [isConnected]);

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

/**
 * Donne accès à l'état de connectivité.
 *
 * Ne lève pas hors provider : le défaut optimiste laisse un composant isolé se comporter
 * comme en ligne, ce qui est le mode dégradé souhaitable ici — au pire, une action échouera
 * et sera traitée par sa propre gestion d'erreur.
 *
 * @returns `{ isConnected }`, verdict du dernier sondage abouti.
 */
export const useNetwork = () => useContext(NetworkContext);
