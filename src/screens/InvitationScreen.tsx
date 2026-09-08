/**
 * Écran des invitations à collaborer sur un voyage, dans ses deux usages : la
 * consultation de tout ce que l'on a reçu et émis, et l'ouverture d'une
 * invitation précise atteinte par un lien.
 *
 * Besoin couvert : décider d'un séjour auquel on est convié — accepter, refuser
 * en motivant son refus, ou voir de quoi il s'agit avant de trancher — et, du
 * côté de l'organisateur, suivre les invitations envoyées et revenir sur un
 * envoi resté sans réponse.
 *
 * Position dans le parcours : atteint depuis l'onglet Profil sans paramètre, ce
 * qui ouvre la liste, ou par le deep link `mytripcircle://invitation/:token`,
 * qui ouvre l'invitation désignée. Ce lien porte l'adhésion à un voyage, à ne
 * pas confondre avec `mytripcircle://friend-invite/:token`, qui porte une
 * demande d'amitié et mène à FriendInvitationScreen. L'écran figure dans
 * MainStack comme dans AuthStack : un visiteur non connecté qui suit le lien
 * voit donc l'invitation, mais sa liste reste vide faute de compte et toute
 * acceptation lui propose d'abord de s'authentifier. En sortie, TripPublicView
 * avant de répondre, et TripDetails une fois membre.
 *
 * Données : tout vient de useInvitationManagement, qui s'appuie sur
 * TripsContext pour lire, accepter, refuser et annuler les invitations
 * (invitationsApi en dessous), sur AuthContext pour identifier le destinataire,
 * et sur NotificationContext, consulter cet écran valant prise de connaissance.
 *
 * États pris en charge : chargement (cartes squelette), onglet vide (message
 * propre à chacun), refus en cours de saisie (fenêtre dédiée), acceptation en
 * cours (seule la ligne concernée signale l'attente), hors-ligne (les actions
 * des cartes sont neutralisées). Un échec de chargement de la liste est
 * seulement journalisé et laisse l'écran vide ; en mode lien, il alerte.
 */
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { F } from "../theme/fonts";
import { TabKey } from "../utils/invitationUtils";
import { useInvitationManagement } from "../hooks/useInvitationManagement";
import SkeletonBox from "../components/SkeletonBox";
import InvitationCard from "../components/invitations/InvitationCard";
import SentCard from "../components/invitations/SentCard";
import EmptyState from "../components/invitations/EmptyState";
import DeclineModal from "../components/invitations/DeclineModal";
import AcceptedToast from "../components/invitations/AcceptedToast";
import InvitationDetailView from "../components/invitations/InvitationDetailView";
import BackButton from "../components/ui/BackButton";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";

/**
 * Compose l'écran des invitations et arbitre entre ses deux modes.
 *
 * @param route.params.token Jeton d'invitation, facultatif : présent, il fait
 * basculer l'écran sur la vue détaillée d'une seule invitation ; absent, la
 * liste s'affiche. Il est lu par useInvitationManagement, non ici.
 *
 * Effets de bord notables — chargement réseau des invitations reçues et émises
 * au montage puis à chaque changement de jeton, marquage des notifications
 * comme lues, et redirection vers TripPublicView lorsque le voyage visé par le
 * lien est identifiable.
 */
const InvitationScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { t }      = useTranslation();
  const { colors } = useTheme();
  const { disabled: offlineDisabled } = useOfflineDisabled();

  const {
    invitation, loading, currentToken, setCurrentToken, initialToken, responding,
    invitations, sentInvitations, refreshing, tab, setTab, pending, displayed,
    declineTarget, setDeclineTarget, declineReason, setDeclineReason, declining,
    acceptingId, toastAnim, toastTrip,
    onRefresh,
    handleAccept, openDecline, confirmDecline,
    handleCancelInvitation,
    handleAcceptSingle, handleDeclineSingle,
  } = useInvitationManagement();

  // ── Deep-link mode ──

  if (currentToken) {
    return (
      <InvitationDetailView
        invitation={invitation}
        loading={loading}
        responding={responding}
        // Venu d'un lien, l'écran n'a pas de liste derrière lui et doit se
        // dépiler ; ouvert depuis la liste, oublier le jeton suffit à y
        // revenir sans recharger.
        onBack={() => {
          if (initialToken) {
            navigation.goBack();
          } else {
            setCurrentToken(undefined);
          }
        }}
        onAccept={handleAcceptSingle}
        onDecline={handleDeclineSingle}
        onNavigateToTrip={(tripId) => navigation.navigate("TripDetails", { tripId })}
        onNavigateBack={() => navigation.goBack()}
      />
    );
  }

  // ── List mode ──

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("invitation.myInvitations")}</Text>

        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* ── Tabs ── */}
      <View style={[styles.tabBar, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        {([
          { key: "all",     label: t("invitation.tabAll",     { count: invitations.length })    },
          { key: "pending", label: t("invitation.tabPending", { count: pending.length })         },
          { key: "sent",    label: t("invitation.tabSent",    { count: sentInvitations.length }) },
        ] as { key: TabKey; label: string }[]).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tabItem, tab === key && [styles.tabItemActive, { borderBottomColor: colors.terra }]]}
            onPress={() => setTab(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: colors.textLight }, tab === key && [styles.tabTextActive, { color: colors.terra }]]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={{ paddingHorizontal: 14, paddingTop: 12, gap: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ borderRadius: 14, backgroundColor: colors.bgMid, padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <SkeletonBox width={40} height={40} borderRadius={20} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SkeletonBox width="65%" height={14} borderRadius={6} />
                  <SkeletonBox width="45%" height={12} borderRadius={5} />
                </View>
                <SkeletonBox width={60} height={22} borderRadius={10} />
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <SkeletonBox height={36} borderRadius={10} style={{ flex: 1 }} />
                <SkeletonBox height={36} borderRadius={10} style={{ flex: 1 }} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, displayed.length === 0 && styles.scrollEmpty]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.terra} />
          }
        >
          {(() => {
            if (displayed.length === 0) return <EmptyState tab={tab} />;
            if (tab === "sent") return displayed.map((inv) => (
              <SentCard
                // Les invitations n'exposent pas toutes le même identifiant
                // selon leur origine ; la cascade garantit une clé stable.
                key={inv._id ?? inv.token ?? inv.id}
                invitation={inv}
                disabled={offlineDisabled}
                onViewTrip={() => {
                  const id = inv.tripId ?? inv.trip?._id;
                  if (id) navigation.navigate("TripDetails", { tripId: id });
                }}
                onCancel={() => handleCancelInvitation(inv)}
              />
            ));
            return displayed.map((inv) => (
              <InvitationCard
                key={inv._id ?? inv.token}
                invitation={inv}
                // Seul l'onglet des invitations en attente déplie les cartes :
                // ce sont les seules qui appellent une décision.
                expanded={tab === "pending"}
                accepting={acceptingId === inv.token}
                disabled={offlineDisabled}
                onAccept={() => handleAccept(inv)}
                onDecline={() => openDecline(inv)}
                // Le détail mène de préférence à l'aperçu public du voyage :
                // décider suppose de savoir à quoi l'on est convié. La vue
                // d'invitation seule n'est qu'un repli.
                onDetail={() => {
                  const tripId = inv.tripId ?? inv.trip?._id;
                  if (tripId) {
                    navigation.navigate("TripPublicView", { tripId, invitationToken: inv.token });
                  } else {
                    setCurrentToken(inv.token);
                  }
                }}
                onViewTrip={() => {
                  const id = inv.tripId ?? inv.trip?._id;
                  if (id) navigation.navigate("TripDetails", { tripId: id });
                }}
              />
            ));
          })()}
        </ScrollView>
      )}

      <DeclineModal
        visible={!!declineTarget}
        declineTarget={declineTarget}
        declineReason={declineReason}
        declining={declining}
        onConfirm={confirmDecline}
        onCancel={() => setDeclineTarget(null)}
        onChangeReason={setDeclineReason}
      />

      <AcceptedToast
        toastTrip={toastTrip}
        toastAnim={toastAnim}
        onView={(tripId) => navigation.navigate("TripDetails", { tripId })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root:         { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle:  { fontSize: 20, fontFamily: F.sans700 },
  tabBar: {
    flexDirection: "row", borderBottomWidth: 1,
    marginHorizontal: 20,
  },
  tabItem: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabItemActive: {},
  tabText:       { fontSize: 15, fontFamily: F.sans600 },
  tabTextActive: {},
  scroll:        { padding: 16, gap: 14 },
  scrollEmpty:   { flex: 1 },
});

export default InvitationScreen;
