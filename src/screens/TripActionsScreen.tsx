import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp, CommonActions } from "@react-navigation/native";
import BackButton from "../components/ui/BackButton";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useTrips } from "../contexts/TripsContext";
import ApiService from "../services/ApiService";
import { formatDate, parseApiError } from "../utils/i18n";
import { useTranslation } from "react-i18next";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";

type TripActionsRouteProp = RouteProp<RootStackParamList, "TripActions">;
type TripActionsNavProp = StackNavigationProp<RootStackParamList, "TripActions">;

const TripActionsScreen: React.FC = () => {
  const route = useRoute<TripActionsRouteProp>();
  const navigation = useNavigation<TripActionsNavProp>();
  const {
    tripId,
    tripTitle,
    destination,
    startDate,
    endDate,
    coverImage,
    totalBookings,
    totalAddresses,
    isOwner,
  } = route.params;
  const { deleteTrip } = useTrips();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { disabled: offlineDisabled, style: offlineStyle } = useOfflineDisabled();

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const dateStr = `${formatDate(startDateObj, { day: "numeric", month: "short" })} – ${formatDate(endDateObj, { day: "numeric", month: "short", year: "numeric" })}`;

  const handleEdit = () => navigation.navigate("EditTrip", { tripId });
  const handleMembers = () => navigation.navigate("InviteFriends", { tripId });

  const handleShare = async () => {
    try {
      const { link } = await ApiService.getTripInvitationLink(tripId);
      await Share.share({
        message: t("tripActions.shareMessage", { title: tripTitle, link }),
        url: link,
      });
    } catch (e) {
      console.error("[TripActionsScreen] share error", e);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t("tripActions.deleteConfirmTitle"),
      t("tripActions.deleteConfirmMsg"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTrip(tripId);
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Main" }] }));
            } catch (error) {
              Alert.alert(
                t("common.error"),
                parseApiError(error) || t("tripActions.deleteError"),
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* ── Hero cover ── */}
      <View style={s.hero}>
        {coverImage ? (
          <Image source={{ uri: coverImage }} style={s.heroImage} resizeMode="cover" />
        ) : (
          <View style={[s.heroImage, { backgroundColor: "#3A3020" }]} />
        )}
        <LinearGradient
          colors={["rgba(0,0,0,0.10)", "rgba(0,0,0,0.72)"]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Back button */}
        <SafeAreaView edges={["top"]} style={s.heroOverlay}>
          <BackButton variant="overlay" onPress={() => navigation.goBack()} style={s.backBtn} />
        </SafeAreaView>

        {/* Trip info overlay */}
        <View style={s.heroBottom}>
          <Text style={s.heroTitle} numberOfLines={1}>{tripTitle}</Text>
          <Text style={s.heroSub} numberOfLines={1}>📍 {destination} · {dateStr}</Text>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View style={[s.statsRow, { backgroundColor: colors.bgLight, borderBottomColor: colors.border }]}>
        {[
          { value: String(totalBookings), label: t("tripActions.statsBookings") },
          { value: String(totalAddresses), label: t("tripActions.statsAddresses") },
        ].map((stat) => (
          <View key={stat.label} style={[s.statPill, { backgroundColor: colors.bgMid }]}>
            <Text style={[s.statValue, { color: colors.terra }]}>{stat.value}</Text>
            <Text style={[s.statLabel, { color: colors.textLight }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Action menu card ── */}
      <View style={[s.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* ✏️ Modifier */}
        <TouchableOpacity style={s.menuItem} onPress={handleEdit} activeOpacity={0.75}>
          <View style={[s.menuIcon, { backgroundColor: colors.terraLight }]}>
            <Text style={s.menuEmoji}>✏️</Text>
          </View>
          <View style={s.menuInfo}>
            <Text style={[s.menuLabel, { color: colors.terra }]}>{t("tripActions.editTrip")}</Text>
            <Text style={[s.menuDesc, { color: colors.textLight }]}>{t("tripActions.editTripDesc")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.bgDark} />
        </TouchableOpacity>

        {/* 👥 Membres — propriétaire uniquement */}
        {isOwner && (
          <>
            <View style={[s.menuDivider, { backgroundColor: colors.bg }]} />
            <TouchableOpacity style={s.menuItem} onPress={handleMembers} activeOpacity={0.75}>
              <View style={[s.menuIcon, { backgroundColor: isDark ? "#1A2E35" : "#DCF0F5" }]}>
                <Text style={s.menuEmoji}>👥</Text>
              </View>
              <View style={s.menuInfo}>
                <Text style={[s.menuLabel, { color: colors.text }]}>{t("tripActions.manageMembers")}</Text>
                <Text style={[s.menuDesc, { color: colors.textLight }]}>{t("tripActions.manageMembersDesc")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.bgDark} />
            </TouchableOpacity>
          </>
        )}

        <View style={[s.menuDivider, { backgroundColor: colors.bg }]} />

        {/* 🔗 Partager */}
        <TouchableOpacity style={s.menuItem} onPress={handleShare} activeOpacity={0.75}>
          <View style={[s.menuIcon, { backgroundColor: isDark ? "#1E2E1A" : "#E2EDD9" }]}>
            <Text style={s.menuEmoji}>🔗</Text>
          </View>
          <View style={s.menuInfo}>
            <Text style={[s.menuLabel, { color: colors.text }]}>{t("tripActions.shareTrip")}</Text>
            <Text style={[s.menuDesc, { color: colors.textLight }]}>{t("tripActions.shareTripDesc")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.bgDark} />
        </TouchableOpacity>

        {/* 🗑 Supprimer — propriétaire uniquement */}
        {isOwner && (
          <>
            <View style={[s.menuDivider, { backgroundColor: colors.bg }]} />
            <TouchableOpacity style={[s.menuItem, offlineStyle]} onPress={handleDelete} disabled={offlineDisabled} activeOpacity={0.75}>
              <View style={[s.menuIcon, { backgroundColor: colors.dangerLight }]}>
                <Text style={s.menuEmoji}>🗑</Text>
              </View>
              <View style={s.menuInfo}>
                <Text style={[s.menuLabel, { color: colors.danger }]}>{t("tripActions.deleteTrip")}</Text>
                <Text style={[s.menuDesc, { color: colors.textLight }]}>{t("tripActions.deleteTripDesc")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.bgDark} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Hero
  hero: {
    height: Platform.OS === "ios" ? 300 : 280,
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 0 : 12,
  },
  backBtn: {
    marginTop: 10,
  },
  heroBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 22,
  },
  heroTitle: {
    fontSize: 30,
    fontFamily: F.sans700,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    fontFamily: F.sans400,
  },

  // ── Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  statPill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontFamily: F.sans700,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 3,
    fontFamily: F.sans400,
  },

  // ── Menu card
  menuCard: {
    marginHorizontal: 20,
    marginTop: 28,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#2A2318",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  menuDivider: {
    height: 1,
  },
  menuIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  menuEmoji: {
    fontSize: 24,
  },
  menuInfo: { flex: 1 },
  menuLabel: {
    fontSize: 17,
    fontFamily: F.sans600,
  },
  menuDesc: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: F.sans400,
  },
});

export default TripActionsScreen;
