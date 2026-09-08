import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScannedBookingData } from "../../hooks/useTicketScanner";
import FieldRow from "./FieldRow";
import { styles } from "./ticketScannerStyles";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface ResultPanelProps {
  parsedData: ScannedBookingData;
  rawData: string;
  colors: any;
  t: (key: string) => string;
  onFill: () => void;
  onRescan: () => void;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ parsedData, rawData, colors, t, onFill, onRescan }) => (
  <SafeAreaView edges={["bottom"]} style={{ paddingHorizontal: 20, paddingTop: 12 }}>
    <View style={[styles.resultHandle, { backgroundColor: colors.border }]} />

    <View style={styles.resultHeader}>
      <View style={[styles.resultIconCircle, { backgroundColor: "#E2EDD9" }]}>
        <Ionicons name="checkmark-circle" size={28} color="#6B8C5A" {...DECORATIVE_ELEMENT_PROPS} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.resultTitle, { color: colors.text }]}>{t("bookings.scanFoundTitle")}</Text>
        <Text style={[styles.resultSubtitle, { color: colors.textMid }]}>{t("bookings.scanFoundSubtitle")}</Text>
      </View>
    </View>

    <View style={[styles.fieldsBox, { backgroundColor: colors.bgMid, borderColor: colors.border }]}>
      {parsedData.type && <FieldRow icon="pricetag-outline" label={t("bookings.type")} value={t(`bookings.typeLabels.${parsedData.type}`)} colors={colors} />}
      {parsedData.title && <FieldRow icon="text-outline" label={t("bookings.title")} value={parsedData.title} colors={colors} />}
      {parsedData.date && <FieldRow icon="calendar-outline" label={t("bookings.date")} value={parsedData.date.toLocaleDateString("fr-FR")} colors={colors} />}
      {parsedData.time && <FieldRow icon="time-outline" label={t("bookings.time")} value={parsedData.time} colors={colors} />}
      {parsedData.confirmationNumber && <FieldRow icon="barcode-outline" label={t("bookings.confirmationNumber")} value={parsedData.confirmationNumber} colors={colors} />}
      {parsedData.address && <FieldRow icon="location-outline" label={t("bookings.address")} value={parsedData.address} colors={colors} />}
      {!parsedData.title && !parsedData.date && !parsedData.confirmationNumber && (
        <Text style={[styles.rawDataText, { color: colors.textMid }]} numberOfLines={3}>{rawData}</Text>
      )}
    </View>

    <TouchableOpacity style={[styles.fillButton, { backgroundColor: colors.terra }]} onPress={onFill} activeOpacity={0.85}>
      <Ionicons name="create-outline" size={18} color="white" style={{ marginRight: 8 }} {...DECORATIVE_ELEMENT_PROPS} />
      <Text style={styles.fillButtonText}>{t("bookings.scanFillButton")}</Text>
    </TouchableOpacity>

    <TouchableOpacity style={[styles.rescanButton, { borderColor: colors.border }]} onPress={onRescan}>
      <Text style={[styles.rescanButtonText, { color: colors.textMid }]}>{t("bookings.scanRescan")}</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

export default ResultPanel;
