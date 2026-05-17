import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "../ui/BackButton";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList, Trip } from "../../types";
import { formatDate } from "../../utils/i18n";
import { F } from "../../theme/fonts";
import { getCachedDestinationPhoto, getSyncCachedPhoto } from "../../utils/destinationPhoto";

const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&q=80&fit=crop",
];

type NavigationProp = StackNavigationProp<RootStackParamList, "TripDetails">;

const heroColors = (status: string): [string, string, string] => {
  if (status === "active" || status === "validated") {
    return ["#2C4A3E", "#1A3028", "#3D5A4A"];
  }
  return ["#3A3020", "#1E1A10", "#2A2216"];
};

interface Props {
  trip: Trip;
  tripId: string;
  isOwner: boolean;
  canEdit?: boolean;
  bookingsCount: number;
  addressesCount: number;
}

const TripHero: React.FC<Props> = ({
  trip,
  tripId,
  isOwner,
  canEdit,
  bookingsCount,
  addressesCount,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const { top: insetTop } = useSafeAreaInsets();
  const gradientColors = heroColors(trip.status);
  const fallbackPhoto = FALLBACK_PHOTOS[(tripId.codePointAt(0) ?? 0) % FALLBACK_PHOTOS.length];
  const [fetchedCover, setFetchedCover] = useState<string>(
    trip.coverImage || getSyncCachedPhoto(trip.destination) || fallbackPhoto
  );

  useEffect(() => {
    if (!trip.coverImage && trip.destination) {
      getCachedDestinationPhoto(trip.destination).then((url) => {
        if (url) setFetchedCover(url);
      });
    }
  }, [trip.coverImage, trip.destination]);

  const coverUri = trip.coverImage || fetchedCover;

  return (
    <View style={s.hero}>
      {coverUri ? (
        <Image
          source={{ uri: coverUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[StyleSheet.absoluteFill, s.heroOverlay]} />

      <BackButton
        variant="overlay"
        onPress={() => navigation.goBack()}
        style={[s.heroBackBtn, { top: insetTop + 10 }]}
      />

      {(isOwner || canEdit) && (
        <TouchableOpacity
          style={[s.heroHeartBtn, { top: insetTop + 10 }]}
          onPress={() =>
            navigation.navigate("TripActions", {
              tripId,
              tripTitle: trip.title,
              destination: trip.destination,
              startDate: trip.startDate instanceof Date ? trip.startDate.toISOString() : String(trip.startDate),
              endDate: trip.endDate instanceof Date ? trip.endDate.toISOString() : String(trip.endDate),
              coverImage: trip.coverImage,
              totalBookings: bookingsCount,
              totalAddresses: addressesCount,
              isOwner,
            })
          }
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <View style={s.heroBottom}>
        <Text style={s.heroTitle} numberOfLines={1}>{trip.title}</Text>
        <View style={s.heroDestRow}>
          <Text style={s.heroDestText}>
            📍 {trip.destination}
            {" · "}
            {formatDate(trip.startDate, { day: "numeric", month: "short" })}
            {" — "}
            {formatDate(trip.endDate, { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  hero: {
    height: 305,
    position: "relative",
    overflow: "hidden",
  },
  heroOverlay: {
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  heroBackBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  heroHeartBtn: {
    position: "absolute",
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  heroBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: F.sans700,
    color: "#FFFFFF",
    lineHeight: 34,
    marginBottom: 4,
  },
  heroDestRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroDestText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontFamily: F.sans400,
  },
});

export default TripHero;
