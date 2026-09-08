import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { F } from "../../theme/fonts";
import { Address } from "../../types";
import { useTheme } from "../../contexts/ThemeContext";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const MOSS = "#6B8C5A";
const MOSS_LIGHT = "#E2EDD9";
const SKY = "#5A8FAA";
const SKY_LIGHT = "#DCF0F5";

const getTypeIcon = (type: Address["type"]) => {
  switch (type) {
    case "hotel":      return "bed-outline";
    case "restaurant": return "restaurant-outline";
    case "activity":   return "ticket-outline";
    case "transport":  return "car-outline";
    default:           return "location-outline";
  }
};

const getIconColors = (type: Address["type"]) => {
  switch (type) {
    case "hotel":      return { bg: SKY_LIGHT,  icon: SKY };
    case "restaurant": return { bg: "#F5E5DC",  icon: "#C4714A" };
    case "activity":   return { bg: MOSS_LIGHT, icon: MOSS };
    default:           return { bg: "#F0EBE3", icon: "#5A4A3A" };
  }
};

const getTagColors = (type: Address["type"]) => {
  switch (type) {
    case "hotel":      return { bg: SKY_LIGHT,  text: SKY };
    case "restaurant": return { bg: "#F5E5DC",  text: "#A35830" };
    case "activity":   return { bg: MOSS_LIGHT, text: MOSS };
    default:           return { bg: "#F0EBE3", text: "#5A4A3A" };
  }
};

interface MapMarkerPopupProps {
  address: Address;
  onClose: () => void;
  onNavigate: (addressId: string) => void;
}

const MapMarkerPopup: React.FC<MapMarkerPopupProps> = ({ address, onClose, onNavigate }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const ic  = getIconColors(address.type);
  const tag = getTagColors(address.type);

  return (
    // Zone transparente qui capte les taps pour fermer la popup
    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity style={styles.popup} activeOpacity={1} onPress={() => {}}>
        <View style={styles.popupRow}>
          <View style={[styles.popupIcon, { backgroundColor: ic.bg }]}>
            <Ionicons name={getTypeIcon(address.type) as keyof typeof Ionicons.glyphMap} size={16} color={ic.icon} {...DECORATIVE_ELEMENT_PROPS} />
          </View>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={[styles.popupName, { color: colors.text }]} numberOfLines={1}>{address.name}</Text>
            <Text style={[styles.popupCity, { color: colors.textMid }]} numberOfLines={1}>{address.city}, {address.country}</Text>
          </View>
          <View style={[styles.popupTag, { backgroundColor: tag.bg }]}>
            <Text style={[styles.popupTagText, { color: tag.text }]}>
              {t(`addresses.filters.${address.type}`)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.popupClose}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t("common.a11y.close")}
          >
            <Ionicons name="close" size={16} color={colors.textMid} />
          </TouchableOpacity>
        </View>
        {address.address ? (
          <Text style={[styles.popupAddress, { color: colors.textMid }]} numberOfLines={1}>{address.address}</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.popupCta, { backgroundColor: colors.terraDark }]}
          activeOpacity={0.85}
          onPress={() => onNavigate(address.id)}
        >
          <Text style={styles.popupCtaText}>Voir les détails</Text>
          <Ionicons name="arrow-forward" size={13} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
        </TouchableOpacity>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  popup: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#2A2318",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  popupRow:    { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  popupIcon: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
    marginRight: 10, flexShrink: 0,
  },
  popupName: { fontSize: 14, fontFamily: F.sans700, marginBottom: 2 },
  popupCity: { fontSize: 12, fontFamily: F.sans400 },
  popupTag:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, flexShrink: 0, marginRight: 6 },
  popupTagText: { fontSize: 11, fontFamily: F.sans600 },
  popupClose: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#F5F0EB",
  },
  popupAddress: { fontSize: 12, fontFamily: F.sans400, marginBottom: 10 },
  popupCta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 9, paddingVertical: 8,
  },
  popupCtaText: { color: "#FFFFFF", fontSize: 13, fontFamily: F.sans600 },
});

export default MapMarkerPopup;
