import { useCallback } from "react";
import { TripInvitation } from "../types";
import ApiService from "../services/ApiService";
import { mapInvitation, mapInvitationWithExtras } from "../utils/tripMappers";

interface InvitationsSetters {
  setInvitations: React.Dispatch<React.SetStateAction<TripInvitation[]>>;
  refreshData: () => Promise<void>;
}

/**
 * Volet « invitations » de la façade d'accès distant : émission, consultation
 * dans les deux sens, réponse et annulation, ainsi que le lien de partage.
 *
 * @param setters.setInvitations Mise à jour de la liste d'invitations du
 * contexte.
 * @param setters.refreshData Rechargement complet des données, déclenché quand
 * une invitation acceptée fait entrer un nouveau voyage dans le périmètre de
 * l'utilisateur.
 * @returns Les sept opérations liées aux invitations.
 *
 * @remarks Seule l'émission alimente la liste du contexte ; les consultations
 * renvoient leur résultat sans le stocker, les écrans concernés étant
 * ponctuels. L'acceptation est le seul cas déclenchant un rechargement global :
 * un refus ne modifie que le statut de l'invitation. La consultation par jeton
 * conserve les données jointes du voyage et de l'invitant, l'écran d'accueil
 * d'une invitation devant les afficher avant toute authentification.
 */
export function useTripsApiInvitations({ setInvitations, refreshData }: InvitationsSetters) {
  const createInvitation = useCallback(
    async (invitation: {
      tripId: string;
      inviteeEmail?: string;
      inviteePhone?: string;
      message?: string;
      permissions?: {
        role: "viewer" | "editor";
        canEdit: boolean;
        canInvite: boolean;
        canDelete: boolean;
      };
    }): Promise<TripInvitation> => {
      try {
        const result = await ApiService.createInvitation(invitation);
        const mappedInvitation = mapInvitation(result);
        setInvitations((prev) => [...prev, mappedInvitation]);
        return mappedInvitation;
      } catch (error) {
        console.error("Error creating invitation:", error);
        throw error;
      }
    },
    [setInvitations]
  );

  const getUserInvitations = useCallback(
    async (email: string, status?: string): Promise<any[]> => {
      try {
        const result = await ApiService.getUserInvitations(email, status);
        return result.map((inv: any) => ({
          ...mapInvitation(inv),
          trip: inv.trip,
          inviter: inv.inviter,
        }));
      } catch (error) {
        console.error("Error getting user invitations:", error);
        throw error;
      }
    },
    []
  );

  const getSentInvitations = useCallback(
    async (userId: string, status?: string): Promise<TripInvitation[]> => {
      try {
        const result = await ApiService.getSentInvitations(userId, status);
        return result.map((inv: any) => mapInvitation(inv));
      } catch (error) {
        console.error("Error getting sent invitations:", error);
        throw error;
      }
    },
    []
  );

  const respondToInvitation = useCallback(
    async (token: string, action: "accept" | "decline", userId?: string): Promise<boolean> => {
      try {
        const result = await ApiService.respondToInvitation(token, action, userId);
        if (result.success) {
          setInvitations((prev) =>
            prev.map((inv) =>
              inv.token === token ? { ...inv, status: result.status } : inv
            )
          );
          if (action === "accept") {
            await refreshData();
          }
        }
        return result.success;
      } catch (error) {
        console.error("Error responding to invitation:", error);
        throw error;
      }
    },
    [setInvitations, refreshData]
  );

  const getInvitationByToken = useCallback(async (token: string): Promise<any> => {
    try {
      const result = await ApiService.getInvitationByToken(token);
      return mapInvitationWithExtras(result);
    } catch (error) {
      console.error("Error getting invitation by token:", error);
      throw error;
    }
  }, []);

  const getTripInvitationLink = useCallback(
    async (tripId: string, force = false): Promise<{ token: string; link: string }> => {
      try {
        return await ApiService.getTripInvitationLink(tripId, force);
      } catch (error) {
        console.error("Error getting trip invitation link:", error);
        throw error;
      }
    },
    []
  );

  const cancelInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    try {
      const result = await ApiService.cancelInvitation(invitationId);
      return result.success;
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      throw error;
    }
  }, []);

  return {
    createInvitation,
    getUserInvitations,
    getSentInvitations,
    respondToInvitation,
    getInvitationByToken,
    getTripInvitationLink,
    cancelInvitation,
  };
}
