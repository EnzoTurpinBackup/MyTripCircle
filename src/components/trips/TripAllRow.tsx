import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { Trip } from "../../types";
import { RADIUS } from "../../theme";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const formatShortDate = (date: Date, monthsShort: string[]): string => {
  const d = new Date(date);
  return `${d.getDate()} ${monthsShort[d.getMonth()]}`;
};

interface Props {
  trip: Trip;
  photoUri: string;
  onPress: () => void;
}

const TripAllRow: React.FC<Props> = ({ trip, photoUri, onPress }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const monthsShort = t("trips.months").split(",");

  return (
    <TouchableOpacity
      style={[styles.allTripRow, { backgroundColor: colors.surface, borderColor: colors.bgMid }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Décorative : le titre et la destination du voyage suivent dans la même ligne. */}
      <Image source={{ uri: photoUri }} style={styles.allTripPhoto} resizeMode="cover" {...DECORATIVE_ELEMENT_PROPS} />
      <View style={styles.allTripInfo}>
        <Text style={[styles.allTripName, { color: colors.text }]} numberOfLines={1}>{trip.title}</Text>
        <Text style={[styles.allTripMeta, { color: colors.textMid }]} numberOfLines={1}>
          📍 {trip.destination} · {formatShortDate(trip.startDate, monthsShort)}–{formatShortDate(trip.endDate, monthsShort)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  allTripRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.card,
    overflow: "hidden",
    borderWidth: 1,
  },
  allTripPhoto: { width: 64, height: 64 },
  allTripInfo: { flex: 1, paddingHorizontal: 12, gap: 4 },
  allTripName: { fontSize: 14, fontFamily: F.sans600 },
  allTripMeta: { fontSize: 12, fontFamily: F.sans400 },
});

export default TripAllRow;
