import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, StyleProp, ViewStyle, ImageStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "../ui/BackButton";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../utils/i18n";
import { F } from "../../theme/fonts";
import { useTheme } from "../../contexts/ThemeContext";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface TripSummary {
  title: string;
  destination?: string;
  startDate: string | Date;
  endDate: string | Date;
  coverImage?: string;
}

interface Props {
  trip: TripSummary;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  insetTop: number;
  onBack: () => void;
  onReport?: () => void;
}

const fmtDate = (d: string | Date) =>
  formatDate(d, { day: "numeric", month: "long", year: "numeric" });

const fmtDateShort = (d: string | Date) =>
  formatDate(d, { day: "numeric", month: "short" });

const TripCoverHero: React.FC<Props> = ({
  trip, statusLabel, statusColor, statusBg, insetTop, onBack, onReport,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.cover, { backgroundColor: colors.textMid }]}>
      {trip.coverImage ? (
        /* Décorative : le titre, la destination et les dates du voyage sont lus en dessous. */
        <Image
          source={{ uri: trip.coverImage }}
          style={StyleSheet.absoluteFill as StyleProp<ImageStyle>}
          resizeMode="cover"
          {...DECORATIVE_ELEMENT_PROPS}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill as StyleProp<ViewStyle>, { backgroundColor: colors.textMid }]} />
      )}
      <LinearGradient
        colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0)", "rgba(0,0,0,0.75)"]}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFill as StyleProp<ViewStyle>}
      />

      <BackButton
        variant="overlay"
        onPress={onBack}
        style={[styles.backBtn, { top: insetTop + 10 }]}
      />

      <View style={[styles.topRight, { top: insetTop + 10 }]}>
        <View style={styles.readOnlyBadge}>
          <Ionicons name="eye-outline" size={13} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={styles.readOnlyText}>{t("tripPublicView.readOnly")}</Text>
        </View>
        {onReport && (
          <TouchableOpacity
            onPress={onReport}
            style={styles.reportBtn}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("tripPublicView.reportTrip")}
          >
            <Ionicons name="flag-outline" size={15} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.coverBottom}>
        <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <Text style={styles.coverTitle}>{trip.title}</Text>
        {trip.destination ? (
          <View style={styles.coverRow}>
            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={styles.coverSub}>{trip.destination}</Text>
          </View>
        ) : null}
        <View style={styles.coverRow}>
          <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.7)" {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={styles.coverDates}>
            {fmtDateShort(trip.startDate)} – {fmtDate(trip.endDate)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cover: {
    height: 280,
    position: "relative",
    justifyContent: "flex-end",
  },
  backBtn: {
    position: "absolute",
    left: 16,
  },
  topRight: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  readOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reportBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  readOnlyText: { fontSize: 12, fontFamily: F.sans600, color: "#FFFFFF" },
  coverBottom: { padding: 18, gap: 5 },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  statusText: { fontSize: 11, fontFamily: F.sans600 },
  coverTitle: { fontSize: 28, fontFamily: F.sans700, color: "#FFFFFF", lineHeight: 34 },
  coverRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  coverSub: { fontSize: 14, fontFamily: F.sans400, color: "rgba(255,255,255,0.85)" },
  coverDates: { fontSize: 12, fontFamily: F.sans400, color: "rgba(255,255,255,0.7)" },
});

export default TripCoverHero;
