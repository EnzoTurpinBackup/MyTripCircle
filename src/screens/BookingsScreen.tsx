/**
 * Écran de l'onglet « Réservations », qui rassemble en une seule liste les
 * transports, hébergements, tables et activités déjà retenus, tous voyages
 * confondus.
 *
 * Besoin couvert : disposer d'un inventaire unique de ce qui est réservé sans
 * avoir à ouvrir chaque voyage, et pouvoir le restreindre à une catégorie
 * lorsqu'on cherche un billet précis.
 *
 * Position dans le parcours : deuxième onglet de MainTabs, atteint par la barre
 * d'onglets ou par balayage depuis « Mes voyages » et « Idées ». L'écran ne mène
 * à aucun autre : modification et suppression se font sur place, dans le
 * formulaire modal et la feuille d'actions ; la fiche BookingDetails n'est
 * atteinte que depuis un voyage.
 *
 * Données : la collection de réservations et les opérations d'écriture viennent
 * de TripsContext, mémoire partagée avec les autres onglets, alimentée par
 * bookingsApi selon une stratégie « périmé puis revalidé ». La saisie relève de
 * BookingForm et d'useBookingForm, qui agrège les pièces jointes
 * d'useAttachmentManager (photothèque, sélecteur de documents) et la lecture de
 * code-barres d'useTicketScanner (appareil photo) ; un refus de permission y est
 * signalé par un message et interrompt le seul ajout concerné.
 *
 * États pris en charge : chargement (squelette plein écran), liste vide avec un
 * message distinct selon qu'aucune réservation n'existe ou que le filtre courant
 * n'en retient aucune, et hors-ligne (commandes d'ajout grisées et neutralisées).
 * Les échecs d'écriture donnent lieu à une alerte ; un échec de chargement est
 * absorbé par le contexte, l'écran conservant la dernière collection connue.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Booking } from "../types";
import { useTrips } from "../contexts/TripsContext";
import { useTranslation } from "react-i18next";
import { parseApiError } from "../utils/i18n";
import BookingForm from "../components/BookingForm";
import BookingCard from "../components/bookings/BookingCard";
import BookingsScreenSkeleton from "../components/bookings/BookingsScreenSkeleton";
import ItemActionSheet from "../components/ItemActionSheet";
import { SwipeToNavigate } from "../hooks/useSwipeToNavigate";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Catégories de filtrage. « all » n'est pas un type de réservation mais une
 * sentinelle désignant l'absence de filtre, ce qui évite un état parallèle.
 */
type FilterType = "all" | "flight" | "train" | "hotel" | "restaurant" | "activity";

/**
 * Compose l'inventaire des réservations.
 *
 * Monté par le navigateur d'onglets, l'écran ne reçoit aucune prop de route :
 * son état provient de TripsContext et du filtre conservé localement. Effets de
 * bord notables — il redemande les collections du contexte à chaque prise de
 * focus, écrit sur le réseau à la création, à la modification et à la
 * suppression, et le formulaire qu'il ouvre sollicite les permissions
 * photothèque, fichiers et appareil photo.
 */
