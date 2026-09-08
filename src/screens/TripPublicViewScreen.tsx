/**
 * Vue d'un voyage pour quelqu'un qui n'en fait pas encore partie : aperçu avant
 * d'accepter une invitation, ou consultation d'un séjour rendu visible.
 *
 * Besoin couvert : décider s'il faut rejoindre un voyage sans s'engager
 * d'abord. Couverture, situation du séjour dans le temps, quatre indicateurs
 * chiffrés, description et contenu — mais en lecture seule et sans composition
 * nominative du groupe : contrairement à TripDetailsScreen, ni onglet des
 * membres, ni ajout, ni modification, et les réservations ne s'ouvrent qu'en
 * `readOnly`. Du groupe, seul l'effectif est communiqué.
 *
 * Position dans le parcours : atteint par lien d'invitation profond, depuis
 * InvitationScreen ou après résolution d'un jeton par useInvitationManagement —
 * `invitationToken` est alors présent et la barre d'acceptation apparaît — ou
 * depuis le profil d'un ami, en simple consultation. En sortie : l'accueil
 * après acceptation, l'écran précédent après refus.
 *
 * Données : fiche, réservations et adresses sont demandées directement à
 * ApiService au montage plutôt qu'à TripsContext, qui ne contient que les
 * voyages de l'utilisateur — or celui-ci n'est pas encore le sien. La réponse à
 * l'invitation passe en revanche par `respondToInvitation` du contexte.
 *
 * États pris en charge : chargement (squelette dédié), accès refusé ou voyage
 * introuvable (cadenas, message et retour — c'est aussi ce que voit un lien
 * périmé), réponse en cours (barre neutralisée), invitation traitée (la barre
 * disparaît). Un contenu inaccessible se réduit à des listes vides.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { ApiService } from "../services/ApiService";
import { useTrips } from "../contexts/TripsContext";
import { useAuth } from "../contexts/AuthContext";
import { parseApiError } from "../utils/i18n";
import { useTheme } from "../contexts/ThemeContext";
import { F } from "../theme/fonts";
import TripPublicSkeleton from "../components/tripPublicView/TripPublicSkeleton";
import TripCoverHero from "../components/tripPublicView/TripCoverHero";
import TripContentTabs from "../components/tripPublicView/TripContentTabs";
import InvitationCtaBar from "../components/tripPublicView/InvitationCtaBar";
import BackButton from "../components/ui/BackButton";
import ReportSheet from "../components/moderation/ReportSheet";
import { moderationApi } from "../services/api/moderationApi";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Durée du séjour, arrondie au jour supérieur et bornée à un : un aller-retour
 * dans la journée reste « 1 jour » là où le calcul brut donnerait zéro.
 */
const tripDays = (start: string | Date, end: string | Date) =>
  Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));

/**
 * Compose l'aperçu public d'un voyage et, le cas échéant, la réponse à
 * l'invitation qui y donne accès.
 *
 * Aucune prop : `tripId` et `invitationToken` facultatif sont lus dans la route,
 * la présence du second distinguant l'aperçu d'invitation de la consultation.
 * Effets de bord — trois appels réseau au montage, écriture via TripsContext à
 * l'acceptation, signalement adressé à moderationApi.
 */
const TripPublicViewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tripId, invitationToken } = route.params as { tripId: string; invitationToken?: string };
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { respondToInvitation } = useTrips();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [trip, setTrip] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"bookings" | "addresses">("bookings");
  const [responding, setResponding] = useState(false);
  // Initialisé d'après la seule présence du jeton ; sa validité n'est pas
  // vérifiée ici, le serveur la tranchant au moment de la réponse.
  const [invitationStatus, setInvitationStatus] = useState<"pending" | "accepted" | "declined" | null>(
    invitationToken ? "pending" : null
  );
  const [reportSheetVisible, setReportSheetVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // Seule la fiche est indispensable : l'échec du contenu est rattrapé
        // par une liste vide, un voyage partagé pouvant n'en rien exposer.
        const [t, b, a] = await Promise.all([
          ApiService.getTripById(tripId),
          ApiService.getBookingsByTripId(tripId).catch(() => []),
          ApiService.getAddressesByTripId(tripId).catch(() => []),
        ]);
        setTrip(t);
        setBookings(b);
        setAddresses(a);
      } catch (e) {
        // Le refus d'accès est ici nominal — lien périmé, voyage redevenu privé.
        // `trip` laissé nul fait basculer l'écran sur son message dédié.
        if (__DEV__) console.warn("[TripPublicViewScreen] Chargement voyage inaccessible:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tripId]);

  const handleAccept = async () => {
    if (!invitationToken) return;
    setResponding(true);
    try {
      // Réponse passée par TripsContext plutôt qu'en appel direct : il
      // rafraîchit la collection, que l'accueil affichera juste après.
      const ok = await respondToInvitation(invitationToken, "accept", user?.id);
      if (ok) {
        setInvitationStatus("accepted");
        Alert.alert(
          t("tripPublicView.joinedTitle"),
          t("tripPublicView.joinedMsg", { title: trip?.title ?? "" }),
          [{ text: t("tripPublicView.viewMyTrips"), onPress: () => navigation.navigate("Main") }]
        );
      } else {
        Alert.alert(t("common.error"), t("tripPublicView.acceptError"));
      }
    } catch (e) {
      Alert.alert(t("common.error"), parseApiError(e) || t("tripPublicView.unexpectedError"));
    } finally {
      setResponding(false);
    }
  };

  // Le refus est confirmé, l'acceptation non : refuser consomme l'invitation et
  // le lien ne mènera plus nulle part.
  const handleDecline = () => {
    Alert.alert(
      t("tripPublicView.declineTitle"),
      t("tripPublicView.declineMsg", { title: trip?.title ?? "" }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("tripPublicView.decline"),
          style: "destructive",
          onPress: async () => {
            if (!invitationToken) return;
            setResponding(true);
            try {
              const ok = await respondToInvitation(invitationToken, "decline", user?.id);
              if (ok) { setInvitationStatus("declined"); navigation.goBack(); }
              else Alert.alert(t("common.error"), t("tripPublicView.declineError"));
            } catch (e) {
              Alert.alert(t("common.error"), parseApiError(e) || t("tripPublicView.unexpectedError"));
            } finally {
              setResponding(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <TripPublicSkeleton />;

  // Message générique : nommer la cause — voyage supprimé, redevenu privé, lien
  // périmé — révélerait à un visiteur non autorisé si le voyage existe.
  if (!trip) {
    return (
      <View style={[styles.loaderFull, { backgroundColor: colors.bg }]}>
        <Ionicons name="lock-closed-outline" size={36} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
        <Text style={[styles.noAccessText, { color: colors.textLight }]}>{t("tripPublicView.noAccess")}</Text>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const now = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  let status: "upcoming" | "past" | "ongoing";
  if (now < start) { status = "upcoming"; }
  else if (now > end) { status = "past"; }
  else { status = "ongoing"; }
  const statusLabel = {
    upcoming: t("tripPublicView.statusUpcoming"),
    past:     t("tripPublicView.statusPast"),
    ongoing:  t("tripPublicView.statusOngoing"),
  }[status];
  const statusColor = { upcoming: "#5A8FAA", past: "#7A6A58", ongoing: "#6B8C5A" }[status];
  const statusBg    = { upcoming: "#DCF0F5", past: "#EDE5D8", ongoing: "#E2EDD9" }[status];
  const days = tripDays(trip.startDate, trip.endDate);
  // Le propriétaire ne figure pas parmi les collaborateurs : l'unité ajoutée
  // rétablit l'effectif réel du groupe.
  const membersCount = 1 + (trip.collaborators?.length ?? 0);
  // Un jeton et une invitation encore en attente : la barre disparaît dès la
  // réponse, ce qui interdit d'en donner une seconde.
  const hasInviteCta = !!invitationToken && invitationStatus === "pending";

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* La marge basse réserve la hauteur de la barre d'acceptation : flottante
          au-dessus du contenu, elle masquerait la fin de la liste. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: hasInviteCta ? 110 + insets.bottom : insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* `onReport` reste indéfini pour le propriétaire : se signaler soi-même
            n'a pas de sens, et le bouton est retiré plutôt que neutralisé,
            l'action n'étant pas seulement indisponible. */}
        <TripCoverHero
          trip={trip}
          statusLabel={statusLabel}
          statusColor={statusColor}
          statusBg={statusBg}
          insetTop={insets.top}
          onBack={() => navigation.goBack()}
          onReport={trip.ownerId === user?.id ? undefined : () => setReportSheetVisible(true)}
        />

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { icon: "sunny-outline",    value: t("tripPublicView.statDurationDays", { count: days }), label: t("tripPublicView.statDuration") },
            { icon: "people-outline",   value: String(membersCount),    label: t("tripPublicView.statMembers")   },
            { icon: "receipt-outline",  value: String(bookings.length), label: t("tripPublicView.statBookings")  },
            { icon: "location-outline", value: String(addresses.length),label: t("tripPublicView.statAddresses") },
          ].map((s) => (
            <View key={s.label} style={[styles.statBox, { backgroundColor: colors.bgMid }]}>
              <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
              <Text style={[styles.statValue, { color: colors.terra }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {trip.description ? (
          <View style={[styles.descBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.descText, { color: colors.textMid }]}>{trip.description}</Text>
          </View>
        ) : null}

        {/* `readOnly` propagé au détail d'une réservation : le visiteur n'est pas
            encore membre et ne doit rien pouvoir y modifier. */}
        <TripContentTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          bookings={bookings}
          addresses={addresses}
          onBookingPress={(id) => navigation.navigate("BookingDetails", { bookingId: id, readOnly: true })}
        />
      </ScrollView>

      {hasInviteCta && (
        <InvitationCtaBar
          responding={responding}
          onAccept={handleAccept}
          onDecline={handleDecline}
          insetBottom={insets.bottom}
        />
      )}

      <ReportSheet
        visible={reportSheetVisible}
        targetType="trip"
        onClose={() => setReportSheetVisible(false)}
        onSubmit={async (reason) => {
          // Feuille refermée avant l'envoi : le motif est choisi, et la laisser
          // ouverte exposerait à signaler deux fois le même voyage.
          setReportSheetVisible(false);
          try {
            await moderationApi.reportTrip(tripId, reason);
            Alert.alert(t("common.ok"), t("tripPublicView.reportedSuccess"));
          } catch (e) {
            if (__DEV__) console.warn("[TripPublicViewScreen] Erreur signalement:", e);
            Alert.alert(t("common.error"), t("tripPublicView.reportError"));
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  loaderFull: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  noAccessText: { fontSize: 15, fontFamily: F.sans400 },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    gap: 3,
  },
  statValue: { fontSize: 15, fontFamily: F.sans700 },
  statLabel: { fontSize: 9, textAlign: "center" },
  descBox: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  descText: { fontSize: 14, lineHeight: 21 },
});

export default TripPublicViewScreen;
