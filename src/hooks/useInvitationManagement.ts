import { useState, useEffect, useRef, useCallback } from "react";
import { Alert, Animated } from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { useTrips } from "../contexts/TripsContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useTranslation } from "react-i18next";
import { parseApiError } from "../utils/i18n";
import { TabKey } from "../utils/invitationUtils";
import { RootStackParamList } from "../types";

type InvitationScreenRouteProp = RouteProp<RootStackParamList, "Invitation">;

/**
 * Porte l'écran des invitations dans ses deux usages : la consultation de
 * toutes les invitations reçues et émises, et l'ouverture d'une invitation
 * précise atteinte par un lien externe. Les deux partagent les mêmes actions
 * d'acceptation et de refus, d'où leur réunion ici.
 *
 * @returns L'invitation ciblée par le lien et l'état de la réponse en cours,
 * les listes reçue et émise avec l'onglet actif et la liste `displayed` qui en
 * découle, l'état de la fenêtre de refus, l'identifiant de l'invitation en
 * cours d'acceptation, la notification de réussite, et l'ensemble des
 * gestionnaires.
 *
 * @remarks Le mode est déterminé par la présence d'un jeton dans la route, et
 * ce jeton est resynchronisé à chaque changement de paramètres : un second lien
 * peut être ouvert alors que l'écran est déjà affiché. Une invitation dont le
 * voyage est identifiable renvoie vers l'aperçu public de ce voyage plutôt que
 * de s'afficher seule : la décision d'accepter suppose de savoir à quoi l'on
 * est convié. Les invitations reçues sont triées par statut avant date, les
 * décisions en attente devant apparaître en premier. Les consulter vaut prise
 * de connaissance et solde les notifications correspondantes. Accepter depuis
 * un lien sans être connecté propose l'authentification plutôt que d'échouer.
 * L'identifiant de l'invitation en cours d'acceptation est conservé pour ne
 * signaler l'attente que sur la ligne concernée.
 */
