/**
 * Contexte des voyages — voyages, réservations, adresses et invitations de l'utilisateur.
 *
 * Ces quatre collections sont globales parce qu'elles sont partagées et corrélées : la liste
 * des voyages, le détail d'un voyage, la carte des adresses et le compteur de notifications
 * lisent le même jeu de données, et une modification faite dans un écran doit être visible
 * dans les autres sans rechargement. Les charger par écran multiplierait les appels réseau
 * et laisserait des vues divergentes derrière une pile de navigation.
 *
 * Consommateurs : les écrans de voyages, de détail, de réservations et d'adresses, ainsi que
 * `NotificationProvider`, qui s'appuie sur `getUserInvitations`.
 *
 * Réinitialisation : les collections sont vidées et les caches invalidés dès que
 * l'authentification est résolue et que `user` est nul. Le drapeau `authLoading` garde ce
 * nettoyage — sans lui, le `user` encore nul de la première frame effacerait le cache d'un
 * utilisateur toujours connecté. Un changement d'utilisateur force un rechargement complet,
 * l'identifiant courant étant comparé à chaque passage.
 *
 * Garanties hors ligne :
 * - la lecture est servie depuis le cache persistant, y compris périmé (`getStale`) : au
 *   démarrage l'interface s'affiche avant toute réponse réseau, et un échec de chargement
 *   laisse en place ce qui avait été hydraté plutôt que d'afficher une liste vide ;
 * - l'écriture n'est pas garantie : créations et modifications passent par le réseau et
 *   remontent l'erreur à l'écran appelant, sans file d'attente ni rejeu ultérieur ;
 * - le cache n'a pas de portée par utilisateur ; c'est la purge à la déconnexion qui empêche
 *   les données d'un compte d'apparaître sous un autre.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
  useCallback,
} from "react";
import { Trip, Booking, Address, TripInvitation } from "../types";
import ApiService from "../services/ApiService";
import { useAuth } from "./AuthContext";
import { useTripsApi } from "../hooks/useTripsApi";
import { mapTrip, mapBooking, mapAddress } from "../utils/tripMappers";
import { CacheManager, CACHE_KEYS, CACHE_TTL } from "../utils/cacheManager";

/** Champs posés par le serveur à la création : l'appelant ne doit jamais les fournir. */
type NewEntityFields = "id" | "createdAt" | "updatedAt";

interface TripsContextType {
  trips: Trip[];
  bookings: Booking[];
  addresses: Address[];
  invitations: TripInvitation[];
  loading: boolean;
  createTrip: (
    trip: Omit<Trip, NewEntityFields>
  ) => Promise<Trip>;
  updateTrip: (tripId: string, updates: Partial<Trip>) => Promise<Trip | null>;
  validateTrip: (tripId: string) => Promise<Trip | null>;
  deleteTrip: (tripId: string) => Promise<boolean>;
  getTripById: (tripId: string) => Trip | null;
  createBooking: (
    booking: Omit<Booking, NewEntityFields>
  ) => Promise<Booking>;
  updateBooking: (
    bookingId: string,
    updates: Partial<Booking>
  ) => Promise<Booking | null>;
  deleteBooking: (bookingId: string) => Promise<boolean>;
  getBookingsByTripId: (tripId: string) => Booking[];
  createAddress: (
    address: Omit<Address, NewEntityFields>
  ) => Promise<Address>;
  updateAddress: (
    addressId: string,
    updates: Partial<Address>
  ) => Promise<Address | null>;
  deleteAddress: (addressId: string) => Promise<boolean>;
  getAddressesByTripId: (tripId: string) => Address[];
  refreshData: () => Promise<void>;
  createInvitation: (invitation: {
    tripId: string;
    inviteeEmail?: string;
    inviteePhone?: string;
    message?: string;
    permissions?: {
      role: "viewer" | "editor";
      canEdit: boolean;
      canInvite: boolean;
      canDelete: boolean;
    };
  }) => Promise<TripInvitation>;
  getUserInvitations: (
    email: string,
    status?: string
  ) => Promise<TripInvitation[]>;
  getSentInvitations: (
    userId: string,
    status?: string
  ) => Promise<TripInvitation[]>;
  respondToInvitation: (
    token: string,
    action: "accept" | "decline",
    userId?: string
  ) => Promise<boolean>;
  getInvitationByToken: (token: string) => Promise<any>;
  getTripInvitationLink: (tripId: string, force?: boolean) => Promise<{ token: string; link: string }>;
  cancelInvitation: (invitationId: string) => Promise<boolean>;
}

const TripsContext = createContext<TripsContextType | undefined>(undefined);

/**
 * Donne accès aux collections de voyages et aux actions qui les modifient.
 *
 * @returns Les collections, le drapeau de chargement et les actions du contexte.
 * @throws Error hors d'un `TripsProvider`. L'erreur est préférable à un contexte vide :
 * les écrans afficheraient sinon des listes vides et des actions inertes, sans indice.
 */
