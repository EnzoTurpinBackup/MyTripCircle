import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { AddressSuggestion } from "../../services/PlacesService";
import { useTheme } from "../../contexts/ThemeContext";
import { RADIUS, SHADOW } from "../../theme";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

type Props = {
  value: string;
  onChange: (v: string) => void;
  suggestions: AddressSuggestion[];
  loadingSuggestions: boolean;
  fetchingPlaceDetails: boolean;
  onSuggestionPress: (s: AddressSuggestion) => void;
};

const AddressAutocompleteField: React.FC<Props> = ({
  value,
  onChange,
  suggestions,
  loadingSuggestions,
  fetchingPlaceDetails,
  onSuggestionPress,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.textMid }]}>
        {t("addresses.form.address")}
        <Text style={{ color: colors.terra }}> *</Text>
      </Text>
      <View style={[styles.inputBox, styles.inputBoxMultiline, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons
          name="search-outline"
          size={20}
          color={colors.textLight}
          style={[styles.inputIcon, styles.inputIconTop]}
          {...DECORATIVE_ELEMENT_PROPS}
        />
        <TextInput
          style={[styles.inputText, styles.inputTextArea, { color: colors.text }]}
          value={value}
          onChangeText={onChange}
          placeholder="Tapez le nom ou l'adresse (ex: McDonald's)"
          placeholderTextColor={colors.textLight}
          multiline
          autoComplete="off"
          textContentType="none"
        />
      </View>

      {(loadingSuggestions || fetchingPlaceDetails) && (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={colors.terra} />
          <Text style={[styles.statusText, { color: colors.textMid }]}>
            {t("common.loading")}
          </Text>
        </View>
      )}

      {suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s.placeId}
              style={[styles.suggestionItem, { borderBottomColor: colors.bgMid }]}
              onPress={() => onSuggestionPress(s)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={colors.terra}
                style={{ marginRight: 10 }}
                {...DECORATIVE_ELEMENT_PROPS}
              />
              <Text style={[styles.suggestionText, { color: colors.text }]}>{s.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldWrap: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: F.sans600,
    marginBottom: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.input,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  inputBoxMultiline: {
    alignItems: "flex-start",
  },
  inputIcon: {
    marginRight: 10,
    flexShrink: 0,
  },
  inputIconTop: {
    alignSelf: "flex-start",
    marginTop: 16,
  },
  inputText: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: F.sans400,
  },
  inputTextArea: {
    textAlignVertical: "top",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    fontFamily: F.sans400,
  },
  suggestionsContainer: {
    marginTop: 10,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    overflow: "hidden",
    ...SHADOW.medium,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: F.sans400,
  },
});

export default AddressAutocompleteField;
