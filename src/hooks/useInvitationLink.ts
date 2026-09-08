import { useState, useCallback } from "react";
import { Alert, Share } from "react-native";
import { useTranslation } from "react-i18next";
import { useTrips } from "../contexts/TripsContext";

/**
 * Gère le lien d'invitation partageable d'un voyage : obtention, partage par le
 * sélecteur du système et renouvellement. Ce lien permet de convier une
 * personne dont on ne connaît ni le compte ni l'adresse électronique.
 *
 * @param tripId Voyage auquel le lien donne accès.
 * @returns Le lien courant, sa date d'expiration à afficher, `loadLink` à
 * appeler à l'ouverture de l'écran, et les deux gestionnaires de partage et de
 * renouvellement.
 *
 * @remarks Le renouvellement passe par une confirmation car il invalide le lien
 * précédent, potentiellement déjà transmis. L'expiration est reconstituée
 * côté client sur la durée de validité convenue de sept jours : elle est
 * indicative, le serveur restant seul à décider de la validité réelle. Un échec
 * de chargement laisse le lien vide plutôt que d'interrompre l'écran, dont les
 * autres modes d'invitation restent utilisables.
 */
export function useInvitationLink(tripId: string) {
  const { t } = useTranslation();
  const { getTripInvitationLink } = useTrips();
  const [invitationLink, setInvitationLink] = useState<string>("");
  const [linkExpiry, setLinkExpiry] = useState<Date | null>(null);

  const loadLink = useCallback(async () => {
    try {
      const res = await getTripInvitationLink(tripId);
      setInvitationLink(res.link || "");
      const exp = new Date();
      exp.setDate(exp.getDate() + 7);
      setLinkExpiry(exp);
    } catch (e) {
      if (__DEV__) console.warn("[useInvitationLink] Erreur chargement lien:", e);
    }
  }, [tripId]);

  const handleShareLink = async () => {
    if (!invitationLink) return;
    try {
      await Share.share({
        message: t("inviteFriends.shareMsg", { link: invitationLink }),
        url: invitationLink,
      });
    } catch (e) {
      if (__DEV__) console.warn("[useInvitationLink] Partage annulé ou échoué:", e);
    }
  };

  const handleRenewLink = () => {
    Alert.alert(t("inviteFriends.renewTitle"), t("inviteFriends.renewMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("inviteFriends.renewConfirm"),
        onPress: async () => {
          try {
            const res = await getTripInvitationLink(tripId, true);
            setInvitationLink(res.link || "");
            const exp = new Date();
            exp.setDate(exp.getDate() + 7);
            setLinkExpiry(exp);
            Alert.alert(t("inviteFriends.renewSuccess"), t("inviteFriends.renewSuccessMsg"));
          } catch (e) {
            if (__DEV__) console.warn("[useInvitationLink] Erreur renouvellement:", e);
            Alert.alert(t("common.error"), t("inviteFriends.renewError"));
          }
        },
      },
    ]);
  };

  return { invitationLink, linkExpiry, loadLink, handleShareLink, handleRenewLink };
}
