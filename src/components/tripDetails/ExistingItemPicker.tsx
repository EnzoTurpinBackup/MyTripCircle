import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { Booking, Address } from "../../types";
import { formatDate } from "../../utils/i18n";
import { F } from "../../theme/fonts";
import { RADIUS } from "../../theme";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

// ─── Animation ─────────────────────────────────────────────────────────────────

function usePickerAnimation(visible: boolean) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetY, { toValue: 0, bounciness: 3, speed: 14, useNativeDriver: true }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetY.setValue(300);
    }
  }, [visible]);

  return { backdropOpacity, sheetY };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const bookingIconName = (type: string): any => {
  switch (type) {
    case "flight":     return "airplane";
    case "hotel":      return "bed";
    case "train":      return "train";
    case "restaurant": return "restaurant";
    case "activity":   return "star";
    default:           return "receipt";
  }
};

const bookingColor = (type: string): string => {
  switch (type) {
    case "flight":     return "#5A8FAA";
    case "hotel":      return "#6B8C5A";
    case "train":
    case "restaurant": return "#C4714A";
    case "activity":   return "#8B70C0";
    default:           return "#C4714A";
  }
};

const addressIconName = (type: string): any => {
  switch (type) {
    case "hotel":      return "bed";
    case "restaurant": return "restaurant";
    case "activity":   return "star";
    default:           return "location";
  }
};

const addressColor = (type: string): string => {
  switch (type) {
    case "hotel":      return "#6B8C5A";
    case "restaurant": return "#C4714A";
    case "activity":   return "#8B70C0";
    default:           return "#5A8FAA";
  }
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface BookingPickerProps {
  visible: boolean;
  bookings: Booking[];
  onSelect: (booking: Booking) => void;
  onClose: () => void;
}

interface AddressPickerProps {
  visible: boolean;
  addresses: Address[];
  onSelect: (address: Address) => void;
  onClose: () => void;
}

// ─── Booking picker ────────────────────────────────────────────────────────────

export const ExistingBookingPicker: React.FC<BookingPickerProps> = ({
  visible,
  bookings,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { backdropOpacity, sheetY } = usePickerAnimation(visible);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[s.overlay, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[s.sheet, { backgroundColor: colors.bg, transform: [{ translateY: sheetY }] }]}
      >
        <TouchableOpacity activeOpacity={1}>
          <View style={[s.header, { borderBottomColor: colors.border }]}>
            <Text style={[s.title, { color: colors.text }]}>{t("tripDetails.pickExistingBooking")}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[s.closeBtn, { backgroundColor: colors.bgMid }]}
              accessibilityRole="button"
              accessibilityLabel={t("common.a11y.close")}
            >
              <Ionicons name="close" size={20} color={colors.textMid} />
            </TouchableOpacity>
          </View>

          {bookings.length === 0 ? (
            <View style={s.empty}>
              <Text style={[s.emptyText, { color: colors.textMid }]}>{t("tripDetails.noOtherBookings")}</Text>
            </View>
          ) : (
            <FlatList
              data={bookings}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const color = bookingColor(item.type);
                return (
                  <TouchableOpacity
                    style={[s.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => onSelect(item)}
                    activeOpacity={0.75}
                  >
                    <View style={[s.iconWrap, { backgroundColor: color + "22" }]}>
                      <Ionicons name={bookingIconName(item.type)} size={20} color={color} {...DECORATIVE_ELEMENT_PROPS} />
                    </View>
                    <View style={s.info}>
                      <Text style={[s.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={[s.itemSub, { color: colors.textLight }]} numberOfLines={1}>
                        {formatDate(item.date)}
                        {item.address ? ` · ${item.address}` : ""}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={color} {...DECORATIVE_ELEMENT_PROPS} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

// ─── Address picker ────────────────────────────────────────────────────────────

export const ExistingAddressPicker: React.FC<AddressPickerProps> = ({
  visible,
  addresses,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { backdropOpacity, sheetY } = usePickerAnimation(visible);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[s.overlay, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[s.sheet, { backgroundColor: colors.bg, transform: [{ translateY: sheetY }] }]}
      >
        <TouchableOpacity activeOpacity={1}>
          <View style={[s.header, { borderBottomColor: colors.border }]}>
            <Text style={[s.title, { color: colors.text }]}>{t("tripDetails.pickExistingAddress")}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[s.closeBtn, { backgroundColor: colors.bgMid }]}
              accessibilityRole="button"
              accessibilityLabel={t("common.a11y.close")}
            >
              <Ionicons name="close" size={20} color={colors.textMid} />
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <View style={s.empty}>
              <Text style={[s.emptyText, { color: colors.textMid }]}>{t("tripDetails.noOtherAddresses")}</Text>
            </View>
          ) : (
            <FlatList
              data={addresses}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const color = addressColor(item.type);
                return (
                  <TouchableOpacity
                    style={[s.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => onSelect(item)}
                    activeOpacity={0.75}
                  >
                    <View style={[s.iconWrap, { backgroundColor: color + "22" }]}>
                      <Ionicons name={addressIconName(item.type)} size={20} color={color} {...DECORATIVE_ELEMENT_PROPS} />
                    </View>
                    <View style={s.info}>
                      <Text style={[s.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[s.itemSub, { color: colors.textLight }]} numberOfLines={1}>
                        {[item.city, item.country].filter(Boolean).join(", ")}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={color} {...DECORATIVE_ELEMENT_PROPS} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(42,35,24,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: F.sans700,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 16,
    gap: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  info: { flex: 1 },
  itemTitle: {
    fontSize: 15,
    fontFamily: F.sans600,
    marginBottom: 3,
  },
  itemSub: {
    fontSize: 13,
    fontFamily: F.sans400,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: F.sans400,
  },
});
