import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "../ui/BackButton";
import { useTranslation } from "react-i18next";
import { getBookingStatusTranslation } from "../../utils/i18n";
import { getBookingTypeIcon, getBookingTypeColorsDetail, getBookingStatusColorsDetail } from "../../utils/bookingHelpers";
import { Booking } from "../../types";
import { F } from "../../theme/fonts";
import { getCachedDestinationPhoto, getSyncCachedPhoto } from "../../utils/destinationPhoto";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&q=80&fit=crop",
];

interface Props {
  booking: Booking;
  gradient: readonly [string, string, ...string[]];
  insetTop: number;
  onBack: () => void;
}

const BookingHeroCover: React.FC<Props> = ({ booking, gradient, insetTop, onBack }) => {
  const { t } = useTranslation();
  const typeC   = getBookingTypeColorsDetail(booking.type);
  const statusC = getBookingStatusColorsDetail(booking.status);
  const fallbackPhoto = FALLBACK_PHOTOS[(booking.id.codePointAt(0) ?? 0) % FALLBACK_PHOTOS.length];
  const syncQuery = booking.address || booking.title;
  const [coverUri, setCoverUri] = useState<string>(
    getSyncCachedPhoto(syncQuery) || fallbackPhoto
  );

  useEffect(() => {
    const query = booking.address || booking.title;
    getCachedDestinationPhoto(query).then((url) => {
      setCoverUri(url ?? fallbackPhoto);
    });
  }, [booking.id, booking.address, booking.title]);

  return (
    <View style={styles.heroCover}>
      {/* Décorative : illustration d'ambiance, le titre et le statut sont lus en dessous. */}
      <Image
        source={{ uri: coverUri }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        onError={() => setCoverUri(fallbackPhoto)}
        {...DECORATIVE_ELEMENT_PROPS}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.70)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <BackButton
        variant="overlay"
        onPress={onBack}
        style={[styles.backButton, { top: insetTop + 10 }]}
      />

      <View style={styles.heroBottom}>
        <View style={styles.heroBadgeRow}>
          <View style={[styles.heroBadge, { backgroundColor: typeC.bg }]}>
            <Ionicons name={getBookingTypeIcon(booking.type) as keyof typeof Ionicons.glyphMap} size={13} color={typeC.stripe} {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={[styles.heroBadgeText, { color: typeC.stripe }]}>
              {t(`bookings.filters.${booking.type}`)}
            </Text>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: statusC.bg }]}>
            <Text style={[styles.heroBadgeText, { color: statusC.color }]}>
              {booking.status ? getBookingStatusTranslation(booking.status) : t("common.unknown")}
            </Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>{booking.title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroCover: {
    height: 305,
    position: "relative",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  backButton: {
    position: "absolute",
    left: 16,
  },
  heroBottom: { paddingHorizontal: 18, paddingBottom: 16 },
  heroBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroBadgeText: { fontSize: 11, fontFamily: F.sans600 },
  heroTitle: { fontSize: 28, fontFamily: F.sans700, color: "#FFFFFF", lineHeight: 34 },
});

export default BookingHeroCover;
