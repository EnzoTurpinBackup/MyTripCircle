/**
 * Carte plein écran de toutes les adresses du carnet.
 *
 * Besoin couvert : passer d'une liste de lieux à leur répartition réelle dans
 * l'espace, pour juger des distances et regrouper ce qui se visite le même
 * jour. Le filtre par catégorie isole un type de lieu sans quitter la carte.
 *
 * Position dans le parcours : atteint depuis l'aperçu cartographique du carnet
 * d'adresses. En sortie, AddressDetails par la bulle d'un marqueur, ou retour.
 *
 * Données : les adresses viennent de TripsContext ; useAddressGeocoding en
 * dérive les coordonnées en espaçant les appels au géocodeur Nominatim.
 * ThemeContext fournit la palette, le mode sombre et la préférence de fond
 * satellite, conservée d'une session à l'autre. Le repère de position est
 * affiché par la carte native : il dépend de la permission de localisation
 * accordée au système, dont le refus le supprime sans autre effet.
 *
 * États pris en charge : cartographie native indisponible (message de
 * substitution, filtres conservés), géocodage en cours et absence de marqueur
 * (messages superposés), sélection d'un marqueur (bulle et gel des gestes). Un
 * géocodage sans résultat se traduit par un marqueur manquant, l'adresse
 * restant listée dans le carnet ; il n'y a pas d'autre état d'erreur.
 */
import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

// Chargement protégé du module natif : il manque dans Expo Go et dans tout
// client construit sans lui, et l'alias du bundle web le résout sans exposer de
// composant. Les deux cas laissent `MapView` à une valeur fausse, seule
// condition testée au rendu ; un import statique ferait, lui, échouer le
// chargement de l'écran entier.
let MapView: any = null;
let Marker: any = null;
try {
  const RNMaps = require("react-native-maps");
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
} catch (e) {
  // Silencieux en production : l'absence de carte y est une dégradation prévue.
  if (__DEV__) console.warn("[FullMapScreen] react-native-maps non disponible:", e);
}

import { RootStackParamList, Address } from "../types";
import { useTrips } from "../contexts/TripsContext";
import { useTranslation } from "react-i18next";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";
import BackButton from "../components/ui/BackButton";
import { useAddressGeocoding } from "../hooks/useAddressGeocoding";
import MapMarkerPopup from "../components/fullMap/MapMarkerPopup";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

type FilterType = "all" | "hotel" | "restaurant" | "activity" | "transport" | "other";

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

/**
 * Habillage sombre de la carte, aligné sur la palette de l'application : le
 * fond clair par défaut trancherait avec l'écran et éblouirait de nuit.
 */
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1A1714" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#A89880" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1A1714" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2E2A27" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#3A3530" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3D3830" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0D1117" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#22201D" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1A2218" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#262220" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#3A3530" }] },
];

/**
 * Cadrage initial, tenu jusqu'au recadrage sur les marqueurs. Son amplitude
 * évite qu'un carnet dispersé n'apparaisse d'abord au ras du sol.
 */
const DEFAULT_REGION: Region = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

// Codage visuel repris des fiches du carnet : même type, même repère.
const getTypeIcon = (type: Address["type"]) => {
  switch (type) {
    case "hotel":      return "bed-outline";
    case "restaurant": return "restaurant-outline";
    case "activity":   return "ticket-outline";
    case "transport":  return "car-outline";
    default:           return "location-outline";
  }
};

const getMarkerColor = (type: Address["type"]): string => {
  switch (type) {
    case "hotel":      return "#5A8FAA";
    case "restaurant": return "#C4714A";
    case "activity":   return "#6B8C5A";
    default:           return "#8B7355";
  }
};

/**
 * Compose la carte plein écran du carnet d'adresses.
 *
 * L'écran n'attend aucun paramètre de route ni prop du parent : il repart de la
 * collection entière, son filtre étant indépendant de celui du carnet. Effets
 * de bord notables — géocodage réseau, recadrage animé quand la carte est
 * prête, déplacement de la caméra au choix d'un marqueur, et écriture locale de
 * la préférence de fond satellite.
 */
const FullMapScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { addresses }                          = useTrips();
  const { t }                                  = useTranslation();
  const { colors, isDark, satelliteMap, toggleSatelliteMap } = useTheme();
  const insets                                 = useSafeAreaInsets();

  const [selectedFilter, setSelectedFilter]     = useState<FilterType>("all");
  const [selectedAddress, setSelectedAddress]   = useState<Address | null>(null);
  const mapRef                                  = useRef<any>(null);
  const currentRegionRef                        = useRef<Region>(DEFAULT_REGION);

  const { mapCoords, isGeocoding } = useAddressGeocoding(addresses);

  const filteredAddresses  = addresses.filter((a) => selectedFilter === "all" || a.type === selectedFilter);
  // Sans coordonnées, pas de place sur la carte : l'adresse est écartée du
  // cadrage et des marqueurs, mais reste dans le carnet.
  const filteredWithCoords = filteredAddresses.filter((a) => mapCoords[a.id] != null);

  const handleMapReady = () => {
    const coords = filteredWithCoords.map((a) => mapCoords[a.id]);
    if (coords.length === 0) return;
    // Contourne une limite de la carte native : appelé dans la foulée de
    // `onMapReady`, le recadrage est ignoré, la vue n'étant pas encore mesurée.
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
        animated: true,
      });
    }, 300);
  };

  const handleMarkerPress = (address: Address) => {
    const coords = mapCoords[address.id];
    if (!coords) return;
    setSelectedAddress(address);
    // Centre le marker dans le tiers bas de l'écran pour que la popup soit visible
    // Le décalage suit l'amplitude affichée : une valeur fixe en degrés serait
    // imperceptible en vue large et démesurée en vue rapprochée.
    const offsetLat = coords.latitude - currentRegionRef.current.latitudeDelta * 0.2;
    mapRef.current?.animateCamera(
      { center: { latitude: offsetLat, longitude: coords.longitude } },
      { duration: 350 },
    );
  };

  const renderFilterButton = useCallback((filter: FilterType, label: string) => {
    const active = selectedFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
        style={[styles.chip, { backgroundColor: colors.bgMid }, active && { backgroundColor: colors.terra }]}
        onPress={() => setSelectedFilter(filter)}
        activeOpacity={0.7}
      >
        <Text style={[styles.chipText, { color: colors.textMid }, active && { color: "#FFFFFF" }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedFilter, colors]);

  const renderMarkerPin = (type: Address["type"]) => (
    <View style={[styles.markerPin, { backgroundColor: getMarkerColor(type) }]}>
      <Ionicons name={getTypeIcon(type) as keyof typeof Ionicons.glyphMap} size={13} color="white" {...DECORATIVE_ELEMENT_PROPS} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["left", "right"]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border, paddingTop: insets.top + 12 }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.title, { color: colors.text }]}>{t("addresses.header")}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Filtres */}
      <View style={[styles.filters, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {renderFilterButton("all",        t("addresses.filters.all"))}
          {renderFilterButton("hotel",      t("addresses.filters.hotel"))}
          {renderFilterButton("restaurant", t("addresses.filters.restaurant"))}
          {renderFilterButton("activity",   t("addresses.filters.activity"))}
          {renderFilterButton("transport",  t("addresses.filters.transport"))}
          {renderFilterButton("other",      t("addresses.filters.other"))}
        </ScrollView>
      </View>

      {/* Carte */}
      <View style={{ flex: 1 }}>
        {MapView ? (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={DEFAULT_REGION}
            mapType={satelliteMap ? "hybrid" : "standard"}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
            onMapReady={handleMapReady}
            // Région mémorisée dans une référence et non dans un état : elle ne
            // sert qu'au calcul de décalage et déclencherait sinon un rendu à
            // chaque déplacement.
            onRegionChangeComplete={(region: Region) => { currentRegionRef.current = region; }}
            // Gestes gelés tant qu'une bulle est ouverte : posée à une position
            // fixe de l'écran, elle se détacherait du marqueur qu'elle décrit.
            scrollEnabled={selectedAddress === null}
            zoomEnabled={selectedAddress === null}
            rotateEnabled={selectedAddress === null}
            pitchEnabled={selectedAddress === null}
            // Habillage sombre écarté en vue satellite : il porte sur les
            // couches vectorielles et n'assombrirait que les libellés.
            customMapStyle={isDark && !satelliteMap ? DARK_MAP_STYLE : []}
          >
            {filteredWithCoords.map((address) => (
              <Marker
                key={address.id}
                coordinate={mapCoords[address.id]}
                anchor={{ x: 0.5, y: 1 }}
                // Pastille statique : surveiller ses redessins dégrade la
                // fluidité dès quelques dizaines de marqueurs sur Android.
                tracksViewChanges={false}
                onPress={() => handleMarkerPress(address)}
              >
                {renderMarkerPin(address.type)}
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="map-outline" size={52} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={[styles.placeholderTitle, { color: colors.text }]}>Carte non disponible</Text>
          </View>
        )}

        {/* Bouton satellite */}
        {MapView && (
          <TouchableOpacity
            style={[styles.satelliteBtn, { backgroundColor: colors.surface }]}
            onPress={toggleSatelliteMap}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("common.a11y.toggleSatelliteView")}
            accessibilityState={{ selected: satelliteMap }}
          >
            <Ionicons name={satelliteMap ? "map-outline" : "globe-outline"} size={20} color={colors.terra} />
          </TouchableOpacity>
        )}

        {/* Popup custom */}
        {selectedAddress && (
          <MapMarkerPopup
            address={selectedAddress}
            onClose={() => setSelectedAddress(null)}
            onNavigate={(addressId) => {
              setSelectedAddress(null);
              navigation.navigate("AddressDetails", { addressId });
            }}
          />
        )}

        {/* Aucun marqueur */}
        {/* Deux causes distinguées : géocodage en cours, ou achevé sans
            résultat. Le bandeau laisse passer les gestes vers la carte. */}
        {filteredWithCoords.length === 0 && (
          <View style={styles.noMarkersOverlay} pointerEvents="none">
            <View style={[styles.noMarkersBadge, { backgroundColor: colors.surface }]}>
              {isGeocoding ? (
                <>
                  <ActivityIndicator size="small" color={colors.terra} style={{ marginBottom: 6 }} />
                  <Text style={[styles.noMarkersText, { color: colors.textMid }]}>Géocodage en cours…</Text>
                </>
              ) : (
                <Text style={[styles.noMarkersText, { color: colors.textMid }]}>Aucune adresse à afficher</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  title:    { flex: 1, fontSize: 20, fontFamily: F.sans700, textAlign: "center" },
  filters:  { paddingVertical: 10, borderBottomWidth: 1 },
  filtersScroll: { paddingHorizontal: 16, gap: 8 },
  chip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999 },
  chipText: { fontSize: 13, fontFamily: F.sans600 },
  markerPin: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "white",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3, elevation: 3,
  },
  satelliteBtn: {
    position: "absolute", top: 16, right: 16,
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 4, elevation: 4,
  },
  noMarkersOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  noMarkersBadge: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  noMarkersText:    { fontSize: 14, fontFamily: F.sans500 },
  placeholder:      { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  placeholderTitle: { fontSize: 18, fontFamily: F.sans700 },
});

export default FullMapScreen;
