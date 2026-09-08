/**
 * Fiche complète d'un voyage auquel l'utilisateur appartient déjà, propriétaire
 * ou membre invité.
 *
 * Besoin couvert : disposer d'un point unique où retrouver tout ce qui compose
 * un séjour — l'avancement dans le temps, les réservations, le carnet
 * d'adresses et les personnes du groupe — et agir dessus sans changer d'écran,
 * les trois collections étant présentées en onglets plutôt qu'empilées.
 *
 * Position dans le parcours : atteint depuis la liste de TripsScreen, depuis
 * CreateTrip qui remplace le formulaire par cette fiche une fois le voyage créé
 * (avec `showValidateButton` pour inviter à sortir du brouillon), depuis
 * EditTrip qui y revient avec `showToast` après un enregistrement réussi, et
 * enfin après l'acceptation d'une invitation ou la conversion d'une idée en
 * voyage. En sortie : TripActions par le crayon de l'en-tête, InviteFriends
 * depuis l'onglet des membres, AddressForm pour créer ou corriger une adresse.
 *
 * Données : tout provient de useTripDetails, qui assemble trois hooks —
 * useTripData pour la fiche, les réservations et les adresses (préremplissage
 * depuis le cache de TripsContext, puis appels à ApiService),
 * useTripPermissions pour `isOwner`, l'entrée `userCollaborator` du membre
 * courant et le décompte des membres, useTripCountdown pour l'avancement du
 * séjour. L'identité de l'utilisateur connecté vient d'AuthContext, pour que
 * l'onglet des membres sache se reconnaître dans la liste.
 *
 * États pris en charge : chargement (squelette reproduisant la silhouette de
 * la page, défilement neutralisé pour ne pas laisser croire à du contenu),
 * voyage introuvable ou inaccessible (message unique, sans possibilité de
 * réessayer), et permissions — un membre sans droit de modification ne voit ni
 * les commandes d'ajout ni le crayon d'accès aux actions. L'écran n'a pas
 * d'état hors-ligne propre : une erreur réseau est absorbée par useTripData,
 * qui laisse en place les données déjà issues du cache.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import BookingForm from "../components/BookingForm";
import { useTheme } from "../contexts/ThemeContext";
import { useTripDetails } from "../hooks/useTripDetails";
import TripHero from "../components/tripDetails/TripHero";
import TripStatsRow from "../components/tripDetails/TripStatsRow";
import TripProgressBar from "../components/tripDetails/TripProgressBar";
import TripDraftBanner from "../components/tripDetails/TripDraftBanner";
import TripTabBar from "../components/tripDetails/TripTabBar";
import BookingsTab from "../components/tripDetails/BookingsTab";
import AddressesTab from "../components/tripDetails/AddressesTab";
import MembersTab from "../components/tripDetails/MembersTab";
import {
  ExistingBookingPicker,
  ExistingAddressPicker,
} from "../components/tripDetails/ExistingItemPicker";
import { F } from "../theme/fonts";
import { RADIUS, SHADOW } from "../theme";
import SkeletonBox from "../components/SkeletonBox";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

type TripDetailsScreenRouteProp = RouteProp<RootStackParamList, "TripDetails">;

type TripDetailsNavigationProp = StackNavigationProp<RootStackParamList, "TripDetails">;

/**
 * Compose la fiche d'un voyage et arbitre les commandes selon les droits du
 * lecteur.
 *
 * Le composant ne reçoit pas de props : ses paramètres sont lus dans la route —
 * `tripId` (obligatoire), `showValidateButton` qui force la bannière de
 * brouillon au retour de la création, et `showToast` qui déclenche la
 * confirmation après une modification. Effets de bord notables : useTripDetails
 * recharge la fiche, les réservations et les adresses à chaque prise de focus,
 * useTripPermissions émet une requête pour résoudre les profils des membres, et
 * useTripCountdown maintient un intervalle d'une seconde tant que le départ
 * n'est pas passé. La validation du voyage réinitialise la pile de navigation.
 */
