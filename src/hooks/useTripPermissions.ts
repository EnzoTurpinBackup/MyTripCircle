import { useState, useEffect } from "react";
import { Trip, Collaborator } from "../types";
import ApiService from "../services/ApiService";

/**
 * Détermine ce que l'utilisateur courant a le droit de faire sur un voyage et
 * charge l'identité des autres membres, que le voyage ne stocke que sous forme
 * d'identifiants.
 *
 * @param trip Voyage consulté, ou `null` tant qu'il n'est pas chargé.
 * @param userId Identifiant de l'utilisateur connecté.
 * @returns Les drapeaux `isOwner` et `canInvite` qui conditionnent l'affichage
 * des actions, l'entrée `userCollaborator` du membre courant, le décompte
 * `totalMembers` et `collaboratorUsers`, table des profils indexée par
 * identifiant.
 *
 * @remarks Les droits sont recalculés ici uniquement pour masquer les commandes
 * inaccessibles ; le serveur reste seul juge et revérifie chaque opération.
 * `totalMembers` ajoute une unité aux collaborateurs, le propriétaire ne
 * figurant pas dans cette liste. Un échec de chargement des profils est
 * journalisé sans interrompre l'écran, qui se contente alors des identifiants.
 */
export function useTripPermissions(
  trip: Trip | null,
  userId: string | undefined,
) {
  const [collaboratorUsers, setCollaboratorUsers] = useState<Map<string, any>>(new Map());

  const isOwner = trip && userId ? trip.ownerId === userId : false;
  const userCollaborator = trip?.collaborators?.find((c: Collaborator) => c.userId === userId);
  const canInvite = isOwner || userCollaborator?.permissions?.canInvite;
  const totalMembers = trip ? (trip.collaborators?.length ?? 0) + 1 : 0;

  useEffect(() => {
    if (!trip) return;
    const loadCollaboratorInfo = async () => {
      const idsToFetch = new Set<string>();
      if (trip.collaborators) {
        trip.collaborators.forEach((c: Collaborator) => {
          if (c.userId !== userId) idsToFetch.add(c.userId);
          if (c.invitedBy && c.invitedBy !== userId) idsToFetch.add(c.invitedBy);
        });
      }
      if (trip.ownerId && trip.ownerId !== userId) idsToFetch.add(trip.ownerId);
      if (idsToFetch.size === 0) return;
      try {
        const users = await ApiService.getUsersByIds(Array.from(idsToFetch));
        const usersMap = new Map();
        users.forEach((u: any) => {
          usersMap.set(u._id?.toString() || u.id, u);
        });
        setCollaboratorUsers(usersMap);
      } catch (error) {
        console.error("Error loading collaborator info:", error);
      }
    };
    loadCollaboratorInfo();
  }, [trip, userId]);

  return { isOwner, userCollaborator, canInvite, totalMembers, collaboratorUsers };
}
