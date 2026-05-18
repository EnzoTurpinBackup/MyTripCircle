import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { F } from "../../theme/fonts";
import { RADIUS, SPACING, SHADOW } from "../../theme";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  variant?: "default" | "premium";
}

const SubscriptionFeaturesCard: React.FC<Props> = ({ variant = "default" }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (variant === "premium") {
    const advantages: string[] = [
      t("subscription.monthlyAdvantage1"),
      t("subscription.monthlyAdvantage2"),
      t("subscription.monthlyAdvantage3"),
      t("subscription.monthlyAdvantage4"),
      t("subscription.annualAdvantage3"),
      t("subscription.annualAdvantage5"),
    ];
    return (
      <View
        style={[
          styles.card,
          SHADOW.light,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          {t("subscription.premiumAdvantagesTitle")}
        </Text>
        <View style={styles.list}>
          {advantages.map((text, index) => (
            <View key={text} style={styles.listItem}>
              <View style={[styles.numberBadge, { backgroundColor: colors.terra }]}>
                <Text style={styles.numberBadgeText}>{index + 1}</Text>
              </View>
              <Text style={[styles.listText, { color: colors.text }]}>{text}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const features: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
    { icon: "cloud-upload-outline",     text: t("subscription.featureCloud") },
    { icon: "shield-checkmark-outline", text: t("subscription.featureSecure") },
    { icon: "people-outline",           text: t("subscription.featureTeam") },
    { icon: "refresh-outline",          text: t("subscription.featureUpdates") },
  ];

  return (
    <View
      style={[
        styles.card,
        SHADOW.light,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        {t("subscription.includedInAllPlans")}
      </Text>
      <View style={styles.grid}>
        {features.map((f) => (
          <View key={f.icon} style={styles.item}>
            <View style={[styles.iconWrap, { backgroundColor: colors.terraLight }]}>
              <Ionicons name={f.icon} size={18} color={colors.terra} />
            </View>
            <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: SPACING.xxl,
    borderRadius: RADIUS.card,
    padding: SPACING.xl,
    borderWidth: 1,
  },
  title: {
    fontSize: 17,
    fontFamily: F.sans700,
    marginBottom: SPACING.lg,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  item: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    fontFamily: F.sans400,
    lineHeight: 18,
  },
  list: {
    gap: SPACING.md,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    fontFamily: F.sans400,
    lineHeight: 20,
  },
  numberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  numberBadgeText: {
    fontSize: 12,
    fontFamily: F.sans700,
    color: "#FFFFFF",
  },
});

export default SubscriptionFeaturesCard;
