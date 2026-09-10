/**
 * Fiche détaillée d'une réservation : ce qui est réservé, quand, à quelle heure,
 * sous quel numéro de dossier, avec les justificatifs joints.
 *
 * Besoin couvert : retrouver au moment utile — au comptoir, à l'embarquement, à
 * l'arrivée à l'hôtel — le numéro de confirmation et le billet correspondant,
 * puis corriger ou annuler la réservation si le programme change.
 *
 * Position dans le parcours : ouvert depuis la frise d'un voyage, et depuis
 * TripPublicViewScreen lorsqu'un voyage public est consulté par un tiers, ce
 * second appel passant `readOnly`. Retour au seul écran appelant ; l'annulation
 * confirmée referme également la fiche, la réservation n'existant plus.
 *
 * Données : la réservation est d'abord cherchée dans la collection déjà chargée
 * par TripsContext, source partagée qui rend l'ouverture immédiate ; à défaut
 * elle est demandée à l'unité au serveur via bookingsApi. Les modifications et
 * la suppression passent par le même contexte. Le formulaire de modification est
 * BookingForm, adossé à useBookingForm.
 *
 * États pris en charge : chargement (squelette), réservation introuvable
 * (message d'erreur seul, sans possibilité de réessayer), lecture seule (les
 * actions de modification et d'annulation disparaissent), et hors-ligne (ces
 * mêmes actions sont grisées et neutralisées). L'ouverture d'une pièce jointe
 * qui n'est plus accessible donne lieu à une alerte.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  StatusBar,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Booking } from "../types";
import { useTranslation } from "react-i18next";
import { formatDateLong, parseApiError } from "../utils/i18n";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrips } from "../contexts/TripsContext";
import { ApiService } from "../services/ApiService";
import BookingForm from "../components/BookingForm";
import BookingDetailsSkeleton from "../components/bookingDetails/BookingDetailsSkeleton";
import BookingHeroCover from "../components/bookingDetails/BookingHeroCover";
import { F } from "../theme/fonts";
import { RADIUS } from "../theme";
import { useTheme } from "../contexts/ThemeContext";
import { getBookingHeroGradient } from "../utils/bookingHelpers";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";

type BookingDetailsScreenRouteProp = RouteProp<RootStackParamList, "BookingDetails">;
type BookingDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, "BookingDetails">;

/**
 * Compose la fiche d'une réservation.
 *
 * Les props ne transitent pas par le composant mais par la route :
 * `route.params.bookingId` désigne la réservation à afficher et
 * `route.params.readOnly` retire les commandes d'écriture, la fiche étant alors
 * ouverte depuis la vue publique d'un voyage dont on n'est pas membre. Effets de
 * bord notables — une requête réseau au montage si la réservation n'est pas déjà
 * en mémoire, une écriture distante à l'enregistrement et à l'annulation, et
 * l'ouverture d'une pièce jointe par l'application système associée.
 */
