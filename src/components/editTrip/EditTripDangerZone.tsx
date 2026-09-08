import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface EditTripDangerZoneProps {
  dangerLight: string;
  sectionLabelColor: string;
  disabled?: boolean;
  onDelete: () => void;
}

const EditTripDangerZone: React.FC<EditTripDangerZoneProps> = ({ dangerLight, sectionLabelColor, disabled, onDelete }) => {
  const { t } = useTranslation();

  return (
    <>
      <Text style={[styles.sectionLbl, { color: sectionLabelColor }]}>{t("editTrip.dangerZone")}</Text>
      <TouchableOpacity
        style={[styles.dangerRow, { backgroundColor: dangerLight }, disabled && { opacity: 0.4 }]}
        onPress={onDelete}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <View style={styles.dangerIcon}>
          <Text style={{ fontSize: 20 }}>🗑</Text>
        </View>
        <View style={styles.dangerInfo}>
          <Text style={styles.dangerLabel}>{t("editTrip.deleteTrip")}</Text>
          <Text style={styles.dangerDesc}>{t("editTrip.deleteTripSubtitle")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#C04040" {...DECORATIVE_ELEMENT_PROPS} />
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  sectionLbl: {
    fontSize: 13,
    fontFamily: F.sans700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 18,
  },
  dangerRow: {
    borderWidth: 1,
    borderColor: "rgba(192,64,64,0.18)",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 10,
  },
  dangerIcon: {
    width: 50,
    height: 50,
    borderRadius: 13,
    backgroundColor: "rgba(192,64,64,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  dangerInfo:  { flex: 1 },
  dangerLabel: { fontSize: 17, fontFamily: F.sans600, color: "#C04040" },
  dangerDesc:  { fontSize: 13, fontFamily: F.sans400, color: "#C04040", opacity: 0.75, marginTop: 3 },
});

export default EditTripDangerZone;
