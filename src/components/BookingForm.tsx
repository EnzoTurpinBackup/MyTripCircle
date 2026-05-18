import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
  FlatList,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Booking } from "../types";
import { formatDate } from "../utils/i18n";
import TicketScannerModal from "./TicketScannerModal";
import i18n from "i18next";
import { F } from "../theme/fonts";
import { RADIUS, SHADOW } from "../theme";
import { useTheme } from "../contexts/ThemeContext";
import { useBookingForm, needsEndDate, isTransport } from "../hooks/useBookingForm";
import PickerModal from "./bookingForm/PickerModal";
import BackButton from "./ui/BackButton";
import AttachmentThumb from "./bookingForm/AttachmentThumb";
import { TypePill, StatusPillItem } from "./bookingForm/BookingFormPills";
import {
  getTypeLabels,
  STATUSES,
  statusLabel,
  getSafeDate,
} from "./bookingForm/bookingFormConstants";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateFieldLabel(t: (k: string) => string, type: Booking["type"], direction: string | undefined): string {
  if (needsEndDate(type, direction)) {
    return type === "hotel" ? t("bookings.startDate") : t("bookings.departureDate");
  }
  return isTransport(type) ? t("bookings.departureDate") : t("bookings.date");
}

function getDatePickerTitle(t: (k: string) => string, type: Booking["type"], direction: string | undefined): string {
  if (isTransport(type)) return t("bookings.departureDate");
  return needsEndDate(type, direction) ? t("bookings.startDate") : t("bookings.date");
}

function getLocale(language: string): string {
  return language === "fr" ? "fr_FR" : "en_US";
}

type FormHandle = ReturnType<typeof useBookingForm>;
type ThemeColors = ReturnType<typeof useTheme>["colors"];

function AndroidDatePickers({ form, safeDate, safeEndDate }: Readonly<{ form: FormHandle; safeDate: Date; safeEndDate: Date }>) {
  if (Platform.OS !== "android") return null;
  return (
    <>
      {form.showDatePicker && <DateTimePicker value={safeDate} mode="date" display="default" onChange={(e, d) => form.handleDateChange(e, d, "start")} />}
      {form.showEndDatePicker && <DateTimePicker value={safeEndDate} mode="date" display="default" onChange={(e, d) => form.handleDateChange(e, d, "end")} />}
      {form.showTimePicker && <DateTimePicker value={form.getTimePickerValue()} mode="time" display="default" onChange={form.handleTimeChange} />}
      {form.showReturnTimePicker && <DateTimePicker value={form.getReturnTimePickerValue()} mode="time" display="default" onChange={form.handleReturnTimeChange} />}
    </>
  );
}

