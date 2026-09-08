import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { cardStyles } from "./cardStyles";
import { getBannerGradient, formatRelative, formatDateRange, tripDuration } from "../../utils/invitationUtils";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface SentProps {
  invitation: any;
  disabled?: boolean;
  onViewTrip: () => void;
  onCancel: () => void;
}

const SentCard: React.FC<SentProps> = ({ invitation: inv, disabled, onViewTrip, onCancel }) => {
  const { t }      = useTranslation();
  const { colors } = useTheme();

  const status      = inv.status ?? "pending";
  const tripName    = inv.trip?.title ?? t("invitation.tripFallback");
  const destination = inv.trip?.destination ?? "";
  const invitee     = inv.inviteeEmail ?? inv.inviteePhone ?? t("invitation.unknownRecipient");
  const gradient    = getBannerGradient(destination || tripName);
  const avatarColor = getAvatarColor(invitee);
  const initials    = getInitials(invitee.split("@")[0]);
  const relTime     = inv.createdAt ? formatRelative(inv.createdAt) : "";
  const dateRange   = inv.trip?.startDate && inv.trip?.endDate
    ? formatDateRange(inv.trip.startDate, inv.trip.endDate)
    : null;
  const duration    = inv.trip?.startDate && inv.trip?.endDate
    ? tripDuration(inv.trip.startDate, inv.trip.endDate)
    : null;

  const statusConfig: Record<string, { emoji: string; label: string; color: string }> = {
    pending:  { emoji: "⏳", label: t("invitation.statusPendingLabel"),  color: "#C07A20" },
    accepted: { emoji: "✓",  label: t("invitation.statusAcceptedLabel"), color: "#6B8C5A" },
    declined: { emoji: "✕",  label: t("invitation.statusDeclinedLabel"), color: "#C04040" },
    expired:  { emoji: "⏰", label: t("invitation.statusExpiredLabel"),  color: colors.textLight },
  };
  const sc = statusConfig[status] ?? statusConfig.pending;

  let actionEl: React.ReactNode = null;
  if (status === "accepted") {
    actionEl = (
      <TouchableOpacity style={cardStyles.viewTripLink} onPress={onViewTrip} activeOpacity={0.8}>
        <Text style={cardStyles.viewTripText}>{t("invitation.viewTripLink")}</Text>
      </TouchableOpacity>
    );
  } else if (status === "expired") {
    actionEl = (
      <View style={cardStyles.expiredRow}>
        <Ionicons name="hourglass-outline" size={16} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
        <Text style={[cardStyles.expiredText, { color: colors.textLight }]}>{t("invitation.expiredLabel")}</Text>
      </View>
    );
  } else if (status === "pending") {
    actionEl = (
      <TouchableOpacity style={[cardStyles.cancelInviteBtn, { backgroundColor: colors.dangerLight }, disabled && { opacity: 0.4 }]} onPress={onCancel} disabled={disabled} activeOpacity={0.85}>
        <Ionicons name="close-outline" size={18} color={colors.danger} {...DECORATIVE_ELEMENT_PROPS} />
        <Text style={[cardStyles.cancelInviteText, { color: colors.danger }]}>{t("invitation.cancelInviteBtn")}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyles.card, cardStyles.cardDefault, { backgroundColor: colors.surface }]}>
      {/* ── Banner ── */}
      <View style={cardStyles.banner}>
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <LinearGradient
          colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.70)"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={cardStyles.bannerBadge}>
          <Text style={cardStyles.bannerBadgeText}>{sc.emoji} {sc.label}</Text>
        </View>
        <View style={cardStyles.bannerBottom}>
          <View style={{ flex: 1 }}>
            <Text style={cardStyles.bannerTitle} numberOfLines={1}>{tripName}</Text>
            {destination ? (
              <Text style={cardStyles.bannerSub}>
                📍 {destination}{dateRange ? ` · ${dateRange}` : ""}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={cardStyles.cardBody}>
        <View style={cardStyles.inviterRow}>
          <View style={[cardStyles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={cardStyles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[cardStyles.inviterName, { color: colors.text }]} numberOfLines={1}>{invitee}</Text>
            <Text style={[cardStyles.inviterRole, { color: colors.textLight }]}>{t("invitation.invitedRole")} · {relTime}</Text>
          </View>
        </View>

        {duration ? (
          <View style={cardStyles.chips}>
            <View style={[cardStyles.chip, { backgroundColor: colors.bgMid }]}>
              <Text style={[cardStyles.chipLabel, { color: colors.textLight }]}>{t("invitation.duration")}</Text>
              <Text style={[cardStyles.chipValue, { color: colors.text }]}>{t("invitation.durationDays", { count: duration })}</Text>
            </View>
          </View>
        ) : null}

        {actionEl}
      </View>
    </View>
  );
};

export default SentCard;
