/**
 * Contexte des notifications — invitations en attente et leur statut de lecture.
 *
 * L'état est global parce que la pastille de non-lus est affichée dans la barre d'onglets,
 * hors de l'écran qui liste les notifications : ouvrir une invitation doit décrémenter un
 * compteur rendu ailleurs dans l'arbre. Un état local obligerait à faire remonter ce
 * compteur, ou à le recalculer à chaque changement d'onglet.
 *
 * Consommateurs : la barre d'onglets pour la pastille, et l'écran de notifications.
 *
 * Réinitialisation : à la disparition de `user`, invitations, compteur et identifiants lus
 * en mémoire sont vidés et le jeton de notifications push est effacé. Les identifiants lus
 * persistés, eux, survivent : ils sont rangés sous une clé portant l'identifiant de
 * l'utilisateur, ce qui les rend au bon compte à la reconnexion sans les mélanger entre
 * comptes d'un même appareil.
 *
 * Garanties en cas de perte de réseau ou de session expirée :
 * - le statut de lecture est local et persistant : il survit hors ligne et au redémarrage,
 *   mais n'est jamais synchronisé, si bien qu'une invitation lue sur un appareil réapparaît
 *   non lue sur un autre ;
 * - la liste des invitations, elle, n'est pas mise en cache : hors ligne, un rechargement
 *   échoue silencieusement et laisse la liste précédente en place, vide si l'application
 *   vient de démarrer ;
 * - le compteur est décrémenté sans attendre quoi que ce soit du serveur ; il ne peut pas
 *   descendre sous zéro, ce qui protège d'un double marquage plutôt que de le corriger ;
 * - l'enregistrement du jeton push est conditionné au consentement stocké et n'est retenté
 *   qu'à la connexion suivante : un refus de permission ou une panne réseau à cet instant
 *   prive l'utilisateur de notifications jusque-là.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TripInvitation } from "../types";
import { useTrips } from "./TripsContext";
import { useAuth } from "./AuthContext";
import { requestPermissionAndRegisterToken, clearStoredPushToken } from "../hooks/usePushNotifications";
import { CONSENT_KEY, ConsentPreferences } from "../screens/ConsentScreen";

interface NotificationContextType {
  invitations: TripInvitation[];
  unreadCount: number;
  readIds: Set<string>;
  loadInvitations: () => Promise<void>;
  markAsRead: (invitationId: string) => void;
  markAllAsRead: () => void;
  refreshInvitations: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

/**
 * Donne accès aux invitations et au compteur de non-lus.
 *
 * @returns Les invitations, le compteur, les identifiants lus et les actions du contexte.
 * @throws Error hors d'un `NotificationProvider` : la barre d'onglets afficherait sinon une
 * pastille à zéro en permanence, panne silencieuse et difficile à repérer.
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Clé de stockage des identifiants lus, cloisonnée par utilisateur.
 *
 * Le cloisonnement est nécessaire sur un appareil partagé : sans lui, les notifications d'un
 * compte apparaîtraient déjà lues pour le compte suivant, ou l'inverse.
 */
const readStorageKey = (userId: string) => `notifications_read_${userId}`;