function IosPickersBlock({ form, safeDate, safeEndDate, colors, t, locale }: Readonly<{
  form: FormHandle; safeDate: Date; safeEndDate: Date; colors: ThemeColors; t: (k: string) => string; locale: string;
}>) {
  if (Platform.OS !== "ios") return null;
  return (
    <>
      <PickerModal visible={form.showDatePicker} title={getDatePickerTitle(t, form.formData.type, form.formData.tripDirection)} onClose={() => form.setShowDatePicker(false)} colors={colors} t={t}>
        <DateTimePicker value={safeDate} mode="date" display="spinner" onChange={(e, d) => form.handleDateChange(e, d, "start")} textColor={colors.text} locale={locale} />
      </PickerModal>
      <PickerModal visible={form.showTimePicker} title={isTransport(form.formData.type) ? t("bookings.departureTime") : t("bookings.time")} onClose={() => form.setShowTimePicker(false)} colors={colors} t={t}>
        <DateTimePicker value={form.getTimePickerValue()} mode="time" display="spinner" onChange={form.handleTimeChange} textColor={colors.text} />
      </PickerModal>
      <PickerModal visible={form.showEndDatePicker} title={form.formData.type === "hotel" ? t("bookings.endDate") : t("bookings.directionLabels.return")} onClose={() => form.setShowEndDatePicker(false)} colors={colors} t={t}>
        <DateTimePicker value={safeEndDate} mode="date" display="spinner" onChange={(e, d) => form.handleDateChange(e, d, "end")} textColor={colors.text} locale={locale} />
      </PickerModal>
      <PickerModal visible={form.showReturnTimePicker} title={t("bookings.returnTime")} onClose={() => form.setShowReturnTimePicker(false)} colors={colors} t={t}>
        <DateTimePicker value={form.getReturnTimePickerValue()} mode="time" display="spinner" onChange={form.handleReturnTimeChange} textColor={colors.text} />
      </PickerModal>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function OriginDestinationSection({ form, colors, t }: Readonly<{ form: FormHandle; colors: ThemeColors; t: (k: string) => string }>) {
  const icon = form.formData.type === "flight" ? "airplane-outline" : "train-outline";
  return (
    <>
      <View style={[styles.fieldBox, { backgroundColor: colors.surface, borderColor: colors.border }, form.fieldErrors.origin ? styles.fieldBoxError : null]}>
        <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("bookings.origin")} *</Text>
        <TextInput
          style={[styles.fieldInput, { color: colors.text }, form.fieldErrors.origin ? styles.fieldInputError : null]}
          value={form.formData.origin}
          onChangeText={(v) => { form.handleOriginChange(v); if (form.fieldErrors.origin) form.setFieldErrors((e) => ({ ...e, origin: undefined })); }}
          placeholder={t("bookings.originPlaceholder")}
          placeholderTextColor={colors.textLight}
        />
        {form.fieldErrors.origin ? <Text style={styles.inlineError}>{form.fieldErrors.origin}</Text> : null}
        {form.showOriginSuggestions && form.originSuggestions.length > 0 && (
          <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FlatList
              data={form.originSuggestions}
              keyExtractor={(item) => item.placeId}
              scrollEnabled={false}
              style={styles.suggestionsList}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.suggestionItem, { borderBottomColor: colors.bgMid }]} onPress={() => form.handleSelectOrigin(item)}>
                  <Ionicons name={icon} size={16} color={colors.textMid} style={styles.suggestionIcon} />
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{item.description}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      <View style={styles.transportArrowRow}>
        <Ionicons name="arrow-down" size={18} color={colors.textLight} />
      </View>

      <View style={[styles.fieldBox, { backgroundColor: colors.surface, borderColor: colors.border }, form.fieldErrors.destination ? styles.fieldBoxError : null]}>
        <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("bookings.destination")} *</Text>
        <TextInput
          style={[styles.fieldInput, { color: colors.text }, form.fieldErrors.destination ? styles.fieldInputError : null]}
          value={form.formData.destination}
          onChangeText={(v) => { form.handleDestinationChange(v); if (form.fieldErrors.destination) form.setFieldErrors((e) => ({ ...e, destination: undefined })); }}
          placeholder={t("bookings.destinationPlaceholder")}
          placeholderTextColor={colors.textLight}
        />
        {form.fieldErrors.destination ? <Text style={styles.inlineError}>{form.fieldErrors.destination}</Text> : null}
        {form.showDestinationSuggestions && form.destinationSuggestions.length > 0 && (
          <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FlatList
              data={form.destinationSuggestions}
              keyExtractor={(item) => item.placeId}
              scrollEnabled={false}
              style={styles.suggestionsList}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.suggestionItem, { borderBottomColor: colors.bgMid }]} onPress={() => form.handleSelectDestination(item)}>
                  <Ionicons name={icon} size={16} color={colors.textMid} style={styles.suggestionIcon} />
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{item.description}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
    </>
  );
}

