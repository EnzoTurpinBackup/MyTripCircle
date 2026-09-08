import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { cardStyles } from "./cardStyles";
import { getBannerGradient, formatRelative, formatDateRange, tripDuration } from "../../utils/invitationUtils";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

function buildBadge(expanded: boolean, isUnread: boolean, t: ReturnType<typeof useTranslation>["t"]): React.ReactNode {
  if (expanded) return <View style={cardStyles.bannerBadge}><Text style={cardStyles.bannerBadgeText}>{t("invitation.badgePending")}</Text></View>;
  if (isUnread) return <View style={cardStyles.bannerBadge}><Text style={cardStyles.bannerBadgeText}>{t("invitation.badgeNew")}</Text></View>;
  return null;
}

function buildFooter(
  canAct: boolean, status: string, isExpired: boolean | Date | null | undefined,
  colors: { textLight: string }, t: ReturnType<typeof useTranslation>["t"], onViewTrip: () => void,
): React.ReactNode {
  if (canAct) return null;
  if (status === "accepted") {
    return (
      <TouchableOpacity style={cardStyles.viewTripLink} onPress={onViewTrip} activeOpacity={0.8}>
        <Text style={cardStyles.viewTripText}>{t("invitation.viewTripLink")}</Text>
      </TouchableOpacity>
    );
  }
  if (isExpired) {
    return (
      <View style={cardStyles.expiredRow}>
        <Ionicons name="hourglass-outline" size={16} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
        <Text style={[cardStyles.expiredText, { color: colors.textLight }]}>{t("invitation.expiredLabel")}</Text>
      </View>
    );
  }
  return null;
}

function computeTripDates(inv: any): { dateRange: string | null; duration: number | null } {
  if (inv.trip?.startDate && inv.trip?.endDate) {
    return { dateRange: formatDateRange(inv.trip.startDate, inv.trip.endDate), duration: tripDuration(inv.trip.startDate, inv.trip.endDate) };
  }
  return { dateRange: null, duration: null };
}

function buildInviterBody(
  expanded: boolean, inviterName: string, relTime: string, dateRange: string | null,
  colors: { text: string; textLight: string }, t: ReturnType<typeof useTranslation>["t"],
): React.ReactNode {
  const dateRangeStr = dateRange ? `📅 ${dateRange}` : "";
  const relTimeStr   = relTime   ? ` · ${relTime}`   : "";
  if (expanded) {
    return (
      <>
        <Text style={[cardStyles.inviterName, { color: colors.text }]}>{inviterName}</Text>
        <Text style={[cardStyles.inviterRole, { color: colors.textLight }]}>{t("invitation.roleOrganizer")} · {relTime}</Text>
      </>
    );
  }
  return (
    <>
      <Text style={[cardStyles.inviterNameSmall, { color: colors.text }]}>
        {t("invitation.invitedBy")} <Text style={cardStyles.bold}>{inviterName}</Text>
      </Text>
      <Text style={[cardStyles.inviterDate, { color: colors.textLight }]}>{dateRangeStr}{relTimeStr}</Text>
    </>
  );
}

function buildAcceptContent(accepting: boolean, t: ReturnType<typeof useTranslation>["t"]): React.ReactNode {
  if (accepting) return <ActivityIndicator size="small" color="#FFFFFF" />;
  return <><Ionicons name="checkmark" size={16} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} /><Text style={cardStyles.btnAcceptText}>{t("invitation.acceptBtn")}</Text></>;
}

function buildDestinationEl(destination: string, dateRange: string | null): React.ReactNode {
  if (!destination) return null;
  return <Text style={cardStyles.bannerSub}>📍 {destination}{dateRange ? ` · ${dateRange}` : ""}</Text>;
}

function buildMoreBtn(expanded: boolean, colors: { bgMid: string; textMid: string }, onDetail: () => void): React.ReactNode {
  if (expanded) return null;
  return (
    <TouchableOpacity style={[cardStyles.btnMore, { backgroundColor: colors.bgMid }]} onPress={onDetail} activeOpacity={0.8}>
      <Text style={[cardStyles.btnMoreText, { color: colors.textMid }]}>›</Text>
    </TouchableOpacity>
  );
}

interface CardProps {
  invitation: any;
  expanded: boolean;
  accepting: boolean;
  disabled?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onDetail: () => void;
  onViewTrip: () => void;
}

