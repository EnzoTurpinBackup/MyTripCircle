/**
 * Boîte de réception des invitations à rejoindre un voyage.
 *
 * Besoin couvert : voir les invitations reçues, celles qui attendent une réponse
 * en tête, et y répondre sans repasser par le lien reçu par courrier.
 *
 * Position dans le parcours : ouvert depuis la ligne « Notifications » de
 * ProfileScreen, quitté par le bouton de retour. Aucune navigation n'en part :
 * accepter inscrit le compte parmi les membres du voyage mais laisse
 * l'utilisateur sur la liste, qui se recharge alors.
 *
 * Données : `getUserInvitations` (TripsContext) les retrouve à partir de
 * l'adresse du compte lue dans AuthContext, et `respondToInvitation` transmet la
 * réponse. NotificationContext détient les identifiants déjà consultés, dont
 * dépend aussi le compteur de l'onglet Profil. L'affichage d'une ligne revient à
 * NotifItem, la liste vide à NotifEmptyState.
 *
 * États pris en charge : chargement (squelette), liste vide, rafraîchissement
 * par traction, réponse en cours neutralisant les boutons de la seule invitation
 * concernée. Un échec de chargement n'est pas montré et laisse en place ce qui
 * était affiché ; un échec de réponse remonte en alerte.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTrips } from "../contexts/TripsContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { F } from "../theme/fonts";
import { useTranslation } from "react-i18next";
import { parseApiError } from "../utils/i18n";
import { useTheme } from "../contexts/ThemeContext";
import SkeletonBox from "../components/SkeletonBox";
import NotifItem from "../components/notifications/NotifItem";
import NotifEmptyState from "../components/notifications/NotifEmptyState";
import BackButton from "../components/ui/BackButton";

/**
 * Compose la boîte de réception des invitations.
 *
 * Montée par la pile racine sans paramètre de route : la liste est déduite du
 * compte connecté. Effets de bord notables — appel réseau au montage, à chaque
 * traction et à chaque réponse, puis écriture des identifiants lus en local.
 */
const NotificationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { getUserInvitations, respondToInvitation } = useTrips();
  const { user } = useAuth();
  const { markAllAsRead, markAsRead, readIds } = useNotifications();

  const [invitations, setInvitations]   = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Sans adresse, aucune requête : le serveur retrouve les invitations reçues
    // par destinataire, et une session à peine restaurée peut encore être vide.
    if (!user?.email) return;
    try {
      const data = await getUserInvitations(user.email);
      // Ce qui attend une réponse remonte en tête — seule partie de la liste sur
      // laquelle l'utilisateur peut agir — puis la plus récente d'abord. Un statut
      // inconnu prend un rang supérieur à tous et se retrouve relégué en fin.
      const sorted = [...data].sort((a: any, b: any) => {
        const order = { pending: 0, accepted: 1, declined: 2 };
        const diff =
          (order[a.status as keyof typeof order] ?? 3) -
          (order[b.status as keyof typeof order] ?? 3);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setInvitations(sorted);
    } catch (e) {
      console.error("NotificationsScreen load error:", e);
    }
  }, [user?.email]);

  // Le squelette est retiré dans tous les cas, y compris après un échec : le
  // laisser en place ferait passer une panne pour un chargement sans fin.
  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Seul le refus passe par une confirmation : il clôt l'invitation côté serveur
  // et la ligne perd ses boutons, sans retour possible depuis cet écran.
  const handleRespond = async (token: string, action: "accept" | "decline") => {
    if (action === "decline") {
      Alert.alert(
        t("notifications.declineConfirmTitle"),
        t("notifications.declineConfirmMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("notifications.decline"), style: "destructive", onPress: () => doRespond(token, action) },
        ]
      );
    } else {
      doRespond(token, action);
    }
  };

  // L'attente est repérée par le jeton plutôt que par un booléen : seule la ligne
  // sollicitée voit ses boutons neutralisés pendant l'appel.
  const doRespond = async (token: string, action: "accept" | "decline") => {
    setRespondingId(token);
    try {
      // L'identifiant du compte accompagne la réponse : l'invitation a pu viser
      // une adresse avant que ce compte n'existe.
      const ok = await respondToInvitation(token, action, user?.id);
      if (ok) {
        markAsRead(token);
        // Rechargement complet plutôt que correction sur place : seule la réponse
        // du serveur donne l'état réellement enregistré de l'invitation.
        await load();
      } else {
        Alert.alert(t("common.error"), t("notifications.declineError"));
      }
    } catch (e) {
      Alert.alert(t("common.error"), parseApiError(e) || t("friendInvitation.errorOccurred"));
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} translucent={false} />

      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]}>{t("notifications.title")}</Text>
        </View>
        <TouchableOpacity onPress={() => markAllAsRead()} activeOpacity={0.7}>
          <Text style={[styles.markAll, { color: colors.terra }]}>{t("notifications.markAllRead")}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 14, paddingTop: 12, gap: 14 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <SkeletonBox width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1, gap: 8, paddingTop: 4 }}>
                <SkeletonBox width="75%" height={14} borderRadius={6} />
                <SkeletonBox width="50%" height={12} borderRadius={5} />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  <SkeletonBox width={90} height={30} borderRadius={8} />
                  <SkeletonBox width={90} height={30} borderRadius={8} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            invitations.length === 0 && styles.scrollEmpty,
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.terra} />
          }
        >
          {invitations.length === 0 ? (
            <NotifEmptyState />
          ) : (
            invitations.map((inv) => {
              // Repli sur le jeton, toujours présent puisqu'il porte le lien reçu,
              // quand le serveur n'a pas renvoyé d'identifiant de document.
              const id = inv._id ?? inv.token;
              // Une invitation déjà tranchée n'est jamais « non lue » : la mise en
              // avant signale ce qui reste à faire, pas ce qui n'a pas été vu.
              const isUnread = inv.status === "pending" && !readIds.has(id);
              return (
                <NotifItem
                  key={id}
                  invitation={inv}
                  unread={isUnread}
                  responding={respondingId === inv.token}
                  onPress={() => markAsRead(id)}
                  onAccept={() => handleRespond(inv.token, "accept")}
                  onDecline={() => handleRespond(inv.token, "decline")}
                />
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  headerCenter: { flex: 1 },
  title:   { fontSize: 20, fontFamily: F.sans700, textAlign: "center" },
  markAll: { fontSize: 15, fontFamily: F.sans600 },

  scrollContent: { paddingTop: 8, paddingBottom: 32 },
  // Réservé à la liste vide : sans hauteur imposée, le contenu d'une ScrollView
  // se réduit à sa taille naturelle et le message se collerait sous l'en-tête.
  scrollEmpty:   { flex: 1 },
});

export default NotificationsScreen;
