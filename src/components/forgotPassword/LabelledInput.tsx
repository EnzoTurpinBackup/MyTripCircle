import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { F } from "../../theme/fonts";
import { useTheme } from "../../contexts/ThemeContext";

const EYE_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export interface LabelledInputProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address";
  secureTextEntry?: boolean;
  showToggle?: boolean;
  showValue?: boolean;
  onToggleShow?: () => void;
  hasError?: boolean;
  errorText?: string;
}

const LabelledInput: React.FC<LabelledInputProps> = ({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
  showToggle = false,
  showValue = false,
  onToggleShow,
  hasError = false,
  errorText,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.box,
          { backgroundColor: colors.surface, borderColor: colors.border },
          hasError && styles.boxError,
        ]}
      >
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
            autoCapitalize="none"
            secureTextEntry={secureTextEntry && !showValue}
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
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {errorText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  box: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  boxError: { borderColor: "#C04040" },
  label: { fontSize: 11, marginBottom: 2, fontFamily: F.sans500 },
  row: { flexDirection: "row", alignItems: "center" },
  value: { flex: 1, fontSize: 14, paddingVertical: 2, fontFamily: F.sans400 },
  eye: { padding: 4, marginLeft: 4 },
  error: { fontSize: 12, color: "#C04040", marginTop: 4, marginLeft: 2, fontFamily: F.sans400 },
});

export default LabelledInput;
