import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, StyleProp, ImageStyle, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface TripSquareProps {
  trip: any;
  onPress: () => void;
}

const TripSquare: React.FC<TripSquareProps> = ({ trip, onPress }) => {
  const { colors } = useTheme();
  return (
  <TouchableOpacity style={styles.wrap} onPress={onPress} activeOpacity={0.85}>
    {trip.coverImage ? (
      /* Décorative : la destination du voyage est lue en superposition. */
      <Image source={{ uri: trip.coverImage }} style={StyleSheet.absoluteFill as StyleProp<ImageStyle>} resizeMode="cover" {...DECORATIVE_ELEMENT_PROPS} />
    ) : (
      <View style={[StyleSheet.absoluteFill as StyleProp<ViewStyle>, { backgroundColor: colors.textMid }]} />
    )}
    <LinearGradient
      colors={["transparent", "rgba(0,0,0,0.68)"]}
      locations={[0.4, 1]}
      style={StyleSheet.absoluteFill as StyleProp<ViewStyle>}
    />
    <View style={styles.bottom}>
      <Text style={styles.dest} numberOfLines={1}>{trip.destination || trip.title}</Text>
    </View>
  </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    flexShrink: 0,
    justifyContent: "flex-end",
  },
  bottom: { padding: 7 },
  dest: { fontSize: 11, fontFamily: F.sans600, color: "#FFFFFF" },
});

export default TripSquare;
