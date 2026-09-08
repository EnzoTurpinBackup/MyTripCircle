import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Address } from "../../types";
import { GeoCoords } from "../../utils/geocoding";
import { MapView, Marker, mapsAvailable, Region } from "../../hooks/useAddresses";
import { getTypeIcon, getMarkerColor } from "./addressHelpers";
import { styles } from "./addressStyles";
import { useTheme } from "../../contexts/ThemeContext";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

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

interface AddressMapWidgetProps {
  addresses: Address[];
  mapCoords: Record<string, GeoCoords>;
  isGeocoding: boolean;
  widgetRegion: Region;
  onOpenFullMap: () => void;
}

const MarkerPin: React.FC<{ type: Address["type"]; size: "sm" | "md" }> = ({ type, size }) => {
  const s = size === "sm" ? 10 : 13;
  return (
    <View
      style={[
        styles.markerPin,
        size === "sm" && styles.markerPinSm,
        { backgroundColor: getMarkerColor(type) },
      ]}
    >
      <Ionicons name={getTypeIcon(type) as keyof typeof Ionicons.glyphMap} size={s} color="white" {...DECORATIVE_ELEMENT_PROPS} />
    </View>
  );
};

const AddressMapWidget: React.FC<AddressMapWidgetProps> = ({
  addresses,
  mapCoords,
  isGeocoding,
  widgetRegion,
  onOpenFullMap,
}) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  return (
    <View style={styles.mapWidget} pointerEvents="box-none">
      {mapsAvailable ? (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={widgetRegion}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          customMapStyle={isDark ? DARK_MAP_STYLE : []}
        >
          {Object.entries(mapCoords).map(([addressId, coords]) => {
            const address = addresses.find((a) => a.id === addressId);
            if (!address) return null;
            return (
              <Marker
                key={addressId}
                coordinate={coords}
                anchor={{ x: 0.5, y: 1 }}
                tracksViewChanges={false}
              >
                <MarkerPin type={address.type} size="sm" />
              </Marker>
            );
          })}
        </MapView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.mapPlaceholder]}>
          <Ionicons name="map-outline" size={28} color="rgba(255,255,255,0.7)" {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={styles.mapPlaceholderText}>Rebuild requis</Text>
        </View>
      )}

      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={onOpenFullMap}
        activeOpacity={1}
      />

      {mapsAvailable && isGeocoding && (
        <View style={styles.mapLoadingBadge}>
          <ActivityIndicator size="small" color="#5A4A3A" />
        </View>
      )}

      {mapsAvailable && Object.keys(mapCoords).length > 0 && (
        <View style={styles.mapCountBadge}>
          <Ionicons name="location" size={11} color="#5A4A3A" {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={styles.mapCountText}>{Object.keys(mapCoords).length}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.mapSeeAll} onPress={onOpenFullMap} activeOpacity={0.8}>
        <Text style={styles.mapSeeAllText}>{t("addresses.seeMap")} →</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddressMapWidget;
