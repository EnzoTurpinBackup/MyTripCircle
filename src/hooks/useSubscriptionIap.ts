import { useState, useEffect, useMemo, useRef } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import Constants from "expo-constants";
import { parseApiError } from "../utils/i18n";
import { request } from "../services/api/apiCore";
import logger from "../utils/logger";

// Conditionally import react-native-iap only if not in Expo Go
let RNIap: any = null;
let isIapAvailable = false;

const isExpoGoEnvironment = Constants.executionEnvironment === "storeClient";

if (!isExpoGoEnvironment) {
  try {
    RNIap = require("react-native-iap");
    isIapAvailable = true;
  } catch (error) {
    logger.warn("react-native-iap not available:", error);
  }
}

const productIds = Platform.select({
  ios: ["com.myapp.monthly", "com.myapp.yearly"],
  android: ["com.myapp.monthly", "com.myapp.yearly"],
}) || [];

const PRODUCTS_CACHE_KEY = "subscription_products_cache";

interface MockProduct {
  productId: string;
  title: string;
  localizedPrice: string;
}

interface UseSubscriptionIapOptions {
  /**
   * Notifié après la finalisation d'un achat dont le reçu a été validé par le
   * serveur. Le hook n'accorde aucun droit lui-même : c'est à l'appelant de
   * resynchroniser l'état d'abonnement qu'il détient.
   */
  onPurchaseSuccess?: () => void | Promise<void>;
}

/**
 * Conduit l'achat d'un abonnement par la boutique de la plateforme : offre les
 * formules disponibles, déclenche l'achat et fait valider le reçu par le
 * serveur avant d'accorder le service.
 *
 * @param options `onPurchaseSuccess`, appelé une fois la transaction finalisée,
 * pour que l'appelant resynchronise l'abonnement qu'il affiche.
 *
 * @returns Les formules à présenter, `loadingId` qui identifie celle dont
 * l'achat est en cours, `onSubscribe` déclenchant l'achat, et `isExpoGo` qui
 * signale un environnement dépourvu de boutique.
 *
 * @remarks Le module d'achat natif est chargé de manière conditionnelle : il
 * est absent d'Expo Go, où son importation directe ferait échouer le
 * démarrage. L'écran affiche d'abord des formules de repli traduites, puis les
 * dernières formules mises en cache sur disque, avant les tarifs réels de la
 * boutique ; cette gradation évite un écran de tarifs vide au premier rendu, la
 * boutique étant lente à répondre. Le reçu est validé côté serveur avant que la
 * transaction ne soit finalisée : une validation échouée laisse la transaction
 * ouverte, ce qui la fait rejouer plutôt que de la perdre. La souscription
 * reste possible sans que ce hook n'accorde lui-même le moindre droit, cette
 * décision appartenant au serveur.
 */
