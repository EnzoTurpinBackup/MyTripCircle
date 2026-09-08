/**
 * Fiche publique d'un autre utilisateur : son identité, ses statistiques de
 * voyage, les séjours qu'il expose, et les actions possibles sur la relation.
 *
 * Besoin couvert : se faire une idée de quelqu'un — un inconnu croisé dans une
 * suggestion, un membre d'un voyage partagé — puis décider d'engager la
 * relation, de la rompre, ou de se protéger par un signalement ou un blocage.
 *
 * Position dans le parcours : atteint depuis FriendsScreen (carte d'ami ou de
 * suggestion), depuis AddFriendScreen (résultat de recherche) et depuis la
 * liste des membres d'un voyage. En sortie, TripPublicView pour un séjour
 * exposé et InviteFriends pour convier l'intéressé à un voyage ; le retrait et
 * le blocage referment l'écran, la fiche n'ayant plus de raison d'être.
 *
 * Données : tout passe par useFriendProfileActions, qui lit friendId et
 * friendName dans les paramètres de route, charge la fiche via friendsApi,
 * délègue l'établissement et la rupture du lien à FriendsContext, et adresse
 * signalement et blocage à moderationApi. Le nom transmis par la navigation
 * sert de repli tant que la fiche n'est pas revenue.
 *
 * Deux états de relation seulement sont distingués ici, par `isFriend` : amis,
 * auquel cas la fiche s'ouvre aux voyages communs et à ceux réservés aux amis
 * et propose l'invitation à un voyage ; sans lien, auquel cas seuls les voyages
 * publics apparaissent et l'action principale devient l'envoi d'une demande.
 * Une demande déjà envoyée ou déjà reçue n'est pas représentée : le serveur la
 * signale au moment de l'envoi, par une erreur.
 *
 * États pris en charge : chargement (squelette sous une couverture déjà peuplée
 * du nom transmis), profil fermé par son propriétaire (carte explicative, les
 * actions restant accessibles), envoi de demande en cours (bouton neutralisé).
 * Un échec de chargement est annoncé par une alerte et laisse la fiche vide.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import BackButton from "../components/ui/BackButton";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendProfileActions } from "../hooks/useFriendProfileActions";
import TripSection from "../components/friendProfile/TripSection";
import ProfileSkeleton from "../components/friendProfile/ProfileSkeleton";
import ProfileActions from "../components/friendProfile/ProfileActions";
import ReportSheet from "../components/moderation/ReportSheet";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Compose la fiche d'un autre utilisateur.
 *
 * Les paramètres de route — `friendId` et `friendName` — ne sont pas lus ici
 * mais par useFriendProfileActions, seule la visibilité de la feuille de
 * signalement restant un état local. Effets de bord notables — la fiche est
 * chargée au montage et rechargée après une demande acceptée d'emblée ; le
 * retrait comme le blocage ferment l'écran une fois confirmés.
 */
const FriendProfileScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { colors }  = useTheme();
  const insets      = useSafeAreaInsets();
  // Repli sur l'anglais hors français : seules ces deux locales sont fournies,
  // et un identifiant inconnu ferait échouer le formatage de la date.
  const locale      = i18n.language === "fr" ? "fr-FR" : "en-US";
  const [reportSheetVisible, setReportSheetVisible] = useState(false);

  const {
    profile, loading, sending,
    name, initials, avatarColor, isFriend,
    friendName,
    handleRemove, handleAddFriend, handleReport, handleBlock,
    goToTrip, navigateInvite, goBack,
  } = useFriendProfileActions();

  // Les messages d'absence désignent la personne par son seul prénom, le nom
  // complet répété à chaque section vide alourdissant la lecture.
  const firstName = (profile?.name || friendName).split(" ")[0];

  return (
    <View style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cover ── */}
        <View style={[styles.cover, { backgroundColor: colors.textMid }]}>
          <LinearGradient
            colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.0)", "rgba(0,0,0,0.72)"]}
            locations={[0, 0.3, 1]}
            style={StyleSheet.absoluteFill}
          />

          <BackButton variant="overlay" onPress={goBack} style={[styles.backBtn, { top: insets.top + 10 }]} />

          {/* Le badge de relation attend la fin du chargement : isFriend vaut
              faux tant que la fiche n'est pas revenue, l'afficher plus tôt
              annoncerait un inconnu là où il peut s'agir d'un ami. */}
          {!loading && (
            <View style={[styles.amiBadge, { top: insets.top + 10 }, !isFriend && styles.amiBadgeStranger]}>
              <Ionicons name={isFriend ? "checkmark" : "earth-outline"} size={15} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
              <Text style={styles.amiBadgeText}>{isFriend ? t("friendProfile.badgeFriend") : t("friendProfile.badgePublic")}</Text>
            </View>
          )}

          <View style={styles.identity}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              {profile?.avatar ? (
                /* Décorative : le nom du profil consulté est lu juste à côté. */
                <Image source={{ uri: profile.avatar }} style={styles.avatarPhoto} {...DECORATIVE_ELEMENT_PROPS} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <View>
              <Text style={styles.coverName}>{name}</Text>
              {isFriend && profile?.friendSince && (
                <Text style={styles.coverSub}>
                  {t("friendProfile.friendSince", {
                    date: new Date(profile.friendSince).toLocaleDateString(locale, { month: "short", year: "numeric" }),
                  })}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Contenu ── */}
        <View style={[styles.body, { backgroundColor: colors.bg }]}>
          {(() => {
            if (loading) return <ProfileSkeleton />;

            // La comparaison stricte est nécessaire : un profil non encore
            // chargé laisse le champ indéfini, ce qui ne doit pas être traité
            // comme une fermeture explicite du profil par son propriétaire.
            // Les actions restent proposées sous la carte : refuser l'accès à
            // ses voyages n'empêche ni de solliciter ni de signaler.
            if (profile?.isPublicProfile === false) return ( // NOSONAR — distingue false de undefined (profil non chargé)
              <>
                <View style={[styles.privateCard, { backgroundColor: colors.bgMid, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed" size={32} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
                  <Text style={[styles.privateTitle, { color: colors.text }]}>{t("friendProfile.privateTitle")}</Text>
                  <Text style={[styles.privateSubtitle, { color: colors.textMid }]}>
                    {t("friendProfile.privateSubtitle", { name: firstName })}
                  </Text>
                </View>
                <ProfileActions
                  isFriend={isFriend}
                  sending={sending}
                  dangerBg={colors.dangerLight}
                  dangerColor={colors.danger}
                  onInvite={navigateInvite}
                  onRemove={handleRemove}
                  onAddFriend={handleAddFriend}
                  onReport={() => setReportSheetVisible(true)}
                  onBlock={handleBlock}
                />
              </>
            );

            // Les trois sections découpent une même liste `sharedTrips`, dont
            // le serveur a déjà retiré ce que la relation ne permet pas de
            // voir. Les séjours « récents » sont ceux qui sont terminés, un
            // voyage en cours relevant de l'actualité et non du souvenir ; la
            // coupe à huit tient à la place disponible dans le carrousel.
            const recentTrips = (profile?.sharedTrips || [])
              .filter((t: any) => new Date(t.endDate) < new Date())
              .slice(0, 8);
            const friendsTrips = (profile?.sharedTrips || []).filter((t: any) => t.visibility === "friends");
            const publicTrips  = (profile?.sharedTrips || []).filter((t: any) => t.visibility === "public");

            return (
              <>
                {/* Stats */}
                <View style={styles.statsRow}>
                  {[
                    { value: profile?.stats?.totalTrips ?? 0,    label: t("friendProfile.statTrips") },
                    { value: profile?.stats?.countries ?? 0,     label: t("friendProfile.statCountries") },
                    { value: profile?.stats?.commonFriends ?? 0, label: t("friendProfile.statCommonFriends") },
                    { value: profile?.stats?.totalBookings ?? 0, label: t("friendProfile.statBookings") },
                  ].map((s) => (
                    <View key={s.label} style={[styles.statBox, { backgroundColor: colors.bgMid }]}>
                      <Text style={[styles.statValue, { color: colors.terra }]}>{s.value}</Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]} numberOfLines={1} adjustsFontSizeToFit>{s.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Voyages communs et voyages réservés aux amis ne sont
                    montrés qu'aux amis : ces sections révèlent une proximité
                    et un contenu que le lien seul autorise. */}
                {isFriend && (
                  <TripSection
                    title={t("friendProfile.sectionCommonTrips")}
                    marginTop={0}
                    trips={profile?.commonTrips ?? []}
                    emptyIcon="airplane-outline"
                    emptyText={t("friendProfile.emptyCommonTrips")}
                    bgMid={colors.bgMid}
                    textLight={colors.textLight}
                    onPress={goToTrip}
                  />
                )}

                <TripSection
                  title={t("friendProfile.sectionRecentTrips")}
                  // Sans lien d'amitié, cette section devient la première de la
                  // page et n'a plus à se décoller de celle qui la précédait.
                  marginTop={isFriend ? 20 : 0}
                  trips={recentTrips}
                  emptyIcon="earth-outline"
                  emptyText={t("friendProfile.emptyRecentTrips", { name: firstName })}
                  bgMid={colors.bgMid}
                  textLight={colors.textLight}
                  onPress={goToTrip}
                />

                {isFriend && (
                  <TripSection
                    title={t("friendProfile.sectionFriendsTrips")}
                    marginTop={20}
                    trips={friendsTrips}
                    emptyIcon="people-outline"
                    emptyText={t("friendProfile.emptyFriendsTrips")}
                    bgMid={colors.bgMid}
                    textLight={colors.textLight}
                    onPress={goToTrip}
                  />
                )}

                <TripSection
                  title={t("friendProfile.sectionPublicTrips")}
                  marginTop={20}
                  trips={publicTrips}
                  emptyIcon="earth-outline"
                  emptyText={t("friendProfile.emptyPublicTrips", { name: firstName })}
                  bgMid={colors.bgMid}
                  textLight={colors.textLight}
                  onPress={goToTrip}
                />

                <ProfileActions
                  isFriend={isFriend}
                  sending={sending}
                  dangerBg={colors.dangerLight}
                  dangerColor={colors.danger}
                  onInvite={navigateInvite}
                  onRemove={handleRemove}
                  onAddFriend={handleAddFriend}
                  onReport={() => setReportSheetVisible(true)}
                  onBlock={handleBlock}
                />
              </>
            );
          })()}
        </View>
      </ScrollView>

      <ReportSheet
        visible={reportSheetVisible}
        targetType="user"
        onClose={() => setReportSheetVisible(false)}
        onSubmit={async (reason) => {
          // La feuille se referme avant l'envoi : le signalement n'a pas
          // d'effet visible, garder la fenêtre ouverte laisserait croire
          // qu'une décision se prend. Le hook annonce le résultat par alerte.
          setReportSheetVisible(false);
          await handleReport(reason);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  scroll:      { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  cover: {
    height: 300,
    position: "relative",
    justifyContent: "flex-end",
  },
  backBtn: {
    position: "absolute",
    left: 16,
  },
  amiBadge: {
    position: "absolute",
    top: 16, right: 16,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(107,140,90,0.82)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  amiBadgeText:     { fontSize: 14, fontFamily: F.sans600, color: "#FFFFFF" },
  amiBadgeStranger: { backgroundColor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.35)" },
  identity: {
    flexDirection: "row", alignItems: "flex-end", gap: 14,
    paddingHorizontal: 18, paddingBottom: 18,
  },
  avatar: {
    width: 70, height: 70, borderRadius: 35,
    justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: "#FFFFFF",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    overflow: "hidden",
  },
  avatarPhoto: { width: 70, height: 70, borderRadius: 35 },
  avatarText:  { fontSize: 22, fontFamily: F.sans700, color: "#FFFFFF" },
  coverName:   { fontSize: 26, fontFamily: F.sans700, color: "#FFFFFF" },
  coverSub:    { fontSize: 13, fontFamily: F.sans400, color: "rgba(255,255,255,0.7)", marginTop: 3 },

  body: { flex: 1 },

  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16, marginTop: 16, marginBottom: 22, gap: 8,
  },
  statBox: {
    flex: 1, borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 4, alignItems: "center",
  },
  statValue: { fontSize: 22, fontFamily: F.sans700 },
  statLabel: { fontSize: 11, fontFamily: F.sans400, textAlign: "center", marginTop: 4 },

  privateCard: {
    marginHorizontal: 14, marginTop: 24, marginBottom: 8,
    borderRadius: 16, paddingVertical: 36, paddingHorizontal: 24,
    alignItems: "center", gap: 10, borderWidth: 1,
  },
  privateTitle: { fontSize: 16, fontFamily: F.sans600, textAlign: "center" },
  privateSubtitle: {
    fontSize: 13, fontFamily: F.sans400,
    textAlign: "center", lineHeight: 19,
  },
});

export default FriendProfileScreen;
