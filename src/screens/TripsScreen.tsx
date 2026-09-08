/**
 * Écran d'accueil de l'onglet « Mes voyages », première vue affichée une fois
 * l'utilisateur authentifié.
 *
 * Besoin couvert : retrouver immédiatement le voyage qui compte maintenant — celui
 * déjà commencé, à défaut le prochain — sans avoir à parcourir une liste, puis
 * accéder au reste de la collection.
 *
 * Position dans le parcours : premier onglet de MainTabs, atteint après connexion
 * ou par balayage horizontal depuis les onglets voisins. En sortie, TripDetails
 * pour consulter un voyage existant et CreateTrip pour en composer un nouveau.
 *
 * Données : la collection de voyages vient de TripsContext, source de vérité
 * partagée avec les autres onglets, et le prénom de la salutation d'AuthContext.
 * Les couvertures manquantes sont complétées à la volée par le cache de photos de
 * destination, avec repli sur un jeu d'illustrations constantes pour qu'aucune
 * carte ne reste sans visuel.
 *
 * États pris en charge : chargement (squelette plein écran), collection vide
 * (invitation à créer un premier voyage), hors-ligne (les actions qui exigent le
 * réseau sont neutralisées). Une erreur de rafraîchissement est absorbée par le
 * contexte : l'écran conserve alors la dernière collection connue plutôt que de
 * se vider.
 */
import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList, Trip } from "../types";
import { useTrips } from "../contexts/TripsContext";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { SwipeToNavigate } from "../hooks/useSwipeToNavigate";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";
import TripsScreenSkeleton from "../components/trips/TripsScreenSkeleton";
import TripHeroCard from "../components/trips/TripHeroCard";
import TripMiniCard from "../components/trips/TripMiniCard";
import TripAllRow from "../components/trips/TripAllRow";
import TripNewCard from "../components/trips/TripNewCard";
import { getCachedDestinationPhoto } from "../utils/destinationPhoto";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Illustrations de repli du dernier recours : elles ne servent que si le voyage
 * n'a ni couverture choisie par l'utilisateur ni photo de destination récupérable.
 * L'index est pris modulo la longueur du tableau, ce qui évite que deux cartes
 * voisines tombent sur la même image.
 */
const HERO_PHOTOS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&q=80&fit=crop",
];

/** Même rôle de repli que HERO_PHOTOS, en résolution réduite pour les vignettes. */
const MINI_PHOTOS = [
  "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=200&q=80&fit=crop",
  "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=200&q=80&fit=crop",
  "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=200&q=80&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=200&q=80&fit=crop",
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=200&q=80&fit=crop",
];

type TripsScreenNavigationProp = StackNavigationProp<RootStackParamList, "Main">;

/**
 * Compose la vue d'accueil des voyages.
 *
 * L'écran est monté par le navigateur d'onglets et ne reçoit donc aucune prop de
 * route : tout son état est lu dans les contextes. Effets de bord notables — il
 * redemande la collection à chaque prise de focus et déclenche la récupération
 * réseau des photos de destination absentes.
 */