const BookingsScreen: React.FC = () => {
  const { bookings, loading, createBooking, updateBooking, deleteBooking, refreshData } = useTrips();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { disabled: offlineDisabled, style: offlineStyle } = useOfflineDisabled();
  const insets = useSafeAreaInsets();
  // La barre d'onglets flotte au-dessus de la liste : sans cette réserve, la
  // dernière carte resterait inatteignable. Le plancher couvre les appareils
  // dépourvus de zone de sécurité basse, où l'inset vaut zéro.
  const listPaddingBottom = 100 + Math.max(insets.bottom, 12);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [actionBooking, setActionBooking] = useState<Booking | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Rafraîchir à la prise de focus et non au seul montage : une réservation peut
  // avoir été ajoutée ou supprimée depuis un voyage ou depuis une idée convertie,
  // et l'inventaire doit en rendre compte sans geste de l'utilisateur.
  useFocusEffect(useCallback(() => { refreshData(); }, [refreshData]));

  if (loading) return <BookingsScreenSkeleton />;

  const filteredBookings = bookings.filter(
    (booking) => selectedFilter === "all" || booking.type === selectedFilter
  );

  const handleSaveBooking = async (booking: Omit<Booking, "id" | "createdAt" | "updatedAt">) => {
    try {
      // Le formulaire est ouvert sans voyage présélectionné depuis cet onglet :
      // la réservation est donc créée détachée. Le serveur admet ce cas et
      // rattache l'élément au compte plutôt qu'à un voyage, ce qui permet de
      // noter un billet avant même d'avoir composé le séjour.
      await createBooking({ ...booking, tripId: booking.tripId || "" });
      // Resynchroniser plutôt que se fier à la mise à jour locale : le serveur
      // normalise certains champs et attribue l'identifiant définitif.
      await refreshData();
      setShowBookingForm(false);
    } catch (error) {
      Alert.alert(
        t("common.error"),
        parseApiError(error) || t("bookings.saveError") || t("bookings.createBookingError")
      );
    }
  };

  const handleSaveEdit = async (updates: Omit<Booking, "id" | "createdAt" | "updatedAt">) => {
    if (!actionBooking) return;
    try {
      await updateBooking(actionBooking.id, updates);
      await refreshData();
      setShowEditForm(false);
      setActionBooking(null);
    } catch (error) {
      Alert.alert(t("common.error"), parseApiError(error) || t("bookings.details.errorUpdateBooking"));
    }
  };

  const handleDeletePress = () => {
    if (!actionBooking) return;
    // L'identifiant est capturé avant de refermer la feuille d'actions, dont la
    // fermeture efface la réservation sélectionnée. Fermer d'abord évite aussi
    // de superposer la confirmation à une modale déjà ouverte, empilement
    // qu'iOS ne rend pas de façon fiable.
    const id = actionBooking.id;
    setActionBooking(null);
    Alert.alert(
      t("common.delete"),
      t("bookings.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBooking(id);
              await refreshData();
            } catch (error) {
              Alert.alert(t("common.error"), parseApiError(error) || t("bookings.details.errorDeleteBooking"));
            }
          },
        },
      ]
    );
  };

  const renderFilterPill = (filter: FilterType, label: string) => {
    const active = selectedFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
        style={[styles.filterPill, { backgroundColor: active ? colors.terra : colors.bgMid }]}
        onPress={() => setSelectedFilter(filter)}
        activeOpacity={0.75}
      >
        <Text style={[styles.filterPillText, { color: active ? colors.white : colors.textMid }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SwipeToNavigate currentIndex={1} totalTabs={5}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
        <View style={[styles.container, { backgroundColor: colors.bg }]}>

          <View style={[styles.header, { backgroundColor: colors.bg }]}>
            <View>
              <Text style={[styles.headerEyebrow, { color: colors.textLight }]}>{t("bookings.count", { count: filteredBookings.length })}</Text>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t("bookings.header")}</Text>
            </View>
            <TouchableOpacity
              style={[styles.filterIconBtn, { backgroundColor: colors.terra }, offlineStyle]}
              onPress={() => setShowBookingForm(true)}
              disabled={offlineDisabled}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t("bookings.addBooking")}
              accessibilityState={{ disabled: offlineDisabled }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.filtersWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
              {renderFilterPill("all",        t("bookings.filters.all"))}
              {renderFilterPill("flight",     t("bookings.filters.flight"))}
              {renderFilterPill("train",      t("bookings.filters.train"))}
              {renderFilterPill("hotel",      t("bookings.filters.hotel"))}
              {renderFilterPill("restaurant", t("bookings.filters.restaurant"))}
              {renderFilterPill("activity",   t("bookings.filters.activity"))}
            </ScrollView>
          </View>

          {filteredBookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.terraLight }]}>
                <Ionicons name="calendar-outline" size={44} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("bookings.emptyTitle")}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMid }]}>
                {selectedFilter === "all"
                  ? t("bookings.emptyAll")
                  : t("bookings.emptyFiltered", { type: t(`bookings.filters.${selectedFilter}`) })}
              </Text>
              <TouchableOpacity style={[styles.emptyAddButton, { backgroundColor: colors.terra }, offlineStyle]} onPress={() => setShowBookingForm(true)} disabled={offlineDisabled} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={18} color="white" style={{ marginRight: 8 }} {...DECORATIVE_ELEMENT_PROPS} />
                <Text style={styles.emptyAddButtonText}>{t("bookings.addBooking")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listWrapper}>
              <FlatList
                data={filteredBookings}
                renderItem={({ item }) => (
                  <BookingCard
                    booking={item}
                    onPress={() => setActionBooking(item)}
                  />
                )}
                // Repli sur la position : une réservation restituée du cache
                // peut avoir perdu son identifiant, et une clé vide ferait
                // s'effondrer le recyclage des lignes.
                keyExtractor={(item, index) => item.id || `booking-${index}`}
                contentContainerStyle={[styles.bookingsList, { paddingBottom: listPaddingBottom }]}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

          {/* Deux instances distinctes plutôt qu'une seule : le formulaire se
              réinitialise au passage de sa propriété d'ouverture, et la partager
              ferait resurgir la réservation éditée lors d'une création. */}
          <BookingForm
            visible={showBookingForm}
            onClose={() => setShowBookingForm(false)}
            onSave={handleSaveBooking}
          />

          <BookingForm
            visible={showEditForm}
            onClose={() => { setShowEditForm(false); setActionBooking(null); }}
            onSave={handleSaveEdit}
            initialBooking={actionBooking ?? undefined}
          />

          {/* actionBooking tient à la fois la sélection et l'ouverture de la
              feuille : la condition la masque pendant l'édition sans perdre la
              réservation visée, que handleSaveEdit doit encore identifier. */}
          <ItemActionSheet
            visible={!!actionBooking && !showEditForm}
            title={actionBooking?.title ?? ""}
            onClose={() => setActionBooking(null)}
            onEdit={() => setShowEditForm(true)}
            onDelete={handleDeletePress}
          />
        </View>
      </SafeAreaView>
    </SwipeToNavigate>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerEyebrow: { fontFamily: F.sans400, fontSize: 14, marginBottom: 4 },
  headerTitle: { fontFamily: F.sans700, fontSize: 28 },
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#A35830",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  filtersWrapper: { paddingBottom: 14 },
  filtersScroll: { paddingHorizontal: 24, gap: 10, flexDirection: "row", alignItems: "center" },
  filterPill: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20 },
  filterPillText: { fontFamily: F.sans600, fontSize: 15 },
  listWrapper: { flex: 1 },
  bookingsList: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 48 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: "center", alignItems: "center", marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontFamily: F.sans700, marginBottom: 8, textAlign: "center" },
  emptySubtitle: { fontSize: 15, textAlign: "center", marginBottom: 32, lineHeight: 22, fontFamily: F.sans400 },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: "#A35830",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyAddButtonText: { color: "white", fontSize: 15, fontFamily: F.sans600 },
});

export default BookingsScreen;
