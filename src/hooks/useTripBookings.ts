import { useState } from "react";
import { Alert } from "react-native";
import { Booking } from "../types";
import { parseApiError } from "../utils/i18n";

type BookingOmitKeys = "id" | "createdAt" | "updatedAt";

interface UseTripBookingsParams {
  tripId: string;
  createBooking: (data: Omit<Booking, BookingOmitKeys> & { tripId: string }) => Promise<Booking>;
  updateBooking: (id: string, data: Partial<Booking>) => Promise<Booking | null>;
  deleteBooking: (id: string) => Promise<boolean>;
  t: (key: string) => string;
}

/**
 * Contrat de la gestion des réservations d'un voyage. Exporté parce qu'il entre
 * dans le type de retour de l'écran de modification, qui aplatit cet état avec
 * le sien.
 */
export interface UseTripBookingsReturn {
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  showBookingForm: boolean;
  editingBookingIndex: number | null;
  handleAddBooking: () => void;
  handleEditBooking: (index: number) => void;
  handleDeleteBooking: (index: number) => void;
  handleSaveBooking: (booking: Omit<Booking, BookingOmitKeys>) => Promise<void>;
  closeBookingForm: () => void;
}

/**
 * Tient la liste des réservations d'un voyage en cours d'édition et l'état du
 * formulaire qui les crée ou les modifie. Utilisé par les écrans de création et
 * de modification, où les réservations se saisissent avant que le voyage ne
 * soit enregistré.
 *
 * @param params.tripId Voyage auquel rattacher les réservations créées.
 * @param params.createBooking Opération distante de création, injectée pour que
 * le hook reste indépendant de la couche d'accès aux données.
 * @param params.updateBooking Opération distante de modification.
 * @param params.deleteBooking Opération distante de suppression.
 * @param params.t Fonction de traduction des messages de confirmation.
 * @returns La liste et son accesseur, l'état d'ouverture du formulaire, l'index
 * en cours d'édition, et les gestionnaires d'ajout, d'édition, de suppression,
 * d'enregistrement et de fermeture.
 *
 * @remarks Les éléments sont repérés par leur position dans la liste et non par
 * leur identifiant : une réservation saisie mais pas encore enregistrée n'en
 * possède pas. Un index nul distingue l'ajout de la modification. La
 * suppression retire l'élément localement même sans identifiant, cas d'une
 * saisie annulée avant enregistrement.
 */
const useTripBookings = ({
  tripId,
  createBooking,
  updateBooking,
  deleteBooking,
  t,
}: UseTripBookingsParams): UseTripBookingsReturn => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [editingBookingIndex, setEditingBookingIndex] = useState<number | null>(null);

  const handleAddBooking = () => {
    setEditingBookingIndex(null);
    setShowBookingForm(true);
  };

  const handleEditBooking = (index: number) => {
    setEditingBookingIndex(index);
    setShowBookingForm(true);
  };

  const handleDeleteBooking = (index: number) => {
    const booking = bookings[index];
    const removeAtIndex = (prev: Booking[]) => prev.filter((_, i) => i !== index);

    const onConfirm = async () => {
      if (booking.id) await deleteBooking(booking.id);
      setBookings(removeAtIndex);
    };

    Alert.alert(t("common.confirm"), t("bookings.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.ok"), style: "destructive", onPress: onConfirm },
    ]);
  };

  const handleSaveBooking = async (
    booking: Omit<Booking, BookingOmitKeys>
  ) => {
    try {
      if (editingBookingIndex === null) {
        const newBooking = await createBooking({ ...booking, tripId });
        setBookings((prev) => [...prev, newBooking]);
      } else {
        const existing = bookings[editingBookingIndex];
        if (existing.id) {
          await updateBooking(existing.id, booking);
          setBookings((prev) =>
            prev.map((b, i) =>
              i === editingBookingIndex ? { ...b, ...booking, updatedAt: new Date() } : b
            )
          );
        }
      }
      setShowBookingForm(false);
      setEditingBookingIndex(null);
    } catch (error) {
      Alert.alert(t("common.error"), parseApiError(error) || t("editTrip.saveError"));
    }
  };

  const closeBookingForm = () => {
    setShowBookingForm(false);
    setEditingBookingIndex(null);
  };

  return {
    bookings,
    setBookings,
    showBookingForm,
    editingBookingIndex,
    handleAddBooking,
    handleEditBooking,
    handleDeleteBooking,
    handleSaveBooking,
    closeBookingForm,
  };
};

export default useTripBookings;
