import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Booking } from "../../types";
import { useTheme } from "../../contexts/ThemeContext";
import { formatDate } from "../../utils/i18n";
import { F } from "../../theme/fonts";
import ItemActionSheet from "../ItemActionSheet";
import BookingForm from "../BookingForm";
import { tabSharedStyles } from "./tabSharedStyles";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const bookingStripeColor = (type: string): string => {
  switch (type) {
    case "flight":      return "#5A8FAA";
    case "hotel":       return "#6B8C5A";
    case "train":
    case "restaurant":  return "#C4714A";
    case "activity":    return "#8B70C0";
    default:            return "#C4714A";
  }
};

const bookingIconBg = (type: string, isDark: boolean): string => {
  if (isDark) {
    switch (type) {
      case "flight":      return "#1A2E35";
      case "hotel":       return "#1E2E1A";
      case "train":
      case "restaurant":  return "#2E1E15";
      case "activity":    return "#251E35";
      default:            return "#2E1E15";
    }
  }
  switch (type) {
    case "flight":      return "#DCF0F5";
    case "hotel":       return "#E2EDD9";
    case "train":
    case "restaurant":  return "#F5E5DC";
    case "activity":    return "#EDE8F5";
    default:            return "#F5E5DC";
  }
};

const bookingIconName = (type: string): any => {
  switch (type) {
    case "flight":      return "airplane";
    case "hotel":       return "bed";
    case "train":       return "train";
    case "restaurant":  return "restaurant";
    case "activity":    return "star";
    case "car":         return "car";
    default:            return "receipt";
  }
};

interface Props {
  bookings: Booking[];
  isOwner: boolean;
  canEdit?: boolean;
  onAddBooking?: () => void;
  onUpdateBooking?: (bookingId: string, updates: Omit<Booking, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onDeleteBooking?: (bookingId: string) => Promise<void>;
}

const BookingsTab: React.FC<Props> = ({ bookings, isOwner, canEdit, onAddBooking, onUpdateBooking, onDeleteBooking }) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const [actionBooking, setActionBooking] = useState<Booking | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const canAdd = isOwner || canEdit;
  const canModify = isOwner || canEdit;

  const handleDeletePress = () => {
    if (!actionBooking || !onDeleteBooking) return;
    const id = actionBooking.id;
    setActionBooking(null);
    Alert.alert(
      t("common.delete"),
      t("bookings.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => onDeleteBooking(id),
        },
      ]
    );
  };

  const handleEditPress = () => {
    setShowEditForm(true);
  };

  const handleSaveEdit = async (updates: Omit<Booking, "id" | "createdAt" | "updatedAt">) => {
    if (!actionBooking || !onUpdateBooking) return;
    await onUpdateBooking(actionBooking.id, updates);
    setShowEditForm(false);
    setActionBooking(null);
  };

  if (bookings.length === 0) {
    return (
      <View style={s.tabContent}>
        <View style={s.emptyState}>
          <Text style={[s.emptyText, { color: colors.textMid }]}>{t("tripDetails.noBookings")}</Text>
          {canAdd && onAddBooking && (
            <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onAddBooking} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color={colors.textMid} {...DECORATIVE_ELEMENT_PROPS} />
              <Text style={[s.addBtnText, { color: colors.textMid }]}>{t("tripDetails.addBooking")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={s.tabContent}>
      {canAdd && onAddBooking && (
        <TouchableOpacity style={[s.addBtnTop, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onAddBooking} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={18} color={colors.textMid} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={[s.addBtnText, { color: colors.textMid }]}>{t("tripDetails.addBooking")}</Text>
        </TouchableOpacity>
      )}
      {bookings.map((booking: Booking) => {
        const stripe = bookingStripeColor(booking.type);
        const iconBg = bookingIconBg(booking.type, isDark);
        const isConfirmed = booking.status === "confirmed";
        return (
          <TouchableOpacity
            key={booking.id}
            style={[s.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setActionBooking(booking)}
            activeOpacity={0.8}
          >
            <View style={[s.listStripe, { backgroundColor: stripe }]} />
            <View style={[s.listIconWrap, { backgroundColor: iconBg }]}>
              <Ionicons name={bookingIconName(booking.type)} size={22} color={stripe} {...DECORATIVE_ELEMENT_PROPS} />
            </View>
            <View style={s.listInfo}>
              <Text style={[s.listTitle, { color: colors.text }]} numberOfLines={1}>{booking.title}</Text>
              <Text style={[s.listSub, { color: colors.textLight }]} numberOfLines={1}>
                {formatDate(booking.date)}{booking.time ? ` · ${booking.time}` : ""}
              </Text>
            </View>
            {booking.status && (
              <View style={[
                s.statusPill,
                isConfirmed
                  ? { backgroundColor: "#E2EDD9" }
                  : { backgroundColor: colors.terraLight },
              ]}>
                <Text style={[
                  s.statusPillText,
                  isConfirmed ? { color: "#6B8C5A" } : { color: colors.terra },
                ]}>
                  {isConfirmed ? t("bookings.status.confirmed") : t("bookings.status.pending")}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <ItemActionSheet
        visible={!!actionBooking && !showEditForm}
        title={actionBooking?.title ?? ""}
        subtitle={actionBooking ? formatDate(actionBooking.date) : undefined}
        onClose={() => setActionBooking(null)}
        onEdit={handleEditPress}
        onDelete={handleDeletePress}
        canEdit={canModify && !!onUpdateBooking}
        canDelete={isOwner && !!onDeleteBooking}
      />

      <BookingForm
        visible={showEditForm}
        onClose={() => { setShowEditForm(false); setActionBooking(null); }}
        onSave={handleSaveEdit}
        initialBooking={actionBooking ?? undefined}
      />
    </View>
  );
};

const s = {
  ...tabSharedStyles,
  ...StyleSheet.create({
    statusPill: {
      alignSelf: "center" as const,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginHorizontal: 12,
    },
    statusPillText: {
      fontSize: 13,
      fontFamily: F.sans600,
    },
  }),
};

export default BookingsTab;
