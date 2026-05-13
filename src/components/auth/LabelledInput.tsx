import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { AppColors } from "../../contexts/ThemeContext";
import { F } from "../../theme/fonts";
import { RADIUS } from "../../theme";

const EYE_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export interface LabelledInputProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  secureTextEntry?: boolean;
  showToggle?: boolean;
  showValue?: boolean;
  onToggleShow?: () => void;
  hasError?: boolean;
  errorText?: string;
  autoFocus?: boolean;
  textContentType?: "none" | "password" | "newPassword" | "emailAddress" | "name" | "telephoneNumber" | "oneTimeCode";
  colors: AppColors;
}

const LabelledInput: React.FC<LabelledInputProps> = ({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
  secureTextEntry = false,
  showToggle = false,
  showValue = false,
  onToggleShow,
  hasError = false,
  errorText,
  autoFocus = false,
  textContentType = "none",
  colors,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.wrapper}>
      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: hasError ? colors.danger : colors.border }]}>
        <Text style={[styles.label, { color: colors.textMid }]}>{label}</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.value, { color: colors.text }]}
            value={value}
            onChangeText={onChangeText}
            onBlur={onBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.textLight}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            secureTextEntry={secureTextEntry && !showValue}
            autoFocus={autoFocus}
            textContentType={textContentType}
            accessibilityLabel={label}
          />
          {showToggle && onToggleShow && (
            <TouchableOpacity
              onPress={onToggleShow}
              style={styles.eye}
              hitSlop={EYE_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={showValue ? t("common.a11y.hidePassword") : t("common.a11y.showPassword")}
            >
              <Ionicons
                name={showValue ? "eye-outline" : "eye-off-outline"}
                size={16}
                color={colors.textMid}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {hasError && errorText ? (
        <Text
          style={[styles.error, { color: colors.danger }]}
          accessibilityLiveRegion="polite"
        >
          {errorText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  box: {
    borderWidth: 1,
    borderRadius: RADIUS.input,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  label: {
    fontSize: 11,
    fontFamily: F.sans400,
    marginBottom: 4,
  },
  row: { flexDirection: "row", alignItems: "center" },
  value: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 2,
    fontFamily: F.sans400,
  },
  eye: { padding: 4, marginLeft: 4 },
  error: {
    fontSize: 13,
    marginTop: 4,
    marginLeft: 2,
    fontFamily: F.sans400,
  },
});

export default LabelledInput;
