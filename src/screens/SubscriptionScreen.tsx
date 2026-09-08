/**
 * Écran de l'abonnement payant : présentation des formules pour un compte
 * gratuit, état de l'abonnement en cours pour un compte déjà souscrit.
 *
 * Besoin couvert : comprendre ce qu'apporte l'offre et souscrire en quelques
 * gestes ; une fois abonné, savoir jusqu'à quand le service est acquis.
 *
 * Position dans le parcours : atteint depuis la ligne d'abonnement de
 * ProfileScreen, dans les deux cas. Retour à l'écran appelant ; la seule autre
 * sortie est externe, vers la page d'abonnements de la boutique.
 *
 * Données : les formules et l'achat viennent d'useSubscriptionIap, qui interroge
 * la boutique du téléphone après avoir affiché des tarifs de repli puis ceux mis
 * en cache, afin de ne jamais montrer une page vide. L'état de l'abonnement
 * vient de SubscriptionContext, alimenté par subscriptionsApi : c'est le
 * serveur, après vérification du reçu, qui ouvre les droits.
 *
 * États pris en charge : achat en cours, signalé sur la seule formule engagée ;
 * abonnement actif, qui remplace le catalogue par un bandeau d'échéance ;
 * absence de module d'achat, où un avertissement précède des formules non
 * souscriptibles. Les échecs d'achat sont rapportés par le hook.
 */
