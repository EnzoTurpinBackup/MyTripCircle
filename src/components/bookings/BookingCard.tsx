import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { Booking } from "../../types";
import { formatDate, getBookingStatusTranslation } from "../../utils/i18n";
import { getBookingTypeIcon, getBookingTypeColors, getBookingStatusColors } from "../../utils/bookingHelpers";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const MOSS = "#6B8C5A";

interface Props {
  booking: Booking;
  onPress: () => void;
}

const BookingCard: React.FC<Props> = ({ booking: item, onPress }) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const typeC   = getBookingTypeColors(item.type, isDark);
  const statusC = getBookingStatusColors(item.status, isDark);
  const stripeColor    = typeC?.stripe ?? colors.textMid;
  const typeBg         = typeC?.bg ?? colors.bgMid;
  const statusBgColor  = statusC?.bg ?? colors.bgMid;
  const statusTextColor = statusC?.color ?? colors.textMid;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.cardStripe, { backgroundColor: stripeColor }]} />

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.typeIconCircle, { backgroundColor: typeBg }]}>
            <Ionicons name={getBookingTypeIcon(item.type) as keyof typeof Ionicons.glyphMap} size={24} color={stripeColor} {...DECORATIVE_ELEMENT_PROPS} />
          </View>

          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textLight }]} numberOfLines={1}>
              {formatDate(item.date)}
              {item.time ? ` · ${item.time}` : ""}
            </Text>
          </View>

          <View style={styles.cardRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusTextColor }]}>
                {item.status ? getBookingStatusTranslation(item.status) : t("common.unknown")}
              </Text>
            </View>
          </View>
        </View>

        {item.description ? (
          <Text style={[styles.cardDescription, { color: colors.textMid }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {item.address ? (
          <View style={styles.cardAddressRow}>
            <Ionicons name="location-outline" size={16} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={[styles.cardAddressText, { color: colors.textLight }]} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        ) : null}

        {item.confirmationNumber ? (
          <View style={styles.cardConfRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={MOSS} {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={[styles.cardConfText, { color: colors.textMid }]}>{item.confirmationNumber}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 12,
  },
  cardStripe: { width: 5, height: 48, borderRadius: 3, marginRight: 4, flexShrink: 0 },
  cardBody: { flex: 1, paddingRight: 14 },
  cardTopRow: { flexDirection: "row", alignItems: "center" },
  typeIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    marginRight: 12,
  },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 17, fontFamily: F.sans600, marginBottom: 3 },
  cardSubtitle: { fontSize: 14, fontFamily: F.sans400 },
  cardRight: { alignItems: "flex-end", gap: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 13, fontFamily: F.sans600 },
  cardDescription: { fontSize: 14, marginTop: 10, lineHeight: 20, fontFamily: F.sans400 },
  cardAddressRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 5 },
  cardAddressText: { fontSize: 13, flex: 1, fontFamily: F.sans400 },
  cardConfRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 5 },
  cardConfText: { fontSize: 13, fontFamily: F.sans500 },
});

export default BookingCard;