const TripsScreen: React.FC = () => {
  const navigation = useNavigation<TripsScreenNavigationProp>();
  const { trips, loading, refreshData } = useTrips();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { disabled: offlineDisabled, style: offlineStyle } = useOfflineDisabled();

  const [showAllTrips, setShowAllTrips] = useState(false);
  // Photos auto-fetchées pour les voyages sans coverImage : tripId → URL
  const [fetchedPhotos, setFetchedPhotos] = useState<Record<string, string>>({});

  // Rafraîchir à la prise de focus plutôt qu'au seul montage : l'utilisateur
  // revient ici après avoir créé, modifié ou quitté un voyage depuis un autre
  // écran de la pile, et la liste doit refléter ces changements sans geste.
  useFocusEffect(useCallback(() => { refreshData(); }, [refreshData]));

  // Pour chaque voyage sans coverImage, on fetch la photo depuis Google Places.
  // fetchedPhotos est volontairement absent des dépendances : chaque photo reçue
  // le modifie, et l'inscrire ici relancerait l'effet en boucle. La garde interne
  // sur fetchedPhotos[trip.id] suffit à ne jamais redemander la même destination.
  useEffect(() => {
    const tripsNeedingPhoto = trips.filter((t) => !t.coverImage && t.destination);
    if (tripsNeedingPhoto.length === 0) return;

    tripsNeedingPhoto.forEach(async (trip) => {
      if (fetchedPhotos[trip.id]) return; // déjà fetché
      const url = await getCachedDestinationPhoto(trip.destination);
      if (url) {
        setFetchedPhotos((prev) => ({ ...prev, [trip.id]: url }));
      }
    });
  }, [trips]);

  const handleCreateTrip = () => navigation.navigate("CreateTrip");
  const handleTripPress = (trip: Trip) => navigation.navigate("TripDetails", { tripId: trip.id });

  const getFirstName = () => user?.name?.trim().split(" ")[0] ?? "";

  // Borné à zéro : un voyage déjà commencé reste mis en avant en carte héros, et
  // afficher un décompte négatif y serait incompréhensible.
  const daysUntil = (date: Date): number => {
    const diffMs = new Date(date).getTime() - Date.now();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  if (loading) return <TripsScreenSkeleton />;

  // Le filtre porte sur endDate et non startDate : un voyage commencé mais non
  // terminé reste un voyage « à venir » du point de vue de l'utilisateur, qui a
  // justement besoin d'y accéder pendant son séjour.
  const now = new Date();
  const upcomingTrips = trips
    .filter((t) => new Date(t.endDate) >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  // Priorité : voyage en cours (déjà commencé), sinon le plus proche à venir
  const heroTrip: Trip | null =
    upcomingTrips.find((t) => new Date(t.startDate) <= now) ?? upcomingTrips[0] ?? null;
  const miniTrips: Trip[] = heroTrip ? upcomingTrips.filter((t) => t.id !== heroTrip.id) : [];

  return (
    <SwipeToNavigate currentIndex={0} totalTabs={5}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          // En vue repliée le contenu tient dans l'écran et les vignettes défilent
          // horizontalement : laisser le défilement vertical actif capterait les
          // gestes obliques et rendrait ce carrousel difficile à manipuler.
          scrollEnabled={showAllTrips}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* Informative : seule marque de l'application dans l'en-tête, aucun texte ne la reprend. */}
              <Image source={require("../../assets/icon.png")} style={styles.headerLogo} resizeMode="contain" accessibilityLabel={t("common.a11y.appLogo")} />
              <View>
                <Text style={[styles.headerEyebrow, { color: colors.textLight }]}>{t("trips.greeting", { name: getFirstName() })}</Text>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t("trips.header")}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.addTripBtn, { backgroundColor: colors.terra }, offlineStyle]}
              onPress={handleCreateTrip}
              disabled={offlineDisabled}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t("trips.createTrip")}
              accessibilityState={{ disabled: offlineDisabled }}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {upcomingTrips.length === 0 ? (
            <>
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.terraLight }]}>
                  <Ionicons name="airplane-outline" size={40} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("trips.emptyTitle")}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMid }]}>{t("trips.emptySubtitle")}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.miniScroll}>
                <TripNewCard onPress={handleCreateTrip} disabled={offlineDisabled} />
              </ScrollView>
            </>
          ) : (
            <>
              {heroTrip && (
                <TripHeroCard
                  trip={heroTrip}
                  photoUri={heroTrip.coverImage || fetchedPhotos[heroTrip.id] || HERO_PHOTOS[trips.indexOf(heroTrip) % HERO_PHOTOS.length]}
                  daysUntil={daysUntil(heroTrip.startDate)}
                  onPress={() => handleTripPress(heroTrip)}
                />
              )}

              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("trips.upcomingTrips")}</Text>
                <TouchableOpacity onPress={() => setShowAllTrips((v) => !v)} activeOpacity={0.7}>
                  <Text style={[styles.sectionLink, { color: colors.terra }]}>
                    {showAllTrips ? t("trips.showLess") : t("trips.showAll")}
                  </Text>
                </TouchableOpacity>
              </View>

              {showAllTrips ? (
                <View style={styles.allTripsContainer}>
                  {miniTrips.map((trip, idx) => (
                    <TripAllRow
                      key={trip.id ?? `all-${idx}`}
                      trip={trip}
                      photoUri={trip.coverImage || fetchedPhotos[trip.id] || MINI_PHOTOS[idx % MINI_PHOTOS.length]}
                      onPress={() => handleTripPress(trip)}
                    />
                  ))}
                  <TripNewCard onPress={handleCreateTrip} disabled={offlineDisabled} />
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.miniScroll}>
                  {miniTrips.map((trip, idx) => (
                    <TripMiniCard
                      key={trip.id ?? `mini-${idx}`}
                      trip={trip}
                      photoUri={trip.coverImage || fetchedPhotos[trip.id] || MINI_PHOTOS[idx % MINI_PHOTOS.length]}
                      onPress={() => handleTripPress(trip)}
                    />
                  ))}
                  <TripNewCard onPress={handleCreateTrip} disabled={offlineDisabled} />
                </ScrollView>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </SwipeToNavigate>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerLogo: { width: 44, height: 44, borderRadius: 12 },
  headerEyebrow: { fontSize: 14, fontFamily: F.sans400, marginBottom: 2 },
  headerTitle: { fontSize: 28, fontFamily: F.sans700 },
  addTripBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#A35830",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
  },
  sectionTitle: { fontSize: 22, fontFamily: F.sans700 },
  sectionLink: { fontSize: 13, fontFamily: F.sans500 },
  miniScroll: { paddingHorizontal: 14, paddingBottom: 16, gap: 12, flexDirection: "row", alignItems: "flex-start" },
  allTripsContainer: { paddingHorizontal: 14, paddingBottom: 8, gap: 8 },
  emptyContainer: { alignItems: "center", paddingHorizontal: 48, paddingTop: 60, paddingBottom: 32 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontFamily: F.sans700, marginBottom: 8, textAlign: "center" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 8, fontFamily: F.sans400 },
});

export default TripsScreen;
