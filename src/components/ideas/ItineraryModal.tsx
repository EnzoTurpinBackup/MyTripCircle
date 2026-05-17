import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView as RNScrollView,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatDate } from "../../utils/i18n";
import { F } from "../../theme/fonts";
import { useTheme } from "../../contexts/ThemeContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  onClose: () => void;
  cityInput: string;
  onCityChange: (v: string) => void;
  daysInput: string;
  onDaysChange: (v: string) => void;
  loading: boolean;
  itinerary: any;
  showCreateStep: boolean;
  onShowCreateStep: () => void;
  onBackFromCreate: () => void;
  startDate: Date;
  onStartDateChange: (d: Date) => void;
  showDatePicker: boolean;
  onToggleDatePicker: (show: boolean) => void;
  creating: boolean;
  onGenerate: () => void;
  onCreateTrip: () => void;
  onNewSearch: () => void;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

type Colors = ReturnType<typeof useTheme>["colors"];

interface SearchFormProps {
  cityInput: string;
  onCityChange: (v: string) => void;
  daysInput: string;
  onDaysChange: (v: string) => void;
  loading: boolean;
  onGenerate: () => void;
  colors: Colors;
}

const SearchForm: React.FC<SearchFormProps> = ({
  cityInput, onCityChange, daysInput, onDaysChange, loading, onGenerate, colors,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder={t("ideas.itinerary.cityPlaceholder")}
        placeholderTextColor={colors.textLight}
        value={cityInput}
        onChangeText={onCityChange}
        returnKeyType="next"
        autoCapitalize="words"
      />
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder={t("ideas.itinerary.daysPlaceholder")}
        placeholderTextColor={colors.textLight}
        value={daysInput}
        onChangeText={onDaysChange}
        keyboardType="number-pad"
      />
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.terra, opacity: loading || !cityInput.trim() ? 0.6 : 1 }]}
        onPress={onGenerate}
        disabled={loading || !cityInput.trim()}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator color="#FFF" size="small" />
          : <Text style={styles.primaryBtnText}>{t("ideas.itinerary.generate")}</Text>
        }
      </TouchableOpacity>
    </>
  );
};

interface DayCardProps {
  day: any;
  colors: Colors;
}

const DayCard: React.FC<DayCardProps> = ({ day, colors }) => {
  const { t } = useTranslation();
  const slots = [
    { emoji: "🌅", label: t("ideas.itinerary.morning"),   data: day.morning },
    { emoji: "☀️", label: t("ideas.itinerary.afternoon"), data: day.afternoon },
    { emoji: "🌙", label: t("ideas.itinerary.evening"),   data: day.evening },
  ];
  return (
    <View style={[styles.dayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.dayTitle, { color: colors.terra }]}>
        {t("ideas.itinerary.day")} {day.day} — {day.title}
      </Text>
      {slots.map(({ emoji, label, data }) => data && (
        <View key={label} style={styles.slotRow}>
          <Text style={styles.slotEmoji}>{emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.slotLabel, { color: colors.textMid }]}>{label}</Text>
            <Text style={[styles.slotActivity, { color: colors.text }]}>{data.activity}</Text>
            {data.tip && <Text style={[styles.slotTip, { color: colors.textLight }]}>💡 {data.tip}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
};

interface ItineraryPreviewProps {
  itinerary: any;
  daysInput: string;
  onDaysChange: (v: string) => void;
  loading: boolean;
  onGenerate: () => void;
  onShowCreateStep: () => void;
  onNewSearch: () => void;
  colors: Colors;
}

const ItineraryPreview: React.FC<ItineraryPreviewProps> = ({
  itinerary, daysInput, onDaysChange, loading, onGenerate, onShowCreateStep, onNewSearch, colors,
}) => {
  const { t } = useTranslation();
  const daysCount = Number.parseInt(daysInput, 10);
  return (
    <RNScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <Text style={[styles.cityTitle, { color: colors.text }]}>📍 {itinerary.city}</Text>

      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepperBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => onDaysChange(String(Math.max(1, daysCount - 1)))}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={16} color={colors.terra} />
        </TouchableOpacity>
        <Text style={[styles.stepperText, { color: colors.text }]}>
          {daysInput} {t("ideas.addModal.days")}
        </Text>
        <TouchableOpacity
          style={[styles.stepperBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => onDaysChange(String(Math.min(30, daysCount + 1)))}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color={colors.terra} />
        </TouchableOpacity>
        {daysCount !== itinerary.days?.length && (
          <TouchableOpacity
            style={[styles.regenerateBtn, { backgroundColor: colors.terra, opacity: loading ? 0.6 : 1 }]}
            onPress={onGenerate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.regenerateBtnText}>{t("ideas.itinerary.regenerate")}</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      {itinerary.days?.map((d: any) => (
        <DayCard key={d.day} day={d} colors={colors} />
      ))}

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.terra, marginBottom: 8 }]}
        onPress={() => { onDaysChange(daysInput); onShowCreateStep(); }}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryBtnText}>{t("ideas.itinerary.createTrip")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.terra, marginBottom: 20 }]}
        onPress={onNewSearch}
        activeOpacity={0.8}
      >
        <Text style={[styles.primaryBtnText, { color: colors.terra }]}>{t("ideas.itinerary.newSearch")}</Text>
      </TouchableOpacity>
    </RNScrollView>
  );
};