/**
 * Fournit les invitations et le compteur de non-lus à l'arbre React.
 *
 * Dépend de `TripsProvider` pour la lecture des invitations : ce contexte ne parle pas
 * directement à l'API, il réutilise l'accès déjà exposé par les voyages. L'ordre de montage
 * des providers n'est donc pas interchangeable.
 *
 * Les identifiants lus sont relus avant le premier chargement, pour que les invitations
 * arrivent déjà marquées et que la pastille n'affiche pas un compte trop élevé le temps
 * d'une frame.
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [invitations, setInvitations] = useState<TripInvitation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const { getUserInvitations } = useTrips();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadPersistedReadIds().then(() => loadInvitations());
      refreshPushTokenIfConsented();
    } else {
      setInvitations([]);
      setUnreadCount(0);
      setReadIds(new Set());
      clearStoredPushToken();
    }
  }, [user]);

  /**
   * Réenregistre le jeton de notifications push, mais seulement si l'utilisateur y a
   * consenti.
   *
   * Le consentement est relu à chaque connexion plutôt que mémorisé : le jeton d'appareil
   * change à la réinstallation et peut être invalidé par le système, un réenregistrement
   * régulier est donc nécessaire. Demander la permission sans vérifier le consentement
   * préalable ferait surgir une boîte de dialogue système jamais sollicitée.
   *
   * Une préférence absente ou illisible est traitée comme un refus : sur ce sujet, le
   * silence ne vaut pas accord.
   */
  const refreshPushTokenIfConsented = async () => {
    try {
      const stored = await AsyncStorage.getItem(CONSENT_KEY);
      if (!stored) return;
      const prefs: ConsentPreferences = JSON.parse(stored);
      if (prefs.notifications) {
        await requestPermissionAndRegisterToken();
      }
    } catch (e) {
      if (__DEV__) console.warn("[NotificationContext] Erreur chargement préférences notifications:", e);
    }
  };

  /**
   * Relit les identifiants d'invitations déjà lues pour l'utilisateur courant.
   *
   * Un échec de lecture laisse l'ensemble vide : toutes les invitations réapparaissent alors
   * non lues. C'est le sens d'erreur choisi — répéter une notification est bénin, en masquer
   * une ne l'est pas.
   */
  const loadPersistedReadIds = async () => {
    if (!user) return;
    try {
      const stored = await AsyncStorage.getItem(readStorageKey(user.id));
      if (stored) {
        setReadIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      if (__DEV__) console.warn("[NotificationContext] Erreur lecture readIds:", e);
    }
  };

  /**
   * Écrit l'ensemble des identifiants lus.
   *
   * L'échec est journalisé sans être propagé : l'état en mémoire a déjà été mis à jour et
   * l'interface reste cohérente pour la session en cours ; seule la persistance est perdue,
   * et l'invitation redeviendra non lue au prochain démarrage.
   *
   * L'ensemble n'est jamais élagué : il croît avec le nombre d'invitations reçues sur la
   * durée de vie du compte, celles-ci restant peu nombreuses par nature.
   *
   * @param ids Ensemble complet à persister — l'écriture remplace, elle n'ajoute pas.
   */
  const persistReadIds = async (ids: Set<string>) => {
    if (!user) return;
    try {
      await AsyncStorage.setItem(
        readStorageKey(user.id),
        JSON.stringify(Array.from(ids))
      );
    } catch (e) {
      if (__DEV__) console.warn("[NotificationContext] Erreur persistance readIds:", e);
    }
  };

  /**
   * Identifiant stable d'une invitation, quel que soit son origine.
   *
   * Les invitations arrivent par deux chemins qui ne nomment pas la clé de la même façon —
   * document brut de la base d'un côté, entité déjà transposée de l'autre — et une invitation
   * reçue par lien peut n'avoir que son jeton. L'ordre d'essai va du plus stable au plus
   * circonstanciel.
   *
   * @param inv Invitation, sous l'une ou l'autre de ces formes.
   * @returns L'identifiant, ou la chaîne vide si aucune des trois clés n'est présente. Ce cas
   * limite est volontairement silencieux : l'invitation reste affichée et simplement
   * inmarquable comme lue, ce qui vaut mieux que de la faire disparaître.
   */
  const invId = (inv: any): string =>
    inv._id ?? inv.id ?? inv.token ?? "";

  /**
   * Charge les invitations en attente et recalcule le compteur de non-lus.
   *
   * Le marquage est fait à l'intérieur d'un `setReadIds` qui retourne son argument inchangé :
   * ce détour lit l'ensemble courant depuis l'état plutôt que depuis la fermeture. Sans lui,
   * un rechargement déclenché juste après un marquage repartirait d'un ensemble périmé et
   * ferait réapparaître comme non lue une invitation qui venait d'être ouverte.
   *
   * Un échec est journalisé sans être propagé : la liste précédente est conservée, et la
   * pastille garde sa dernière valeur connue.
   */
  const loadInvitations = async () => {
    if (!user) return;

    try {
      const pendingInvitations = await getUserInvitations(user.email, "pending");
      // Snapshot readIds from current state to avoid stale-closure issues
      setReadIds((currentReadIds) => {
        const markedInvitations = pendingInvitations.map((inv: TripInvitation) => ({
          ...inv,
          read: currentReadIds.has(invId(inv)),
        }));
        setInvitations(markedInvitations);
        const unread = markedInvitations.filter((inv: TripInvitation) => !inv.read).length;
        setUnreadCount(unread);
        return currentReadIds;
      });
    } catch (error) {
      console.error("Error loading invitations:", error);
    }
  };

  /**
   * Marque une invitation comme lue et décrémente le compteur.
   *
   * L'opération est purement locale et immédiate : rien n'est envoyé au serveur, le statut de
   * lecture n'existant pas côté API. Le compteur est décrémenté d'une unité plutôt que
   * recalculé sur la liste, ce qui rend l'appel insensible à un rechargement concurrent — au
   * prix d'un plancher à zéro qui absorbe un éventuel double appel sur la même invitation.
   *
   * @param invitationId Identifiant tel que rendu par la résolution d'identifiant ; un
   * identifiant absent de la liste enregistre l'entrée et décrémente tout de même le
   * compteur, sans effet visible sur les invitations affichées.
   */
  const markAsRead = (invitationId: string) => {
    const updated = new Set(readIds);
    updated.add(invitationId);
    setReadIds(updated);
    persistReadIds(updated);

    setInvitations((prev) =>
      prev.map((invitation) =>
        invId(invitation) === invitationId
          ? { ...invitation, read: true }
          : invitation
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  /**
   * Marque toutes les invitations affichées comme lues et remet le compteur à zéro.
   *
   * Ne porte que sur les invitations actuellement en mémoire : une invitation arrivée
   * pendant l'appel ne sera pas couverte et restera non lue, ce qui est le comportement
   * attendu — l'utilisateur ne peut pas avoir acquitté ce qu'il n'a pas vu.
   */
  const markAllAsRead = () => {
    const updated = new Set(readIds);
    invitations.forEach((inv) => updated.add(invId(inv)));
    setReadIds(updated);
    persistReadIds(updated);

    setInvitations((prev) =>
      prev.map((invitation) => ({ ...invitation, read: true }))
    );
    setUnreadCount(0);
  };

  /**
   * Recharge les invitations à la demande.
   *
   * Existe comme point d'entrée distinct pour les écrans : `loadInvitations` traduit le
   * cycle de vie interne, `refreshInvitations` un geste utilisateur. Les deux partagent
   * aujourd'hui la même implémentation, la distinction étant sémantique.
   */
  const refreshInvitations = async () => {
    await loadInvitations();
  };

  // `readIds` figure en dépendance bien qu'aucun écran ne l'affiche : les actions le lisent
  // par fermeture, et l'omettre les figerait sur un ensemble périmé.
  const value: NotificationContextType = useMemo(
    () => ({ invitations, unreadCount, readIds, loadInvitations, markAsRead, markAllAsRead, refreshInvitations }),
    [invitations, unreadCount, readIds], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
