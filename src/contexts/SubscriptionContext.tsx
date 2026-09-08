/**
 * Contexte d'abonnement — état du plan de l'utilisateur et droits qui en découlent.
 *
 * L'état est global parce que les droits sont interrogés partout : création de voyage,
 * ajout de collaborateur, export de données, bandeaux d'incitation. Chaque écran qui
 * interrogerait le serveur pour son propre compte multiplierait les appels et pourrait
 * afficher des droits contradictoires d'un onglet à l'autre.
 *
 * Consommateurs : l'écran d'abonnement, les gardes de création de voyage et d'invitation de
 * collaborateurs, et les fonctions d'export.
 *
 * Réinitialisation : l'abonnement est vidé et sa copie locale effacée dès que
 * l'authentification est résolue et que `user` est nul. La copie locale n'est pas cloisonnée
 * par compte ; c'est cet effacement, et non une clé par utilisateur, qui empêche le plan
 * d'un compte de fuiter vers le suivant.
 *
 * Garanties en cas de perte de réseau ou de session expirée :
 * - la copie persistée permet d'ouvrir l'application hors ligne avec les droits connus de la
 *   dernière session, sans intervalle où l'utilisateur serait rétrogradé à tort ;
 * - cette copie n'a pas de date d'expiration propre : un abonnement échu ou résilié depuis
 *   la dernière synchronisation restera considéré comme actif tant que le serveur n'aura pas
 *   répondu, sauf si sa date de fin est passée — seul contrôle purement local ;
 * - les droits ne sont donc pas une mesure de sécurité mais un confort d'interface ;
 *   l'autorisation qui fait foi reste celle appliquée par le serveur à chaque opération ;
 * - un achat exige le réseau de bout en bout : la validation du reçu passe par le backend, et
 *   un échec à cette étape laisse la transaction non finalisée côté magasin.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Subscription, SubscriptionFeatures } from "../types";
import ApiService from "../services/ApiService";
import { useAuth } from "./AuthContext";

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;

  // Méthodes
  refreshSubscription: () => Promise<void>;
  purchaseSubscription: (productId: string) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;

  // Vérifications de fonctionnalités
  canCreateTrip: (currentCount?: number) => boolean;
  canAddCollaborator: (currentCount?: number) => boolean;
  canExportData: () => boolean;
  hasFeatureAccess: (feature: keyof SubscriptionFeatures) => boolean;
  isPremium: () => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

/**
 * Donne accès à l'abonnement courant et aux vérifications de droits.
 *
 * @returns L'abonnement, l'état de chargement, l'erreur éventuelle et les prédicats de droit.
 * @throws Error hors d'un `SubscriptionProvider` : sans contexte, tous les prédicats
 * répondraient « non autorisé » et l'application paraîtrait bridée sans raison.
 */
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

const SUBSCRIPTION_STORAGE_KEY = "subscription";

/**
 * Fournit l'abonnement à l'arbre React.
 *
 * `error` est un message d'état affichable par l'écran d'abonnement, distinct des rejets :
 * les actions retournent un booléen et posent l'erreur ici plutôt que de lever, car une
 * tentative d'achat abandonnée par l'utilisateur n'est pas un incident à propager.
 */