const BookingDetailsScreen: React.FC = () => {
  const route      = useRoute<BookingDetailsScreenRouteProp>();
  const navigation = useNavigation<BookingDetailsScreenNavigationProp>();
  const { bookingId, readOnly = false } = route.params;
  const { t }      = useTranslation();
  const insets     = useSafeAreaInsets();
  const { bookings, updateBooking, deleteBooking } = useTrips();
  const { colors } = useTheme();
  const { disabled: offlineDisabled, style: offlineStyle } = useOfflineDisabled();

  const [booking, setBooking]     = useState<Booking | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);

  // Réagir aussi aux évolutions de la collection du contexte : une modification
  // faite ailleurs, ou l'arrivée tardive du chargement initial, doit rafraîchir
  // la fiche sans que l'utilisateur ait à ressortir puis revenir.
  // Numéro du dernier chargement lancé. Deux chargements peuvent se chevaucher
  // (remplacement de la collection pendant une requête à l'unité) : seul le plus
  // récent a le droit d'écrire l'état, faute de quoi une réponse tardive
  // réinstallerait une version périmée de la fiche (défaut D-11). Le démontage
  // invalide lui aussi toute réponse encore attendue.
  const latestLoad = useRef(0);

  useEffect(() => {
    loadBooking();
    return () => { latestLoad.current += 1; };
  }, [bookingId, bookings]);

  const loadBooking = async () => {
    const load = ++latestLoad.current;
    setLoading(true);
    // Deux identifiants sont comparés : les réservations issues du serveur
    // portent `_id`, celles déjà normalisées par le contexte portent `id`, et
    // l'appelant peut avoir transmis l'un ou l'autre.
    const found = bookings.find((b) => b.id === bookingId || b._id === bookingId);
    // Lecture locale prioritaire : la fiche s'ouvre sans attente réseau, la
    // requête à l'unité n'étant nécessaire que pour une réservation absente de
    // la collection, cas d'une ouverture par un tiers sur un voyage public.
    if (found) { setBooking(found); setLoading(false); return; }
    try {
      const data = await ApiService.getBookingById(bookingId);
      if (load !== latestLoad.current) return;
      setBooking({
        id: data._id ?? data.id, _id: data._id, tripId: data.tripId,
        type: data.type, title: data.title, description: data.description,
        date: data.date, endDate: data.endDate, time: data.time,
        address: data.address, confirmationNumber: data.confirmationNumber,
        status: data.status, attachments: data.attachments,
      } as any);
    } catch (error) {
      if (load !== latestLoad.current) return;
      console.error("[BookingDetailsScreen] Erreur lors du chargement de la réservation:", error);
      setBooking(null);
    }
    setLoading(false);
  };

  const handleSaveBooking = async (updates: Omit<Booking, "id" | "createdAt" | "updatedAt">) => {
    if (!booking) return;
    // `_id` prime sur `id` : c'est la clé attendue par le serveur, la seconde
    // n'étant qu'une recopie produite à la normalisation.
    const id = (booking as any)._id ?? booking.id;
    try {
      await updateBooking(id, updates);
      await loadBooking();
      setShowEditForm(false);
    } catch (error) {
      Alert.alert(t("common.error"), parseApiError(error) || t("bookings.details.errorUpdateBooking"));
    }
  };

  const handleCancelBooking = () => {
    Alert.alert(
      t("bookings.details.cancelBooking"),
      t("bookings.details.cancelConfirm"),
      [
        { text: t("bookings.details.no"), style: "cancel" },
        {
          text: t("bookings.details.yes"),
          style: "destructive",
          onPress: async () => {
            try {
              const id = (booking as any)?._id ?? booking?.id;
              if (id) await deleteBooking(id);
              navigation.goBack();
            } catch (error) {
              Alert.alert(t("common.error"), parseApiError(error) || t("bookings.details.errorDeleteBooking"));
            }
          },
        },
      ]
    );
  };

  const handleViewAttachment = async (attachment: string) => {
    // Les quatre schémas admis couvrent les emplacements réellement produits par
    // la sélection de fichiers : cache local, fournisseur de contenu Android,
    // photothèque iOS et lien distant. Tout autre contenu est un reliquat d'une
    // ancienne version, ouvrable par aucune application ; mieux vaut le dire que
    // laisser le système afficher un échec sans explication.
    const isUri = attachment.startsWith("file://") || attachment.startsWith("content://")
      || attachment.startsWith("https://") || attachment.startsWith("ph://");
    if (!isUri) { Alert.alert(t("common.error"), t("bookings.details.fileNotAccessible")); return; }
    try {
      await Linking.openURL(attachment);
    } catch (e) {
      if (__DEV__) console.warn("[BookingDetailsScreen] Erreur ouverture fichier:", e);
      Alert.alert(t("common.error"), t("bookings.details.fileOpenError"));
    }
  };

  // La troisième case de la grille change d'intitulé selon la nature de la
  // réservation : un numéro de vol, une référence de dossier ferroviaire et une
  // confirmation d'hôtel ne se nomment pas de la même manière, alors qu'ils
  // occupent la même place.
  const getGridThirdLabel = (type: Booking["type"]): string => {
    const keys: Partial<Record<Booking["type"], string>> = {
      flight: "bookings.details.gridThirdLabel.flight",
      train: "bookings.details.gridThirdLabel.train",
      hotel: "bookings.details.gridThirdLabel.hotel",
      restaurant: "bookings.details.gridThirdLabel.restaurant",
      activity: "bookings.details.gridThirdLabel.activity",
    };
    const label = keys[type];
    return label ? t(label) : t("bookings.details.gridThirdLabel.default");
  };

  if (loading) return <BookingDetailsSkeleton />;

  if (!booking) {
    return (
      <View style={[styles.centeredState, { backgroundColor: colors.bg }]}>
        <Text style={[styles.centeredStateText, { color: colors.danger }]}>
          {t("bookings.details.notFound")}
        </Text>
      </View>
    );
  }

  const gradient = getBookingHeroGradient(booking.type);

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <BookingHeroCover
          booking={booking}
          gradient={gradient}
          insetTop={insets.top}
          onBack={() => navigation.goBack()}
        />

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={[styles.infoPill, { backgroundColor: colors.bgMid }]}>
            <Text style={[styles.infoPillLabel, { color: colors.textLight }]}>{t("bookings.details.date")}</Text>
            <Text style={[styles.infoPillValue, { color: colors.text }]} numberOfLines={2}>
              {formatDateLong(booking.date)}
              {booking.endDate ? `\n– ${formatDateLong(booking.endDate)}` : ""}
            </Text>
          </View>
          <View style={[styles.infoPill, { backgroundColor: colors.bgMid }]}>
            <Text style={[styles.infoPillLabel, { color: colors.textLight }]}>{t("bookings.details.time")}</Text>
            <Text style={[styles.infoPillValue, { color: colors.text }]}>{booking.time || "–"}</Text>
          </View>
          <View style={[styles.infoPill, { backgroundColor: colors.bgMid }]}>
            <Text style={[styles.infoPillLabel, { color: colors.textLight }]}>{getGridThirdLabel(booking.type)}</Text>
            <Text style={[styles.infoPillValue, { color: colors.text }]} numberOfLines={1}>
              {booking.confirmationNumber || "–"}
            </Text>
          </View>
        </View>

        {/* Confirmation Card */}
        {booking.confirmationNumber ? (
          <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.confirmLabel, { color: colors.textLight }]}>{t("bookings.details.confirmationNumberShort")}</Text>
            <Text style={[styles.confirmValue, { color: colors.text }]}>{booking.confirmationNumber}</Text>
          </View>
        ) : null}

        {/* Attachments */}
        {booking.attachments && booking.attachments.length > 0 ? (
          <View style={styles.attachmentsSection}>
            <Text style={[styles.attachmentsSectionLabel, { color: colors.textLight }]}>
              {t("bookings.details.attachmentsSectionTitle")}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentsScroll}>
              {booking.attachments.map((attachment) => {
                // Une pièce jointe est stockée sous la forme « nom::emplacement »
                // pour conserver le nom donné par l'utilisateur. Les entrées
                // antérieures à cette convention ne contiennent que
                // l'emplacement : leur dernier segment fait alors office de nom.
                const [name, uri] = attachment.includes("::")
                  ? attachment.split("::")
                  : [attachment.split("/").pop() || attachment, attachment];
                return (
                  <TouchableOpacity
                    key={attachment}
                    style={[styles.attachmentChip, { backgroundColor: colors.bgMid }]}
                    onPress={() => handleViewAttachment(uri)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.attachmentChipText, { color: colors.textMid }]}>📄 {name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Description */}
        {booking.description ? (
          <View style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.descriptionCardTitle, { color: colors.textLight }]}>{t("bookings.details.description")}</Text>
            <Text style={[styles.descriptionCardBody, { color: colors.text }]}>{booking.description}</Text>
          </View>
        ) : null}

        {/* Actions retirées, et non simplement grisées, en lecture seule : la
            fiche est alors ouverte depuis un voyage public dont le visiteur
            n'est pas membre, et lui présenter des commandes inopérantes
            laisserait croire à un droit qu'il n'a pas. */}
        {!readOnly && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionEdit, { backgroundColor: colors.bgMid }, offlineStyle]}
              onPress={() => setShowEditForm(true)}
              disabled={offlineDisabled}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionEditText, { color: colors.textMid }]}>{t("bookings.details.editButton")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionDelete, { backgroundColor: colors.dangerLight }, offlineStyle]}
              onPress={handleCancelBooking}
              disabled={offlineDisabled}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionDeleteText, { color: colors.danger }]}>{t("bookings.details.deleteButton")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {booking && (
        <BookingForm
          visible={showEditForm}
          onClose={() => setShowEditForm(false)}
          onSave={handleSaveBooking}
          initialBooking={booking}
          preselectedTripId={booking.tripId}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  centeredState: { flex: 1, justifyContent: "center", alignItems: "center" },
  centeredStateText: { fontSize: 16, fontFamily: F.sans400 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 18, paddingVertical: 14 },
  infoPill: { flex: 1, minWidth: 80, borderRadius: RADIUS.input, paddingHorizontal: 12, paddingVertical: 8 },
  infoPillLabel: { fontSize: 11, fontFamily: F.sans400, marginBottom: 3 },
  infoPillValue: { fontSize: 14, fontFamily: F.sans600, lineHeight: 19 },
  confirmCard: { marginHorizontal: 18, marginBottom: 10, borderWidth: 1, borderRadius: RADIUS.card, paddingHorizontal: 16, paddingVertical: 12 },
  confirmLabel: { fontSize: 11, fontFamily: F.sans400, marginBottom: 4 },
  confirmValue: { fontSize: 17, fontFamily: F.sans600, letterSpacing: 0.5 },
  attachmentsSection: { marginHorizontal: 18, marginBottom: 12 },
  attachmentsSectionLabel: { fontSize: 12, fontFamily: F.sans600, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  attachmentsScroll: { gap: 8, paddingRight: 4 },
  attachmentChip: { borderRadius: RADIUS.input, paddingHorizontal: 12, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  attachmentChipText: { fontSize: 12, fontFamily: F.sans400 },
  descriptionCard: { marginHorizontal: 18, marginBottom: 12, borderWidth: 1, borderRadius: RADIUS.card, paddingHorizontal: 16, paddingVertical: 12 },
  descriptionCardTitle: { fontSize: 11, fontFamily: F.sans400, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  descriptionCardBody: { fontSize: 14, fontFamily: F.sans400, lineHeight: 22 },
  actionsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingVertical: 8, marginTop: 8 },
  actionEdit: { flex: 1, borderRadius: RADIUS.button, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  actionEditText: { fontSize: 14, fontFamily: F.sans600 },
  actionDelete: { flex: 1, borderRadius: RADIUS.button, paddingVertical: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(192,64,64,0.2)" },
  actionDeleteText: { fontSize: 14, fontFamily: F.sans600 },
});

export default BookingDetailsScreen;
