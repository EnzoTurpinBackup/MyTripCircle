/**
 * Écran de composition du groupe d'un voyage : qui en fait déjà partie, qui a
 * été convié sans avoir répondu, et comment inviter d'autres personnes.
 *
 * Besoin couvert : réunir autour d'un séjour des proches qui utilisent déjà
 * l'application comme des personnes extérieures, puis administrer le groupe —
 * retirer un participant, transmettre l'organisation, revenir sur une
 * invitation restée sans réponse.
 *
 * Position dans le parcours : atteint depuis TripDetails, TripActions,
 * TripMembers et EditTrip, toujours avec l'identifiant du voyage. En sortie,
 * FriendProfile depuis la fiche d'un membre, et le retour à l'écran précédent —
 * y compris immédiatement, lorsque les droits d'invitation font défaut.
 *
 * Données : tout passe par useInviteFriends, qui compose le voyage et ses
 * collaborateurs (tripsApi), les invitations nominatives en attente
 * (usePendingInvitations), le lien partageable et son renouvellement
 * (useInvitationLink), l'envoi d'un lot d'invitations (useSendInvitations) et
 * les actions sur les membres (useTripMembers). Les noms et avatars des
 * participants viennent de la liste d'amis de FriendsContext : un membre
 * étranger au cercle n'affiche donc qu'un libellé générique.
 *
 * L'invitation à un voyage est distincte de la demande d'amitié : elle accorde
 * des droits sur un séjour précis et ne noue aucun lien social durable. Les
 * invités reçoivent le rôle d'éditeur sans droit d'inviter à leur tour.
 *
 * États pris en charge : chargement (squelette reprenant la structure de
 * l'écran), action en cours (voile plein écran), lien non encore émis (libellé
 * d'attente, partage neutralisé), hors-ligne (invitation, partage et
 * renouvellement neutralisés), droits insuffisants (alerte puis retour). Un
 * échec de chargement du voyage alerte et laisse l'écran vide ; un échec de
 * chargement du lien reste silencieux, les autres modes restant utilisables.
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import SkeletonBox from "../components/SkeletonBox";
import { useInviteFriends } from "../hooks/useInviteFriends";
import MemberRow from "../components/inviteFriends/MemberRow";
import BackButton from "../components/ui/BackButton";
import PendingRow from "../components/inviteFriends/PendingRow";
import MemberActionSheet from "../components/inviteFriends/MemberActionSheet";
import InvitePanelSheet from "../components/inviteFriends/InvitePanelSheet";
import { F } from "../theme/fonts";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";

/**
 * Nombre de jours restants avant l'expiration du lien d'invitation. L'arrondi
 * se fait au jour supérieur et le résultat est borné à zéro : une échéance déjà
 * passée doit se lire « expire aujourd'hui » plutôt qu'afficher un compte
 * négatif, l'expiration réelle étant de toute façon décidée par le serveur.
 */
const daysUntil = (date: Date) =>
  Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));

type ScreenRouteProp = RouteProp<RootStackParamList, "InviteFriends">;
type ScreenNavProp = StackNavigationProp<RootStackParamList, "InviteFriends">;

/**
 * Compose l'écran d'administration du groupe d'un voyage.
 *
 * @param route.params.tripId Voyage dont on gère les participants ; seul
 * paramètre, il conditionne l'intégralité du contenu.
 *
 * Effets de bord notables — chargement du voyage, des invitations en attente et
 * du lien partageable au montage ; ouverture de la feuille de partage du
 * système lors du partage du lien ; émission d'un nouveau lien, qui invalide le
 * précédent ; retour forcé à l'écran précédent si le compte n'a pas le droit
 * d'inviter sur ce voyage.
 */
const InviteFriendsScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<ScreenNavProp>();
  const { tripId } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { disabled: offlineDisabled, style: offlineStyle } = useOfflineDisabled();

  const {
    trip,
    owner,
    activeMembers,
    pendingInvitations,
    friends,
    friendsToInvite,
    alreadyMembers,
    invitationLink,
    linkExpiry,
    loading,
    actionLoading,
    showInvitePanel,
    invitedFriends,
    emailInput,
    setEmailInput,
    sendingInvitations,
    inviteCount,
    selectedMember,
    isOwner,
    backdropAnim,
    sheetY,
    inviteAnim,
    inviteBackdrop,
    inviteY,
    openSheet,
    closeSheet,
    openInvitePanel,
    closeInvitePanel,
    handleShareLink,
    handleRenewLink,
    handleCancelInvitation,
    handleRemoveMember,
    handleTransferOwnership,
    handleViewProfile,
    toggleFriend,
    handleSendInvitations,
  } = useInviteFriends(tripId);

  // Le squelette reproduit la structure définitive — en-tête, carte de voyage,
  // lien, puis lignes de membres — pour que l'arrivée des données ne
  // réorganise pas la page sous les yeux de l'utilisateur.
  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.bgLight }]} edges={["top", "left", "right"]}>
        <View style={{ paddingHorizontal: 14, paddingTop: 16, gap: 16 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <SkeletonBox width={36} height={36} borderRadius={18} />
            <SkeletonBox width={180} height={20} borderRadius={8} />
          </View>

          {/* Trip info card */}
          <SkeletonBox width="100%" height={80} borderRadius={12} />

          {/* Invite link */}
          <SkeletonBox width="100%" height={52} borderRadius={12} />

          {/* Section label */}
          <SkeletonBox width={120} height={14} borderRadius={6} />

          {/* Member rows */}
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 2 }}>
              <SkeletonBox width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBox width="55%" height={14} borderRadius={6} />
                <SkeletonBox width="35%" height={12} borderRadius={5} />
              </View>
              <SkeletonBox width={72} height={30} borderRadius={15} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgLight }]} edges={["top", "left", "right"]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bgLight} />

      <View style={[s.header, { backgroundColor: colors.bgLight }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: "center" }}>
          {trip && (
            <Text style={[s.headerSub, { color: colors.textLight }]} numberOfLines={1}>
              {trip.title}
            </Text>
          )}
          <Text style={[s.headerTitle, { color: colors.text }]}>
            {t("inviteFriends.manageMembers")}
          </Text>
        </View>
        <TouchableOpacity style={[s.inviteBtn, { backgroundColor: colors.terra, shadowColor: colors.terra }, offlineStyle]} onPress={openInvitePanel} disabled={offlineDisabled}>
          <Text style={s.inviteBtnTxt}>{t("inviteFriends.inviteBtn")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[s.linkCard, { backgroundColor: colors.terraLight, borderColor: colors.border }]}>
          <Text style={[s.linkTitle, { color: colors.terra }]}>
            {t("inviteFriends.linkTitle")}
          </Text>
          <View style={s.linkRow}>
            <Text
              style={[s.linkUrl, { color: colors.textMid, backgroundColor: colors.surface }]}
              numberOfLines={1}
            >
              {/* Un libellé d'attente occupe la place du lien : la carte garde
                  sa hauteur, et l'utilisateur comprend que le lien arrive. */}
              {invitationLink || t("inviteFriends.linkGenerating")}
            </Text>
            <TouchableOpacity
              style={[s.copyBtn, { backgroundColor: colors.terra }, offlineStyle]}
              onPress={handleShareLink}
              // Partager avant l'arrivée du lien enverrait un message vide au
              // destinataire, sans moyen de s'en apercevoir.
              disabled={!invitationLink || offlineDisabled}
            >
              <Text style={s.copyBtnTxt}>{t("inviteFriends.linkShare")}</Text>
            </TouchableOpacity>
          </View>
          {/* L'échéance et le renouvellement n'apparaissent qu'une fois le lien
              obtenu : proposer de renouveler un lien inexistant n'aurait pas
              de sens, et le renouvellement invalide le lien déjà transmis. */}
          {linkExpiry && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}>
              <Text style={[s.expiryTxt, { color: colors.terra }]}>
                {t("inviteFriends.linkExpiry", { count: daysUntil(linkExpiry) })}
              </Text>
              <TouchableOpacity onPress={handleRenewLink} disabled={offlineDisabled} style={offlineStyle}>
                <Text
                  style={[
                    s.expiryTxt,
                    { color: colors.terra, fontFamily: F.sans600, textDecorationLine: "underline" },
                  ]}
                >
                  {t("inviteFriends.linkRenew")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Le propriétaire a sa propre section : il est le seul à pouvoir
            retirer un participant ou transmettre l'organisation, d'où le
            drapeau isOwner porté par chaque ligne. */}
        {owner && (
          <>
            <Text style={[s.sec, { color: colors.textMid }]}>
              {t("inviteFriends.sectionOrganizer")}
            </Text>
            <MemberRow member={owner} isOwner={isOwner} onPress={openSheet} />
          </>
        )}

        {activeMembers.length > 0 && (
          <>
            <Text style={[s.sec, { marginTop: 4, color: colors.textMid }]}>
              {t("inviteFriends.sectionMembers", { count: activeMembers.length })}
            </Text>
            {activeMembers.map((m) => (
              <MemberRow key={m.userId} member={m} isOwner={isOwner} onPress={openSheet} />
            ))}
          </>
        )}

        {pendingInvitations.length > 0 && (
          <>
            <Text style={[s.sec, { marginTop: 4, color: colors.textMid }]}>
              {t("inviteFriends.sectionPending", { count: pendingInvitations.length })}
            </Text>
            {pendingInvitations.map((inv) => (
              <PendingRow
                key={inv._id || inv.id}
                invitation={inv}
                friends={friends}
                isOwner={isOwner}
                onCancel={handleCancelInvitation}
              />
            ))}
          </>
        )}

        {/* Second accès au panneau d'invitation : après avoir parcouru les
            membres, l'utilisateur n'a pas à remonter jusqu'à l'en-tête. */}
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
          onPress={openInvitePanel}
        >
          <View style={[s.addBtnIcon, { backgroundColor: colors.terraLight }]}>
            <Text style={{ fontSize: 22, color: colors.terra, fontFamily: F.sans400 }}>+</Text>
          </View>
          <Text style={[s.addBtnTxt, { color: colors.textLight }]}>
            {t("inviteFriends.inviteFromFriends")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Voile bloquant plutôt qu'indicateur local : ces actions modifient la
          composition du groupe, un second geste pendant l'opération porterait
          sur une liste déjà obsolète. */}
      {actionLoading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.terra} />
        </View>
      )}

      {/* Les deux feuilles ne sont montées que lorsqu'elles servent : leurs
          valeurs animées repartent ainsi de leur position fermée à chaque
          ouverture, sans avoir à les réinitialiser. */}
      {selectedMember && (
        <MemberActionSheet
          member={selectedMember}
          isOwner={isOwner}
          backdropAnim={backdropAnim}
          sheetY={sheetY}
          onClose={closeSheet}
          onViewProfile={handleViewProfile}
          onTransfer={handleTransferOwnership}
          onRemove={handleRemoveMember}
        />
      )}

      {showInvitePanel && (
        <InvitePanelSheet
          inviteAnim={inviteAnim}
          inviteBackdrop={inviteBackdrop}
          inviteY={inviteY}
          friendsToInvite={friendsToInvite}
          alreadyMembers={alreadyMembers}
          invitedFriends={invitedFriends}
          emailInput={emailInput}
          sendingInvitations={sendingInvitations}
          inviteCount={inviteCount}
          onClose={closeInvitePanel}
          onToggleFriend={toggleFriend}
          onChangeEmail={setEmailInput}
          onSend={handleSendInvitations}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 50, paddingTop: 10 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingTop: 14, paddingBottom: 14 },
  headerSub: { fontFamily: F.sans400, fontSize: 14, textAlign: "center" },
  headerTitle: { fontFamily: F.sans700, fontSize: 20, textAlign: "center" },
  inviteBtn: { borderRadius: 24, paddingHorizontal: 18, paddingVertical: 10, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 3 },
  inviteBtnTxt: { fontFamily: F.sans600, fontSize: 15, color: "#FFFFFF" },
  linkCard: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 18 },
  linkTitle: { fontFamily: F.sans600, fontSize: 14, marginBottom: 10 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  linkUrl: { flex: 1, fontFamily: F.sans400, fontSize: 13, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  copyBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  copyBtnTxt: { fontFamily: F.sans600, fontSize: 13, color: "#FFFFFF" },
  expiryTxt: { fontFamily: F.sans400, fontSize: 12 },
  sec: { fontFamily: F.sans700, fontSize: 16, textTransform: "uppercase", letterSpacing: 1.2, paddingTop: 10, paddingBottom: 10 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderWidth: 2, borderStyle: "dashed", borderRadius: 18, paddingVertical: 16, paddingHorizontal: 16, marginTop: 8 },
  addBtnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  addBtnTxt: { fontFamily: F.sans400, fontSize: 15 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(253,250,245,0.65)", alignItems: "center", justifyContent: "center" },
});

export default InviteFriendsScreen;
