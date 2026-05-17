import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { RootStackParamList, Address } from "../types";
import { useTrips } from "../contexts/TripsContext";
import { useTheme } from "../contexts/ThemeContext";
import { geocodeAddress, getCached, GeoCoords } from "../utils/geocoding";
import { useCurrentLocation } from "./useCurrentLocation";

let _MapView: any = null;
let _Marker: any = null;
let _mapsAvailable = false;
try {
  const RNMaps = require("react-native-maps");
  _MapView = RNMaps.default;
  _Marker = RNMaps.Marker;
  _mapsAvailable = true;
} catch (e) {
  if (__DEV__) console.warn("[useAddresses] react-native-maps non disponible:", e);
}

export const MapView: any = _MapView;
export const Marker: any = _Marker;
export const mapsAvailable: boolean = _mapsAvailable;

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type FilterType = "all" | "hotel" | "restaurant" | "activity" | "transport" | "other";

const DEFAULT_REGION: Region = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

type AddressesNavigationProp = StackNavigationProp<RootStackParamList, "Main">;

export function useAddresses() {
  const navigation = useNavigation<AddressesNavigationProp>();
  const { addresses, loading, deleteAddress, refreshData } = useTrips();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [actionAddress, setActionAddress] = useState<Address | null>(null);
  const currentLocation = useCurrentLocation();

  const [mapCoords, setMapCoords] = useState<Record<string, GeoCoords>>({});
  const [isGeocoding, setIsGeocoding] = useState(false);
  const geocodedQueueRef = useRef(new Set<string>());

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  const addressIdsKey = addresses.map((a) => a.id).join(",");
  useEffect(() => {
    const toGeocode = addresses.filter(
      (a) => !geocodedQueueRef.current.has(a.id)
    );
    if (toGeocode.length === 0) return;

    toGeocode.forEach((a) => geocodedQueueRef.current.add(a.id));

    let cancelled = false;
    setIsGeocoding(true);

    const geocodeViaNetwork = async (
      address: Address,
      lastMs: number,
    ): Promise<number> => {
      const delay = Math.max(0, 1100 - (Date.now() - lastMs));
      if (lastMs > 0 && delay > 0) await new Promise<void>((r) => setTimeout(r, delay));
      if (cancelled) return lastMs;
      const coords = await geocodeAddress(address.address, address.city, address.country);
      const now = Date.now();
      if (coords && !cancelled) setMapCoords((prev) => ({ ...prev, [address.id]: coords }));
      return now;
    };

    const run = async () => {
      let lastNetworkRequest = 0;

      for (const address of toGeocode) {
        if (cancelled) break;
        const cached = getCached(address.address, address.city, address.country);
        if (cached !== undefined) {
          if (cached) setMapCoords((prev) => ({ ...prev, [address.id]: cached }));
          continue;
        }
        lastNetworkRequest = await geocodeViaNetwork(address, lastNetworkRequest);
      }

      if (!cancelled) setIsGeocoding(false);
    };

    run().catch((err) => {
      console.error("[AddressesScreen] Erreur géocodage:", err);
      if (!cancelled) setIsGeocoding(false);
    });

    return () => {
      cancelled = true;
    };
  }, [addressIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const widgetRegion = useMemo((): Region => {
    if (currentLocation) {
      return {
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    const coordList = Object.values(mapCoords);
    if (coordList.length === 0) return DEFAULT_REGION;

    const lats = coordList.map((c) => c.latitude);
    const lons = coordList.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const pad = 0.05;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(maxLat - minLat + pad, 0.08),
      longitudeDelta: Math.max(maxLon - minLon + pad, 0.08),
    };
  }, [currentLocation, mapCoords]);

  const filteredAddresses = addresses.filter(
    (address) => selectedFilter === "all" || address.type === selectedFilter
  );

  const filteredWithCoords = filteredAddresses.filter(
    (a) => mapCoords[a.id] != null
  );

  const eyebrow = t("addresses.count", { count: filteredAddresses.length });

  const handleAddressPress = (address: Address) => {
    setActionAddress(address);
  };

  const handleEditAddress = () => {
    if (!actionAddress) return;
    const id = actionAddress.id;
    setActionAddress(null);
    navigation.navigate("AddressForm", { addressId: id });
  };

  const handleDeleteAddress = async (addressId: string) => {
    await deleteAddress(addressId);
    await refreshData();
  };

  const handleAddAddress = () => navigation.navigate("AddressForm", {});

  const handleOpenFullMap = () => navigation.navigate("FullMap");

  return {
    t,
    colors,
    isDark,
    addresses,
    loading,
    selectedFilter,
    setSelectedFilter,
    mapCoords,
    isGeocoding,
    widgetRegion,
    filteredAddresses,
    filteredWithCoords,
    eyebrow,
    actionAddress,
    setActionAddress,
    handleAddressPress,
    handleEditAddress,
    handleDeleteAddress,
    handleAddAddress,
    handleOpenFullMap,
  };
}