export const useTrips = () => {
  const context = useContext(TripsContext);
  if (context === undefined) {
    throw new Error("useTrips must be used within a TripsProvider");
  }
  return context;
};

interface TripsProviderProps {
  children: ReactNode;
}

/**
 * Fournit les collections de voyages à l'arbre React et pilote leur cycle de vie.
 *
 * Trois références échappent volontairement à l'état React : l'identifiant de l'utilisateur
 * couvert par les données en mémoire, un verrou de chargement, et le fait qu'un premier
 * chargement ait eu lieu. Elles sont lues et écrites à l'intérieur d'un même effet et ne
 * doivent provoquer aucun rendu ; en état, elles réintroduiraient les rendus en cascade et
 * les chargements concurrents qu'elles servent précisément à empêcher.
 */
export const TripsProvider: React.FC<TripsProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [invitations, setInvitations] = useState<TripInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserIdRef = React.useRef<string | null>(null);
  const isLoadingRef = React.useRef(false);
  const hasLoadedOnceRef = React.useRef(false);

  // Le cache est alimenté par observation de l'état plutôt qu'à chaque appel d'écriture :
  // une seule voie de persistance couvre ainsi création, modification et suppression, y
  // compris les mises à jour optimistes faites par les actions. La garde sur le premier
  // chargement empêche d'écraser un cache valide avec les tableaux vides du montage initial,
  // et les échecs d'écriture sont ignorés — le cache est une optimisation, pas la source.
  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    CacheManager.set(CACHE_KEYS.TRIPS, trips, CACHE_TTL.TRIPS).catch(() => {});
  }, [trips]);

  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    CacheManager.set(CACHE_KEYS.BOOKINGS, bookings, CACHE_TTL.BOOKINGS).catch(() => {});
  }, [bookings]);

  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    CacheManager.set(CACHE_KEYS.ADDRESSES, addresses, CACHE_TTL.ADDRESSES).catch(() => {});
  }, [addresses]);

  /**
   * Charge voyages, réservations et adresses selon une stratégie « périmé puis revalidé ».
   *
   * Au premier passage, le cache est lu avec `getStale` : afficher une donnée datée d'un
   * quart d'heure vaut mieux qu'un écran vide, d'autant que la réponse réseau la remplace
   * quelques centaines de millisecondes plus tard. Le drapeau de chargement n'est donc
   * maintenu que si le cache n'a rien rendu.
   *
   * Le premier chargement est marqué comme accompli avant les `setState` : les effets de
   * synchronisation du cache observent l'état, et l'ordre inverse leur ferait manquer la
   * toute première écriture des données réseau.
   *
   * Un échec réseau ne vide rien et ne propage aucune erreur : l'utilisateur reste sur les
   * données hydratées et continue de naviguer. Le prix de ce choix est qu'une panne
   * ressemble, à l'écran, à une absence de nouveauté.
   */
  const loadData = useCallback(async () => {
    if (!user || isLoadingRef.current) {
      setLoading(false);
      return;
    }

    isLoadingRef.current = true;

    // On first load: hydrate from cache instantly so the UI renders immediately
    if (!hasLoadedOnceRef.current) {
      const [cachedTrips, cachedBookings, cachedAddresses] = await Promise.all([
        CacheManager.getStale<Trip[]>(CACHE_KEYS.TRIPS),
        CacheManager.getStale<Booking[]>(CACHE_KEYS.BOOKINGS),
        CacheManager.getStale<Address[]>(CACHE_KEYS.ADDRESSES),
      ]);

      const hasCachedData = !!(cachedTrips || cachedBookings || cachedAddresses);
      if (cachedTrips) setTrips(cachedTrips);
      if (cachedBookings) setBookings(cachedBookings);
      if (cachedAddresses) setAddresses(cachedAddresses);

      // Show cached data immediately; keep spinner only if nothing in cache
      setLoading(!hasCachedData);
    }

    try {
      const [tripsData, bookingsData, addressesData] = await Promise.all([
        ApiService.getTrips(),
        ApiService.getBookings(),
        ApiService.getAddresses(),
      ]);

      // Mark as loaded BEFORE state updates so the cache-sync useEffects fire correctly
      hasLoadedOnceRef.current = true;
      setTrips(tripsData.map(mapTrip));
      setBookings(bookingsData.map(mapBooking));
      setAddresses(addressesData.map(mapAddress));
    } catch (error) {
      console.error("Error loading data:", error);
      // Keep showing whatever cached data was set above — user stays functional offline
      if (!hasLoadedOnceRef.current) {
        hasLoadedOnceRef.current = true;
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [user]);

  // Arbitre du cycle de vie : décide entre charger, ne rien faire, et purger.
  // La comparaison de l'identifiant courant avec celui déjà couvert distingue un simple
  // nouveau rendu (l'objet `user` change d'identité sans changer de compte) d'un véritable
  // changement d'utilisateur, seul cas qui justifie de recharger.
  useEffect(() => {
    // Auth still resolving from storage — don't touch the cache yet
    if (authLoading) return;

    const userId = user?.id || null;

    if (hasLoadedOnceRef.current && currentUserIdRef.current === userId) {
      return;
    }

    currentUserIdRef.current = userId;

    if (user && !isLoadingRef.current) {
      loadData();
    } else {
      // Auth is resolved and user is null → confirmed logout, safe to clear
      setTrips([]);
      setBookings([]);
      setAddresses([]);
      setInvitations([]);
      setLoading(false);
      hasLoadedOnceRef.current = false;
      Promise.all([
        CacheManager.invalidate(CACHE_KEYS.TRIPS),
        CacheManager.invalidate(CACHE_KEYS.BOOKINGS),
        CacheManager.invalidate(CACHE_KEYS.ADDRESSES),
      ]).catch(() => {});
    }
  }, [user, loadData, authLoading]);

  /**
   * Recharge les trois collections depuis le serveur.
   *
   * Exposée aux écrans pour le « tirer pour rafraîchir », et réutilisée par les actions
   * d'écriture qui préfèrent resynchroniser plutôt que patcher l'état à la main. Un appel
   * concurrent est absorbé par le verrou de `loadData` : la promesse se résout alors sans
   * qu'aucune requête ait été émise, ce qui n'est pas distinguable d'un rafraîchissement
   * réussi du point de vue de l'appelant.
   */
  const refreshData = useCallback(async (): Promise<void> => {
    await loadData();
  }, [loadData]);

  // Les appels réseau d'écriture sont délégués : ils partagent tous le même schéma
  // (appel, remontée d'erreur, mise à jour de l'état) et les garder ici aurait fait de ce
  // fichier un mélange de cycle de vie et de CRUD. Le provider ne conserve que ce qui
  // relève de la mémoire partagée : hydratation, purge et sélecteurs.
  const api = useTripsApi({
    setTrips,
    setBookings,
    setAddresses,
    setInvitations,
    refreshData,
  });

  /**
   * Retrouve un voyage déjà chargé.
   *
   * Lecture purement locale : un identifiant inconnu rend `null` sans déclencher de requête.
   * Un écran ouvert par lien profond avant la fin du chargement obtient donc `null` alors que
   * le voyage existe — il lui revient d'attendre `loading`, non de conclure à une absence.
   *
   * @param tripId Identifiant du voyage.
   * @returns Le voyage en mémoire, ou `null`.
   */
  const getTripById = (tripId: string): Trip | null =>
    trips.find((trip) => trip.id === tripId) || null;

  /**
   * Filtre les réservations d'un voyage parmi celles déjà chargées.
   *
   * @param tripId Identifiant du voyage.
   * @returns Un tableau, vide si le voyage n'a pas de réservation comme si rien n'est encore
   * chargé : les deux situations sont indistinguables ici et ne doivent pas être présentées
   * comme un « aucune réservation » tant que `loading` est vrai.
   */
  const getBookingsByTripId = (tripId: string): Booking[] =>
    bookings.filter((booking) => booking.tripId === tripId);

  /**
   * Filtre les adresses d'un voyage parmi celles déjà chargées.
   *
   * @param tripId Identifiant du voyage.
   * @returns Un tableau, vide si aucune adresse n'est rattachée au voyage ou si le
   * chargement n'a pas encore abouti.
   */
  const getAddressesByTripId = (tripId: string): Address[] =>
    addresses.filter((address) => address.tripId === tripId);

  // Seules les collections et `loading` figurent en dépendances. Les sélecteurs sont des
  // fonctions pures de ces mêmes collections : les figer en même temps qu'elles suffit à
  // garantir qu'ils ne liront jamais un tableau périmé. Les actions, elles, ne capturent
  // aucun état. Élargir les dépendances n'apporterait donc rien et invaliderait le contexte
  // — donc tout l'arbre — à chaque rendu du provider.
  const value: TripsContextType = useMemo(
    () => ({
      trips, bookings, addresses, invitations, loading,
      createTrip: api.createTrip, updateTrip: api.updateTrip,
      validateTrip: api.validateTrip, deleteTrip: api.deleteTrip,
      getTripById, createBooking: api.createBooking,
      updateBooking: api.updateBooking, deleteBooking: api.deleteBooking,
      getBookingsByTripId, createAddress: api.createAddress,
      updateAddress: api.updateAddress, deleteAddress: api.deleteAddress,
      getAddressesByTripId, refreshData,
      createInvitation: api.createInvitation,
      getUserInvitations: api.getUserInvitations,
      getSentInvitations: api.getSentInvitations,
      respondToInvitation: api.respondToInvitation,
      getInvitationByToken: api.getInvitationByToken,
      getTripInvitationLink: api.getTripInvitationLink,
      cancelInvitation: api.cancelInvitation,
    }),
    [trips, bookings, addresses, invitations, loading], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <TripsContext.Provider value={value}>{children}</TripsContext.Provider>
  );
};
