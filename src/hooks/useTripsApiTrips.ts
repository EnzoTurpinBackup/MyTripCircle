import { useCallback } from "react";
import { Trip, Booking } from "../types";
import ApiService from "../services/ApiService";
import { mapTripFromCreate } from "../utils/tripMappers";

interface TripsSetters {
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
}

/**
 * Volet « voyages » de la façade d'accès distant : création, modification,
 * validation et suppression, chacune suivie de la mise à jour de l'état du
 * contexte pour que les listes affichées restent cohérentes.
 *
 * @param setters.setTrips Mise à jour de la liste des voyages du contexte.
 * @param setters.setBookings Mise à jour des réservations, nécessaire ici parce
 * que la suppression d'un voyage emporte les siennes.
 * @returns Les quatre opérations sur un voyage.
 *
 * @remarks La validation n'est pas une opération distincte côté serveur mais
 * un changement de statut : elle passe par `updateTrip`, ce qui lui fait
 * bénéficier de la même mise à jour d'état. La suppression retire aussi
 * localement les réservations rattachées, que le serveur supprime en cascade
 * sans les énumérer dans sa réponse.
 */
export function useTripsApiTrips({ setTrips, setBookings }: TripsSetters) {
  const createTrip = useCallback(
    async (trip: Omit<Trip, "id" | "createdAt" | "updatedAt">): Promise<Trip> => {
      try {
        const result = await ApiService.createTrip(trip);
        const mappedTrip = mapTripFromCreate(result);
        setTrips((prev) => [...prev, mappedTrip]);
        return mappedTrip;
      } catch (error) {
        console.error("Error creating trip:", error);
        throw error;
      }
    },
    [setTrips]
  );

  const updateTrip = useCallback(
    async (tripId: string, updates: Partial<Trip>): Promise<Trip | null> => {
      try {
        const result = await ApiService.updateTrip(tripId, updates);
        const mappedTrip = mapTripFromCreate(result);
        setTrips((prev) => prev.map((t) => (t.id === tripId ? mappedTrip : t)));
        return mappedTrip;
      } catch (error) {
        console.error("Error updating trip:", error);
        throw error;
      }
    },
    [setTrips]
  );

  const validateTrip = useCallback(
    async (tripId: string): Promise<Trip | null> => {
      try {
        return await updateTrip(tripId, { status: "validated" });
      } catch (error) {
        console.error("Error validating trip:", error);
        throw error;
      }
    },
    [updateTrip]
  );

  const deleteTrip = useCallback(
    async (tripId: string): Promise<boolean> => {
      try {
        await ApiService.deleteTrip(tripId);
        setTrips((prev) => prev.filter((t) => t.id !== tripId));
        setBookings((prev) => prev.filter((b) => b.tripId !== tripId));
        return true;
      } catch (error) {
        console.error("Error deleting trip:", error);
        return false;
      }
    },
    [setTrips, setBookings]
  );

  return { createTrip, updateTrip, validateTrip, deleteTrip };
}