function TitleField({ form, colors, t }: Readonly<{ form: FormHandle; colors: ThemeColors; t: (k: string) => string }>) {
  return (
    <View style={[styles.fieldBox, { backgroundColor: colors.surface, borderColor: colors.border }, form.fieldErrors.title ? styles.fieldBoxError : null]}>
      <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("bookings.title")} *</Text>
      {form.formData.type === "flight" ? (
        <Text style={[styles.fieldValue, { color: form.formData.title ? colors.text : colors.textLight }]}>
          {form.formData.title || t("bookings.flightTitlePlaceholder")}
        </Text>
      ) : (
        <TextInput
          style={[styles.fieldInput, { color: colors.text }, form.fieldErrors.title ? styles.fieldInputError : null]}
          value={form.formData.title}
          onChangeText={(v) => { form.handleInputChange("title", v); if (form.fieldErrors.title) form.setFieldErrors((e) => ({ ...e, title: undefined })); }}
          placeholder={t("bookings.titlePlaceholder")}
          placeholderTextColor={colors.textLight}
        />
      )}
      {form.fieldErrors.title ? <Text style={styles.inlineError}>{form.fieldErrors.title}</Text> : null}
    </View>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BookingFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (booking: Omit<Booking, "id" | "createdAt" | "updatedAt">) => void;
  initialBooking?: Partial<Booking>;
  tripStartDate?: Date;
  tripEndDate?: Date;
  preselectedTripId?: string;
}

// ─── Composant principal ──────────────────────────────────────────────────────

