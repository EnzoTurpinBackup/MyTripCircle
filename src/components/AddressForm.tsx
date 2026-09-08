import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Address } from "../types";
import { COLORS, RADIUS } from "../theme";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";
import { useAddressFormModal } from "../hooks/useAddressFormModal";
import AddressTypeSelector from "./addressForm/AddressTypeSelector";
import AddressAutocompleteField from "./addressForm/AddressAutocompleteField";
import FormField from "./addressForm/FormField";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

interface AddressFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (address: Omit<Address, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  initialAddress?: Address;
}

export const AddressForm: React.FC<AddressFormProps> = ({
  visible,
  onClose,
  onSave,
  initialAddress,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    form,
    suggestions,
    loadingSuggestions,
    fetchingPlaceDetails,
    submitting,
    slideAnim,
    handleInputChange,
    handleSuggestionPress,
    handleSave,
  } = useAddressFormModal({ visible, initialAddress, onSave, onClose });

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.bg, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.bgMid, borderBottomColor: colors.border }]}>
            <View style={[styles.headerIcon, { backgroundColor: colors.terraLight }]}>
              <Ionicons name="location" size={24} color={COLORS.terra} {...DECORATIVE_ELEMENT_PROPS} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {initialAddress ? t("addresses.form.editTitle") : t("addresses.form.title")}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.bgDark }]}
              accessibilityRole="button"
              accessibilityLabel={t("common.a11y.close")}
            >
              <Ionicons name="close" size={24} color={colors.textMid} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Type */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t("addresses.form.type")} *
              </Text>
              <AddressTypeSelector
                selectedType={form.type}
                onSelect={(type) => handleInputChange("type", type)}
              />
            </View>

            {/* Nom */}
            {(!!initialAddress || !!form.name) && (
              <FormField
                label={t("addresses.form.name")}
                value={form.name}
                onChangeText={(v) => handleInputChange("name", v)}
                icon="text-outline"
                placeholder={t("addresses.form.namePlaceholder")}
              />
            )}

            {/* Adresse avec autocomplétion */}
            <AddressAutocompleteField
              value={form.address}
              onChange={(v) => handleInputChange("address", v)}
              suggestions={suggestions}
              loadingSuggestions={loadingSuggestions}
              fetchingPlaceDetails={fetchingPlaceDetails}
              onSuggestionPress={handleSuggestionPress}
            />

            {/* Ville / Pays */}
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <FormField
                  label={t("addresses.form.city")}
                  value={form.city}
                  onChangeText={(v) => handleInputChange("city", v)}
                  icon="business-outline"
                  placeholder={t("addresses.form.cityPlaceholder")}
                  required
                />
              </View>
              <View style={styles.rowItem}>
                <FormField
                  label={t("addresses.form.country")}
                  value={form.country}
                  onChangeText={(v) => handleInputChange("country", v)}
                  icon="flag-outline"
                  placeholder={t("addresses.form.countryPlaceholder")}
                  required
                />
              </View>
            </View>

            <FormField
              label={t("addresses.form.phone")}
              value={form.phone}
              onChangeText={(v) => handleInputChange("phone", v)}
              icon="call-outline"
              placeholder={t("addresses.form.phonePlaceholder")}
              keyboardType="phone-pad"
            />

            <FormField
              label={t("addresses.form.website")}
              value={form.website}
              onChangeText={(v) => handleInputChange("website", v)}
              icon="globe-outline"
              placeholder={t("addresses.form.websitePlaceholder")}
              autoCapitalize="none"
            />

            <FormField
              label={t("addresses.form.notes")}
              value={form.notes}
              onChangeText={(v) => handleInputChange("notes", v)}
              icon="document-text-outline"
              placeholder={t("addresses.form.notesPlaceholder")}
              multiline
            />
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: colors.bgMid, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: colors.textMid }]}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (submitting || fetchingPlaceDetails) && { opacity: 0.6 }]}
              onPress={handleSave}
              activeOpacity={0.7}
              disabled={submitting || fetchingPlaceDetails}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} {...DECORATIVE_ELEMENT_PROPS} />
                  <Text style={styles.saveText}>{t("common.save")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(42, 35, 24, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    paddingTop: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: F.sans700,
    marginLeft: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    padding: 24,
    maxHeight: 500,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontFamily: F.sans600,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowItem: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: F.sans600,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.terra,
    paddingVertical: 14,
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: COLORS.terra,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveText: {
    color: "white",
    fontSize: 16,
    fontFamily: F.sans700,
  },
});
