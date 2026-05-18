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

const MANAGE_SUBSCRIPTION_URL =
  Platform.OS === "ios"
    ? "https://apps.apple.com/account/subscriptions"
    : "https://play.google.com/store/account/subscriptions";

const SubscriptionScreen: React.FC = () => {
  const navigation  = useNavigation();
  const { t }       = useTranslation();
  const { colors }  = useTheme();

  const { products, loadingId, onSubscribe, isExpoGo } = useSubscriptionIap();
  const { isPremium, subscription } = useSubscription();
  const premium = isPremium();

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
        scrollEnabled={!premium}
      >
        <View style={styles.content}>
          {/* ── Bandeau mode démo ── */}
          {isExpoGo && (
            <View style={[styles.demoCard, { backgroundColor: colors.terraLight, borderColor: colors.terra }]}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.terra} style={styles.demoIcon} />
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

          {premium ? (
            <View style={[styles.activeCard, { backgroundColor: colors.terraLight, borderColor: colors.terra }]}>
              <View style={styles.activeHeader}>
                <Ionicons name="checkmark-circle" size={22} color={colors.terra} />
                <Text style={[styles.activeTitle, { color: colors.terraDark }]}>
                  {t("subscription.activeBannerTitle")}
                </Text>
              </View>
              <Text style={[styles.activeRenewal, { color: colors.textMid }]}>
                {renewalLine}
              </Text>
              <TouchableOpacity
                style={[styles.manageBtn, { backgroundColor: colors.terra }]}
                onPress={() => Linking.openURL(MANAGE_SUBSCRIPTION_URL).catch(() => {})}
                activeOpacity={0.85}
              >
                <Text style={styles.manageBtnText}>{t("subscription.manageButton")}</Text>
                <Ionicons name="open-outline" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : products.length === 0 ? (
            <View style={[styles.loadingContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="hourglass-outline" size={32} color={colors.terra} />
              <Text style={[styles.loadingText, { color: colors.textMid }]}>
                {t("subscription.loadingOffers")}
              </Text>
            </View>
          ) : (
            products.map((product, index) => (
              <PlanCard
                key={product.productId}
                id={product.productId}
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
                loading={loadingId === product.productId}
                recommended={index === 1}
              />
            ))
          )}

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

  loadingContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xxl + SPACING.xl,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    gap: SPACING.md,
  },
  loadingText: { fontSize: 15, fontFamily: F.sans400 },
});

export default SubscriptionScreen;
