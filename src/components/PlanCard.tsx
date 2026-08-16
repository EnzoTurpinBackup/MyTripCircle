import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ModernButton } from "./ModernButton";
import { F } from "../theme/fonts";
import { RADIUS, SPACING, SHADOW } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  id: string;
  title: string;
  price?: string;
  advantages: string[];
  onSubscribe: (productId: string) => void;
  loading?: boolean;
  recommended?: boolean;
  priceUnit?: string;
};

const PlanCard: React.FC<Props> = ({
  id,
  title,
  price,
  advantages,
  onSubscribe,
  loading,
  recommended = false,
  priceUnit,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        SHADOW.light,
        {
          backgroundColor: recommended ? colors.terraLight : colors.surface,
          borderColor: recommended ? colors.terra : colors.border,
        },
      ]}
    >
      {recommended && (
        <View style={[styles.badge, { backgroundColor: colors.terra }]}>
          <Ionicons name="star" size={11} color={colors.white} />
          <Text style={styles.badgeText}>{t("subscription.recommended")}</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {price && (
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.terra }]}>{price}</Text>
            <Text style={[styles.priceUnit, { color: colors.textMid }]}>
              {priceUnit ?? t("subscription.perMonth")}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.advantagesList}>
        {advantages.map((advantage) => (
          <View key={advantage} style={styles.advantageItem}>
            <View style={[styles.checkWrap, { backgroundColor: colors.terraLight }]}>
              <Ionicons name="checkmark" size={14} color={colors.terra} />
            </View>
            <Text style={[styles.advantageText, { color: colors.text }]}>{advantage}</Text>
          </View>
        ))}
      </View>

      <ModernButton
        title={loading ? t("common.loading") : t("subscription.subscribe")}
        onPress={() => onSubscribe(id)}
        variant={recommended ? "primary" : "outline"}
        size="large"
        fullWidth
        disabled={loading}
        icon="arrow-forward"
        iconPosition="right"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
  },
  badge: {
    position: "absolute",
    top: -13,
    right: SPACING.xl,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: F.sans700,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 22,
    fontFamily: F.sans700,
    marginBottom: SPACING.xs,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  price: {
    fontSize: 30,
    fontFamily: F.sans700,
  },
  priceUnit: {
    fontSize: 15,
    fontFamily: F.sans400,
  },
  advantagesList: {
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  advantageItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkWrap: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  advantageText: {
    flex: 1,
    fontSize: 14,
    fontFamily: F.sans400,
    lineHeight: 22,
  },
});

export default PlanCard;