import React from "react";
import {
  Text,
  ScrollView,
  StyleSheet,
  View,
  StatusBar,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { F } from "../theme/fonts";
import { RADIUS, SPACING } from "../theme";
import { useTheme } from "../contexts/ThemeContext";
import { useSubscriptionIap } from "../hooks/useSubscriptionIap";
import { useSubscription } from "../contexts/SubscriptionContext";
import { formatDate } from "../utils/i18n";
import PlanCard from "../components/PlanCard";
import SubscriptionFeaturesCard from "../components/subscription/SubscriptionFeaturesCard";
import BackButton from "../components/ui/BackButton";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Page de gestion des abonnements de la boutique. La résiliation n'est pas
 * proposée dans l'application : Apple comme Google exigent qu'elle se fasse chez
 * eux. L'adresse est arrêtée au chargement du module, ce qui impose une suite de
 * tests distincte pour couvrir la variante Android.
 */
const MANAGE_SUBSCRIPTION_URL =
  Platform.OS === "ios"
    ? "https://apps.apple.com/account/subscriptions"
    : "https://play.google.com/store/account/subscriptions";

/**
 * Compose l'écran d'abonnement.
 *
 * Poussé sur la pile sans paramètre de route : catalogue et état de l'abonnement
 * sont lus dans le hook d'achat et dans le contexte. Effets de bord — l'achat
 * ouvre le dialogue de paiement, la gestion quitte l'application.
 */
const SubscriptionScreen: React.FC = () => {
  const navigation  = useNavigation();
  const { t }       = useTranslation();
  const { colors }  = useTheme();

  const { isPremium, subscription, refreshSubscription } = useSubscription();
  // Le hook d'achat ignore tout de l'état d'abonnement : c'est l'écran qui, une
  // fois la transaction finalisée, fait relire les droits au serveur. Sans quoi
  // le catalogue resterait affiché à un compte qui vient de payer.
  const { products, loadingId, onSubscribe, isExpoGo } = useSubscriptionIap({
    onPurchaseSuccess: refreshSubscription,
  });
  const premium = isPremium();

  // Trois formulations par précision décroissante. La résiliation avec échéance
  // connue passe en premier : les droits courent jusqu'à cette date. Vient la
  // prochaine facturation, puis, faute de date, la seule mention d'un abonnement
  // en cours — un compte est reconnu payant avant même d'en connaître le détail.
  const renewalLine = (() => {
    if (!subscription) return t("subscription.activeBannerActive");
    if (subscription.status === "cancelled" && subscription.endDate) {
      return t("subscription.activeBannerCancelledUntil", { date: formatDate(subscription.endDate) });
    }
    if (subscription.nextBillingDate) {
      return t("subscription.activeBannerNextBilling", { date: formatDate(subscription.nextBillingDate) });
    }
    return t("subscription.activeBannerActive");
  })();

  // Le bandeau d'abonnement actif se substitue au catalogue : proposer une
  // souscription à qui en détient déjà une mènerait à un achat rejeté.
  const renderSubscriptionBlock = () => {
    if (premium) {
      return (
        <View style={[styles.activeCard, { backgroundColor: colors.terraLight, borderColor: colors.terra }]}>
          <View style={styles.activeHeader}>
            <Ionicons name="checkmark-circle" size={22} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={[styles.activeTitle, { color: colors.terraDark }]}>
              {t("subscription.activeBannerTitle")}
            </Text>
          </View>
          <Text style={[styles.activeRenewal, { color: colors.textMid }]}>
            {renewalLine}
          </Text>
          <TouchableOpacity
            style={[styles.manageBtn, { backgroundColor: colors.terra }]}
            // Rejet absorbé volontairement : un appareil sans boutique ni
            // navigateur ne peut rien ouvrir et aucun repli n'existe. L'écran
            // reste consultable plutôt que d'afficher une erreur sans issue.
            onPress={() => Linking.openURL(MANAGE_SUBSCRIPTION_URL).catch(() => {})}
            activeOpacity={0.85}
          >
            <Text style={styles.manageBtnText}>{t("subscription.manageButton")}</Text>
            <Ionicons name="open-outline" size={16} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
          </TouchableOpacity>
        </View>
      );
    }

    // Périodicité déduite du rang, la boutique ne rendant pas l'unité de
    // facturation : useSubscriptionIap déclare la formule mensuelle en tête, si
    // bien que toute suivante est annuelle et la deuxième recommandée.
    return products.map((product, index) => (
      <PlanCard
        key={product.productId}
        id={product.productId}
        // Repli sur l'identifiant : une fiche mal renseignée dans la console de
        // la boutique laisserait la carte sans titre.
        title={product.title || product.productId}
        price={product.localizedPrice}
        advantages={
          index === 0
            ? [
                t("subscription.monthlyAdvantage1"),
                t("subscription.monthlyAdvantage2"),
                t("subscription.monthlyAdvantage3"),
                t("subscription.monthlyAdvantage4"),
              ]
            : [
                t("subscription.annualAdvantage1"),
                t("subscription.annualAdvantage2"),
                t("subscription.annualAdvantage3"),
                t("subscription.annualAdvantage4"),
                t("subscription.annualAdvantage5"),
              ]
        }
        onSubscribe={onSubscribe}
        // L'attente ne porte que sur la formule engagée : l'utilisateur voit
        // laquelle il a choisie pendant que le paiement se prépare.
        loading={loadingId === product.productId}
        recommended={index === 1}
        priceUnit={index === 0 ? t("subscription.perMonth") : t("subscription.perYear")}
      />
    ));
  };

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("subscription.title")}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // Défilement bloqué pour un compte abonné : bandeau et carte d'avantages
        // tiennent dans la hauteur, et une course vide déroute.
        scrollEnabled={!premium}
      >
        <View style={styles.content}>
          {/* ── Bandeau mode démo ── */}
          {/* Le module d'achat natif est absent d'Expo Go : les formules restent
              affichées avec leurs tarifs de repli, mais y souscrire échouerait. */}
          {isExpoGo && (
            <View style={[styles.demoCard, { backgroundColor: colors.terraLight, borderColor: colors.terra }]}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.terra} style={styles.demoIcon} {...DECORATIVE_ELEMENT_PROPS} />
              <View style={styles.demoContent}>
                <Text style={[styles.demoTitle, { color: colors.terraDark }]}>
                  {t("subscription.demoMode")}
                </Text>
                <Text style={[styles.demoText, { color: colors.textMid }]}>
                  {t("subscription.demoMessage")}
                </Text>
              </View>
            </View>
          )}

          {renderSubscriptionBlock()}

          <SubscriptionFeaturesCard variant={premium ? "premium" : "default"} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper:       { flex: 1 },
  container:     { flex: 1 },
  scrollContent: { paddingBottom: 64 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontFamily: F.sans700,
  },

  content: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },

  demoCard: {
    flexDirection: "row",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  demoIcon:    { marginTop: 2 },
  demoContent: { flex: 1 },
  demoTitle:   { fontSize: 14, fontFamily: F.sans700, marginBottom: 4 },
  demoText:    { fontSize: 13, fontFamily: F.sans400, lineHeight: 19 },

  activeCard: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  activeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: 6,
  },
  activeTitle: { fontSize: 17, fontFamily: F.sans700 },
  activeRenewal: { fontSize: 14, fontFamily: F.sans400, marginBottom: SPACING.md },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: RADIUS.button,
    paddingVertical: 12,
  },
  manageBtnText: { fontSize: 15, fontFamily: F.sans600, color: "#FFFFFF" },
});

export default SubscriptionScreen;