const TripDetailsScreen: React.FC = () => {
  const route = useRoute<TripDetailsScreenRouteProp>();
  const navigation = useNavigation<TripDetailsNavigationProp>();
  const { tripId, showValidateButton = false, showToast: toastParam } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();

  const {
    trip,
    bookings,
    addresses,
    loading,
    activeTab,
    setActiveTab,
    showBookingForm,
    setShowBookingForm,
    collaboratorUsers,
    showToast,
    setShowToast,
    toastOpacity,
    isOwner,
    userCollaborator,
    totalMembers,
    progressPercent,
    durationDays,
    daysPassed,
    handleSaveBooking,
    handleCopyBooking,
    handleCopyAddress,
    handleEditAddress,
    handleUpdateBooking,
    handleDeleteBooking,
    handleDeleteAddress,
    handleValidateTrip,
    otherBookings,
    otherAddresses,
  } = useTripDetails(tripId, toastParam);

  const [showBookingPicker, setShowBookingPicker] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  // Le propriétaire n'apparaît pas parmi les collaborateurs du voyage : sa
  // permission n'est donc écrite nulle part et doit être ajoutée ici, sinon il
  // se verrait refuser l'ajout d'adresses sur son propre séjour.
  const canEdit = isOwner || userCollaborator?.permissions?.canEdit;

  const handleAddBookingPress = () => {
    // Sans réservation ailleurs, le choix « créer ou reprendre » n'aurait qu'une
    // branche utile : on ouvre directement le formulaire de création.
    if (!otherBookings.length) {
      setShowBookingForm(true);
      return;
    }
    Alert.alert(t("tripDetails.addBooking"), undefined, [
      { text: t("tripDetails.createNew"), onPress: () => setShowBookingForm(true) },
      { text: t("tripDetails.chooseExisting"), onPress: () => setShowBookingPicker(true) },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  const handleAddAddressPress = () => {
    Alert.alert(t("tripDetails.addAddress"), undefined, [
      { text: t("tripDetails.createNew"), onPress: () => navigation.navigate("AddressForm", { tripId }) },
      { text: t("tripDetails.chooseExisting"), onPress: () => setShowAddressPicker(true) },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  if (loading) {
    return (
      <View style={[s.wrapper, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="light-content" translucent />
        {/* Défilement neutralisé pendant l'attente : faire glisser un squelette
            laisserait croire à du contenu réel situé plus bas. */}
        <ScrollView scrollEnabled={false} contentContainerStyle={s.scrollContent}>
          {/* Hero */}
          <SkeletonBox width="100%" height={220} borderRadius={0} />

          {/* Back button area */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
            {/* Trip title */}
            <SkeletonBox width="65%" height={26} borderRadius={8} />
            <SkeletonBox width="45%" height={14} borderRadius={6} />

            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              {[0, 1, 2].map((i) => (
                <SkeletonBox key={i} height={80} borderRadius={14} style={{ flex: 1 }} />
              ))}
            </View>

            {/* Progress bar */}
            <SkeletonBox width="100%" height={8} borderRadius={4} />

            {/* Tab bar */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {[0, 1, 2].map((i) => (
                <SkeletonBox key={i} height={36} borderRadius={10} style={{ flex: 1 }} />
              ))}
            </View>

            {/* List items */}
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 4 }}>
                <SkeletonBox width={44} height={44} borderRadius={12} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SkeletonBox width="60%" height={14} borderRadius={6} />
                  <SkeletonBox width="40%" height={12} borderRadius={5} />
                </View>
                <SkeletonBox width={60} height={22} borderRadius={10} />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Un voyage absent après chargement recouvre deux cas indiscernables côté
  // client — supprimé entre-temps, ou accès révoqué — d'où un message unique
  // plutôt qu'un diagnostic qui pourrait être faux.
  if (!trip) {
    return (
      <View style={[s.errorContainer, { backgroundColor: colors.bg }]}>
        <Text style={[s.errorText, { color: colors.danger }]}>{t("tripDetails.notFound")}</Text>
      </View>
    );
  }

  return (
    <View style={[s.wrapper, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" translucent />

      <ScrollView
        style={[s.scroll, { backgroundColor: colors.bg }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* `canEdit` ne transporte ici que la permission du collaborateur, sans
            le repli propriétaire : les composants enfants reçoivent aussi
            `isOwner` et recomposent eux-mêmes la règle, ce qui leur permet de
            distinguer les actions ouvertes à tout éditeur de celles réservées
            au propriétaire. */}
        <TripHero
          trip={trip}
          tripId={tripId}
          isOwner={isOwner}
          canEdit={userCollaborator?.permissions?.canEdit}
          bookingsCount={bookings.length}
          addressesCount={addresses.length}
        />

        <TripStatsRow
          bookingsCount={bookings.length}
          addressesCount={addresses.length}
          totalMembers={totalMembers}
        />

        <TripProgressBar
          progressPercent={progressPercent}
          daysPassed={daysPassed}
          durationDays={durationDays}
        />

        {/* Le paramètre de route sert de repli au statut : au retour immédiat de
            la création, la fiche rapatriée peut ne pas encore porter l'état
            « brouillon », et la bannière doit tout de même s'afficher. */}
        {(showValidateButton || trip.status === "draft") && (
          <TripDraftBanner onValidate={handleValidateTrip} />
        )}

        <TripTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "bookings" && (
          <BookingsTab
            bookings={bookings}
            isOwner={isOwner}
            canEdit={userCollaborator?.permissions?.canEdit}
            onAddBooking={handleAddBookingPress}
            onUpdateBooking={handleUpdateBooking}
            onDeleteBooking={handleDeleteBooking}
          />
        )}

        {activeTab === "addresses" && (
          <AddressesTab
            addresses={addresses}
            onEditAddress={handleEditAddress}
            onAddAddress={handleAddAddressPress}
            canAdd={canEdit}
            onDeleteAddress={handleDeleteAddress}
          />
        )}

        {activeTab === "members" && (
          <MembersTab
            trip={trip}
            user={user}
            isOwner={isOwner}
            userCollaborator={userCollaborator}
            collaboratorUsers={collaboratorUsers}
            onInvite={() => navigation.navigate("InviteFriends", { tripId })}
          />
        )}

        <View style={s.bottomPad} />
      </ScrollView>

      {/* Le formulaire est monté conditionnellement pour disposer des bornes du
          séjour : elles servent à contraindre la date de la réservation. */}
      {trip && (
        <BookingForm
          visible={showBookingForm}
          onClose={() => setShowBookingForm(false)}
          onSave={handleSaveBooking}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
          preselectedTripId={tripId}
        />
      )}

      {/* Le sélecteur est refermé avant la copie : celle-ci passe par le réseau
          et laisserait sinon la liste ouverte pendant l'appel, au risque d'un
          second choix qui dupliquerait l'élément. */}
      <ExistingBookingPicker
        visible={showBookingPicker}
        bookings={otherBookings}
        onSelect={(booking) => { setShowBookingPicker(false); handleCopyBooking(booking); }}
        onClose={() => setShowBookingPicker(false)}
      />

      <ExistingAddressPicker
        visible={showAddressPicker}
        addresses={otherAddresses}
        onSelect={(address) => { setShowAddressPicker(false); handleCopyAddress(address); }}
        onClose={() => setShowAddressPicker(false)}
      />

      {/* La confirmation s'efface d'elle-même après quelques secondes ; la croix
          n'est là que pour l'écarter plus tôt si elle masque une action. */}
      {showToast && (
        <Animated.View style={[s.toast, { opacity: toastOpacity }]}>
          <View style={s.toastIcon}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
          </View>
          <View style={s.toastInfo}>
            <Text style={s.toastTitle}>{t("tripDetails.toastUpdatedTitle")}</Text>
            <Text style={s.toastSub}>{t("tripDetails.toastUpdatedSub")}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowToast(false)}>
            <Text style={s.toastClose}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  bottomPad: {
    height: 64,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontFamily: F.sans400,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    fontFamily: F.sans400,
  },
  toast: {
    position: "absolute",
    bottom: 28,
    left: 16,
    right: 16,
    backgroundColor: "#2A2318",
    borderRadius: RADIUS.card,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    ...SHADOW.strong,
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#6B8C5A",
    justifyContent: "center",
    alignItems: "center",
  },
  toastInfo: { flex: 1 },
  toastTitle: {
    fontSize: 13,
    fontFamily: F.sans600,
    color: "#FFFFFF",
  },
  toastSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    fontFamily: F.sans400,
    marginTop: 2,
  },
  toastClose: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    fontFamily: F.sans400,
  },
});

export default TripDetailsScreen;
