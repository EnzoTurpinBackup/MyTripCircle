import { useCallback } from "react";
import { Booking } from "../types";
import ApiService from "../services/ApiService";
import { mapBooking } from "../utils/tripMappers";

interface BookingsSetters {
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
}

/**
 * Volet « réservations » de la façade d'accès distant : création, modification
 * et suppression, suivies de la mise à jour de la liste du contexte.
 *
 * @param setters.setBookings Mise à jour de la liste des réservations.
 * @returns Les trois opérations sur une réservation.
 *
 * @remarks La création recompose explicitement la charge envoyée plutôt que de
 * transmettre l'objet reçu : elle applique au passage les valeurs par défaut
 * attendues par le serveur (devise, statut, pièces jointes) et écarte les
 * champs calculés côté client. La modification apparie l'élément aussi bien
 * par son identifiant applicatif que par celui de la base, les deux formes
 * circulant selon l'origine de la réservation.
 */
export function useTripsApiBookings({ setBookings }: BookingsSetters) {
  const createBooking = useCallback(
    async (booking: Omit<Booking, "id" | "createdAt" | "updatedAt">): Promise<Booking> => {
      try {
        const result = await ApiService.createBooking({
          tripId: booking.tripId || "",
          type: booking.type,
          title: booking.title,
          description: booking.description,
          date: booking.date,
          endDate: booking.endDate,
          time: booking.time,
          address: booking.address,
          confirmationNumber: booking.confirmationNumber,
          price: booking.price,
          currency: booking.currency || "EUR",
          status: booking.status || "pending",
          attachments: booking.attachments || [],
        });
        const mappedBooking = mapBooking(result);
        setBookings((prev) => [...prev, mappedBooking]);
        return mappedBooking;
      } catch (error) {
        console.error("Error creating booking:", error);
        throw error;
      }
    },
    [setBookings]
  );

  const updateBooking = useCallback(
    async (bookingId: string, updates: Partial<Booking>): Promise<Booking | null> => {
      try {
        const updated = await ApiService.updateBooking(bookingId, updates);
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId || (b as Booking & { _id?: string })._id === bookingId
              ? { ...b, ...updated }
              : b
          )
        );
        return updated;
      } catch (error) {
        console.error("Error updating booking:", error);
        throw error;
      }
    },
    [setBookings]
  );

  const deleteBooking = useCallback(
    async (bookingId: string): Promise<boolean> => {
      try {
        await ApiService.deleteBooking(bookingId);
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        return true;
      } catch (error) {
        console.error("Error deleting booking:", error);
        return false;
      }
    },
    [setBookings]
  );

  return { createBooking, updateBooking, deleteBooking };
}