interface CreateTripStepProps {
  itinerary: any;
  daysInput: string;
  startDate: Date;
  onStartDateChange: (d: Date) => void;
  showDatePicker: boolean;
  onToggleDatePicker: (show: boolean) => void;
  creating: boolean;
  onCreateTrip: () => void;
  onBackFromCreate: () => void;
  colors: Colors;
}

const CreateTripStep: React.FC<CreateTripStepProps> = ({
  itinerary, daysInput, startDate, onStartDateChange, showDatePicker,
  onToggleDatePicker, creating, onCreateTrip, onBackFromCreate, colors,
}) => {
  const { t } = useTranslation();
  const [tempDate, setTempDate] = useState(startDate);

  const openPicker = () => {
    setTempDate(startDate);
    onToggleDatePicker(true);
  };

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + Number.parseInt(daysInput, 10) - 1);

  return (
    <RNScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* Bouton retour */}
      <TouchableOpacity style={styles.backBtn} onPress={onBackFromCreate} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={colors.textMid} />
        <Text style={[styles.backBtnText, { color: colors.textMid }]}>{t("ideas.itinerary.back")}</Text>
      </TouchableOpacity>

      {/* Carte récapitulatif */}
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.summaryCity, { color: colors.text }]}>📍 {itinerary.city}</Text>
        <View style={styles.summaryPillRow}>
          <View style={styles.summaryPill}>
            <Ionicons name="time-outline" size={13} color={colors.terra} />
            <Text style={[styles.summaryPillText, { color: colors.terra }]}>{daysInput} {t("ideas.addModal.days")}</Text>
          </View>
        </View>
        <View style={[styles.summaryDatesBlock, { borderTopColor: colors.border }]}>
          <View style={styles.summaryLabelsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryDateLabel, { color: colors.textLight }]}>{t("ideas.itinerary.pickStartDate")}</Text>
            </View>
            <View style={styles.summaryArrowSpace} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryDateLabel, { color: colors.textLight, textAlign: "right" }]}>{t("ideas.itinerary.endDate")}</Text>
            </View>
          </View>
          <View style={styles.summaryValuesRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryDateValue, { color: colors.text }]}>{formatDate(startDate)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.border} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryDateValue, { color: colors.text, textAlign: "right" }]}>{formatDate(endDate)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Champ date de départ */}
      <Text style={[styles.sectionLabel, { color: colors.textMid }]}>{t("ideas.itinerary.pickStartDate")}</Text>
      <TouchableOpacity
        style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={openPicker}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.terra} />
        <Text style={[styles.dateFieldText, { color: colors.text }]}>{formatDate(startDate)}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
      </TouchableOpacity>

      {/* iOS : modale avec confirm/annuler */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => onToggleDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.datePickerOverlay}
            activeOpacity={1}
            onPress={() => onToggleDatePicker(false)}
          >
            <TouchableOpacity activeOpacity={1} style={[styles.datePickerSheet, { backgroundColor: colors.bg }]}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                textColor={colors.text}
                style={{ alignSelf: "center", width: "100%" }}
                onChange={(_, date) => { if (date) setTempDate(date); }}
              />
              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={[styles.datePickerCancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => onToggleDatePicker(false)}
                >
                  <Text style={[styles.primaryBtnText, { color: colors.textMid }]}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.datePickerConfirmBtn, { backgroundColor: colors.terra }]}
                  onPress={() => { onStartDateChange(tempDate); onToggleDatePicker(false); }}
                >
                  <Text style={styles.primaryBtnText}>{t("common.confirm")}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Android : picker natif inline */}
      {showDatePicker && Platform.OS !== "ios" && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(_, date) => {
            onToggleDatePicker(false);
            if (date) onStartDateChange(date);
          }}
        />
      )}

      {/* Bouton créer */}
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.terra, marginTop: 24, opacity: creating ? 0.6 : 1 }]}
        onPress={onCreateTrip}
        disabled={creating}
        activeOpacity={0.8}
      >
        {creating
          ? <ActivityIndicator color="#FFF" size="small" />
          : <Text style={styles.primaryBtnText}>{t("ideas.itinerary.createTrip")}</Text>
        }
      </TouchableOpacity>

    </RNScrollView>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────