export function useSubscriptionIap(options?: UseSubscriptionIapOptions) {
  const { t } = useTranslation();
  const isExpoGo = !isIapAvailable;

  // Les écouteurs d'achat ne sont posés qu'une fois, au montage : ils ne
  // peuvent pas capturer la fonction reçue en paramètre, qui change à chaque
  // rendu de l'appelant. La référence, tenue à jour ici, leur donne la dernière
  // version sans imposer de réabonner la boutique à chaque rendu.
  const onPurchaseSuccessRef = useRef(options?.onPurchaseSuccess);
  onPurchaseSuccessRef.current = options?.onPurchaseSuccess;

  const mockProducts = useMemo<MockProduct[]>(
    () => [
      { productId: "com.myapp.monthly", title: t("subscription.monthly"), localizedPrice: t("subscription.monthlyPrice") },
      { productId: "com.myapp.yearly",  title: t("subscription.annual"),  localizedPrice: t("subscription.annualPrice")  },
    ],
    [t],
  );

  // Affichage immédiat des mock products pour éviter le flash de chargement.
  // Les vrais produits IAP (ou le cache) viennent remplacer cette valeur dès qu'ils sont prêts.
  const [products, setProducts]   = useState<MockProduct[]>(() => mockProducts);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isIapAvailable || !RNIap) {
      return;
    }

    let cancelled = false;

    async function init() {
      // Hydrate immédiatement avec le dernier cache disque, si présent
      try {
        const cached = await AsyncStorage.getItem(PRODUCTS_CACHE_KEY);
        if (!cancelled && cached) {
          const parsed = JSON.parse(cached) as MockProduct[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProducts(parsed);
          }
        }
      } catch (err) {
        logger.warn("IAP cache read error", err);
      }

      try {
        await RNIap.initConnection();
        const subs = await RNIap.fetchProducts({ skus: productIds, type: "subs" });
        if (cancelled) return;
        if (!subs || subs.length === 0) {
          return;
        }
        const normalized: MockProduct[] = subs.map((p: any) => ({
          productId: p.productId ?? p.id,
          title: p.title,
          localizedPrice: p.localizedPrice ?? p.displayPrice,
        }));
        setProducts(normalized);
        AsyncStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(normalized)).catch(() => {});
      } catch (err) {
        logger.warn("IAP init error", err);
      }
    }
    init();

    const purchaseUpdate = RNIap.purchaseUpdatedListener(async (purchase: any) => {
      try {
        const receipt = purchase.transactionReceipt || purchase.purchaseToken;
        if (!receipt) return;

        // Validation server-side du reçu avant de finaliser la transaction
        await request("/subscriptions/validate-receipt", "POST", {
          receipt,
          platform: Platform.OS,
          productId: purchase.productId,
        });

        await RNIap.finishTransaction(purchase);

        // L'achat est acquis dès que le serveur a validé le reçu ; sans cette
        // resynchronisation, l'appelant continuerait d'afficher le catalogue et
        // les limites du compte gratuit jusqu'au prochain démarrage. Son échec
        // est journalisé sans être remonté : il ne doit pas faire passer un
        // achat abouti pour une erreur de paiement.
        try {
          await onPurchaseSuccessRef.current?.();
        } catch (refreshErr) {
          logger.warn("subscription refresh after purchase error", refreshErr);
        }

        setLoadingId(null);
        Alert.alert(t("subscription.purchaseSuccessTitle"), t("subscription.purchaseSuccessMessage"), [{ text: t("common.ok") }]);
      } catch (err) {
        logger.warn("purchase update handling error", err);
        // Si la validation échoue, on ne finalise pas la transaction
        Alert.alert(t("subscription.purchaseErrorTitle"), t("subscription.purchaseErrorMessage"), [{ text: t("common.ok") }]);
        setLoadingId(null);
      }
    });

    const purchaseError = RNIap.purchaseErrorListener((err: unknown) => {
      logger.warn("purchase error", err);
      let raw: Error;
      if (err instanceof Error) {
        raw = err;
      } else {
        const msg = typeof (err as { message?: string })?.message === "string"
          ? (err as { message: string }).message
          : "";
        raw = new Error(msg);
      }
      Alert.alert(
        t("subscription.purchaseErrorTitle"),
        parseApiError(raw) || t("subscription.purchaseErrorMessage"),
        [{ text: t("common.ok") }],
      );
      setLoadingId(null);
    });

    return () => {
      cancelled = true;
      purchaseUpdate.remove();
      purchaseError.remove();
      RNIap.endConnection();
    };
  }, []);

  const onSubscribe = async (productId: string) => {
    if (!isIapAvailable || !RNIap) {
      Alert.alert(t("subscription.purchaseErrorTitle"), t("subscription.demoMessage"), [{ text: t("common.ok") }]);
      return;
    }
    try {
      setLoadingId(productId);
      await RNIap.requestPurchase({
        type: "subs",
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
      });
    } catch (err) {
      logger.warn("requestSubscription err", err);
      Alert.alert(t("subscription.purchaseErrorTitle"), t("subscription.purchaseErrorMessage"), [{ text: t("common.ok") }]);
      setLoadingId(null);
    }
  };

  return { products, loadingId, onSubscribe, isExpoGo };
}
