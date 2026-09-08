import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ApiService from "../services/ApiService";

/**
 * Vue unifiée d'un participant à un voyage, qu'il ait déjà rejoint le groupe ou
 * qu'il soit seulement invité. Ce modèle commun permet à l'écran des membres de
 * rendre les deux populations avec le même composant.
 */
export interface MemberInfo {
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  role: "owner" | "editor" | "viewer";
  status: "active" | "pending";
  invitedAt?: Date;
  invitationId?: string;
}

/**
 * Reconstitue la composition d'un voyage à partir de sources séparées : le
 * voyage ne porte que des identifiants de collaborateurs, les profils vivent
 * ailleurs, et les personnes invitées mais pas encore inscrites n'existent que
 * sous forme d'invitations.
 *
 * @param tripId Voyage dont on établit la liste des membres.
 * @param userId Utilisateur connecté, dont on lit les invitations émises pour
 * en déduire les membres en attente.
 * @returns Le titre du voyage, le propriétaire, les membres actifs et en
 * attente, le lien d'invitation et son expiration avec leurs accesseurs, les
 * indicateurs de chargement, et les commandes de rechargement.
 *
 * @remarks Le voyage et les invitations sont demandés en parallèle, ces deux
 * appels étant indépendants. Les chargements accessoires — profils, lien
 * d'invitation — sont isolés dans leur propre traitement d'erreur : leur échec
 * dégrade l'affichage sans priver l'écran de sa liste. Un membre sans profil
 * connu est présenté sous son identifiant, faute de mieux. Deux indicateurs de
 * chargement coexistent afin de distinguer l'ouverture de l'écran d'un
 * rafraîchissement déclenché par l'utilisateur, qui ne doit pas masquer la
 * liste déjà affichée.
 */
export function useTripMembersData(tripId: string, userId: string | undefined) {
  const { t } = useTranslation();
  const [tripTitle, setTripTitle] = useState("");
  const [owner, setOwner] = useState<MemberInfo | null>(null);
  const [activeMembers, setActiveMembers] = useState<MemberInfo[]>([]);
  const [pendingMembers, setPendingMembers] = useState<MemberInfo[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [linkExpiry, setLinkExpiry] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tripData, sentInvs] = await Promise.all([
        ApiService.getTripById(tripId),
        userId
          ? ApiService.getSentInvitations(userId, "pending").catch(() => [] as any[])
          : Promise.resolve([] as any[]),
      ]);

      if (!tripData) return;
      setTripTitle(tripData.title || "");

      const collaboratorIds = (tripData.collaborators || []).map((c: any) => c.userId);
      const uniqueIds = [...new Set<string>([tripData.ownerId, ...collaboratorIds].filter(Boolean))];

      let usersMap: Record<string, any> = {};
      if (uniqueIds.length > 0) {
        try {
          const usersData = await ApiService.getUsersByIds(uniqueIds);
          usersData.forEach((u: any) => { usersMap[u._id || u.id] = u; });
        } catch (e) {
          if (__DEV__) console.warn("[useTripMembersData] Erreur chargement utilisateurs:", e);
        }
      }

      const ownerData = usersMap[tripData.ownerId];
      setOwner({
        userId: tripData.ownerId,
        name: ownerData?.name || t("tripMembers.ownerFallback"),
        email: ownerData?.email,
        avatar: ownerData?.avatar || null,
        role: "owner",
        status: "active",
      });

      setActiveMembers(
        (tripData.collaborators || []).map((c: any) => {
          const u = usersMap[c.userId] || {};
          return {
            userId: c.userId,
            name: u.name || c.userId,
            email: u.email,
            avatar: u.avatar || null,
            role: (c.role || "viewer") as MemberInfo["role"],
            status: "active" as const,
          };
        })
      );

      const tripPending = sentInvs.filter((inv: any) => inv.tripId === tripId);
      setPendingMembers(
        tripPending.map((inv: any) => ({
          userId: inv._id || inv.id,
          name: inv.inviteeEmail || inv.inviteePhone || t("tripMembers.guestFallback"),
          email: inv.inviteeEmail,
          role: "viewer" as const,
          status: "pending" as const,
          invitedAt: inv.createdAt ? new Date(inv.createdAt) : undefined,
          invitationId: inv._id || inv.id,
        }))
      );

      try {
        const linkRes = await ApiService.getTripInvitationLink(tripId);
        setInviteLink(linkRes.link || "");
        const exp = new Date();
        exp.setDate(exp.getDate() + 7);
        setLinkExpiry(exp);
      } catch (e) {
        if (__DEV__) console.warn("[useTripMembersData] Erreur chargement lien invitation:", e);
      }
    } catch (e) {
      console.error("useTripMembersData loadData:", e);
    } finally {
      setLoading(false);
    }
  }, [tripId, userId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  return {
    tripTitle,
    owner,
    activeMembers,
    pendingMembers,
    inviteLink,
    setInviteLink,
    linkExpiry,
    setLinkExpiry,
    loading,
    refreshing,
    loadData,
    onRefresh,
  };
}
