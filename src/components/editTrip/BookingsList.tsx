import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Booking } from "../../types";
import { formatDate } from "../../utils/i18n";
import { F } from "../../theme/fonts";
import { useTheme } from "../../contexts/ThemeContext";
import { listSharedStyles } from "./listSharedStyles";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const BOOKING_ICON: Record<Booking["type"], string> = {
  flight:     "airplane",
  train:      "train",
  hotel:      "bed",
  restaurant: "restaurant",
  activity:   "ticket",
};

const BOOKING_STRIPE_COLOR: Record<Booking["type"], string> = {
  flight:     "#5A8FAA",
  train:      "#C4714A",
  hotel:      "#6B8C5A",
  restaurant: "#C4714A",
  activity:   "#8B70C0",
};

const bookingIconBg = (type: Booking["type"], isDark: boolean): string => {
  if (isDark) {
    switch (type) {
      case "flight":     return "#1A2E35";
      case "hotel":      return "#1E2E1A";
      case "activity":   return "#251E35";
      default:           return "#2E1E15";
    }
  }
  switch (type) {
    case "flight":     return "#DCF0F5";
    case "hotel":      return "#E2EDD9";
    case "activity":   return "#EDE8F5";
    default:           return "#F5E5DC";
  }
};

interface Props {
  bookings: Booking[];
  colors: {
    textLight: string;
    terra: string;
    terraLight: string;
    surface: string;
    border: string;
    bgMid: string;
    textMid: string;
    dangerLight: string;
    text: string;
  };
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

const BookingsList: React.FC<Props> = ({ bookings, colors, onAdd, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  return (
    <>
      <View style={s.sectionRow}>
        <Text style={[s.sectionLbl, { color: colors.textLight }]}>{t("bookings.header")}</Text>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.terraLight }]}
          onPress={onAdd}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={17} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={[s.addBtnText, { color: colors.terra }]}>{t("bookings.addBooking")}</Text>
        </TouchableOpacity>
      </View>

      {bookings.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="receipt-outline" size={40} color={colors.border} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={[s.emptyText, { color: colors.textLight }]}>{t("bookings.emptyAll")}</Text>
        </View>
      ) : (
        <View style={s.list}>
          {bookings.map((booking, index) => (
            <View
              key={booking.id || index}
              style={[s.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[s.stripe, { backgroundColor: BOOKING_STRIPE_COLOR[booking.type] ?? "#C4714A" }]} />
              <View style={s.content}>
                <View style={[s.iconWrap, { backgroundColor: bookingIconBg(booking.type, isDark) }]}>
                  <Ionicons
                    name={(BOOKING_ICON[booking.type] ?? "receipt") as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={BOOKING_STRIPE_COLOR[booking.type] ?? "#C4714A"}
                    {...DECORATIVE_ELEMENT_PROPS}
                  />
                </View>
                <View style={s.info}>
                  <Text style={[s.title, { color: colors.text }]}>{booking.title}</Text>
                  <Text style={[s.date, { color: colors.textLight }]}>
                    {formatDate(booking.date)}
                    {booking.time ? ` · ${booking.time}` : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: colors.bgMid }]}
                  onPress={() => onEdit(index)}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.a11y.editItem", { item: booking.title })}
                >
                  <Ionicons name="pencil" size={17} color={colors.textMid} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: colors.dangerLight }]}
                  onPress={() => onDelete(index)}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.a11y.deleteItem", { item: booking.title })}
                >
                  <Ionicons name="trash" size={17} color="#C04040" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
};

const s = {
  ...listSharedStyles,
  ...StyleSheet.create({
    date: { fontSize: 13, fontFamily: F.sans400, marginTop: 3 },
  }),
};

export default BookingsList;