const BookingForm: React.FC<BookingFormProps> = (props) => {
  const { visible, onClose, initialBooking } = props;
  const { t }      = useTranslation();
  const { colors, isDark } = useTheme();
  const insets     = useSafeAreaInsets();
  const TYPE_LABELS = getTypeLabels(t);

  const form = useBookingForm(props);

  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [internalVisible, setInternalVisible] = useState(false);

  const springConfig = {
    damping: 1000,
    stiffness: 1000,
    mass: 3,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
    useNativeDriver: true,
  };

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      slideAnim.setValue(SCREEN_WIDTH);
      Animated.spring(slideAnim, { toValue: 0, ...springConfig }).start();
    } else if (internalVisible) {
      Animated.spring(slideAnim, { toValue: SCREEN_WIDTH, ...springConfig }).start(() => setInternalVisible(false));
    }
  }, [visible]);

  const safeDate    = getSafeDate(form.formData.date);
  const safeEndDate = getSafeDate(form.formData.endDate);
  const locale      = getLocale(i18n.language);

  return (
    <Modal visible={internalVisible} animationType="none" transparent={true}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <Animated.View style={{ flex: 1, backgroundColor: colors.bg, transform: [{ translateX: slideAnim }] }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom", "left", "right"]}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 6, backgroundColor: colors.bg, borderBottomColor: colors.bgMid }]}>
          <BackButton onPress={onClose} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {initialBooking ? t("bookings.editBooking") : t("bookings.newBooking")}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Scan ── */}
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: colors.bgMid, borderColor: colors.border }]}
            onPress={() => form.setShowScanner(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="scan-outline" size={20} color="#5A8FAA" style={{ marginRight: 8 }} />
            <Text style={[styles.scanButtonText, { color: "#5A8FAA" }]}>{t("bookings.scanTicketButton")}</Text>
          </TouchableOpacity>

          {/* ── Type ── */}
          <View style={styles.typePillsContainer}>
            <View style={styles.typePillsRow}>
              {(["flight", "train", "hotel"] as Booking["type"][]).map((type) => (
                <TypePill key={type} type={type} isSelected={form.formData.type === type} label={TYPE_LABELS[type]} colors={colors} isDark={isDark} onPress={() => form.handleInputChange("type", type)} />
              ))}
            </View>
            <View style={styles.typePillsRow}>
              {(["restaurant", "activity"] as Booking["type"][]).map((type) => (
                <TypePill key={type} type={type} isSelected={form.formData.type === type} label={TYPE_LABELS[type]} colors={colors} isDark={isDark} onPress={() => form.handleInputChange("type", type)} />
              ))}
            </View>
          </View>

          {/* ── Direction (vol / train) ── */}
          {isTransport(form.formData.type) && (
            <View style={[styles.fieldBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("bookings.direction")}</Text>
              <View style={styles.statusRow}>
                {(["outbound", "return", "roundtrip"] as const).map((dir) => (
                  <TouchableOpacity
                    key={dir}
                    style={[
                      styles.directionPill,
                      { borderColor: colors.border, backgroundColor: colors.bgMid },
                      form.formData.tripDirection === dir && { backgroundColor: colors.terra, borderColor: colors.terra },
                    ]}
                    onPress={() => form.handleInputChange("tripDirection", dir)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.directionPillText, { color: colors.textMid }, form.formData.tripDirection === dir && { color: "#FFFFFF" }]}>
                      {t(`bookings.directionLabels.${dir}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Origine / Destination (vol / train) ── */}
          {isTransport(form.formData.type) && (
            <OriginDestinationSection form={form} colors={colors} t={t} />
          )}

          {/* ── Titre ── */}
          <TitleField form={form} colors={colors} t={t} />

          {/* ── Date + Heure de départ ── */}
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.fieldBox, styles.dateRowItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => form.setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.fieldLabel, { color: colors.textLight }]}>
                {getDateFieldLabel(t, form.formData.type, form.formData.tripDirection)}
              </Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>{formatDate(form.formData.date)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fieldBox, styles.dateRowItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => form.setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.fieldLabel, { color: colors.textLight }]}>
                {isTransport(form.formData.type) ? t("bookings.departureTime") : t("bookings.time")}
              </Text>
              <Text style={[styles.fieldValue, { color: form.formData.time ? colors.text : colors.textLight }]}>
                {form.formData.time || "12:00"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* iOS pickers */}
          <IosPickersBlock form={form} safeDate={safeDate} safeEndDate={safeEndDate} colors={colors} t={t} locale={locale} />

          {/* ── Date de fin (hôtel) ── */}
          {needsEndDate(form.formData.type, form.formData.tripDirection) && form.formData.type === "hotel" && (
            <TouchableOpacity
              style={[styles.fieldBox, { backgroundColor: colors.surface, borderColor: colors.border }, form.fieldErrors.endDate ? styles.fieldBoxError : null]}
              onPress={() => form.setShowEndDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("bookings.endDate")} *</Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>{formatDate(form.formData.endDate || new Date())}</Text>
              {form.fieldErrors.endDate ? <Text style={styles.inlineError}>{form.fieldErrors.endDate}</Text> : null}
            </TouchableOpacity>
          )}

          {/* ── Date + Heure de retour (aller-retour vol/train) ── */}
          {needsEndDate(form.formData.type, form.formData.tripDirection) && isTransport(form.formData.type) && (
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.fieldBox, styles.dateRowItem, { backgroundColor: colors.surface, borderColor: colors.border }, form.fieldErrors.endDate ? styles.fieldBoxError : null]}
                onPress={() => form.setShowEndDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("bookings.directionLabels.return")} *</Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>{formatDate(form.formData.endDate || new Date())}</Text>
                {form.fieldErrors.endDate ? <Text style={styles.inlineError}>{form.fieldErrors.endDate}</Text> : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fieldBox, styles.dateRowItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => form.setShowReturnTimePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("bookings.time")}</Text>
                <Text style={[styles.fieldValue, { color: form.formData.returnTime ? colors.text : colors.textLight }]}>
                  {form.formData.returnTime || "12:00"}
                </Text>
              </TouchableOpacity>
            </View>
          )}


          {/* ── Adresse ── */}
          <View style={[styles.fieldBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("bookings.address")}</Text>
            <TextInput style={[styles.fieldInput, { color: colors.text }]} value={form.formData.address} onChangeText={form.handleAddressChange} placeholder={t("bookings.addressPlaceholder")} placeholderTextColor={colors.textLight} />
            {form.showAddressSuggestions && form.addressSuggestions.length > 0 && (
              <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <FlatList
                  data={form.addressSuggestions}
                  keyExtractor={(item) => item.placeId}
                  scrollEnabled={false}
                  style={styles.suggestionsList}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.suggestionItem, { borderBottomColor: colors.bgMid }]} onPress={() => form.handleSelectAddress(item)}>
                      <Ionicons name="location" size={16} color={colors.textMid} style={styles.suggestionIcon} />
                      <Text style={[styles.suggestionText, { color: colors.text }]}>{item.description}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          {/* ── Statut ── */}
          <View style={[styles.fieldBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("bookings.statusLabel")}</Text>
            <View style={styles.statusRow}>
              {STATUSES.map((status) => (
                <StatusPillItem
                  key={status}
                  status={status}
                  label={statusLabel(t, status)}
                  isSelected={form.formData.status === status}
                  colors={colors}
                  onPress={() => form.handleInputChange("status", status)}
                />
              ))}
            </View>
          </View>

          {/* ── Pièces jointes ── */}
          <View style={styles.attachmentSection}>
            {form.attachments.map((attachment, idx) => (
              <View key={attachment.uri} style={[styles.attachmentItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AttachmentThumb attachment={attachment} colors={colors} />
                <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>{attachment.name}</Text>
                <TouchableOpacity style={styles.renameAttachmentButton} onPress={() => form.handleOpenRename(idx)}>
                  <Ionicons name="pencil" size={16} color={colors.terra} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeAttachmentButton} onPress={() => form.handleRemoveAttachment(idx)}>
                  <Ionicons name="close-circle" size={22} color="#C04040" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.attachmentDashedBox, { borderColor: colors.border }]}
              onPress={() => Alert.alert(t("bookings.attachmentTitle"), t("bookings.chooseFileType"), [
                { text: t("bookings.imageOption"), onPress: form.handlePickImage },
                { text: t("bookings.pdfOption"),   onPress: form.handlePickDocument },
                { text: t("common.cancel"), style: "cancel" },
              ])}
              activeOpacity={0.7}
            >
              <Text style={[styles.attachmentDashedText, { color: colors.textLight }]}>{t("bookings.addAttachment")}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Bouton principal ── */}
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.terra }]} onPress={form.handleSave} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>
              {initialBooking ? t("common.save") : t("bookings.newBooking")}
            </Text>
          </TouchableOpacity>

        </ScrollView>

        {/* Platform pickers */}
        <AndroidDatePickers form={form} safeDate={safeDate} safeEndDate={safeEndDate} />

        {/* Scanner */}
        <TicketScannerModal visible={form.showScanner} onClose={() => form.setShowScanner(false)} onFill={form.handleScanFill} />

        {/* Modal renommage pièce jointe */}
        <Modal visible={form.renamingIndex !== null} transparent animationType="fade">
          <View style={styles.renameOverlay}>
            <View style={[styles.renameModal, { backgroundColor: colors.surface }]}>
              <Text style={[styles.renameTitle, { color: colors.text }]}>{t("bookings.renameFileTitle")}</Text>
              <Text style={[styles.renameSubtitle, { color: colors.textLight }]}>{t("bookings.renameFileSubtitle")}</Text>
              <TextInput
                style={[styles.renameInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={form.renameValue}
                onChangeText={form.setRenameValue}
                placeholder={t("bookings.renamePlaceholder")}
                placeholderTextColor={colors.textLight}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={form.handleConfirmRename}
              />
              <View style={styles.renameButtons}>
                <TouchableOpacity style={[styles.renameCancelBtn, { borderColor: colors.border }]} onPress={() => form.setRenamingIndex(null)}>
                  <Text style={[styles.renameCancelText, { color: colors.textMid }]}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.renameConfirmBtn, { backgroundColor: colors.terra }, !form.renameValue.trim() && { opacity: 0.5 }]} onPress={form.handleConfirmRename} disabled={!form.renameValue.trim()}>
                  <Text style={styles.renameConfirmText}>{t("common.confirm")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20, fontFamily: F.sans700,
    flex: 1, textAlign: "center", marginHorizontal: 8,
  },
  scrollContent: { paddingBottom: 40 },
  scanButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginTop: 20, marginBottom: 4, marginHorizontal: 20,
    paddingVertical: 13, paddingHorizontal: 20,
    borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed",
  },
  scanButtonText: { fontSize: 15, fontFamily: F.sans600 },
  typePillsContainer: { marginTop: 20, marginBottom: 8, gap: 12 },
  typePillsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12 },
  fieldBox: {
    backgroundColor: "#FFFFFF", borderRadius: RADIUS.card, borderWidth: 1,
    paddingHorizontal: 18, paddingVertical: 16, marginHorizontal: 20, marginBottom: 12,
  },
  fieldLabel: { fontSize: 13, fontFamily: F.sans400, marginBottom: 6 },
  fieldValue: { fontSize: 18, fontFamily: F.sans400 },
  fieldInput: { fontSize: 18, fontFamily: F.sans400, padding: 0, margin: 0 },
  fieldBoxError: { borderColor: "#C04040", borderWidth: 1.5 },
  fieldInputError: { color: "#C04040" },
  inlineError: { fontSize: 12, color: "#C04040", marginTop: 4, fontFamily: F.sans400 },
  dateRow: { flexDirection: "row", marginHorizontal: 20, marginBottom: 0, gap: 10 },
  dateRowItem: { flex: 1, marginHorizontal: 0, marginBottom: 10 },
  statusRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  transportArrowRow: {
    alignItems: "center", marginTop: -4, marginBottom: 8,
  },
  directionPill: {
    flex: 1, paddingVertical: 9, paddingHorizontal: 4,
    borderRadius: RADIUS.button, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  directionPillText: { fontSize: 14, fontFamily: F.sans600 },
  attachmentSection: { marginHorizontal: 20, marginBottom: 10 },
  attachmentDashedBox: {
    borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed",
    padding: 20, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8,
  },
  attachmentDashedText: { fontSize: 16, fontFamily: F.sans400 },
  attachmentItem: {
    flexDirection: "row", alignItems: "center", borderRadius: RADIUS.button,
    padding: 12, marginBottom: 10, borderWidth: 1,
  },
  attachmentName: { flex: 1, fontSize: 14, fontFamily: F.sans400, marginRight: 8 },
  renameAttachmentButton: { padding: 4, marginRight: 4 },
  removeAttachmentButton: { padding: 4 },
  primaryButton: {
    borderRadius: RADIUS.card,
    paddingVertical: 19, marginHorizontal: 20, marginTop: 14,
    alignItems: "center", ...SHADOW.medium,
  },
  primaryButtonText: { fontSize: 19, fontFamily: F.sans700, color: "#FFFFFF" },
  renameOverlay: {
    flex: 1, backgroundColor: "rgba(42, 35, 24, 0.5)",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  renameModal: { borderRadius: 20, padding: 24, width: "100%", ...SHADOW.strong },
  renameTitle: { fontSize: 18, fontFamily: F.sans700, marginBottom: 4 },
  renameSubtitle: { fontSize: 13, fontFamily: F.sans400, marginBottom: 16 },
  renameInput: {
    borderRadius: RADIUS.button, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontFamily: F.sans400, marginBottom: 16,
  },
  renameButtons: { flexDirection: "row", gap: 12 },
  renameCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.button,
    borderWidth: 1.5, alignItems: "center",
  },
  renameCancelText: { fontSize: 15, fontFamily: F.sans600 },
  renameConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.button,
    alignItems: "center",
  },
  renameConfirmText: { fontSize: 15, fontFamily: F.sans700, color: "white" },
  suggestionsContainer: {
    marginTop: 8, borderRadius: RADIUS.button, borderWidth: 1,
    shadowColor: "#2A2318", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, zIndex: 10,
  },
  suggestionsList: { maxHeight: 150 },
  suggestionItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1,
  },
  suggestionIcon: { marginRight: 12 },
  suggestionText: { flex: 1, fontSize: 14, fontFamily: F.sans400 },
});

export default BookingForm;