const ItineraryModal: React.FC<Props> = ({
  visible, onClose, cityInput, onCityChange, daysInput, onDaysChange,
  loading, itinerary, showCreateStep, onShowCreateStep, onBackFromCreate,
  startDate, onStartDateChange, showDatePicker, onToggleDatePicker,
  creating, onGenerate, onCreateTrip, onNewSearch,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetY, { toValue: 0, bounciness: 3, speed: 14, useNativeDriver: true }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetY.setValue(600);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.container, { backgroundColor: colors.bg, transform: [{ translateY: sheetY }] }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t("ideas.itinerary.title")}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={colors.textLight} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>{t("ideas.itinerary.subtitle")}</Text>

          {!itinerary && (
            <SearchForm
              cityInput={cityInput} onCityChange={onCityChange}
              daysInput={daysInput} onDaysChange={onDaysChange}
              loading={loading} onGenerate={onGenerate} colors={colors}
            />
          )}

          {itinerary && !showCreateStep && (
            <ItineraryPreview
              itinerary={itinerary} daysInput={daysInput} onDaysChange={onDaysChange}
              loading={loading} onGenerate={onGenerate} onShowCreateStep={onShowCreateStep}
              onNewSearch={onNewSearch} colors={colors}
            />
          )}

          {itinerary && showCreateStep && (
            <CreateTripStep
              itinerary={itinerary} daysInput={daysInput} startDate={startDate}
              onStartDateChange={onStartDateChange} showDatePicker={showDatePicker}
              onToggleDatePicker={onToggleDatePicker} creating={creating}
              onCreateTrip={onCreateTrip} onBackFromCreate={onBackFromCreate} colors={colors}
            />
          )}
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
    minHeight: "60%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title:    { fontFamily: F.sans700, fontSize: 22 },
  subtitle: { fontFamily: F.sans400, fontSize: 14, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: F.sans400,
    marginBottom: 12,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  primaryBtnText: { fontFamily: F.sans600, fontSize: 15, color: "#FFFFFF" },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cityTitle: { fontFamily: F.sans700, fontSize: 20, marginBottom: 12, marginTop: 8 },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  stepperBtn: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  stepperText: { fontFamily: F.sans600, fontSize: 15, minWidth: 60, textAlign: "center" },
  regenerateBtn: {
    flex: 1, borderRadius: 20,
    paddingVertical: 8, alignItems: "center", justifyContent: "center",
  },
  regenerateBtnText: { fontFamily: F.sans600, fontSize: 13, color: "#FFFFFF" },
  dayCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  dayTitle: { fontFamily: F.sans700, fontSize: 15, marginBottom: 12 },
  slotRow: { flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "flex-start" },
  slotEmoji: { fontSize: 18, marginTop: 1 },
  slotLabel: {
    fontFamily: F.sans500, fontSize: 11,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
  },
  slotActivity: { fontFamily: F.sans500, fontSize: 13, lineHeight: 18 },
  slotTip: { fontFamily: F.sans400, fontSize: 12, marginTop: 3, fontStyle: "italic" },
  // CreateTripStep
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backBtnText: {
    fontFamily: F.sans500,
    fontSize: 14,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  summaryCity: {
    fontFamily: F.sans700,
    fontSize: 18,
    marginBottom: 8,
  },
  summaryPillRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(196, 113, 74, 0.12)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  summaryPillText: {
    fontFamily: F.sans600,
    fontSize: 13,
  },
  summaryDatesBlock: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 4,
  },
  summaryLabelsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryArrowSpace: {
    width: 24,
  },
  summaryValuesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryDateLabel: {
    fontFamily: F.sans400,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryDateValue: {
    fontFamily: F.sans600,
    fontSize: 14,
  },
  sectionLabel: {
    fontFamily: F.sans500,
    fontSize: 13,
    marginBottom: 8,
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
  },
  dateFieldText: {
    flex: 1,
    fontFamily: F.sans400,
    fontSize: 15,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  datePickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  datePickerActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    width: "100%",
  },
  datePickerCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  datePickerConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});

export default ItineraryModal;
