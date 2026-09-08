import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { RADIUS } from "../../theme";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  required?: boolean;
};

const FormField: React.FC<Props> = ({
  label,
  value,
  onChangeText,
  icon,
  placeholder = "",
  multiline = false,
  keyboardType,
  autoCapitalize = "sentences",
  required = false,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.textMid }]}>
        {label}
        {required && <Text style={{ color: colors.terra }}> *</Text>}
      </Text>
      <View style={[
        styles.inputBox,
        multiline && styles.inputBoxMultiline,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={colors.textLight}
            style={[styles.inputIcon, multiline && styles.inputIconTop]}
            {...DECORATIVE_ELEMENT_PROPS}
          />
        )}
        <TextInput
          style={[styles.inputText, { color: colors.text }, multiline && styles.inputTextArea]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete="off"
          textContentType="none"
        />
      </View>
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
});

export default FormField;
