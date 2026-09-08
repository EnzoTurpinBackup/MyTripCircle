/**
 * Administration du groupe d'un voyage : qui l'organise, qui l'a rejoint, qui
 * est encore attendu, et par quel lien on invite.
 *
 * Besoin couvert : voir d'un coup l'état réel de la composition du séjour —
 * membres confirmés comme invitations restées sans réponse — et agir sur
 * chacun : partager ou renouveler le lien, annuler une invitation, retirer un
 * membre, consulter son profil, lui transmettre l'organisation.
 *
 * Position dans le parcours : écran de MainStack sous la route `TripMembers`,
 * de paramètre unique `tripId`. En sortie : InviteFriends depuis ses trois
 * points d'appel, et FriendProfile depuis la fiche d'un membre.
 *
 * Données : useTripMembersData reconstitue la liste à partir de trois sources —
 * le voyage, qui ne porte que des identifiants ; les profils, résolus
 * séparément ; les invitations émises, seule trace des personnes attendues — et
 * fournit le lien d'invitation avec son expiration. useTripMembersActions porte
 * les opérations, adressées à ApiService puis suivies d'un rechargement. Cet
 * écran ne passe pas par TripsContext, la composition d'un voyage n'y étant pas
 * tenue.
 *
 * États pris en charge : chargement initial (squelette), rafraîchissement tiré
 * vers le bas (la liste reste visible), action en cours (voile bloquant),
 * hors-ligne (commandes réseau neutralisées), permissions (retrait, transfert
 * et annulation réservés au propriétaire). Pas d'état d'erreur : un échec de
 * chargement laisse une liste vide, un échec d'action une simple alerte.
 */

import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Animated,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { F } from "../theme/fonts";
import { getInitials, getAvatarColor } from "../utils/avatarUtils";
import { useTheme } from "../contexts/ThemeContext";
import SkeletonBox from "../components/SkeletonBox";
import { useTripMembersData, MemberInfo } from "../hooks/useTripMembersData";
import BackButton from "../components/ui/BackButton";
import { useTripMembersActions } from "../hooks/useTripMembersActions";
import { useBottomSheet } from "../hooks/useBottomSheet";
import { s } from "./TripMembersScreen.styles";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

type TripMembersScreenRouteProp = RouteProp<RootStackParamList, "TripMembers">;
type TripMembersScreenNavProp   = StackNavigationProp<RootStackParamList, "TripMembers">;

/**
 * Jours restants, arrondis au supérieur et bornés à zéro : le lien reste
 * utilisable pendant toute sa dernière journée, et une échéance dépassée
 * s'annonce « 0 jour » plutôt qu'en négatif.
 */
