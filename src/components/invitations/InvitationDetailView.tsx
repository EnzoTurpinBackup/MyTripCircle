import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BackButton from "../ui/BackButton";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { formatDate } from "../../utils/i18n";
import {
  getBannerGradient,
  formatRelative,
  formatDateRange,
  tripDuration,
} from "../../utils/invitationUtils";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils";
import { F } from "../../theme/fonts";
import { RADIUS } from "../../theme";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeInviteDates(inv: any): { dateRange: string | null; duration: number | null } {
  if (inv.trip?.startDate && inv.trip?.endDate) {
    return {
      dateRange: formatDateRange(inv.trip.startDate, inv.trip.endDate),
      duration: tripDuration(inv.trip.startDate, inv.trip.endDate),
    };
  }
  return { dateRange: null, duration: null };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type Colors = ReturnType<typeof useTheme>["colors"];

const LoadingView: React.FC<{ colors: Colors }> = ({ colors }) => {
  const { t } = useTranslation();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.terra} />
      <Text style={[styles.loadingText, { color: colors.textMid }]}>{t("invitation.loading")}</Text>
    </View>
  );
};

interface ErrorViewProps {
  colors: Colors;
  onNavigateBack: () => void;
}

const ErrorView: React.FC<ErrorViewProps> = ({ colors, onNavigateBack }) => {
  const { t } = useTranslation();
  return (
    <View style={[styles.errorContainer, { backgroundColor: colors.bg }]}>
      <Ionicons name="alert-circle" size={64} color="#C04040" />
      <Text style={[styles.errorTitle, { color: colors.text }]}>{t("invitation.notFound")}</Text>
      <Text style={[styles.errorMessage, { color: colors.textMid }]}>{t("invitation.notFoundMessage")}</Text>
      <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.terra }]} onPress={onNavigateBack}>
        <Text style={styles.backButtonText}>{t("common.back")}</Text>
      </TouchableOpacity>
    </View>
  );
};

interface StatusBannerProps {
  isExpired: boolean | Date | null | undefined;
  status: string;
}

const StatusBanner: React.FC<StatusBannerProps> = ({ isExpired, status }) => {
  const { t } = useTranslation();
  if (isExpired) {
    return (
      <View style={[styles.detailStatusBanner, { backgroundColor: "#FDEAEA", borderColor: "rgba(192,64,64,0.2)" }]}>
        <Ionicons name="hourglass-outline" size={20} color="#C04040" />
        <Text style={[styles.detailStatusText, { color: "#C04040" }]}>{t("invitation.expired")}</Text>
      </View>
    );
  }
  if (status === "accepted") {
    return (
      <View style={[styles.detailStatusBanner, { backgroundColor: "#E2EDD9", borderColor: "rgba(107,140,90,0.25)" }]}>
        <Ionicons name="checkmark-circle" size={20} color="#6B8C5A" />
        <Text style={[styles.detailStatusText, { color: "#6B8C5A" }]}>{t("invitation.statusAccepted")}</Text>
      </View>
    );
  }
  if (status === "declined") {
    return (
      <View style={[styles.detailStatusBanner, { backgroundColor: "#FDEAEA", borderColor: "rgba(192,64,64,0.2)" }]}>
        <Ionicons name="close-circle" size={20} color="#C04040" />
        <Text style={[styles.detailStatusText, { color: "#C04040" }]}>{t("invitation.statusDeclined")}</Text>
      </View>
    );
  }
  return null;
};

interface InvitationBannerProps {
  tripName: string;
  destination: string;
  dateRange: string | null;
  hasImage: boolean;
  coverImage?: string;
  bannerGrad: readonly [string, string, ...string[]];
  onBack: () => void;
}

const InvitationBanner: React.FC<InvitationBannerProps> = ({
  tripName, destination, dateRange, hasImage, coverImage, bannerGrad, onBack,
}) => {
  const insets = useSafeAreaInsets();
  return (
  <View style={styles.detailBanner}>
    {hasImage
      ? <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      : <LinearGradient colors={bannerGrad} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
    }
    <LinearGradient
      colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.72)"]}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0.3 }}
      end={{ x: 0, y: 1 }}
    />
    <BackButton variant="overlay" onPress={onBack} style={[styles.detailBackBtn, { top: insets.top + 10 }]} />
    <View style={styles.detailBannerContent}>
      {!!destination && (
        <View style={styles.detailDestRow} testID="invitation-destination-row">
          <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.80)" />
          <Text style={styles.detailDestText}>{destination}</Text>
        </View>
      )}
      <Text style={styles.detailTripTitle}>{tripName}</Text>
      {dateRange && <Text style={styles.detailDateRange}>📅 {dateRange}</Text>}
    </View>
  </View>
  );
};

interface DetailChipsProps {
  duration: number | null;
  destination: string;
  invitation: any;
  isExpired: boolean;
  colors: Colors;
  t: (key: string, opts?: any) => string;
}

