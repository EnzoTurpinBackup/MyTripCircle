import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./ticketScannerStyles";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface FieldRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
}

const FieldRow: React.FC<FieldRowProps> = ({ icon, label, value, colors }) => (
  <View style={styles.fieldRow}>
    <Ionicons name={icon} size={16} color={colors.textMid} style={{ marginRight: 8 }} {...DECORATIVE_ELEMENT_PROPS} />
    <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{label} : </Text>
    <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
  </View>
);

export default FieldRow;
