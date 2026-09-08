/**
 * Contexte des amis — relations acceptées, demandes en attente et suggestions.
 *
 * Les trois listes sont globales parce qu'elles bougent ensemble : accepter une demande
 * retire une ligne des demandes, ajoute un ami et retire une suggestion. Localiser cet état
 * obligerait chaque écran concerné à réagir aux actions des autres, ou laisserait un écran
 * revenu du plan de fond afficher une demande déjà traitée ailleurs.
 *
 * Consommateurs : les écrans d'amis, de demandes, d'ajout de contact, le profil d'un ami, et
 * l'invitation de collaborateurs sur un voyage, qui puise dans la liste d'amis.
 *
 * Réinitialisation : listes vidées et caches invalidés dès que l'authentification est
 * résolue et que `user` est nul. Le garde `authLoading` est indispensable — sans lui, la
 * première frame, où `user` est encore nul, effacerait le cache d'une session valide.
 *
 * Garanties hors ligne :
 * - la lecture est hydratée depuis le cache persistant, même périmé, avant toute réponse
 *   réseau ; un rafraîchissement en échec est journalisé et laisse les listes en place ;
 * - les écritures ne le sont pas : elles propagent leur erreur à l'appelant, sans file
 *   d'attente. Un ami retiré hors ligne reste affiché, aucune mise à jour optimiste
 *   n'anticipe la réponse du serveur ;
 * - les rafraîchissements déclenchés après une écriture ne sont pas attendus dans tous les
 *   cas : `sendFriendRequest` les lance en arrière-plan, si bien que les listes peuvent
 *   rester d'une version en retard le temps d'un aller-retour.
 */
import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from "react";
import { FriendRequest, Friend, FriendSuggestion } from "../types";
import { ApiService } from "../services/ApiService";
import { useAuth } from "./AuthContext";
import { CacheManager, CACHE_KEYS, CACHE_TTL } from "../utils/cacheManager";

