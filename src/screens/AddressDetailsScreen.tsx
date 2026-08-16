import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList, Address } from "../types";
import { useTranslation } from "react-i18next";
import { useTrips } from "../contexts/TripsContext";
import { useAuth } from "../contexts/AuthContext";
import { F } from "../theme/fonts";
import { RADIUS } from "../theme";
import { useTheme } from "../contexts/ThemeContext";
import { geocodeAddress, getCached, GeoCoords } from "../utils/geocoding";
import { getAddressHeroGradient, getAddressTypeBadge } from "../utils/addressHelpers";
import AddressDetailsSkeleton from "../components/addressDetails/AddressDetailsSkeleton";
import AddressHeroCover from "../components/addressDetails/AddressHeroCover";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";

// Chargement conditionnel : react-native-maps nécessite un rebuild du dev client
let MapView: any = null;
let Marker: any  = null;
let mapsAvailable = false;
try {
  const RNMaps = require("react-native-maps");
  MapView       = RNMaps.default;
  Marker        = RNMaps.Marker;
  mapsAvailable = !!MapView;
} catch (e) {
  if (__DEV__) console.warn("[AddressDetailsScreen] react-native-maps non disponible:", e);
}

type AddressDetailsScreenRouteProp      = RouteProp<RootStackParamList, "AddressDetails">;
type AddressDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, "AddressDetails">;

