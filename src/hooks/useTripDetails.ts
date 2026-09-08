import { useState, useRef, useCallback } from "react";
import { Animated } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useTripData } from "./useTripData";
import { useTripPermissions } from "./useTripPermissions";
import { useTripCountdown } from "./useTripCountdown";

type NavigationProp = StackNavigationProp<RootStackParamList, "TripDetails">;

// Re-exporté pour la compatibilité descendante
export type { CountdownValue } from "./useTripCountdown";

/**
 * Point d'entrée unique de l'écran de détail d'un voyage. Assemble les données,
 * les droits et le décompte, et y ajoute l'état propre à l'écran (onglet actif,
 * notification de confirmation), afin que le composant de vue n'ait qu'un seul
 * hook à consommer.
 *
 * @param tripId Voyage affiché.
 * @param showToastParam Passé par l'écran précédent après un enregistrement
 * réussi, pour afficher la confirmation à l'arrivée sur le détail.
 * @returns L'ensemble aplati des valeurs des trois hooks sous-jacents, complété
 * par l'onglet courant, l'état de la notification et la navigation vers
 * l'invitation.
 *
 * @remarks Les données sont rechargées à chaque prise de focus et non au seul
 * montage : l'écran reste en mémoire pendant qu'on modifie une réservation, et
 * un simple retour doit en refléter l'effet. Le retour est aplati pour
 * conserver la signature attendue par l'écran malgré le découpage interne en
 * trois hooks.
 */
export function useTripDetails(tripId: string, showToastParam?: boolean) {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"bookings" | "addresses" | "members">("bookings");
  const [showToast, setShowToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const data = useTripData(tripId);
  const permissions = useTripPermissions(data.trip, user?.id);
  const countdown = useTripCountdown(data.trip);

  useFocusEffect(
    useCallback(() => {
      data.loadTripData();
      if (showToastParam) displayToast();
    }, [tripId, showToastParam]),
  );

  const displayToast = () => {
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowToast(false));
  };

  const handleInviteFriends = () => {
    navigation.navigate("InviteFriends", { tripId });
  };

  return {
    // useTripData
    trip: data.trip,
    bookings: data.bookings,
    addresses: data.addresses,
    loading: data.loading,
    showBookingForm: data.showBookingForm,
    setShowBookingForm: data.setShowBookingForm,
    handleAddBooking: data.handleAddBooking,
    handleSaveBooking: data.handleSaveBooking,
    handleCopyBooking: data.handleCopyBooking,
    handleCopyAddress: data.handleCopyAddress,
    handleAddAddress: data.handleAddAddress,
    handleEditAddress: data.handleEditAddress,
    handleUpdateBooking: data.handleUpdateBooking,
    handleDeleteBooking: data.handleDeleteBooking,
    handleDeleteAddress: data.handleDeleteAddress,
    handleValidateTrip: data.handleValidateTrip,
    otherBookings: data.otherBookings,
    otherAddresses: data.otherAddresses,
    // useTripPermissions
    isOwner: permissions.isOwner,
    userCollaborator: permissions.userCollaborator,
    canInvite: permissions.canInvite,
    totalMembers: permissions.totalMembers,
    collaboratorUsers: permissions.collaboratorUsers,
    // useTripCountdown
    countdown: countdown.countdown,
    progressPercent: countdown.progressPercent,
    durationDays: countdown.durationDays,
    daysPassed: countdown.daysPassed,
    // local
    activeTab,
    setActiveTab,
    showToast,
    setShowToast,
    toastOpacity,
    handleInviteFriends,
  };
}
