import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { ApiService } from "../services/ApiService";
import { useFriends } from "../contexts/FriendsContext";
import { parseApiError } from "../utils/i18n";
import { getInitials, getAvatarColor } from "../utils/avatarUtils";
import { moderationApi, ReportReason } from "../services/api/moderationApi";

/**
 * Rassemble tout ce que l'écran de profil d'un autre utilisateur permet de
 * faire : consulter la fiche, nouer ou rompre le lien d'amitié, signaler ou
 * bloquer, et rebondir vers ses voyages ou une invitation.
 *
 * @returns Le profil chargé et les indicateurs d'attente, les éléments
 * d'affichage dérivés du nom (initiales, couleur d'avatar), le drapeau
 * `isFriend` qui détermine les actions proposées, les gestionnaires d'actions
 * et les raccourcis de navigation.
 *
 * @remarks Les paramètres proviennent de la route plutôt que d'arguments :
 * l'écran est atteint depuis plusieurs endroits, et le nom transmis à la
 * navigation permet d'afficher un en-tête avant même que la fiche soit chargée.
 * Le blocage et le retrait ramènent à l'écran précédent, la fiche n'ayant plus
 * de raison d'être consultée. Une demande d'amitié peut être acceptée
 * d'emblée lorsqu'elle croise une demande déjà reçue, d'où le rechargement du
 * profil dans ce cas.
 */
export function useFriendProfileActions() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { friendId, friendName } = route.params as { friendId: string; friendName: string };

  const { removeFriend, sendFriendRequest } = useFriends();
  const { t } = useTranslation();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadProfile = () => {
    setLoading(true);
    ApiService.getFriendProfile(friendId)
      .then(setProfile)
      .catch(() => Alert.alert(t("common.error"), t("friendProfile.loadError")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProfile(); }, [friendId]);

  const handleRemove = () => {
    Alert.alert(
      t("friendProfile.removeTitle"),
      t("friendProfile.removeMsg", { name: profile?.name || friendName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("friendProfile.removeConfirm"),
          style: "destructive",
          onPress: async () => {
            try {
              await removeFriend(friendId);
              navigation.goBack();
            } catch (e) {
              if (__DEV__) console.warn("[useFriendProfileActions] Erreur suppression ami:", e);
              Alert.alert(t("common.error"), t("friendProfile.removeError"));
            }
          },
        },
      ]
    );
  };

  const handleAddFriend = async () => {
    try {
      setSending(true);
      const res = await sendFriendRequest({ recipientEmail: profile?.email });
      if (res?.autoAccepted) {
        Alert.alert(t("friends.success"), t("friendProfile.successNowFriends"), [{ text: t("common.ok"), onPress: loadProfile }]);
      } else {
        Alert.alert(t("friends.success"), t("friendProfile.successRequestSent"));
      }
    } catch (err: unknown) {
      Alert.alert(t("common.error"), parseApiError(err) || t("friendProfile.errorDefault"));
    } finally {
      setSending(false);
    }
  };

  const handleReport = async (reason: ReportReason) => {
    try {
      await moderationApi.reportUser(friendId, reason);
      Alert.alert(t("friends.success"), t("friendProfile.reportedSuccess"));
    } catch (e) {
      if (__DEV__) console.warn("[useFriendProfileActions] Erreur signalement:", e);
      Alert.alert(t("common.error"), t("friendProfile.reportError"));
    }
  };

  const handleBlock = () => {
    const name = profile?.name || friendName;
    Alert.alert(
      t("friendProfile.blockConfirmTitle", { name }),
      t("friendProfile.blockConfirmMsg"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("friendProfile.blockConfirmAction"),
          style: "destructive",
          onPress: async () => {
            try {
              await moderationApi.blockUser(friendId);
              Alert.alert(t("friends.success"), t("friendProfile.blockedSuccess", { name }), [
                { text: t("common.ok"), onPress: () => navigation.goBack() },
              ]);
            } catch (e) {
              if (__DEV__) console.warn("[useFriendProfileActions] Erreur blocage:", e);
              Alert.alert(t("common.error"), t("friendProfile.blockError"));
            }
          },
        },
      ]
    );
  };

  const name        = profile?.name || friendName;
  const initials    = getInitials(name);
  const avatarColor = getAvatarColor(name);
  const isFriend    = profile?.isFriend ?? false;

  return {
    profile, loading, sending,
    name, initials, avatarColor, isFriend,
    friendId, friendName,
    handleRemove, handleAddFriend, handleReport, handleBlock,
    goToTrip: (tripId: string) => navigation.navigate("TripPublicView", { tripId }),
    navigateInvite: () => navigation.navigate("InviteFriends", { preselectedFriend: friendId }),
    goBack: () => navigation.goBack(),
  };
}
