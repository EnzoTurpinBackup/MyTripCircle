/**
 * Écran central du cercle d'amis : la liste des relations établies, les demandes
 * en cours dans les deux sens, et les profils suggérés.
 *
 * Besoin couvert : savoir avec qui l'on voyage habituellement, traiter les
 * demandes reçues sans les chercher ailleurs, et élargir le cercle — par une
 * suggestion, ou par un lien personnel adressé à quelqu'un dont on ne connaît
 * ni le compte ni l'adresse.
 *
 * Position dans le parcours : atteint depuis l'onglet Profil. En sortie,
 * AddFriend pour une recherche nominative, FriendProfile pour une fiche, et
 * FriendRequestConfirmation après l'envoi d'une demande à une suggestion.
 *
 * Données : tout vient de FriendsContext — amis, demandes et suggestions, et les
 * actions d'envoi, de réponse, d'annulation et de rupture, qui rafraîchissent
 * les listes concernées après chaque opération. L'identifiant du compte courant
 * est lu dans AuthContext, seul moyen de séparer les demandes reçues des
 * demandes émises dans la liste unique renvoyée par le serveur. Le lien
 * d'invitation personnel est demandé à la volée par ApiService, sans être
 * conservé.
 *
 * Trois états de relation cohabitent ici : aucune relation (onglet Suggestions),
 * demande en attente — reçue, on peut l'accepter ou la refuser ; émise, on ne
 * peut que l'annuler —, et amitié établie (onglet Amis). Le blocage se pilote
 * depuis FriendProfile et se traduit ici par la seule disparition du compte.
 *
 * États pris en charge : chargement (squelette commun aux trois onglets), listes
 * vides (message propre à chaque onglet), hors-ligne (l'accès à AddFriend est
 * neutralisé). Les échecs d'action donnent lieu à une alerte ; un échec de
 * rafraîchissement est absorbé par le contexte, qui laisse les listes
 * précédentes en place plutôt que de vider l'écran.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  LayoutAnimation,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useFriends } from "../contexts/FriendsContext";
import { useAuth } from "../contexts/AuthContext";
import { Friend, FriendRequest, FriendSuggestion } from "../types";
import { F } from "../theme/fonts";
import { ApiService } from "../services/ApiService";
import { useTranslation } from "react-i18next";
import { parseApiError } from "../utils/i18n";
import { useTheme } from "../contexts/ThemeContext";
import SkeletonBox from "../components/SkeletonBox";
import FriendsTabBar from "../components/friends/FriendsTabBar";
import FriendsTab from "../components/friends/FriendsTab";
import RequestsTab from "../components/friends/RequestsTab";
import SuggestionsTab from "../components/friends/SuggestionsTab";
import BackButton from "../components/ui/BackButton";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";

type Tab = "friends" | "requests" | "suggestions";

/**
 * Compose l'écran du cercle d'amis et distribue les trois onglets.
 *
 * L'écran est poussé sans paramètre de route : son état vient de FriendsContext
 * et d'AuthContext, seuls l'onglet actif et la recherche textuelle sont locaux.
 * Effets de bord notables — il redemande amis, demandes et suggestions à chaque
 * prise de focus, sollicite l'émission d'un lien d'invitation personnel puis
 * ouvre la feuille de partage du système, et déclenche les alertes de
 * confirmation des actions destructrices.
 */
const FriendsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { disabled: offlineDisabled, style: offlineStyle } = useOfflineDisabled();
  const {
    friends,
    friendRequests,
    suggestions,
    loading,
    sendFriendRequest,
    respondToFriendRequest,
    cancelFriendRequest,
    removeFriend,
    refreshFriendRequests,
    refreshFriends,
    refreshSuggestions,
  } = useFriends();

  const [activeTab, setActiveTab] = useState<Tab>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [sharingLink, setSharingLink] = useState(false);

  const handleTabChange = (tab: Tab) => {
    // Les trois onglets n'ont ni la même hauteur ni le même nombre de lignes ;
    // animer la transition évite le saut visuel d'un remplacement instantané.
    LayoutAnimation.configureNext({
      duration: 240,
      create: { type: "easeInEaseOut", property: "opacity" },
      update: { type: "spring", springDamping: 0.85 },
    });
    setActiveTab(tab);
  };

  // Rafraîchir à la prise de focus : une demande peut avoir été traitée depuis
  // FriendProfile pendant que l'écran restait empilé. Le tableau de dépendances
  // est vide à dessein — les trois fonctions sont recréées à chaque rendu du
  // contexte et les inscrire relancerait l'effet en boucle.
  useFocusEffect(
    React.useCallback(() => {
      refreshFriendRequests();
      refreshFriends();
      refreshSuggestions();
    }, [])
  );

  // Le serveur renvoie les demandes des deux sens dans une liste unique ; la
  // comparaison à l'identifiant du compte courant est ce qui distingue une
  // demande à traiter d'une demande dont on attend la réponse.
  const receivedRequests = friendRequests.filter(
    (r) => r.status === "pending" && r.senderId !== user?.id
  );
  const sentRequests = friendRequests.filter(
    (r) => r.status === "pending" && r.senderId === user?.id
  );
  // Seules les demandes reçues alimentent la pastille de l'onglet : elle
  // annonce un nombre de décisions à prendre, pas un volume d'échanges en cours.
  const totalPending = receivedRequests.length;

  const filteredFriends = friends.filter((f) =>
    searchQuery.trim() ? f.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSendToSuggestion = async (suggestion: FriendSuggestion) => {
    try {
      setSending(true);
      const res = await sendFriendRequest({ recipientEmail: suggestion.email });
      // autoAccepted est transmis tel quel : le destinataire avait déjà une
      // demande en attente vers nous, l'amitié est donc nouée d'emblée et
      // l'écran de confirmation doit l'annoncer ainsi, pas comme une attente.
      navigation.navigate("FriendRequestConfirmation", {
        recipientName: suggestion.name,
        recipientEmail: suggestion.email,
        autoAccepted: !!res?.autoAccepted,
      });
    } catch (error: unknown) {
      Alert.alert(t("common.error"), parseApiError(error) || t("friends.sendError"));
    } finally {
      setSending(false);
    }
  };

  const handleRespondRequest = async (requestId: string, action: "accept" | "decline") => {
    try {
      await respondToFriendRequest(requestId, action);
      if (action === "accept") Alert.alert(t("friends.success"), t("friends.requestAccepted"));
    } catch (error: unknown) {
      Alert.alert(t("common.error"), parseApiError(error) || t("friends.sendError"));
    }
  };

  const handleCancelRequest = (request: FriendRequest) => {
    // Une demande peut viser une adresse ou un numéro sans compte associé : on
    // désigne le destinataire par ce que l'on connaît de lui, du plus parlant
    // au moins parlant.
    const name = request.recipientName || request.recipientEmail || request.recipientPhone || t("common.unknown");
    Alert.alert(
      t("friends.cancelRequest"),
      t("friends.cancelRequestConfirm", { name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("friends.cancelRequest"),
          style: "destructive",
          onPress: async () => {
            try {
              await cancelFriendRequest(request.id);
            } catch (error: unknown) {
              Alert.alert(t("common.error"), parseApiError(error) || t("friends.sendError"));
            }
          },
        },
      ]
    );
  };

  const handleShareInviteLink = async () => {
    setSharingLink(true);
    try {
      const { link } = await ApiService.getFriendInviteLink();
      await Share.share({ message: t("friends.shareMessage", { link }), title: "MyTripCircle" });
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : "";
      // Fermer la feuille de partage sans choisir de destinataire remonte comme
      // un rejet ; ce n'est pas un échec et cela ne mérite pas d'alerte.
      if (raw !== "User did not share") {
        Alert.alert(t("common.error"), parseApiError(error) || t("friends.sendError"));
      }
    } finally {
      setSharingLink(false);
    }
  };

  const handleRemoveFriend = async (friend: Friend) => {
    Alert.alert(
      t("friends.removeFriend"),
      t("friends.removeFriendConfirm", { name: friend.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("friends.remove"),
          style: "destructive",
          onPress: async () => {
            try {
              // friendId désigne le compte de l'ami, quand id identifie la
              // ligne de relation ; c'est bien le compte que le serveur attend.
              await removeFriend(friend.friendId);
            } catch (error: unknown) {
              Alert.alert(t("common.error"), parseApiError(error) || t("friends.sendError"));
            }
          },
        },
      ]
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={{ paddingHorizontal: 14, paddingTop: 8, gap: 12 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
              <SkeletonBox width={48} height={48} borderRadius={24} />
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonBox width="60%" height={14} borderRadius={6} />
                <SkeletonBox width="40%" height={12} borderRadius={5} />
              </View>
              <SkeletonBox width={80} height={32} borderRadius={16} />
            </View>
          ))}
        </View>
      );
    }

    if (activeTab === "friends") {
      return (
        <FriendsTab
          friends={filteredFriends}
          sharingLink={sharingLink}
          searchQuery={searchQuery}
          colors={colors}
          t={t}
          onShareInviteLink={handleShareInviteLink}
          onSearchChange={setSearchQuery}
          onFriendPress={(friendId, friendName) => navigation.navigate("FriendProfile", { friendId, friendName })}
          // La rupture est reléguée à l'appui long : le geste courant sur une
          // carte reste l'ouverture de la fiche, et une action irréversible ne
          // doit pas être atteignable par un simple effleurement.
          onFriendLongPress={handleRemoveFriend}
        />
      );
    }

    if (activeTab === "requests") {
      return (
        <RequestsTab
          receivedRequests={receivedRequests}
          sentRequests={sentRequests}
          colors={colors}
          t={t}
          onRespond={handleRespondRequest}
          onCancel={handleCancelRequest}
        />
      );
    }

    return (
      <SuggestionsTab
        suggestions={suggestions}
        sending={sending}
        colors={colors}
        t={t}
        onSuggestionPress={(friendId, friendName) => navigation.navigate("FriendProfile", { friendId, friendName })}
        onAddSuggestion={handleSendToSuggestion}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("friends.title")}</Text>
        </View>
        <TouchableOpacity style={[styles.addCircleBtn, { backgroundColor: colors.terra, shadowColor: colors.terra }, offlineStyle]} onPress={() => navigation.navigate("AddFriend")} disabled={offlineDisabled} activeOpacity={0.8}>
          <Text style={styles.addCirclePlus}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <FriendsTabBar
          activeTab={activeTab}
          friendsCount={friends.length}
          totalPending={totalPending}
          onTabChange={handleTabChange}
          t={t}
          colors={colors}
        />
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingTop: 14, paddingBottom: 14 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 20, fontFamily: F.sans700 },
  addCircleBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  addCirclePlus: { fontSize: 22, color: "#FFFFFF", lineHeight: 26, marginTop: -1, fontFamily: F.sans400 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
});

export default FriendsScreen;
