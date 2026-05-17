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

const HERO_PHOTOS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=600&q=80&fit=crop",
  "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&q=80&fit=crop",
];

const MINI_PHOTOS = [
  "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=200&q=80&fit=crop",
  "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=200&q=80&fit=crop",
  "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=200&q=80&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=200&q=80&fit=crop",
  "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=200&q=80&fit=crop",
];

type TripsScreenNavigationProp = StackNavigationProp<RootStackParamList, "Main">;

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

  useFocusEffect(useCallback(() => { refreshData(); }, [refreshData]));

  // Pour chaque voyage sans coverImage, on fetch la photo depuis Google Places
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

  const daysUntil = (date: Date): number => {
    const diffMs = new Date(date).getTime() - Date.now();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  if (loading) return <TripsScreenSkeleton />;

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
          scrollEnabled={showAllTrips}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image source={require("../../assets/icon.png")} style={styles.headerLogo} resizeMode="contain" />
              <View>
                <Text style={[styles.headerEyebrow, { color: colors.textLight }]}>{t("trips.greeting", { name: getFirstName() })}</Text>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t("trips.header")}</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.addTripBtn, { backgroundColor: colors.terra }, offlineStyle]} onPress={handleCreateTrip} disabled={offlineDisabled} activeOpacity={0.85}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {upcomingTrips.length === 0 ? (
            <>
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.terraLight }]}>
                  <Ionicons name="airplane-outline" size={40} color={colors.terra} />
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
