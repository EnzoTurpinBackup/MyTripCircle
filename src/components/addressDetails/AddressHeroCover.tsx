import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Address } from "../../types";
import { F } from "../../theme/fonts";
import { useTheme } from "../../contexts/ThemeContext";
import BackButton from "../ui/BackButton";
import { getCachedDestinationPhoto, getSyncCachedPhoto } from "../../utils/destinationPhoto";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&q=80&fit=crop",
];

interface Props {
  address: Address;
  gradient: [string, string, string];
  badge: { label: string; emoji: string };
  insetTop: number;
  onBack: () => void;
}

const AddressHeroCover: React.FC<Props> = ({ address, gradient, badge, insetTop, onBack }) => {
  const { colors } = useTheme();
  const fallbackPhoto = FALLBACK_PHOTOS[(address.id.codePointAt(0) ?? 0) % FALLBACK_PHOTOS.length];
  const syncQuery = address.name || `${address.city} ${address.country}`;
  const [coverUri, setCoverUri] = useState<string>(
    address.photoUrl || getSyncCachedPhoto(syncQuery) || fallbackPhoto
  );

  useEffect(() => {
    if (address.photoUrl) return;
    const query = address.name || `${address.city} ${address.country}`;
    getCachedDestinationPhoto(query).then((url) => {
      if (url) setCoverUri(url);
    });
  }, [address.photoUrl, address.name, address.city]);

  return (
    <View style={styles.heroCover}>
      {/* Décorative : illustration d'ambiance, le nom et le type d'adresse sont lus en dessous. */}
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
        <View style={[styles.typeBadge, { backgroundColor: colors.terraLight }]}>
          <Text style={[styles.typeBadgeText, { color: colors.terra }]}>
            {badge.emoji} {badge.label}
          </Text>
        </View>
        <Text style={styles.heroTitle}>{address.name}</Text>
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
  heroBottom: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  typeBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 13,
    fontFamily: F.sans600,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: F.sans700,
    color: "#FFFFFF",
    lineHeight: 34,
  },
});

export default AddressHeroCover;