export function useInvitationManagement() {
  const route      = useRoute<InvitationScreenRouteProp>();
  const navigation = useNavigation<any>();
  const { t }      = useTranslation();

  const { respondToInvitation, getInvitationByToken, getUserInvitations, getSentInvitations, cancelInvitation } = useTrips();
  const { user }          = useAuth();
  const { markAllAsRead } = useNotifications();

  const initialToken = route.params?.token;
  const [currentToken, setCurrentToken] = useState<string | undefined>(initialToken);

  // ── Deep-link mode ──
  const [invitation, setInvitation]   = useState<any>(null);
  const [responding, setResponding]   = useState(false);

  // ── List mode ──
  const [invitations, setInvitations]         = useState<any[]>([]);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [tab, setTab]                         = useState<TabKey>("all");

  // ── Decline modal ──
  const [declineTarget, setDeclineTarget] = useState<any>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining]         = useState(false);

  // ── Accept loading (per token) ──
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // ── Toast ──
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastTrip, setToastTrip] = useState<{ name: string; id: string } | null>(null);

  // ── Deep-link token sync ──
  useEffect(() => {
    if (route.params?.token && route.params.token !== currentToken) {
      setCurrentToken(route.params.token);
    }
  }, [route.params?.token]);

  useEffect(() => {
    if (currentToken) {
      loadSingleInvitation();
    } else {
      loadAllInvitations();
    }
  }, [currentToken]);

  // ── Loaders ──

  const loadAllInvitations = useCallback(async () => {
    if (!user?.email) return;
    try {
      const data = await getUserInvitations(user.email);
      const sorted = [...data].sort((a: any, b: any) => {
        const order: Record<string, number> = { pending: 0, accepted: 1, declined: 2, expired: 3 };
        const diff = (order[a.status] ?? 4) - (order[b.status] ?? 4);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setInvitations(sorted);
      markAllAsRead();
    } catch (e) {
      console.error("InvitationScreen loadAll error:", e);
    }
  }, [user?.email]);

  const loadSentInvitations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getSentInvitations(user.id);
      const sorted = [...data].sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSentInvitations(sorted);
    } catch (e) {
      console.error("InvitationScreen loadSent error:", e);
    }
  }, [user?.id]);

  const loadSingleInvitation = async () => {
    try {
      setLoading(true);
      const data = await getInvitationByToken(currentToken ?? "");
      const tripId = data?.tripId ?? data?.trip?._id;
      if (tripId) {
        setLoading(false);
        setCurrentToken(undefined);
        navigation.navigate("TripPublicView", { tripId, invitationToken: currentToken });
      } else {
        setInvitation(data);
        setLoading(false);
      }
    } catch (e) {
      console.error("InvitationScreen loadSingle error:", e);
      Alert.alert(t("common.error"), t("invitation.loadingError"));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentToken) {
      Promise.all([loadAllInvitations(), loadSentInvitations()]).finally(() =>
        setLoading(false)
      );
    }
  }, [loadAllInvitations, loadSentInvitations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAllInvitations(), loadSentInvitations()]);
    setRefreshing(false);
  };

  // ── Toast ──

  const showToast = (tripName: string, tripId: string) => {
    setToastTrip({ name: tripName, id: tripId });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3500),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastTrip(null));
  };

  // ── Accept / Decline (list) ──

  const handleAccept = async (inv: any) => {
    setAcceptingId(inv.token);
    try {
      const ok = await respondToInvitation(inv.token, "accept", user?.id);
      if (ok) {
        await loadAllInvitations();
        const name = inv.tripName ?? inv.trip?.title ?? t("invitation.thisTripRef");
        const id   = inv.tripId   ?? inv.trip?._id;
        showToast(name, id);
      } else {
        Alert.alert(t("common.error"), t("invitation.acceptError2"));
      }
    } catch (e) {
      Alert.alert(t("common.error"), parseApiError(e) || t("invitation.unexpectedError"));
    } finally {
      setAcceptingId(null);
    }
  };

  const openDecline = (inv: any) => {
    setDeclineTarget(inv);
    setDeclineReason("");
  };

  const confirmDecline = async () => {
    if (!declineTarget) return;
    setDeclining(true);
    try {
      const ok = await respondToInvitation(declineTarget.token, "decline", user?.id);
      if (ok) {
        setDeclineTarget(null);
        await loadAllInvitations();
      } else {
        Alert.alert(t("common.error"), t("invitation.declineError2"));
      }
    } catch (e) {
      Alert.alert(t("common.error"), parseApiError(e) || t("invitation.unexpectedError"));
    } finally {
      setDeclining(false);
    }
  };

  // ── Cancel sent invitation ──

  const handleCancelInvitation = (inv: any) => {
    const invitee  = inv.inviteeEmail ?? inv.inviteePhone ?? t("invitation.someoneRef");
    const tripName = inv.trip?.title ?? t("invitation.thisTripRef");
    Alert.alert(
      t("invitation.cancelInvitationTitle"),
      t("invitation.cancelInvitationMessage", { invitee, tripName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          style: "destructive",
          onPress: async () => {
            try {
              const id = inv._id ?? inv.id;
              const ok = await cancelInvitation(id);
              if (ok) {
                await loadSentInvitations();
              } else {
                Alert.alert(t("common.error"), t("invitation.cancelError"));
              }
            } catch (e) {
              Alert.alert(t("common.error"), parseApiError(e) || t("invitation.unexpectedError"));
            }
          },
        },
      ]
    );
  };

  // ── Accept / Decline (deep-link single view) ──

  const handleAcceptSingle = async () => {
    if (!invitation) return;
    if (!user) {
      Alert.alert(t("invitation.loginRequired"), t("invitation.loginToAccept"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("invitation.login"), onPress: () => navigation.navigate("Auth") },
      ]);
      return;
    }
    try {
      setResponding(true);
      const ok = await respondToInvitation(currentToken ?? "", "accept", user.id);
      if (ok) {
        Alert.alert(
          invitation.type === "link" ? t("invitation.tripJoined") : t("invitation.accepted"),
          invitation.type === "link" ? t("invitation.tripJoinedMessage") : t("invitation.acceptedMessage"),
          [{
            text: t("common.ok"),
            onPress: () => {
              if (invitation.tripId) {
                navigation.navigate("TripDetails", { tripId: invitation.tripId });
              } else {
                navigation.navigate("Main");
              }
            },
          }]
        );
      } else {
        Alert.alert(t("common.error"), t("invitation.acceptError"));
      }
    } catch (e) {
      Alert.alert(t("common.error"), parseApiError(e) || t("invitation.acceptError"));
    } finally {
      setResponding(false);
    }
  };

  const handleDeclineSingle = () => {
    Alert.alert(t("invitation.declineTitle"), t("invitation.declineMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("invitation.decline"),
        style: "destructive",
        onPress: async () => {
          try {
            setResponding(true);
            const ok = await respondToInvitation(currentToken ?? "", "decline", user?.id);
            if (ok) {
              Alert.alert(t("invitation.declined"), t("invitation.declinedMessage"), [
                { text: t("common.ok"), onPress: () => navigation.navigate("Main") },
              ]);
            } else {
              Alert.alert(t("common.error"), t("invitation.declineError"));
            }
          } catch (e) {
            Alert.alert(t("common.error"), parseApiError(e) || t("invitation.declineError"));
          } finally {
            setResponding(false);
          }
        },
      },
    ]);
  };

  // ── Derived lists ──

  const pending = invitations.filter((i) => i.status === "pending");
  let displayed: typeof invitations;
  if (tab === "pending")   { displayed = pending; }
  else if (tab === "sent") { displayed = sentInvitations; }
  else                     { displayed = invitations; }

  return {
    // Deep-link state
    invitation, loading, currentToken, setCurrentToken, initialToken, responding,
    // List state
    invitations, sentInvitations, refreshing, tab, setTab, pending, displayed,
    // Decline modal state
    declineTarget, setDeclineTarget, declineReason, setDeclineReason, declining,
    // Accept state
    acceptingId,
    // Toast state
    toastAnim, toastTrip,
    // Handlers
    onRefresh,
    handleAccept, openDecline, confirmDecline,
    handleCancelInvitation,
    handleAcceptSingle, handleDeclineSingle,
  };
}