export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSubscription(null);
      setError(null);
      setLoading(false);
      AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY).catch(() => {});
      return;
    }
    loadSubscription();
  }, [user, authLoading]);

  /**
   * Charge l'abonnement : copie locale d'abord, serveur ensuite.
   *
   * La lecture locale sert uniquement à ne pas afficher un compte gratuit pendant l'appel
   * réseau — une rétrogradation d'une seconde suffit à masquer un bouton payant et à
   * dérouter l'utilisateur. Les dates sont ranimées en `Date` car la sérialisation JSON les
   * a réduites à des chaînes, sur lesquelles les comparaisons d'échéance échoueraient.
   *
   * En cas d'échec réseau, `error` est posée mais la copie locale déjà appliquée reste en
   * place : l'application continue avec les droits de la dernière session connue.
   */
  const loadSubscription = async () => {
    try {
      // Try to load from AsyncStorage first
      const stored = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (stored) {
        const sub = JSON.parse(stored);
        // Convert date strings back to Date objects
        setSubscription({
          ...sub,
          startDate: new Date(sub.startDate),
          endDate: sub.endDate ? new Date(sub.endDate) : undefined,
          cancelledAt: sub.cancelledAt ? new Date(sub.cancelledAt) : undefined,
          nextBillingDate: sub.nextBillingDate ? new Date(sub.nextBillingDate) : undefined,
          createdAt: new Date(sub.createdAt),
          updatedAt: new Date(sub.updatedAt),
        });
      }

      // Always fetch from server to get latest data
      const data = await ApiService.getSubscription();
      setSubscription(data);

      // Cache in AsyncStorage
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Error loading subscription:", err);
      setError("Failed to load subscription");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resynchronise l'abonnement avec le serveur, sans passer par la copie locale.
   *
   * Contrairement à `loadSubscription`, l'erreur est ici propagée : ce rafraîchissement est
   * déclenché par un geste explicite ou après un achat, contextes où l'appelant doit pouvoir
   * distinguer un échec d'une absence de changement. `error` est également posée pour
   * l'écran d'abonnement, et `loading` libéré dans tous les cas.
   *
   * @throws Propage l'erreur d'API.
   */
  const refreshSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getSubscription();
      setSubscription(data);
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Error refreshing subscription:", err);
      setError("Failed to refresh subscription");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Lance l'achat d'un abonnement auprès du magasin d'applications, puis fait valider le
   * reçu par le backend.
   *
   * Le module d'achat intégré est chargé à la demande et son absence est traitée comme un
   * cas normal, non comme une panne : il n'existe pas dans le client de développement Expo,
   * où l'écran d'abonnement doit rester consultable. La fonction rend alors `false` en
   * posant un message explicite.
   *
   * Le reçu n'est jamais considéré comme suffisant en lui-même : c'est le backend qui
   * l'authentifie auprès d'Apple ou de Google, et la transaction n'est finalisée qu'après
   * cette validation. Un échec de validation laisse donc la transaction ouverte côté
   * magasin, qui la représentera au prochain démarrage — comportement voulu, il évite de
   * consommer un paiement que le serveur n'a pas enregistré.
   *
   * @param productId Identifiant du produit tel que déclaré dans le magasin.
   * @returns `true` seulement si le backend a validé l'achat ; `false` sur indisponibilité du
   * module, reçu manquant, refus de validation, ou abandon de l'utilisateur.
   */
  const purchaseSubscription = useCallback(async (productId: string): Promise<boolean> => {
    try {
      setError(null);

      // Import RNIap dynamically
      let RNIap: any = null;
      let isIapAvailable = false;

      try {
        RNIap = require("react-native-iap");
        isIapAvailable = true;
      } catch (e) {
        if (__DEV__) console.warn("[SubscriptionContext] IAP non disponible (Expo Go ou non installé):", e);
      }

      if (!isIapAvailable || !RNIap) {
        setError("In-app purchases not available in this environment");
        return false;
      }

      const purchase = await RNIap.requestPurchase({
        type: "subs",
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
      });

      // Get receipt data
      const receiptData = purchase.transactionReceipt || purchase.purchaseToken;
      const platform = purchase.transactionId ? "ios" : "android";

      if (!receiptData) {
        setError("Failed to get purchase receipt");
        return false;
      }

      // Validate purchase with backend
      const result = await ApiService.validatePurchase({
        receiptData,
        platform,
        productId,
        transactionId: purchase.transactionId,
      });

      if (result.success) {
        // Finish transaction
        await RNIap.finishTransaction(purchase);

        // Refresh subscription data
        await refreshSubscription();

        // Clear cached subscription to force reload
        await AsyncStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);

        return true;
      } else {
        setError("Failed to validate purchase");
        return false;
      }
    } catch (err: any) {
      console.error("Error purchasing subscription:", err);
      setError(err.message || "Failed to purchase subscription");
      return false;
    }
  }, [refreshSubscription]);

  /**
   * Résilie l'abonnement en cours.
   *
   * La résiliation ne coupe pas l'accès : le statut passe à « résilié » mais les droits
   * restent ouverts jusqu'à la date de fin, ce que `isSubscriptionActive` prend en compte.
   * L'abonnement est resynchronisé pour récupérer cette date depuis le serveur plutôt que de
   * la déduire localement.
   *
   * @returns `true` si le serveur a confirmé ; `false` sur refus comme sur erreur réseau, le
   * message étant alors publié dans `error`.
   */
  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const result = await ApiService.cancelSubscription();

      if (result.success) {
        // Refresh subscription data
        await refreshSubscription();
        return true;
      } else {
        setError(result.message || "Failed to cancel subscription");
        return false;
      }
    } catch (err: any) {
      console.error("Error cancelling subscription:", err);
      setError(err.message || "Failed to cancel subscription");
      return false;
    }
  }, [refreshSubscription]);

  /**
   * Indique si l'abonnement ouvre encore des droits.
   *
   * Un abonnement résilié reste actif jusqu'à sa date de fin : l'utilisateur a payé la
   * période en cours. C'est la seule règle d'expiration évaluée localement, et elle repose
   * sur l'horloge de l'appareil — une horloge décalée décale d'autant la bascule.
   *
   * @returns `false` en l'absence d'abonnement, ce qui est aussi l'état d'un compte gratuit
   * et celui d'un chargement encore en cours : les prédicats appelants ne doivent donc pas
   * traiter ce `false` comme une preuve de plan gratuit.
   */
  const isSubscriptionActive = useCallback((): boolean => {
    if (!subscription) return false;
    return subscription.status === "active" ||
      (subscription.status === "cancelled" &&
       subscription.endDate != null &&
       new Date() < new Date(subscription.endDate));
  }, [subscription]);

  /**
   * Vérifie l'accès à une fonctionnalité du plan.
   *
   * Les fonctionnalités du plan sont de deux natures : des drapeaux, rendus tels quels, et
   * des quotas numériques, dont seule la valeur `-1` — « illimité » — vaut un accès. Une
   * fonctionnalité plafonnée à un nombre fini répond donc `false` ici : ce prédicat porte sur
   * l'absence de limite, et le respect d'un quota se vérifie avec les prédicats dédiés qui
   * reçoivent le décompte courant.
   *
   * @param feature Nom de la fonctionnalité dans les droits du plan.
   * @returns `false` si l'abonnement n'est pas actif, avant toute lecture des droits.
   */
  const checkFeatureAccess = useCallback((feature: keyof SubscriptionFeatures): boolean => {
    if (!isSubscriptionActive()) return false;

    const featureValue = subscription!.features[feature];

    if (typeof featureValue === "boolean") return featureValue;

    // Numeric features (-1 means unlimited)
    return featureValue === -1;
  }, [subscription, isSubscriptionActive]);

  /**
   * Indique si un voyage supplémentaire peut être créé.
   *
   * Le plafond du plan gratuit est écrit ici et non côté serveur : il ne dépend d'aucun
   * abonnement à interroger, et le faire dépendre du réseau interdirait de créer un voyage
   * hors ligne. Le serveur applique le même plafond de son côté, ce contrôle n'étant qu'un
   * garde-fou d'interface.
   *
   * @param currentCount Nombre de voyages déjà possédés ; l'omettre revient à demander si le
   * tout premier voyage est permis, ce qui est toujours le cas.
   * @returns `true` si la création est permise. Un quota de `-1` signifie illimité.
   */
  const canCreateTrip = useCallback((currentCount: number = 0): boolean => {
    const FREE_MAX = 3;
    if (!isSubscriptionActive()) return currentCount < FREE_MAX;
    const max = subscription!.features.maxTrips;
    return max === -1 || currentCount < max;
  }, [subscription, isSubscriptionActive]);

  /**
   * Indique si un collaborateur supplémentaire peut être invité sur un voyage.
   *
   * Le décompte est celui d'un voyage donné, pas du compte : le plafond s'applique par
   * voyage. L'appelant doit donc transmettre le nombre de collaborateurs de ce voyage
   * précis, sans quoi le plafond serait évalué contre zéro et toujours franchissable.
   *
   * @param currentCount Nombre de collaborateurs déjà présents sur le voyage.
   * @returns `true` si l'invitation est permise. Un quota de `-1` signifie illimité.
   */
  const canAddCollaborator = useCallback((currentCount: number = 0): boolean => {
    const FREE_MAX = 2;
    if (!isSubscriptionActive()) return currentCount < FREE_MAX;
    const max = subscription!.features.maxCollaborators;
    return max === -1 || currentCount < max;
  }, [subscription, isSubscriptionActive]);

  /**
   * Indique si l'export des données est ouvert.
   *
   * @returns `false` pour un compte gratuit comme pour un abonnement expiré ; l'export est un
   * droit binaire, sans variante plafonnée.
   */
  const canExportData = useCallback((): boolean => {
    return checkFeatureAccess("canExport");
  }, [checkFeatureAccess]);

  /**
   * Indique si l'utilisateur est sur le plan premium et que ce plan court toujours.
   *
   * Distinct de `isSubscriptionActive`, qui ignore la nature du plan : un abonnement peut
   * être actif sans être premium. Ce prédicat sert l'affichage — badges, écrans d'offre —
   * là où les autres arbitrent des droits.
   *
   * @returns `true` uniquement pour un plan premium en cours, période de résiliation comprise.
   */
  const isPremium = useCallback((): boolean => {
    return !!(subscription?.plan === "premium" && (
      subscription.status === "active" ||
      (subscription.status === "cancelled" &&
       subscription.endDate &&
       new Date() < new Date(subscription.endDate))
    ));
  }, [subscription]);

  const value: SubscriptionContextType = useMemo(
    () => ({
      subscription,
      loading,
      error,
      refreshSubscription,
      purchaseSubscription,
      cancelSubscription,
      canCreateTrip,
      canAddCollaborator,
      canExportData,
      hasFeatureAccess: checkFeatureAccess,
      isPremium,
    }),
    [
      subscription,
      loading,
      error,
      refreshSubscription,
      purchaseSubscription,
      cancelSubscription,
      canCreateTrip,
      canAddCollaborator,
      canExportData,
      checkFeatureAccess,
      isPremium,
    ]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
