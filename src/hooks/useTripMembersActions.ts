import { useState } from "react";
import { Alert, Share } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import ApiService from "../services/ApiService";
import { RootStackParamList } from "../types";
import { MemberInfo } from "./useTripMembersData";

type NavProp = StackNavigationProp<RootStackParamList, "TripMembers">;

interface LinkSetters {
  setInviteLink: (link: string) => void;
  setLinkExpiry: (date: Date) => void;
}

/**
 * Regroupe les actions administratives de l'écran des membres : partage et
 * renouvellement du lien d'invitation, annulation d'une invitation, retrait
 * d'un membre, transfert de la propriété et consultation d'un profil.
 *
 * @param tripId Voyage administré.
 * @param onSuccess Rechargement de la composition du groupe, appelé après
 * chaque action aboutie.
 * @returns L'indicateur `actionLoading`, qui neutralise l'interface pendant une
 * opération, et les six gestionnaires d'action.
 *
 * @remarks Ce hook ne détient ni la liste des membres ni le lien : ils sont
 * passés en argument par l'écran, qui les tient de `useTripMembersData`. Cette
 * séparation évite de dupliquer l'état entre chargement et actions. Toute
 * opération irréversible passe par une confirmation, et la feuille d'actions
 * est refermée au préalable pour ne pas superposer deux couches modales. Les
 * échecs sont signalés à l'utilisateur puis absorbés : l'écran reste
 * exploitable et l'action peut être retentée.
 */
export function useTripMembersActions(tripId: string, onSuccess: () => Promise<void>) {
  const navigation = useNavigation<NavProp>();
  const { t } = useTranslation();
  const [actionLoading, setActionLoading] = useState(false);

  const handleShareLink = async (inviteLink: string) => {
    if (!inviteLink) return;
    try {
      await Share.share({
        message: t("tripMembers.shareMsg", { link: inviteLink }),
        url: inviteLink,
      });
    } catch (e) {
      if (__DEV__) console.warn("[useTripMembersActions] Partage annulé ou échoué:", e);
    }
  };

  const handleRenewLink = (setters: LinkSetters) => {
    Alert.alert(
      t("tripMembers.renewTitle"),
      t("tripMembers.renewMsg"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("tripMembers.renewConfirm"),
          onPress: async () => {
            try {
              const res = await ApiService.getTripInvitationLink(tripId, true);
              setters.setInviteLink(res.link || "");
              const exp = new Date();
              exp.setDate(exp.getDate() + 7);
              setters.setLinkExpiry(exp);
              Alert.alert(t("tripMembers.renewSuccess"), t("tripMembers.renewSuccessMsg"));
            } catch (e) {
              if (__DEV__) console.warn("[useTripMembersActions] Erreur renouvellement lien:", e);
              Alert.alert(t("common.error"), t("tripMembers.renewError"));
            }
          },
        },
      ]
    );
  };

  const handleCancelInvitation = (inv: MemberInfo) => {
    Alert.alert(
      t("tripMembers.cancelInviteTitle"),
      t("tripMembers.cancelInviteMsg", { name: inv.name }),
      [
        { text: t("tripMembers.cancelInviteNo"), style: "cancel" },
        {
          text: t("tripMembers.cancelInviteYes"),
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await ApiService.cancelInvitation(inv.invitationId!);
              await onSuccess();
            } catch (e) {
              if (__DEV__) console.warn("[useTripMembersActions] Erreur annulation invitation:", e);
              Alert.alert(t("common.error"), t("tripMembers.cancelInviteError"));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (selectedMember: MemberInfo | null, closeSheet: () => void) => {
    if (!selectedMember) return;
    closeSheet();
    Alert.alert(
      t("tripMembers.removeTitle"),
      t("tripMembers.removeMsg", { name: selectedMember.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("tripMembers.removeConfirm"),
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await ApiService.removeTripCollaborator(tripId, selectedMember.userId);
              await onSuccess();
            } catch (e) {
              if (__DEV__) console.warn("[useTripMembersActions] Erreur retrait membre:", e);
              Alert.alert(t("common.error"), t("tripMembers.removeError"));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleTransferOwnership = (selectedMember: MemberInfo | null, closeSheet: () => void) => {
    if (!selectedMember) return;
    closeSheet();
    Alert.alert(
      t("tripMembers.transferTitle"),
      t("tripMembers.transferMsg", { name: selectedMember.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("tripMembers.transferConfirm"),
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await ApiService.transferTripOwnership(tripId, selectedMember.userId);
              await onSuccess();
            } catch (e) {
              if (__DEV__) console.warn("[useTripMembersActions] Erreur transfert propriété:", e);
              Alert.alert(t("common.error"), t("tripMembers.transferError"));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = (selectedMember: MemberInfo | null, closeSheet: () => void) => {
    if (!selectedMember) return;
    closeSheet();
    navigation.navigate("FriendProfile", {
      friendId: selectedMember.userId,
      friendName: selectedMember.name,
    });
  };

  return {
    actionLoading,
    handleShareLink,
    handleRenewLink,
    handleCancelInvitation,
    handleRemoveMember,
    handleTransferOwnership,
    handleViewProfile,
  };
}
