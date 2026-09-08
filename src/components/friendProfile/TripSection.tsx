import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { F } from "../../theme/fonts";
import TripSquare from "./TripSquare";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface TripSectionProps {
  title: string;
  marginTop: number;
  trips: any[];
  emptyIcon: React.ComponentProps<typeof Ionicons>["name"];
  emptyText: string;
  bgMid: string;
  textLight: string;
  onPress: (id: string) => void;
}

const TripSection: React.FC<TripSectionProps> = ({
  title, marginTop, trips, emptyIcon, emptyText, bgMid, textLight, onPress,
}) => (
  <>
    <Text style={[styles.sectionLabel, { marginTop, color: textLight }]}>{title}</Text>
    {trips.length ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.squaresRow}>
        {trips.map((trip: any) => (
          <TripSquare key={trip._id ?? trip.id} trip={trip} onPress={() => onPress(trip._id ?? trip.id)} />
        ))}
      </ScrollView>
    ) : (
      <View style={[styles.emptyCard, { backgroundColor: bgMid }]}>
        <Ionicons name={emptyIcon} size={26} color={textLight} {...DECORATIVE_ELEMENT_PROPS} />
        <Text style={[styles.emptyText, { color: textLight }]}>{emptyText}</Text>
      </View>
    )}
  </>
);

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 10,
    fontFamily: F.sans600,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginHorizontal: 14,
    marginBottom: 8,
  },
  squaresRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
    flexDirection: "row",
  },
  emptyCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
    paddingVertical: 22,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 12, fontFamily: F.sans400, textAlign: "center", paddingHorizontal: 16 },
});

export default TripSection;