interface FriendsContextType {
  friends: Friend[];
  friendRequests: FriendRequest[];
  suggestions: FriendSuggestion[];
  loading: boolean;
  sendFriendRequest: (data: { recipientEmail?: string; recipientPhone?: string }) => Promise<{ autoAccepted?: boolean }>;
  respondToFriendRequest: (requestId: string, action: "accept" | "decline") => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  refreshFriends: () => Promise<void>;
  refreshFriendRequests: () => Promise<void>;
  refreshSuggestions: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

/**
 * Fournit les listes d'amis à l'arbre React et pilote leur cycle de vie.
 *
 * `loading` ne suit pas la présence de requêtes en vol mais la capacité à afficher quelque
 * chose : il retombe dès qu'une donnée, fût-elle issue du cache, est disponible. Un écran
 * qui l'utilise pour masquer un indicateur ne doit donc pas en déduire que les listes sont à
 * jour, seulement qu'elles sont affichables.
 */
export const FriendsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  // Persistance par observation de l'état plutôt qu'à chaque action : une seule voie
  // d'écriture couvre l'ensemble des mutations, sans risque d'en oublier une. La garde sur
  // le premier chargement évite d'écraser un cache utile avec les listes vides du montage,
  // et les échecs d'écriture sont ignorés — le cache accélère, il ne fait pas autorité.
  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    CacheManager.set(CACHE_KEYS.FRIENDS, friends, CACHE_TTL.FRIENDS).catch(() => {});
  }, [friends]);

  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    CacheManager.set(CACHE_KEYS.FRIEND_REQUESTS, friendRequests, CACHE_TTL.FRIEND_REQUESTS).catch(() => {});
  }, [friendRequests]);

  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    CacheManager.set(CACHE_KEYS.FRIEND_SUGGESTIONS, suggestions, CACHE_TTL.FRIEND_SUGGESTIONS).catch(() => {});
  }, [suggestions]);

  /**
   * Recharge la liste d'amis depuis le serveur.
   *
   * Sans utilisateur connecté, l'appel est un no-op silencieux : le contexte est monté avant
   * la résolution de la session, et faire échouer l'appel obligerait chaque appelant à
   * vérifier lui-même l'état d'authentification.
   *
   * Une erreur réseau est journalisée mais non propagée, et la liste précédente est
   * conservée : un rafraîchissement en échec ne doit pas vider un écran déjà rempli.
   */
  const refreshFriends = async () => {
    if (!user) return;
    try {
      const data = await ApiService.getFriends();
      setFriends(data);
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  /**
   * Recharge les demandes d'amitié, en écartant les doublons d'identifiant.
   *
   * Le dédoublonnage est défensif : une même demande peut remonter deux fois quand elle est
   * à la fois reçue et suggérée par un contact partagé, et React lèverait une collision de
   * clés dans la liste. Le premier exemplaire rencontré est conservé, l'ordre du serveur —
   * qui porte l'antériorité — reste donc intact.
   *
   * Erreur réseau journalisée et non propagée, liste précédente conservée.
   */
  const refreshFriendRequests = async () => {
    if (!user) return;
    try {
      const data = await ApiService.getFriendRequests();
      const seen = new Set<string>();
      const deduped = data.filter((r: FriendRequest) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
      setFriendRequests(deduped);
    } catch (error) {
      console.error("Error loading friend requests:", error);
    }
  };

  /**
   * Recharge les suggestions de contacts calculées par le serveur.
   *
   * Même contrat que les autres rafraîchissements : no-op sans session, erreur journalisée
   * et non propagée. Les suggestions étant purement indicatives, leur absence est le mode
   * dégradé acceptable — aucun écran ne doit dépendre de leur présence.
   */
  const refreshSuggestions = async () => {
    if (!user) return;
    try {
      const data = await ApiService.getFriendSuggestions();
      setSuggestions(data);
    } catch (error) {
      console.error("Error loading suggestions:", error);
    }
  };

  // Arbitre du cycle de vie : purge à la déconnexion confirmée, hydratation puis
  // revalidation à la connexion. Le premier chargement est marqué avant les rafraîchissements
  // afin que les effets de synchronisation captent bien les données réseau qui suivent.
  useEffect(() => {
    // Auth still resolving from storage — don't touch the cache yet
    if (authLoading) return;

    if (!user) {
      // Auth is resolved and user is null → confirmed logout, safe to clear
      setFriends([]);
      setFriendRequests([]);
      setSuggestions([]);
      setLoading(false);
      hasLoadedOnceRef.current = false;
      Promise.all([
        CacheManager.invalidate(CACHE_KEYS.FRIENDS),
        CacheManager.invalidate(CACHE_KEYS.FRIEND_REQUESTS),
        CacheManager.invalidate(CACHE_KEYS.FRIEND_SUGGESTIONS),
      ]).catch(() => {});
      return;
    }

    const init = async () => {
      // Hydrate from cache instantly before network responds
      const [cachedFriends, cachedRequests, cachedSuggestions] = await Promise.all([
        CacheManager.getStale<Friend[]>(CACHE_KEYS.FRIENDS),
        CacheManager.getStale<FriendRequest[]>(CACHE_KEYS.FRIEND_REQUESTS),
        CacheManager.getStale<FriendSuggestion[]>(CACHE_KEYS.FRIEND_SUGGESTIONS),
      ]);

      const hasCachedData = !!(cachedFriends || cachedRequests || cachedSuggestions);
      if (cachedFriends) setFriends(cachedFriends);
      if (cachedRequests) setFriendRequests(cachedRequests);
      if (cachedSuggestions) setSuggestions(cachedSuggestions);

      // Show cached data immediately; keep spinner only if nothing in cache
      setLoading(!hasCachedData);

      // Mark loaded before setters so cache-sync useEffects fire on network data
      hasLoadedOnceRef.current = true;

      await Promise.all([
        refreshFriends(),
        refreshFriendRequests(),
        refreshSuggestions(),
      ]).catch(() => {});

      setLoading(false);
    };

    init();
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Envoie une demande d'amitié par e-mail ou par téléphone.
   *
   * Le retrait de la suggestion est appliqué avant la confirmation des rafraîchissements :
   * la ligne sur laquelle l'utilisateur vient d'appuyer doit disparaître immédiatement. Ce
   * retrait n'est possible que pour l'invitation par e-mail, les suggestions n'étant
   * indexées que par adresse ; une invitation par téléphone laisse donc la suggestion
   * correspondante visible jusqu'au prochain rechargement.
   *
   * `autoAccepted` signale que le destinataire avait déjà une demande en attente vers
   * l'émetteur : l'amitié est nouée en un seul geste, ce qui impose de rafraîchir aussi la
   * liste d'amis et non les seules demandes.
   *
   * @param data Destinataire, identifié par `recipientEmail` ou `recipientPhone`.
   * @returns La réponse du serveur, ou un objet vide si celui-ci n'a rien renvoyé.
   * @throws Propage l'erreur d'API — l'écran doit expliquer pourquoi l'invitation a échoué
   * (adresse inconnue, amitié déjà existante, demande déjà en cours).
   */
  const sendFriendRequest = async (data: { recipientEmail?: string; recipientPhone?: string }): Promise<{ autoAccepted?: boolean }> => {
    try {
      const result = await ApiService.sendFriendRequest(data);
      if (data.recipientEmail) {
        setSuggestions((prev) => prev.filter((s) => s.email !== data.recipientEmail));
      }
      if (result?.autoAccepted) {
        Promise.all([refreshFriends(), refreshFriendRequests(), refreshSuggestions()]).catch(() => {});
      } else {
        Promise.all([refreshFriendRequests(), refreshSuggestions()]).catch(() => {});
      }
      return result || {};
    } catch (error) {
      console.error("Error sending friend request:", error);
      throw error;
    }
  };

  /**
   * Accepte ou refuse une demande reçue.
   *
   * Les trois listes sont rechargées et attendues, y compris sur un refus : celui-ci retire
   * la demande et peut faire réapparaître le contact en suggestion. Aucune mise à jour
   * optimiste n'est faite — la relation est une donnée partagée entre deux comptes, et
   * l'afficher comme nouée avant confirmation serait un mensonge difficile à rattraper.
   *
   * @param requestId Identifiant de la demande.
   * @param action `"accept"` noue la relation, `"decline"` la referme.
   * @throws Propage l'erreur d'API ; l'état local reste alors inchangé.
   */
  const respondToFriendRequest = async (requestId: string, action: "accept" | "decline") => {
    try {
      await ApiService.respondToFriendRequest(requestId, action);
      await Promise.all([refreshFriends(), refreshFriendRequests(), refreshSuggestions()]);
    } catch (error) {
      console.error("Error responding to friend request:", error);
      throw error;
    }
  };

  /**
   * Annule une demande que l'utilisateur avait envoyée.
   *
   * Seules les demandes sont rechargées : annuler ne crée ni ne défait de relation, et le
   * calcul des suggestions côté serveur n'en dépend pas. Recharger les trois listes coûterait
   * trois requêtes pour un seul changement visible.
   *
   * @param requestId Identifiant de la demande envoyée.
   * @throws Propage l'erreur d'API ; la demande reste alors affichée.
   */
  const cancelFriendRequest = async (requestId: string) => {
    try {
      await ApiService.cancelFriendRequest(requestId);
      await refreshFriendRequests();
    } catch (error) {
      console.error("Error canceling friend request:", error);
      throw error;
    }
  };

  /**
   * Retire un ami de la liste.
   *
   * Amis et suggestions sont rechargés ensemble : l'ancien contact redevient candidat aux
   * suggestions, et l'omettre ferait réapparaître la personne au prochain démarrage sans
   * explication apparente. Les demandes ne sont pas concernées.
   *
   * @param friendId Identifiant de la relation d'amitié.
   * @throws Propage l'erreur d'API ; l'ami reste alors affiché, la suppression n'ayant pas
   * été appliquée côté serveur.
   */
  const removeFriend = async (friendId: string) => {
    try {
      await ApiService.removeFriend(friendId);
      await Promise.all([refreshFriends(), refreshSuggestions()]);
    } catch (error) {
      console.error("Error removing friend:", error);
      throw error;
    }
  };

  // Dépendances limitées aux données observées : les actions ne capturent rien d'autre que
  // des setters et les fonctions de rafraîchissement, toutes idempotentes vis-à-vis du rendu.
  const ctxValue = useMemo(
    () => ({
      friends, friendRequests, suggestions, loading,
      sendFriendRequest, respondToFriendRequest, cancelFriendRequest,
      removeFriend, refreshFriends, refreshFriendRequests, refreshSuggestions,
    }),
    [friends, friendRequests, suggestions, loading], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <FriendsContext.Provider value={ctxValue}>
      {children}
    </FriendsContext.Provider>
  );
};

/**
 * Donne accès aux listes d'amis et aux actions associées.
 *
 * @returns Les trois listes, le drapeau de chargement et les actions du contexte.
 * @throws Error hors d'un `FriendsProvider` : un contexte absent produirait des listes vides
 * et des actions muettes, symptôme difficile à distinguer d'un compte sans aucun ami.
 */
export const useFriends = () => {
  const context = useContext(FriendsContext);
  if (!context) {
    throw new Error("useFriends must be used within a FriendsProvider");
  }
  return context;
};