const DetailChips: React.FC<DetailChipsProps> = ({ duration, destination, invitation, isExpired, colors, t }) => {
  if (!duration && !destination) return null;
  return (
    <View style={styles.detailChips}>
      {duration && (
        <View style={[styles.detailChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="time-outline" size={18} color={colors.terra} />
          <Text style={[styles.detailChipValue, { color: colors.text }]}>{duration}</Text>
          <Text style={[styles.detailChipLabel, { color: colors.textMid }]}>{t("invitation.days")}</Text>
        </View>
      )}
      {!!destination && (
        <View
          style={[styles.detailChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
          testID="invitation-destination-chip"
        >
          <Ionicons name="airplane-outline" size={18} color="#5A8FAA" />
          <Text style={[styles.detailChipValue, { fontSize: 13, color: colors.text }]} numberOfLines={1}>{destination}</Text>
        </View>
      )}
      {invitation.expiresAt && !isExpired && (
        <View style={[styles.detailChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="hourglass-outline" size={18} color="#FF9500" />
          <Text style={[styles.detailChipLabel, { color: colors.textMid }]}>
            {t("invitation.expiresOnDate", { date: formatDate(invitation.expiresAt) })}
          </Text>
        </View>
      )}
    </View>
  );
};

interface DetailCtaProps {
  canRespond: boolean;
  isLinkType: boolean;
  responding: boolean;
  onAccept: () => void;
  onDecline: () => void;
  colors: Colors;
  t: (key: string) => string;
}

const DetailCta: React.FC<DetailCtaProps> = ({ canRespond, isLinkType, responding, onAccept, onDecline, colors, t }) => {
  if (!canRespond) return null;
  const acceptIcon = isLinkType ? "airplane-outline" : "checkmark";
  const acceptText = isLinkType ? t("invitation.joinTrip") : t("invitation.accept");
  return (
    <View style={[styles.detailCta, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {!isLinkType && (
        <TouchableOpacity
          style={[styles.detailCtaDecline, { backgroundColor: colors.bgMid }]}
          onPress={onDecline}
          disabled={responding}
          activeOpacity={0.85}
        >
          {responding
            ? <ActivityIndicator size="small" color={colors.textMid} />
            : <><Ionicons name="close" size={20} color={colors.textMid} /><Text style={[styles.detailCtaDeclineText, { color: colors.textMid }]}>{t("invitation.decline")}</Text></>
          }
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.detailCtaAccept, isLinkType ? undefined : { flex: 2 }, { backgroundColor: colors.terra, shadowColor: colors.terra }]}
        onPress={onAccept}
        disabled={responding}
        activeOpacity={0.85}
      >
        {responding
          ? <ActivityIndicator size="small" color="#FFFFFF" />
          : <><Ionicons name={acceptIcon} size={20} color="#FFFFFF" /><Text style={styles.detailCtaAcceptText}>{acceptText}</Text></>
        }
      </TouchableOpacity>
    </View>
  );
};

// ─── Main view ────────────────────────────────────────────────────────────────

interface InvitationDetailViewProps {
  invitation: any;
  loading: boolean;
  responding: boolean;
  onBack: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onNavigateToTrip: (tripId: string) => void;
  onNavigateBack: () => void;
}

const InvitationDetailView: React.FC<InvitationDetailViewProps> = ({
  invitation, loading, responding,
  onBack, onAccept, onDecline, onNavigateToTrip, onNavigateBack,
}) => {
  const { t }      = useTranslation();
  const { colors } = useTheme();

  if (loading) return <LoadingView colors={colors} />;
  if (!invitation) return <ErrorView colors={colors} onNavigateBack={onNavigateBack} />;

  const isLinkType   = invitation.type === "link";
  const isExpired    = !isLinkType && invitation.expiresAt && new Date() > new Date(invitation.expiresAt);
  const canRespond   = invitation.status === "pending" && !isExpired;
  const inviterName  = invitation.inviter?.name ?? t("invitation.someone");
  const tripName     = invitation.trip?.title ?? t("invitation.trip");
  const destination  = invitation.trip?.destination ?? "";
  const bannerGrad   = getBannerGradient(destination || tripName);
  const avatarColor  = getAvatarColor(inviterName);
  const initials     = getInitials(inviterName);
  const tripId       = invitation.tripId ?? invitation.trip?._id;
  const { dateRange, duration } = computeInviteDates(invitation);

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: canRespond ? 120 : 40 }}
      >
        <InvitationBanner
          tripName={tripName}
          destination={destination}
          dateRange={dateRange}
          hasImage={!!invitation.trip?.coverImage}
          coverImage={invitation.trip?.coverImage}
          bannerGrad={bannerGrad}
          onBack={onBack}
        />

        <View style={[styles.detailBody, { backgroundColor: colors.bg }]}>
          <DetailChips
            duration={duration} destination={destination}
            invitation={invitation} isExpired={isExpired} colors={colors} t={t}
          />

          <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailSectionTitle, { color: colors.textLight }]}>{t("invitation.invitationFrom")}</Text>
            <View style={styles.detailInviterRow}>
              <View style={[styles.detailAvatar, { backgroundColor: avatarColor }]}>
                <Text style={styles.detailAvatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailInviterName, { color: colors.text }]}>{inviterName}</Text>
                {invitation.inviter?.email && (
                  <Text style={[styles.detailInviterEmail, { color: colors.textMid }]}>{invitation.inviter.email}</Text>
                )}
              </View>
              <Text style={[styles.detailRelTime, { color: colors.textLight }]}>
                {invitation.createdAt ? formatRelative(invitation.createdAt) : ""}
              </Text>
            </View>
            {invitation.message && (
              <View style={[styles.detailMessage, { backgroundColor: colors.terraLight, borderLeftColor: colors.terra }]}>
                <Text style={[styles.detailMessageText, { color: colors.text }]}>"{invitation.message}"</Text>
              </View>
            )}
          </View>

          <StatusBanner isExpired={isExpired} status={invitation.status} />

          {invitation.status === "accepted" && tripId && (
            <TouchableOpacity style={styles.detailViewTripBtn} onPress={() => onNavigateToTrip(tripId)} activeOpacity={0.85}>
              <Ionicons name="airplane" size={18} color="#FFFFFF" />
              <Text style={styles.detailViewTripText}>{t("invitation.viewTrip")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <DetailCta
        canRespond={canRespond} isLinkType={isLinkType} responding={responding}
        onAccept={onAccept} onDecline={onDecline} colors={colors} t={t}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper:          { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText:      { fontSize: 16, fontFamily: F.sans400 },
  errorContainer:   { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  errorTitle:       { fontSize: 24, fontFamily: F.sans700, marginTop: 24, marginBottom: 12 },
  errorMessage:     { fontSize: 15, fontFamily: F.sans400, textAlign: "center", marginBottom: 32, lineHeight: 24 },
  backButton:       { paddingHorizontal: 32, paddingVertical: 16, borderRadius: RADIUS.button },
  backButtonText:   { color: "#FFFFFF", fontSize: 16, fontFamily: F.sans600 },

  detailBanner: { height: 280, position: "relative" },
  detailBackBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  detailBannerContent: { position: "absolute", bottom: 20, left: 20, right: 20 },
  detailDestRow:       { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  detailDestText:      { fontSize: 13, fontFamily: F.sans400, color: "rgba(255,255,255,0.82)" },
  detailTripTitle:     { fontSize: 28, fontFamily: F.sans700, color: "#FFFFFF", lineHeight: 34, marginBottom: 6 },
  detailDateRange:     { fontSize: 14, fontFamily: F.sans400, color: "rgba(255,255,255,0.80)" },

  detailBody: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },

  detailChips: { flexDirection: "row", gap: 10 },
  detailChip: {
    flex: 1, borderRadius: RADIUS.card, borderWidth: 1,
    padding: 14, alignItems: "center", gap: 4,
  },
  detailChipValue: { fontSize: 20, fontFamily: F.sans700 },
  detailChipLabel: { fontSize: 12, fontFamily: F.sans400, textAlign: "center" },

  detailSection: { borderRadius: RADIUS.card, borderWidth: 1, padding: 16, gap: 12 },
  detailSectionTitle: {
    fontSize: 11, fontFamily: F.sans600,
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  detailInviterRow:   { flexDirection: "row", alignItems: "center", gap: 12 },
  detailAvatar:       { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  detailAvatarText:   { fontSize: 18, fontFamily: F.sans700, color: "#FFFFFF" },
  detailInviterName:  { fontSize: 17, fontFamily: F.sans600, marginBottom: 2 },
  detailInviterEmail: { fontSize: 13, fontFamily: F.sans400 },
  detailRelTime:      { fontSize: 12, fontFamily: F.sans400 },
  detailMessage: {
    borderLeftWidth: 3,
    borderTopRightRadius: 10, borderBottomRightRadius: 10,
    padding: 12,
  },
  detailMessageText: { fontSize: 14, fontFamily: F.sans400, fontStyle: "italic", lineHeight: 22 },

  detailStatusBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderRadius: RADIUS.button, borderWidth: 1 },
  detailStatusText:   { fontSize: 15, fontFamily: F.sans600 },

  detailViewTripBtn: {
    backgroundColor: "#6B8C5A", borderRadius: RADIUS.button, paddingVertical: 15,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  detailViewTripText: { fontSize: 16, fontFamily: F.sans600, color: "#FFFFFF" },

  detailCta: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    paddingHorizontal: 16, paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1, gap: 10,
    shadowColor: "#2A2318", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 8,
  },
  detailCtaDecline: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: RADIUS.button, paddingVertical: 16, gap: 8,
  },
  detailCtaDeclineText: { fontSize: 16, fontFamily: F.sans600 },
  detailCtaAccept: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: RADIUS.button, paddingVertical: 16, gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  detailCtaAcceptText: { fontSize: 16, fontFamily: F.sans600, color: "#FFFFFF" },
});

export default InvitationDetailView;
