import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "../types";
import { useTrips } from "../contexts/TripsContext";
import ApiService from "../services/ApiService";
import { parseApiError } from "../utils/i18n";
import { useBottomSheet } from "./useBottomSheet";

/**
 * Membre tel que le manipule la feuille d'actions : l'indicateur `isOwner`
 * suffit à décider des actions permises, sans avoir à recharger les droits.
 */
export interface CollabInfo {
  userId: string;
  name: string;
  email?: string;
  avatar?: string | null;
  isOwner: boolean;
}

type ScreenNavProp = StackNavigationProp<RootStackParamList, "InviteFriends">;

/**
 * Gère la sélection d'un membre via le bottom sheet et les actions associées
 * (retrait, transfert de propriété, voir le profil).
 * Les états owner/activeMembers restent dans le hook orchestrateur.
 *
 * @param tripId Voyage sur lequel portent les actions.
 * @param onRefresh Rechargement de la liste des membres, appelé après toute
 * action ayant modifié la composition du groupe.
 * @returns Le membre sélectionné, l'indicateur `actionLoading`, les valeurs
 * animées de la feuille, ses commandes d'ouverture et de fermeture, et les
 * trois actions proposées.
 *
 * @remarks La feuille est refermée avant d'ouvrir la confirmation : deux
 * couches modales superposées se recouvrent mal sur iOS. Après une action, le
 * rafraîchissement local est complété par celui du contexte voyages, le retrait
 * d'un membre ou un changement de propriétaire modifiant aussi les listes des
 * autres écrans.
 */
export function useTripMembers(tripId: string, onRefresh: () => Promise<void>) {
  const navigation = useNavigation<ScreenNavProp>();
  const { t } = useTranslation();
  const { refreshData } = useTrips();

  const [selectedMember, setSelectedMember] = useState<CollabInfo | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const memberSheet = useBottomSheet({ outputRange: [340, 0] });

  const openSheet = (m: CollabInfo) => {
    setSelectedMember(m);
    memberSheet.open();
  };

  const closeSheet = () => {
    memberSheet.close(() => setSelectedMember(null));
  };

  const handleRemoveMember = () => {
    if (!selectedMember) return;
    const member = selectedMember;
    closeSheet();
    Alert.alert(
      t("inviteFriends.removeTitle"),
      t("inviteFriends.removeMsg", { name: member.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("inviteFriends.removeConfirm"),
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await ApiService.removeTripCollaborator(tripId, member.userId);
              await onRefresh();
              refreshData();
            } catch (e: any) {
              Alert.alert(
                t("common.error"),
                parseApiError(e) || t("inviteFriends.removeError"),
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleTransferOwnership = () => {
    if (!selectedMember) return;
    const member = selectedMember;
    closeSheet();
    Alert.alert(
      t("inviteFriends.transferTitle"),
      t("inviteFriends.transferMsg", { name: member.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("inviteFriends.transferConfirm"),
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await ApiService.transferTripOwnership(tripId, member.userId);
              await onRefresh();
              refreshData();
            } catch (e: unknown) {
              Alert.alert(
                t("common.error"),
                parseApiError(e) || t("inviteFriends.transferError"),
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleViewProfile = () => {
    if (!selectedMember) return;
    closeSheet();
    navigation.navigate("FriendProfile", {
      friendId: selectedMember.userId,
      friendName: selectedMember.name,
    });
  };

  return {
    selectedMember,
    actionLoading,
    memberSheet,
    openSheet,
    closeSheet,
    handleRemoveMember,
    handleTransferOwnership,
    handleViewProfile,
  };
}