const daysUntil = (date: Date) => {
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Compose l'écran d'administration des membres d'un voyage.
 *
 * Aucune prop : le seul paramètre est `tripId`, lu dans la route. Effets de
 * bord — chargement de la composition au montage puis après chaque action
 * aboutie, récupération du lien d'invitation, ouverture de la feuille de
 * partage du système, confirmations avant toute opération irréversible.
 */
const TripMembersScreen: React.FC = () => {
  const route      = useRoute<TripMembersScreenRouteProp>();
  const navigation = useNavigation<TripMembersScreenNavProp>();
  const { tripId } = route.params;
  const { user }   = useAuth();
  const { t }      = useTranslation();
  const { colors } = useTheme();
  const { disabled: offlineDisabled, style: offlineStyle } = useOfflineDisabled();

  const [selectedMember, setSelectedMember] = useState<MemberInfo | null>(null);

  const {
    tripTitle, owner, activeMembers, pendingMembers,
    inviteLink, setInviteLink, linkExpiry, setLinkExpiry,
    loading, refreshing, loadData, onRefresh,
  } = useTripMembersData(tripId, user?.id);

  const sheet = useBottomSheet({ outputRange: [340, 0] });

  const { actionLoading, handleShareLink, handleRenewLink, handleCancelInvitation, handleRemoveMember, handleTransferOwnership, handleViewProfile } =
    useTripMembersActions(tripId, loadData);

  // Déduit de la fiche rapportée par le serveur et non d'un paramètre de
  // navigation : un transfert d'organisation fait ici retire les commandes
  // correspondantes dès le rechargement, sans quitter l'écran.
  const isOwner = !!(user && owner?.userId === user.id);

  const openSheet = (member: MemberInfo) => {
    setSelectedMember(member);
    sheet.open();
  };

  // Le membre n'est effacé qu'à la fin de l'animation : le vider plus tôt
  // démonterait la feuille au lieu de la laisser glisser vers le bas.
  const closeSheet = () => {
    sheet.close(() => setSelectedMember(null));
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderAvatar = (name: string, size = 34, isOwnerAvatar = false, avatar?: string | null) => (
    <View style={[
      s.avatar,
      { width: size, height: size, backgroundColor: getAvatarColor(name) },
      isOwnerAvatar && { borderWidth: 2, borderColor: colors.terraLight },
    ]}>
      {avatar
        /* Décorative : le nom et le rôle du membre sont lus juste à côté. */
        ? <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: size / 2 }} {...DECORATIVE_ELEMENT_PROPS} />
        // Repli sur les initiales, la teinte du fond étant dérivée du nom : elle
        // ne varie pas d'un écran à l'autre et sert donc de repère visuel.
        : <Text style={[s.avatarTxt, { fontSize: size * 0.35 }]}>{getInitials(name)}</Text>
      }
    </View>
  );

  const renderMemberRow = (member: MemberInfo, isOwnerRow = false, tappable = true) => {
    const isSelected = selectedMember?.userId === member.userId;
    const isSelf     = member.userId === user?.id;
    // Trois conditions pour ouvrir la feuille : la ligne doit l'autoriser
    // (celle de l'organisateur ne le fait pas), le lecteur doit être
    // propriétaire, et l'on ne s'administre pas soi-même.
    const canTap     = tappable && isOwner && !isSelf;

    const organizerRole = isSelf ? t("tripMembers.roleOrganizerSelf") : t("tripMembers.roleOrganizer");
    const roleText = isOwnerRow ? organizerRole : t("tripMembers.roleParticipant");

    // L'élément de fin dit ce que la ligne permet : pastille pour se repérer,
    // chevron si la fiche s'ouvre, rien sinon — jamais un chevron inerte.
    let trailingEl: React.ReactNode = null;
    if (isSelf) {
      trailingEl = <View style={s.meTag}><Text style={s.meTagTxt}>{t("tripMembers.meLabel")}</Text></View>;
    } else if (canTap) {
      trailingEl = <Text style={s.rowChevron}>›</Text>;
    }

    const inner = (
      <>
        {renderAvatar(member.name, 34, isOwnerRow, member.avatar)}
        <View style={{ flex: 1 }}>
          <Text style={[s.mn, { color: colors.text }]}>{member.name}</Text>
          <Text style={[s.ms, { color: colors.textLight }]}>{roleText}</Text>
        </View>
        {trailingEl}
      </>
    );

    const rowStyle = [s.mc, { backgroundColor: colors.surface, borderColor: colors.border }, isSelected && s.mcSelected];

    // Ligne non actionnable rendue en simple vue plutôt qu'en TouchableOpacity
    // désactivé, qui resterait annoncé comme un bouton aux lecteurs d'écran.
    if (canTap) {
      return (
        <TouchableOpacity key={member.userId} style={rowStyle} onPress={() => openSheet(member)} activeOpacity={0.75}>
          {inner}
        </TouchableOpacity>
      );
    }
    return <View key={member.userId} style={rowStyle}>{inner}</View>;
  };

  // Invitations en attente : même mise en forme, mais opacité réduite et avatar
  // neutre — la personne n'a pas de profil, seule son adresse est connue.
  const renderPendingRow = (inv: MemberInfo) => {
    // Ancienneté arrondie au jour inférieur : repère de relance, non échéance.
    const daysAgo = inv.invitedAt
      ? Math.floor((Date.now() - new Date(inv.invitedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return (
      <View key={inv.userId} style={[s.mc, { backgroundColor: colors.surface, borderColor: colors.border, opacity: 0.75 }]}>
        <View style={[s.avatar, { width: 34, height: 34, backgroundColor: colors.border }]}>
          <Text style={[s.avatarTxt, { fontSize: 12, color: colors.textMid }]}>{getInitials(inv.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.mn, { color: colors.text }]}>{inv.name}</Text>
          <Text style={[s.ms, { color: colors.textLight }]}>
            {t("tripMembers.pendingLabel")}{daysAgo == null ? "" : ` ${t("tripMembers.pendingDaysAgo", { count: daysAgo })}`}
          </Text>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={() => handleCancelInvitation(inv)} disabled={offlineDisabled} style={offlineStyle}>
            <Text style={s.cancelTxt}>{t("tripMembers.cancelInviteTitle")}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.bgLight }]} edges={["top", "left", "right"]}>
        <View style={{ paddingHorizontal: 14, paddingTop: 16, gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <SkeletonBox width={36} height={36} borderRadius={18} />
            <SkeletonBox width={180} height={20} borderRadius={8} />
          </View>
          <SkeletonBox width={100} height={14} borderRadius={6} />
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
              <SkeletonBox width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBox width="55%" height={14} borderRadius={6} />
                <SkeletonBox width="35%" height={12} borderRadius={5} />
              </View>
              <SkeletonBox width={28} height={28} borderRadius={14} />
            </View>
          ))}
          <View style={{ marginTop: 8, gap: 10 }}>
            <SkeletonBox width={140} height={14} borderRadius={6} />
            <SkeletonBox width="100%" height={48} borderRadius={12} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgLight }]} edges={["top", "left", "right"]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bgLight} />

      <View style={[s.header, { backgroundColor: colors.bgLight }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[s.headerSub, { color: colors.textLight }]} numberOfLines={1}>{tripTitle}</Text>
          <Text style={[s.headerTitle, { color: colors.text }]}>{t("tripMembers.title")}</Text>
        </View>
        <TouchableOpacity style={[s.inviteBtn, offlineStyle]} onPress={() => navigation.navigate("InviteFriends", { tripId })} disabled={offlineDisabled}>
          <Text style={s.inviteBtnTxt}>{t("tripMembers.invite")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.terra} colors={[colors.terra]} />
        }
      >
        {/* Carte absente si le serveur n'a pas fourni de lien : mieux vaut rien
            qu'un cadre vide laissant croire à un partage cassé, les invitations
            nominatives restant accessibles par le bouton d'en-tête. */}
        {inviteLink ? (
          <View style={[s.linkCard, { backgroundColor: colors.terraLight, borderColor: colors.border }]}>
            <Text style={[s.linkTitle, { color: colors.terra }]}>{t("tripMembers.linkTitle")}</Text>
            <View style={s.linkRow}>
              <Text style={[s.linkUrl, { color: colors.textMid, backgroundColor: colors.surface }]} numberOfLines={1}>{inviteLink}</Text>
              <TouchableOpacity style={[s.copyBtn, offlineStyle]} onPress={() => handleShareLink(inviteLink)} disabled={offlineDisabled}>
                <Text style={s.copyBtnTxt}>{t("tripMembers.linkShare")}</Text>
              </TouchableOpacity>
            </View>
            {linkExpiry && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}>
                <Text style={[s.expiryTxt, { color: colors.terra }]}>{t("tripMembers.linkExpiry", { count: daysUntil(linkExpiry) })}</Text>
                {/* Le renouvellement reçoit les accesseurs d'état : seul le lien
                    change, et un rechargement complet ferait clignoter la page. */}
                <TouchableOpacity onPress={() => handleRenewLink({ setInviteLink, setLinkExpiry })} disabled={offlineDisabled} style={offlineStyle}>
                  <Text style={[s.expiryTxt, { color: colors.terra, fontFamily: F.sans600, textDecorationLine: "underline" }]}>
                    {t("tripMembers.linkRenew")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}

        {/* L'organisateur ouvre la liste, seul dans sa section : il ne figure
            pas parmi les collaborateurs et sa ligne n'est jamais actionnable, le
            transfert se déclenchant depuis la fiche d'un autre membre. */}
        {owner && (
          <>
            <Text style={[s.sec, { color: colors.textLight }]}>{t("tripMembers.sectionOrganizer")}</Text>
            {renderMemberRow(owner, true, false)}
          </>
        )}

        {activeMembers.length > 0 && (
          <>
            <Text style={[s.sec, { marginTop: 4, color: colors.textLight }]}>{t("tripMembers.sectionMembers", { count: activeMembers.length })}</Text>
            {activeMembers.map((m) => renderMemberRow(m))}
          </>
        )}

        {pendingMembers.length > 0 && (
          <>
            <Text style={[s.sec, { marginTop: 4, color: colors.textLight }]}>{t("tripMembers.sectionPending", { count: pendingMembers.length })}</Text>
            {pendingMembers.map((inv) => renderPendingRow(inv))}
          </>
        )}

        <TouchableOpacity
          style={[s.addBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
          onPress={() => navigation.navigate("InviteFriends", { tripId })}
        >
          <View style={s.addBtnIcon}>
            <Text style={{ fontSize: 15, color: colors.terra, fontFamily: F.sans400 }}>+</Text>
          </View>
          <Text style={[s.addBtnTxt, { color: colors.textLight }]}>{t("tripMembers.inviteFromFriends")}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Voile bloquant pendant une action : un second geste lancé avant le
          rechargement porterait sur une composition déjà périmée. */}
      {actionLoading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.terra} />
        </View>
      )}

      {/* `animationType="none"` : l'apparition est pilotée par useBottomSheet et
          l'animation intégrée de Modal s'y superposerait. `onRequestClose`
          rattache le bouton retour d'Android à la même fermeture. */}
      {selectedMember && (
        <Modal transparent visible animationType="none" onRequestClose={closeSheet}>
          <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, { opacity: sheet.backdropAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeSheet} />
          </Animated.View>

          <Animated.View style={[s.sheet, { backgroundColor: colors.bgLight, transform: [{ translateY: sheet.translateY }] }]}>
            <View style={[s.sheetHandle, { backgroundColor: colors.border }]} />

            <View style={[s.sheetId, { borderColor: colors.border }]}>
              {renderAvatar(selectedMember.name, 42)}
              <View style={{ flex: 1 }}>
                <Text style={[s.sheetName, { color: colors.text }]}>{selectedMember.name}</Text>
                {selectedMember.email ? (
                  <Text style={[s.sheetEmail, { color: colors.textMid }]} numberOfLines={1}>{selectedMember.email}</Text>
                ) : null}
                <Text style={[s.sheetRole, { color: colors.textLight }]}>{t("tripMembers.roleParticipant")}</Text>
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <TouchableOpacity style={[s.sheetRow, { backgroundColor: colors.bgMid }]} onPress={() => handleViewProfile(selectedMember, closeSheet)} activeOpacity={0.75}>
                <View style={[s.sheetIcon, { backgroundColor: "#E5EEF5" }]}>
                  <Text style={{ fontSize: 14 }}>👤</Text>
                </View>
                <Text style={[s.sheetRowLabel, { flex: 1, color: colors.text }]}>{t("tripMembers.viewProfile")}</Text>
                <Ionicons name="chevron-forward" size={15} color={colors.border} {...DECORATIVE_ELEMENT_PROPS} />
              </TouchableOpacity>

              {/* Transfert et retrait sont de nouveau conditionnés à `isOwner`
                  alors que la feuille ne s'ouvre déjà que pour lui : la garde
                  tient encore si un autre chemin y mène un jour. */}
              {isOwner && (
                <TouchableOpacity style={[s.sheetRow, { backgroundColor: colors.bgMid }, offlineStyle]} onPress={() => handleTransferOwnership(selectedMember, closeSheet)} disabled={offlineDisabled} activeOpacity={0.75}>
                  <View style={[s.sheetIcon, { backgroundColor: colors.terraLight }]}>
                    <Text style={{ fontSize: 14 }}>👑</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.sheetRowLabel, { color: colors.text }]}>{t("tripMembers.appointOrganizer")}</Text>
                    <Text style={[s.sheetRowSub, { color: colors.textLight }]}>{t("tripMembers.appointOrganizerSub")}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {isOwner && (
                <TouchableOpacity style={[s.sheetRow, s.sheetRowDanger, offlineStyle]} onPress={() => handleRemoveMember(selectedMember, closeSheet)} disabled={offlineDisabled} activeOpacity={0.75}>
                  <View style={[s.sheetIcon, { backgroundColor: "rgba(192,64,64,0.12)" }]}>
                    <Text style={{ fontSize: 14 }}>🚪</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.sheetRowLabel, { color: "#C04040" }]}>{t("tripMembers.removeFromTrip")}</Text>
                    <Text style={[s.sheetRowSub, { color: "#C04040", opacity: 0.7 }]}>
                      {t("tripMembers.removeFromTripSub")}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

export default TripMembersScreen;
