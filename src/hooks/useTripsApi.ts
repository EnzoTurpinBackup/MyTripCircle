import { Trip, Booking, Address, TripInvitation } from "../types";
import { useTripsApiTrips } from "./useTripsApiTrips";
import { useTripsApiBookings } from "./useTripsApiBookings";
import { useTripsApiAddresses } from "./useTripsApiAddresses";
import { useTripsApiInvitations } from "./useTripsApiInvitations";

interface TripsApiSetters {
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  setAddresses: React.Dispatch<React.SetStateAction<Address[]>>;
  setInvitations: React.Dispatch<React.SetStateAction<TripInvitation[]>>;
  refreshData: () => Promise<void>;
}

/**
 * Réunit en une seule façade les quatre familles d'opérations distantes d'un
 * voyage : voyages, réservations, adresses et invitations. Le découpage en
 * sous-hooks garde chaque fichier lisible, tandis que ce point d'entrée évite
 * au contexte appelant de connaître ce découpage.
 *
 * @param setters Fonctions de mise à jour de l'état détenu par le contexte
 * voyages, ainsi que `refreshData` pour un rechargement complet lorsqu'une
 * opération touche plusieurs collections à la fois.
 * @returns L'ensemble des actions des quatre sous-hooks, fusionnées à plat.
 *
 * @remarks L'état n'est pas détenu ici mais dans le contexte appelant : ce hook
 * enchaîne l'appel réseau et la mise à jour locale, ce qui permet d'actualiser
 * l'interface sans recharger toutes les données après chaque opération.
 */
export function useTripsApi(setters: TripsApiSetters) {
  const { setTrips, setBookings, setAddresses, setInvitations, refreshData } = setters;

  const trips       = useTripsApiTrips({ setTrips, setBookings });
  const bookings    = useTripsApiBookings({ setBookings });
  const addresses   = useTripsApiAddresses({ setAddresses });
  const invitations = useTripsApiInvitations({ setInvitations, refreshData });

  return {
    ...trips,
    ...bookings,
    ...addresses,
    ...invitations,
  };
}
