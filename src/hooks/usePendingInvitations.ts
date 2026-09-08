import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useTrips } from "../contexts/TripsContext";
import ApiService from "../services/ApiService";

/**
 * Expose les invitations nominatives d'un voyage restées sans réponse, pour que
 * l'organisateur sache qui a déjà été convié et puisse revenir sur un envoi.
 *
 * @param tripId Voyage dont on liste les invitations en attente.
 * @param userId Émetteur des invitations, c'est-à-dire l'utilisateur connecté.
 * @returns La liste des invitations, son accesseur en écriture pour une mise à
 * jour immédiate après action, `loadPendingInvitations` pour la rafraîchir,
 * `handleCancelInvitation` et l'indicateur `actionLoading`.
 *
 * @remarks Le serveur renvoie toutes les invitations émises par l'utilisateur ;
 * le filtrage local isole celles de ce voyage et écarte les invitations par
 * lien, qui ne visent personne en particulier et ne peuvent donc pas être
 * annulées individuellement. Un échec de chargement est journalisé sans être
 * remonté : cette liste complète l'écran d'invitation sans le conditionner.
 */
export function usePendingInvitations(tripId: string, userId: string | undefined) {
  const { t } = useTranslation();
  const { getSentInvitations } = useTrips();
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPendingInvitations = useCallback(async () => {
    if (!userId) return;
    try {
      const sent = await getSentInvitations(userId, "pending");
      const forTrip = sent.filter(
        (inv: any) =>
          inv.tripId === tripId &&
          inv.type !== "link" &&
          (inv.inviteeEmail || inv.inviteePhone),
      );
      setPendingInvitations(forTrip);
    } catch (e) { if (__DEV__) console.warn("[usePendingInvitations] Erreur non-bloquante:", e); }
  }, [tripId, userId]);

  const handleCancelInvitation = (inv: any, onRefresh: () => Promise<void>) => {
    const label = inv.inviteeEmail || inv.inviteePhone || t("inviteFriends.guestFallback");
    Alert.alert(
      t("inviteFriends.cancelInviteTitle"),
      t("inviteFriends.cancelInviteMsg", { name: label }),
      [
        { text: t("inviteFriends.cancelInviteNo"), style: "cancel" },
        {
          text: t("inviteFriends.cancelInviteYes"),
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await ApiService.cancelInvitation(inv._id || inv.id);
              await onRefresh();
            } catch (e) {
              if (__DEV__) console.warn("[usePendingInvitations] Erreur annulation invitation:", e);
              Alert.alert(t("common.error"), t("inviteFriends.cancelInviteError"));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  return {
    pendingInvitations,
    setPendingInvitations,
    loadPendingInvitations,
    handleCancelInvitation,
    actionLoading,
  };
}