const AddressDetailsScreen: React.FC = () => {
  const route      = useRoute<AddressDetailsScreenRouteProp>();
  const navigation = useNavigation<AddressDetailsScreenNavigationProp>();
  const { addressId } = route.params;
  const { t }      = useTranslation();
  const insets     = useSafeAreaInsets();
  const { addresses, loading, deleteAddress } = useTrips();
  const { user }   = useAuth();
  const { colors, satelliteMap } = useTheme();
  const { disabled: offlineDisabled, style: offlineStyle } = useOfflineDisabled();

  const [address, setAddress] = useState<Address | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [coords, setCoords]   = useState<GeoCoords | null>(null);

  useEffect(() => {
    if (!loading) {
      const found = addresses.find((a) => a.id === addressId) || null;
      setAddress(found);
      setIsReady(true);
    }
  }, [loading, addresses, addressId]);

  // Géocodage dès que l'adresse est connue
  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    const run = async () => {
      const cached = getCached(address.address, address.city, address.country);
      if (cached !== undefined) {
        if (!cancelled) setCoords(cached);
        return;
      }
      const result = await geocodeAddress(address.address, address.city, address.country);
      if (!cancelled) setCoords(result);
    };

    run().catch(() => {});
    return () => { cancelled = true; };
  }, [address]);

  const handleEditAddress   = () => navigation.navigate("AddressForm", { addressId });

  const handleDeleteAddress = () => {
    Alert.alert(
      t("addresses.details.deleteTitle"),
      t("addresses.details.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              if (deleteAddress) await deleteAddress(addressId);
              navigation.goBack();
            } catch (err) {
              console.error("Delete address error:", err);
            }
          },
        },
      ]
    );
  };

  const handleCall    = () => { if (address?.phone)   Linking.openURL(`tel:${address.phone}`); };
  const handleWebsite = () => { if (address?.website) Linking.openURL(address.website); };
  const handleMaps    = () => {
    if (!address) return;
    const q = encodeURIComponent(`${address.address}, ${address.city}, ${address.country}`);
    Linking.openURL(`https://maps.google.com/maps?daddr=${q}`);
  };

  if (!isReady || loading) return <AddressDetailsSkeleton />;

  if (!address) {
    return (
      <View style={[styles.centeredState, { backgroundColor: colors.bg }]}>
        <Text style={[styles.centeredStateText, { color: colors.danger }]}>
          {t("addresses.details.notFound")}
        </Text>
      </View>
    );
  }

  const gradient = getAddressHeroGradient(address.type);
  const badge    = getAddressTypeBadge(address.type, t);
  const isOwner  = address.userId === user?.id;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.bg }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >

        <AddressHeroCover
          address={address}
          gradient={gradient}
          badge={badge}
          insetTop={insets.top}
          onBack={() => navigation.goBack()}
        />

        {/* ── Rating + adresse courte ──────────────────────────────────────── */}
        <View style={styles.ratingRow}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = address.rating == null ? false : star <= Math.round(address.rating);
              return (
                <Text key={star} style={[styles.star, { color: filled ? colors.terra : "#D4C4B0" }]}>★</Text>
              );
            })}
          </View>
          <Text style={[styles.shortAddress, { color: colors.textMid }]} numberOfLines={1}>
            📍 {address.address}, {address.city}
          </Text>
        </View>

        {/* ── Chips de contact ────────────────────────────────────────────── */}
        {(address.phone || address.website) ? (
          <View style={styles.chipsRow}>
            {address.phone ? (
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: colors.bgMid }]}
                onPress={handleCall}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, { color: colors.textMid }]}>📞 {address.phone}</Text>
              </TouchableOpacity>
            ) : null}
            {address.website ? (
              <TouchableOpacity
                style={[styles.chip, styles.chipSky]}
                onPress={handleWebsite}
                activeOpacity={0.75}
              >
                <Text style={styles.chipTextSky}>🌐 {t("addresses.details.websiteChip")}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* ── Vignette carte ──────────────────────────────────────────────── */}
        <View style={styles.mapThumb}>
          {mapsAvailable && coords ? (
            <MapView
              style={StyleSheet.absoluteFill}
              region={{
                latitude:       coords.latitude,
                longitude:      coords.longitude,
                latitudeDelta:  0.005,
                longitudeDelta: 0.005,
              }}
              mapType={satelliteMap ? "hybrid" : "standard"}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              showsCompass={false}
              toolbarEnabled={false}
            >
              <Marker coordinate={coords} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
                <Ionicons name="location" size={28} color={colors.terra} />
              </Marker>
            </MapView>
          ) : (
            <LinearGradient
              colors={["#C8D8C0", "#A8C4B0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <TouchableOpacity style={styles.openMapsBtn} onPress={handleMaps} activeOpacity={0.8}>
            <Text style={[styles.openMapsBtnText, { color: colors.textMid }]}>
              {t("addresses.details.openInMaps")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Notes ───────────────────────────────────────────────────────── */}
        <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.notesLabel, { color: colors.textLight }]}>
            {t("addresses.details.notes")}
          </Text>
          <Text style={[styles.notesBody, { color: address.notes ? colors.text : colors.textLight }]}>
            {address.notes || t("addresses.details.noNotes")}
          </Text>
        </View>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        {isOwner && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionEdit, { backgroundColor: colors.bgMid }, offlineStyle]}
              onPress={handleEditAddress}
              disabled={offlineDisabled}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionEditText, { color: colors.textMid }]}>
                {t("addresses.details.editButton")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionDelete, { backgroundColor: colors.dangerLight }, offlineStyle]}
              onPress={handleDeleteAddress}
              disabled={offlineDisabled}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionDeleteText, { color: colors.danger }]}>
                {t("addresses.details.deleteButton")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper:           { flex: 1 },
  scroll:            { flex: 1 },
  centeredState:     { flex: 1, justifyContent: "center", alignItems: "center" },
  centeredStateText: { fontSize: 16, fontFamily: F.sans400 },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  starsRow:     { flexDirection: "row", gap: 3 },
  star:         { fontSize: 18 },
  shortAddress: { flex: 1, fontSize: 13, fontFamily: F.sans400, textAlign: "right", marginLeft: 12 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 18, paddingBottom: 14 },
  chip:         { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  chipText:     { fontSize: 14, fontFamily: F.sans400 },
  chipSky:      { backgroundColor: "#DCF0F5" },
  chipTextSky:  { fontSize: 14, fontFamily: F.sans400, color: "#5A8FAA" },

  mapThumb: {
    marginHorizontal: 18,
    marginBottom: 14,
    height: 160,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  openMapsBtn: {
    position: "absolute",
    bottom: 10,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  openMapsBtnText: { fontSize: 13, fontFamily: F.sans400 },

  notesCard: {
    marginHorizontal: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notesLabel: { fontSize: 12, fontFamily: F.sans400, marginBottom: 6 },
  notesBody:  { fontSize: 15, fontFamily: F.sans400, lineHeight: 22 },

  actionsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingVertical: 6, marginTop: 6 },
  actionEdit:       { flex: 1, borderRadius: RADIUS.button, paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  actionEditText:   { fontSize: 15, fontFamily: F.sans600 },
  actionDelete:     { flex: 1, borderRadius: RADIUS.button, paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  actionDeleteText: { fontSize: 15, fontFamily: F.sans600 },
});

export default AddressDetailsScreen;
