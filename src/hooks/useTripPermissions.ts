import { useState, useEffect } from "react";
import { Trip, Collaborator } from "../types";
import ApiService from "../services/ApiService";

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
