import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Modal,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface ThemeColors {
  bg: string;
  border: string;
  surface: string;
  text: string;
  textLight: string;
  textMid: string;
  bgMid: string;
  terra: string;
}

interface Props {
  visible: boolean;
  destinationName: string;
  customDays: number;
  tripTitle: string;
  startDate: Date;
  endDate: Date;
  showDatePicker: boolean;
  creating: boolean;
  backdropOpacity: Animated.Value;
  sheetTranslateY: Animated.Value;
  colors: ThemeColors;
  isDark: boolean;
  onClose: () => void;
  onChangeTripTitle: (v: string) => void;
  onOpenDatePicker: () => void;
  onCloseDatePicker: () => void;
  onChangeDate: (date: Date | undefined) => void;
  onCreate: () => void;
  formatDate: (d: Date) => string;
}

const AddToTripModal: React.FC<Props> = ({
  visible,
  destinationName,
  customDays,
  tripTitle,
  startDate,
  endDate,
  showDatePicker,
  creating,
  backdropOpacity,
  sheetTranslateY,
  colors,
  isDark,
  onClose,
  onChangeTripTitle,
  onOpenDatePicker,
  onCloseDatePicker,
  onChangeDate,
  onCreate,
  formatDate,
}) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={s.modalOverlay} pointerEvents="box-none">
        <Animated.View style={[s.modalBackdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.modalKAV}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              s.modalSheet,
              {
                backgroundColor: colors.bg,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <TouchableWithoutFeedback onPress={onCloseDatePicker}>
              <View>
                <View style={[s.modalHandle, { backgroundColor: colors.border }]} />

                <Text style={[s.modalTitle, { color: colors.text }]}>
                  {t("ideas.addModal.title")}
                </Text>
                <Text style={[s.modalSubtitle, { color: colors.textLight }]}>
                  {destinationName} · {customDays} {t("ideas.addModal.days")}
                </Text>

                <Text style={[s.fieldLabel, { color: colors.textMid }]}>
                  {t("ideas.addModal.tripTitle")}
                </Text>
                <TextInput
                  style={[
                    s.textInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={tripTitle}
                  onChangeText={onChangeTripTitle}
                  placeholder={t("ideas.addModal.tripTitlePlaceholder")}
                  placeholderTextColor={colors.textLight}
                  returnKeyType="done"
                  maxLength={60}
                />

                <Text style={[s.fieldLabel, { color: colors.textMid }]}>
                  {t("ideas.addModal.startDate")}
                </Text>
                <TouchableOpacity
                  style={[s.dateRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={onOpenDatePicker}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
                  <Text style={[s.dateText, { color: colors.text }]}>{formatDate(startDate)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
                </TouchableOpacity>

                <View style={[s.dateRowReadonly, { backgroundColor: colors.bgMid }]}>
                  <Ionicons name="flag-outline" size={16} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
                  <Text style={[s.dateTextReadonly, { color: colors.textLight }]}>
                    {t("ideas.addModal.endDate")} : {formatDate(endDate)}
                  </Text>
                </View>

                {showDatePicker && (
                  <View style={s.datePickerWrapper}>
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      themeVariant={isDark ? "dark" : "light"}
                      minimumDate={new Date()}
                      onChange={(_e, date) => {
                        if (Platform.OS === "android") onCloseDatePicker();
                        onChangeDate(date);
                      }}
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={[s.createBtn, creating && s.createBtnDisabled]}
                  onPress={onCreate}
                  disabled={creating}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={creating ? ["#C4956A", "#C4956A"] : ["#C4714A", "#A85A38"]}
                    style={s.createBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {creating ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
                        <Text style={s.createBtnText}>{t("ideas.addModal.create")}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  modalOverlay: { flex: 1 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalKAV: { flex: 1, justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: { fontFamily: F.sans700, fontSize: 22, marginBottom: 4 },
  modalSubtitle: { fontFamily: F.sans400, fontSize: 14, marginBottom: 24 },
  fieldLabel: {
    fontFamily: F.sans500,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontFamily: F.sans400,
    fontSize: 15,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  dateText: { fontFamily: F.sans500, fontSize: 15, flex: 1 },
  dateRowReadonly: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  dateTextReadonly: { fontFamily: F.sans400, fontSize: 13 },
  datePickerWrapper: { alignItems: "center" },
  createBtn: { borderRadius: 28, overflow: "hidden" },
  createBtnDisabled: { opacity: 0.7 },
  createBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 28,
  },
  createBtnText: { fontFamily: F.sans700, fontSize: 16, color: "#FFFFFF" },
});

export default AddToTripModal;