const InvitationCard: React.FC<CardProps> = ({
  invitation: inv, expanded, accepting, disabled, onAccept, onDecline, onDetail, onViewTrip,
}) => {
  const { t }      = useTranslation();
  const { colors } = useTheme();

  const status      = inv.status ?? "pending";
  const tripName    = inv.tripName   ?? inv.trip?.title       ?? t("invitation.thisTripRef");
  const destination = inv.trip?.destination ?? "";
  const inviterName = inv.inviterName ?? inv.inviter?.name    ?? t("invitation.someoneRef");
  const isUnread    = inv.read === false; // NOSONAR — distingue false de undefined (non synchronisé)
  const isExpired   = status === "pending" && inv.expiresAt && new Date() > new Date(inv.expiresAt);
  const canAct      = status === "pending" && !isExpired;
  const hasImage    = !!inv.trip?.coverImage;
  const gradient    = getBannerGradient(destination || tripName);
  const avatarColor = getAvatarColor(inviterName);
  const initials    = getInitials(inviterName);
  const relTime  = inv.createdAt ? formatRelative(inv.createdAt) : "";
  const { dateRange, duration } = computeTripDates(inv);

  const badgeEl       = buildBadge(expanded, isUnread, t);
  const footerEl      = buildFooter(canAct, status, isExpired, colors, t, onViewTrip);
  const inviterBodyEl = buildInviterBody(expanded, inviterName, relTime, dateRange, colors, t);
  const acceptContentEl = buildAcceptContent(accepting, t);

  const cardBorderStyle = (isUnread && status === "pending")
    ? [cardStyles.cardActive, { borderColor: colors.terra, shadowColor: colors.terra }]
    : cardStyles.cardDefault;

  // Bannière décorative : le nom du voyage et sa destination sont lus par-dessus.
  const bannerBgEl = hasImage
    ? <Image source={{ uri: inv.trip.coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" {...DECORATIVE_ELEMENT_PROPS} />
    : <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />;

  const destinationEl = buildDestinationEl(destination, dateRange);

  const messageEl  = expanded && inv.message
    ? <View style={[cardStyles.messageBox, { backgroundColor: colors.terraLight, borderLeftColor: colors.terra }]}><Text style={[cardStyles.messageText, { color: colors.text }]}>"{inv.message}"</Text></View>
    : null;

  const durationEl = expanded && duration
    ? (
      <View style={cardStyles.chips}>
        <View style={[cardStyles.chip, { backgroundColor: colors.bgMid }]}>
          <Text style={[cardStyles.chipLabel, { color: colors.textLight }]}>{t("invitation.duration")}</Text>
          <Text style={[cardStyles.chipValue, { color: colors.text }]}>{t("invitation.durationDays", { count: duration })}</Text>
        </View>
      </View>
    )
    : null;

  const expandedActionsStyle = expanded ? cardStyles.actionsExpanded : undefined;
  const expandedBtnStyle     = expanded ? cardStyles.btnAcceptExpanded : undefined;
  const moreBtnEl = buildMoreBtn(expanded, colors, onDetail);

  return (
    <TouchableOpacity
      style={[cardStyles.card, cardBorderStyle, { backgroundColor: colors.surface }]}
      onPress={onDetail}
      activeOpacity={0.92}
    >
      {/* ── Banner ── */}
      <View style={cardStyles.banner}>
        {bannerBgEl}
        <LinearGradient
          colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.70)"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        {isUnread && <View style={[cardStyles.unreadDot, { backgroundColor: colors.terra }]} />}
        {badgeEl}
        <View style={cardStyles.bannerBottom}>
          <View style={{ flex: 1 }}>
            <Text style={cardStyles.bannerTitle} numberOfLines={1}>{tripName}</Text>
            {destinationEl}
          </View>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={cardStyles.cardBody}>
        <View style={cardStyles.inviterRow}>
          <View style={[cardStyles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={cardStyles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>{inviterBodyEl}</View>
        </View>

        {messageEl}
        {durationEl}

        {canAct && (
          <View style={[cardStyles.actions, expandedActionsStyle]}>
            <TouchableOpacity
              style={[cardStyles.btnAccept, expandedBtnStyle, { backgroundColor: colors.terra, shadowColor: colors.terra }, (accepting || disabled) && { opacity: 0.4 }]}
              onPress={onAccept}
              disabled={accepting || disabled}
              activeOpacity={0.85}
            >
              {acceptContentEl}
            </TouchableOpacity>
            <TouchableOpacity
              style={[cardStyles.btnDecline, { backgroundColor: colors.bgMid }, (accepting || disabled) && { opacity: 0.4 }]}
              onPress={onDecline}
              disabled={accepting || disabled}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={16} color={colors.textMid} {...DECORATIVE_ELEMENT_PROPS} />
              <Text style={[cardStyles.btnDeclineText, { color: colors.textMid }]}>{t("invitation.declineBtn")}</Text>
            </TouchableOpacity>
            {moreBtnEl}
          </View>
        )}
        {!canAct && footerEl}
      </View>
    </TouchableOpacity>
  );
};

export default InvitationCard;
