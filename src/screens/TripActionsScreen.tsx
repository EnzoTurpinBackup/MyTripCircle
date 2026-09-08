/**
 * Menu des actions applicables à un voyage : modifier, gérer les membres,
 * partager, supprimer.
 *
 * Besoin couvert : rassembler en un seul endroit les gestes qui portent sur le
 * voyage lui-même, pour les tenir à l'écart de la fiche de consultation où ils
 * encombreraient la lecture et exposeraient la suppression à un toucher
 * accidentel.
 *
 * Position dans le parcours : ouvert par le crayon de l'en-tête de
 * TripDetails, qui ne l'affiche qu'au propriétaire ou à un membre disposant du
 * droit d'édition. En sortie : EditTrip, InviteFriends, la feuille de partage
 * du système, et l'accueil après une suppression.
 *
 * Données : l'écran ne charge rien. Tout ce qu'il affiche — titre, destination,
 * dates, couverture, décomptes et `isOwner` — lui est transmis par les
 * paramètres de route, l'appelant les ayant déjà en mémoire. Deux opérations
 * seulement sortent d'ici : `deleteTrip` de TripsContext, pour que les autres
 * onglets se mettent à jour d'eux-mêmes, et `ApiService.getTripInvitationLink`
 * appelé directement au moment du partage.
 *
 * États pris en charge : hors-ligne (useOfflineDisabled neutralise la seule
 * action irréversible, la suppression) et permissions — gestion des membres et
 * suppression ne sont montées que pour le propriétaire. Ni chargement ni état
 * vide, faute de données à attendre ; l'échec de récupération du lien de
 * partage n'est pas signalé à l'utilisateur.
 */

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
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

type TripActionsRouteProp = RouteProp<RootStackParamList, "TripActions">;
type TripActionsNavProp = StackNavigationProp<RootStackParamList, "TripActions">;

/**
 * Compose le menu d'actions d'un voyage à partir des seuls paramètres de route.
 *
 * Le composant ne reçoit pas de props au sens React : ses neuf entrées sont
 * lues dans `route.params` — `tripId`, `tripTitle`, `destination`, `startDate`
 * et `endDate` sérialisées en chaînes, `coverImage` facultative, les deux
 * compteurs, et `isOwner` qui décide des actions réservées. Effets de bord : le
 * partage demande un lien d'invitation au serveur puis ouvre la feuille du
 * système ; la suppression réinitialise ensuite la pile sur l'accueil.
 */
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

  // Les dates transitent en chaîne : les paramètres de navigation doivent
  // rester sérialisables, une instance Date ne survivant pas à la restauration
  // d'état de React Navigation.
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  // Seule la borne de fin porte l'année : la répéter allongerait une ligne déjà
  // tronquée, pour une information presque toujours identique des deux côtés.
  const dateStr = `${formatDate(startDateObj, { day: "numeric", month: "short" })} – ${formatDate(endDateObj, { day: "numeric", month: "short", year: "numeric" })}`;

  const handleEdit = () => navigation.navigate("EditTrip", { tripId });
  const handleMembers = () => navigation.navigate("InviteFriends", { tripId });

  // Le lien d'invitation est demandé au moment du partage et non au montage :
  // la plupart des visites de cet écran servent à modifier ou à supprimer, et
  // le lien a une durée de validité qu'une récupération anticipée entamerait.
  const handleShare = async () => {
    try {
      const { link } = await ApiService.getTripInvitationLink(tripId);
      await Share.share({
        message: t("tripActions.shareMessage", { title: tripTitle, link }),
        url: link,
      });
    } catch (e) {
      // L'échec n'est que journalisé : la feuille de partage du système ne
      // s'étant pas ouverte, l'écran est resté inchangé sous les yeux de
      // l'utilisateur, et une alerte par-dessus n'apporterait rien d'actionnable.
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
              // Un simple retour ramènerait sur la fiche d'un voyage qui n'existe
              // plus : la pile est reconstruite sur l'accueil, ce qui écarte du
              // même geste toutes les vues devenues caduques.
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
          /* Décorative : le titre, la destination et les dates du voyage sont lus en dessous. */
          <Image source={{ uri: coverImage }} style={s.heroImage} resizeMode="cover" {...DECORATIVE_ELEMENT_PROPS} />
        ) : (
          <View style={[s.heroImage, { backgroundColor: "#3A3020" }]} />
        )}
        {/* Le voile s'épaissit vers le bas, là où sont posés le titre et les
            informations : leur contraste ne peut dépendre de la couverture. */}
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
        {/* Toujours présente : l'écran n'est atteignable que par le propriétaire
            ou un membre autorisé à éditer, le droit est donc acquis ici. */}
        <TouchableOpacity style={s.menuItem} onPress={handleEdit} activeOpacity={0.75}>
          <View style={[s.menuIcon, { backgroundColor: colors.terraLight }]}>
            <Text style={s.menuEmoji}>✏️</Text>
          </View>
          <View style={s.menuInfo}>
            <Text style={[s.menuLabel, { color: colors.terra }]}>{t("tripActions.editTrip")}</Text>
            <Text style={[s.menuDesc, { color: colors.textLight }]}>{t("tripActions.editTripDesc")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.bgDark} {...DECORATIVE_ELEMENT_PROPS} />
        </TouchableOpacity>

        {/* 👥 Membres — propriétaire uniquement */}
        {/* Composer le groupe engage le voyage entier — retrait d'un membre,
            transfert de la propriété : un éditeur peut enrichir le contenu sans
            pour autant décider de qui y participe. */}
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
              <Ionicons name="chevron-forward" size={22} color={colors.bgDark} {...DECORATIVE_ELEMENT_PROPS} />
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
          <Ionicons name="chevron-forward" size={22} color={colors.bgDark} {...DECORATIVE_ELEMENT_PROPS} />
        </TouchableOpacity>

        {/* 🗑 Supprimer — propriétaire uniquement */}
        {/* Reléguée en fin de liste : seule action irréversible du menu, elle
            est ainsi la plus éloignée du pouce au repos. Hors ligne elle est
            neutralisée, la suppression ne pouvant pas être différée. */}
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
              <Ionicons name="chevron-forward" size={22} color={colors.bgDark} {...DECORATIVE_ELEMENT_PROPS} />
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
