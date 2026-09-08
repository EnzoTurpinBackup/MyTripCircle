import { useState, useRef } from "react";
import { Alert, Animated, Dimensions } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { RootStackParamList } from "../types";
import { getTripIdeaById, SuggestedBooking, parseCityCountry } from "../data/tripIdeas";
import { searchPlaceByText } from "../services/PlacesService";
import { useTrips } from "../contexts/TripsContext";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { formatDate } from "../utils/i18n";

type IdeaDetailRouteProp = RouteProp<RootStackParamList, "IdeaDetail">;

function devWarn(msg: string, e: unknown): void {
  if (__DEV__) console.warn(msg, e);
}
type IdeaDetailNavigationProp = StackNavigationProp<RootStackParamList, "IdeaDetail">;

const SCREEN_H = Dimensions.get("window").height;

/**
 * Alimente l'écran de détail d'une idée de voyage et transforme cette idée en
 * voyage réel : à partir d'un itinéraire type, il crée le voyage, ses
 * réservations suggérées et les adresses correspondantes, épargnant à
 * l'utilisateur une saisie intégrale.
 *
 * @returns L'idée consultée et ses libellés traduits, l'état de la fenêtre de
 * création (titre, durée, dates, valeurs animées), l'indicateur `creating`, et
 * les commandes d'ouverture, de fermeture et de création.
 *
 * @remarks La durée est ajustable mais bornée par la longueur de l'itinéraire
 * proposé : au-delà, il n'y aurait plus rien à suggérer. Les réservations sont
 * créées en série et non en parallèle, chacune interrogeant le service de lieux
 * pour retrouver une adresse réelle. L'échec d'une suggestion est journalisé et
 * la suite se poursuit : un voyage partiellement pourvu reste préférable à un
 * abandon complet, l'utilisateur pouvant compléter ensuite. Une adresse n'est
 * créée que si le lieu a été retrouvé, faute de quoi elle serait inexploitable
 * sur la carte. Les hôtels couvrent tout le séjour, tandis qu'activités et
 * restaurants sont répartis jour par jour.
 */
export function useIdeaDetail() {
  const navigation = useNavigation<IdeaDetailNavigationProp>();
  const route = useRoute<IdeaDetailRouteProp>();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { createTrip, createBooking, createAddress } = useTrips();
  const { user } = useAuth();

  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";
  const idea = getTripIdeaById(route.params.ideaId);

  const [modalVisible, setModalVisible] = useState(false);
  const [tripTitle, setTripTitle] = useState("");
  const [customDays, setCustomDays] = useState(() => idea?.duration ?? 7);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [creating, setCreating] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_H)).current;

  const destinationName = idea
    ? t(`ideas.destinations.${idea.id}.name`, { defaultValue: idea.id })
    : "";
  const destinationCountry = idea
    ? t(`ideas.destinations.${idea.id}.country`, { defaultValue: "" })
    : "";

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + customDays - 1);

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: SCREEN_H, duration: 280, useNativeDriver: true }),
    ]).start(() => setModalVisible(false));
  };

  const openModal = () => {
    setTripTitle(`${destinationName} – ${destinationCountry}`);
    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(SCREEN_H);
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 0, duration: 340, useNativeDriver: true }),
    ]).start();
  };

  const changeCustomDays = (updater: (prev: number) => number) => {
    setCustomDays((prev) => {
      const max = idea?.itinerary.length ?? 14;
      return Math.min(max, Math.max(1, updater(prev)));
    });
  };

  const ADDRESS_TYPE_MAP: Record<string, "hotel" | "restaurant" | "activity" | "transport"> = {
    hotel: "hotel", restaurant: "restaurant", flight: "transport",
  };

  const createSingleBooking = async (
    tripId: string,
    b: SuggestedBooking,
    index: number,
    tripStart: Date,
    tripEnd: Date,
    days: number,
  ) => {
    const title = lang === "fr" ? b.titleFr : b.titleEn;
    const bookingDate = new Date(tripStart);
    if (b.type === "activity" || b.type === "restaurant") {
      bookingDate.setDate(tripStart.getDate() + Math.min(index, days - 1));
    }

    let realAddress: string | undefined;
    let placeRating: number | undefined;
    let placePhotoUrl: string | undefined;
    let placeName: string | undefined;
    try {
      const placeResult = await searchPlaceByText(b.placeSearchQuery);
      if (placeResult) {
        realAddress = placeResult.formattedAddress;
        placeRating = placeResult.rating;
        placePhotoUrl = placeResult.photoUrl;
        placeName = placeResult.name;
      }
    } catch (e) {
      devWarn("[useIdeaDetail] Erreur recherche lieu:", e);
    }

    const addressType = ADDRESS_TYPE_MAP[b.type] ?? "activity";
    try {
      await createBooking({
        tripId, type: b.type, title, address: realAddress,
        date: bookingDate, endDate: b.type === "hotel" ? tripEnd : undefined,
        price: b.estimatedPrice, currency: b.currency || "€", status: "pending",
      });
    } catch (e) {
      devWarn("[useIdeaDetail] Erreur création réservation:", e);
    }

    if (realAddress && placeName) {
      const { city, country } = parseCityCountry(realAddress, idea!.destinationCity, idea!.destinationCountry);
      try {
        await createAddress({ type: addressType, name: placeName, address: realAddress, city, country, rating: placeRating, photoUrl: placePhotoUrl, tripId });
      } catch (e) {
        devWarn("[useIdeaDetail] Erreur création adresse:", e);
      }
    }
  };

  const createSuggestedBookings = async (
    tripId: string,
    bookings: SuggestedBooking[],
    tripStart: Date,
    tripEnd: Date,
    days: number,
  ) => {
    for (let i = 0; i < bookings.length; i++) {
      await createSingleBooking(tripId, bookings[i], i, tripStart, tripEnd, days);
    }
  };

  const handleCreate = async () => {
    if (!tripTitle.trim()) {
      Alert.alert(t("common.error"), t("ideas.addModal.titleRequired"));
      return;
    }
    if (!user || !idea) return;

    setCreating(true);
    try {
      const newTrip = await createTrip({
        title: tripTitle.trim(),
        destination: destinationCountry || destinationName,
        startDate,
        endDate,
        isPublic: false,
        visibility: "private",
        status: "draft",
        ownerId: user.id,
        collaborators: [],
        stats: { totalBookings: 0, totalAddresses: 0, totalCollaborators: 0 },
        location: { type: "Point", coordinates: [0, 0] },
        tags: [],
      });

      await createSuggestedBookings(newTrip.id, idea.suggestedBookings, startDate, endDate, customDays);

      setModalVisible(false);
      setCreating(false);
      navigation.navigate("TripDetails", { tripId: newTrip.id, showToast: true });
    } catch (e) {
      if (__DEV__) console.warn("[useIdeaDetail] Erreur création voyage:", e);
      setCreating(false);
      Alert.alert(t("common.error"), t("ideas.addModal.createError"));
    }
  };

  return {
    navigation,
    idea,
    lang,
    colors,
    isDark,
    t,
    destinationName,
    destinationCountry,
    customDays,
    changeCustomDays,
    startDate,
    setStartDate,
    endDate,
    showDatePicker,
    setShowDatePicker,
    modalVisible,
    tripTitle,
    setTripTitle,
    creating,
    backdropOpacity,
    sheetTranslateY,
    openModal,
    closeModal,
    handleCreate,
    formatDate,
  };
}
