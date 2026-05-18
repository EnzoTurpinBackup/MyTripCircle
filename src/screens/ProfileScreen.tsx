import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  Image,
  StyleProp,
  ImageStyle,
  ViewStyle,
} from "react-native";
import { getInitials, getAvatarColor } from "../utils/avatarUtils";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useTrips } from "../contexts/TripsContext";
import { useFriends } from "../contexts/FriendsContext";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SwipeToNavigate } from "../hooks/useSwipeToNavigate";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";
import { useSubscription } from "../contexts/SubscriptionContext";
import SkeletonBox from "../components/SkeletonBox";

const COVER_H = 210;

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { trips, bookings, addresses, loading: tripsLoading } = useTrips();
  const { friends, loading: friendsLoading } = useFriends();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { isPremium } = useSubscription();
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = 100 + Math.max(insets.bottom, 12);

  const handleLogout = () => {
    Alert.alert(t("profile.logoutTitle"), t("profile.logoutMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.logout"), style: "destructive", onPress: logout },
    ]);
  };

  const initials = getInitials(user?.name || "");
  const avatarColor = getAvatarColor(user?.name || "");

  if (tripsLoading && friendsLoading) {
    return (
      <SwipeToNavigate currentIndex={4} totalTabs={5}>
        <View style={[styles.root, { backgroundColor: colors.bg }]}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <ScrollView scrollEnabled={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}>
            {/* Cover */}
            <SkeletonBox width="100%" height={COVER_H} borderRadius={0} />

            <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
              {/* Avatar + name */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <SkeletonBox width={72} height={72} borderRadius={36} />
                <View style={{ flex: 1, gap: 10 }}>
                  <SkeletonBox width="55%" height={18} borderRadius={7} />
                  <SkeletonBox width="70%" height={13} borderRadius={5} />
                </View>
              </View>

              {/* Stats row */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[0, 1, 2, 3].map((i) => (
                  <SkeletonBox key={i} height={64} borderRadius={12} style={{ flex: 1 }} />
                ))}
              </View>

              {/* Section card */}
              <SkeletonBox width={120} height={12} borderRadius={5} />
              <SkeletonBox width="100%" height={180} borderRadius={14} />

              {/* Section card 2 */}
              <SkeletonBox width={110} height={12} borderRadius={5} />
              <SkeletonBox width="100%" height={120} borderRadius={14} />
            </View>
          </ScrollView>
        </View>
      </SwipeToNavigate>
    );
  }

  return (
    <SwipeToNavigate currentIndex={4} totalTabs={5}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        >
          {/* ── Cover ── */}
          <View style={styles.cover}>
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80&fit=crop" }}
              style={StyleSheet.absoluteFill as StyleProp<ImageStyle>}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["rgba(8,4,0,0.2)", "rgba(8,4,0,0.58)"]}
              style={StyleSheet.absoluteFill as StyleProp<ViewStyle>}
            />

            <View style={styles.coverContent}>
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarPhoto} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>

              {/* Name + email + badge privé */}
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                {!user?.isPublicProfile && (
                  <View style={styles.privatePill}>
                    <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.7)" style={{ marginRight: 4 }} />
                    <Text style={styles.privatePillText}>{t("profile.privateLabel")}</Text>
                  </View>
                )}
              </View>

              {/* Edit pill */}
              <TouchableOpacity
                style={styles.editPill}
                onPress={() => navigation.navigate("EditProfile")}
                activeOpacity={0.8}
              >
                <Text style={styles.editPillText}>{t("profile.edit")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Stats ── */}
          <View style={styles.statsRow}>
            {[
              { value: tripsLoading ? "…" : trips.length,     label: t("profile.stats.trips") },
              { value: tripsLoading ? "…" : bookings.length,  label: t("profile.stats.bookings") },
              { value: friendsLoading ? "…" : friends.length, label: t("profile.stats.friends") },
              { value: tripsLoading ? "…" : addresses.length, label: t("profile.stats.addresses") },
            ].map((s) => (
              <View key={s.label} style={[styles.stat, { backgroundColor: colors.bgMid }]}>
                <Text style={[styles.statVal, { color: colors.terra }]}>{s.value}</Text>
                <Text style={[styles.statLbl, { color: colors.textLight }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Mon compte ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textLight }]}>{t("profile.sections.account")}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Row
                icon="person-outline"
                label={t("profile.personalInfo")}
                onPress={() => navigation.navigate("EditProfile")}
              />
              <Divider />
              <Row
                icon="people-outline"
                label={t("profile.myFriends")}
                badge={friends.length > 0 ? friends.length : undefined}
                onPress={() => navigation.navigate("Friends" as never)}
              />
              <Divider />
              <Row
                icon="mail-outline"
                label={t("profile.invitations")}
                badge={unreadCount > 0 ? unreadCount : undefined}
                onPress={() => navigation.navigate("Invitation")}
              />
              <Divider />
              <Row
                icon="notifications-outline"
                label={t("profile.notifications")}
                onPress={() => navigation.navigate("Notifications")}
              />
            </View>
          </View>

          {/* ── Préférences ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textLight }]}>{t("profile.sections.preferences")}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Row
                icon="settings-outline"
                label={t("common.settings")}
                onPress={() => navigation.navigate("Settings")}
              />
              <Divider />
              <Row
                icon="help-circle-outline"
                label={t("common.helpSupport")}
                onPress={() => navigation.navigate("HelpSupport")}
              />
              <Divider />
              {isPremium() && (
                <>
                  <Divider />
                  <Row
                    icon="calendar-outline"
                    label={t("calendar.title")}
                    tinted
                    onPress={() => navigation.navigate("CalendarExport")}
                  />
                </>
              )}
              <Divider />
              <Row
                icon="card-outline"
                label={isPremium() ? t("subscription.manageButton") : t("profile.subscribe")}
                tinted
                onPress={() => navigation.navigate("Subscription")}
              />
            </View>
          </View>

          {/* ── Mes voyages publics ── */}
          {(() => {
            if (!user?.isPublicProfile) return null;
            const publicTrips = trips.filter((t: any) => t.visibility === "public" || (t.isPublic && !t.visibility));
            if (!publicTrips.length) return null;
            return (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textLight }]}>{t("profile.sections.publicTrips")}</Text>
                <View style={{ gap: 8 }}>
                  {publicTrips.map((trip: any) => (
                    <View key={trip.id || trip._id} style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.tripCardLeft}>
                        <Ionicons name="earth-outline" size={18} color={colors.terra} style={{ marginTop: 1 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.tripCardTitle, { color: colors.text }]} numberOfLines={1}>{trip.title}</Text>
                          {trip.destination ? (
                            <Text style={[styles.tripCardSub, { color: colors.textLight }]}>{trip.destination}</Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.publicPill}>
                        <Text style={styles.publicPillText}>{t("createTrip.public")}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          {/* ── Déconnexion ── */}
          <TouchableOpacity style={[styles.logoutRow, { backgroundColor: colors.dangerLight, borderColor: colors.danger + "40" }]} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} style={{ marginRight: 12 }} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>{t("profile.logout")}</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </SwipeToNavigate>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  badge?: number;
  danger?: boolean;
  tinted?: boolean;
  onPress: () => void;
}

const Row: React.FC<RowProps> = ({ icon, label, value, badge, danger, tinted, onPress }) => {
  const { colors } = useTheme();
  const iconColorFallback = tinted ? colors.terra : colors.textMid;
  const iconColor = danger ? colors.danger : iconColorFallback;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Ionicons
        name={icon}
        size={22}
        color={iconColor}
        style={styles.rowIcon}
      />
      <Text style={[styles.rowLabel, { color: colors.text }, danger && { color: colors.danger }, tinted && { color: colors.terra }]}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value ? <Text style={[styles.rowValue, { color: colors.textLight }]}>{value}</Text> : null}
        {badge === undefined ? null : (
          <View style={[styles.badge, { backgroundColor: colors.terraLight }]}>
            <Text style={[styles.badgeText, { color: colors.terra }]}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.bgDark} />
      </View>
    </TouchableOpacity>
  );
};

const Divider = () => {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.bg }]} />;
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Cover
  cover: { height: COVER_H, position: "relative", justifyContent: "flex-end" },
  coverContent: { flexDirection: "row", alignItems: "flex-end", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: "#FFFFFF",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5, overflow: "hidden",
  },
  avatarPhoto: { width: 68, height: 68, borderRadius: 34 },
  avatarText: { color: "#FFFFFF", fontSize: 22, fontFamily: F.sans700 },
  profileName: {
    fontSize: 22, fontFamily: F.sans600, color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  profileEmail: { fontSize: 13, fontFamily: F.sans400, color: "rgba(255,255,255,0.7)", marginTop: 3 },
  editPill: {
    alignSelf: "flex-start", marginBottom: 4, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "rgba(255,255,255,0.22)", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)",
  },
  editPillText: { fontSize: 13, fontFamily: F.sans600, color: "#FFFFFF" },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, marginHorizontal: 20, marginTop: 16, marginBottom: 20 },
  stat: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  statVal: { fontSize: 26, fontFamily: F.sans700, marginBottom: 3 },
  statLbl: { fontSize: 12, fontFamily: F.sans400 },

  // Private pill
  privatePill: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginTop: 5,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  privatePillText: { fontSize: 11, fontFamily: F.sans500, color: "rgba(255,255,255,0.75)" },

  // Section
  section: { marginHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontFamily: F.sans600, letterSpacing: 0.8, marginBottom: 10, marginLeft: 2 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },

  // Row
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 18 },
  rowIcon: { marginRight: 16, width: 24, textAlign: "center" },
  rowLabel: { flex: 1, fontSize: 17, fontFamily: F.sans500 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowValue: { fontSize: 14, fontFamily: F.sans400 },
  divider: { height: 1, marginLeft: 52 },
  badge: { borderRadius: 999, minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { fontSize: 11, fontFamily: F.sans700 },

  // Trip card
  tripCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  tripCardLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10, marginRight: 8 },
  tripCardTitle: { fontSize: 15, fontFamily: F.sans600 },
  tripCardSub: { fontSize: 12, fontFamily: F.sans400, marginTop: 2 },
  publicPill: { backgroundColor: "#DCF0F5", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  publicPillText: { fontSize: 11, fontFamily: F.sans600, color: "#5A8FAA" },

  // Logout
  logoutRow: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 8,
    borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16,
  },
  logoutText: { fontSize: 17, fontFamily: F.sans500 },

});

export default ProfileScreen;
