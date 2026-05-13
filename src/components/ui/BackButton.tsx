import React from "react";
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";

interface Props {
  onPress: () => void;
  /** "default" = fond bgMid + icône textMid | "overlay" = fond semi-transparent + icône blanche */
  variant?: "default" | "overlay";
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
  /** Libellé lu par les lecteurs d'écran. Par défaut : « Retour ». */
  accessibilityLabel?: string;
}

const BackButton: React.FC<Props> = ({
  onPress,
  variant = "default",
  style,
  activeOpacity = 0.7,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const bg = variant === "overlay" ? "rgba(0,0,0,0.35)" : colors.bgMid;
  const iconColor = variant === "overlay" ? "#FFFFFF" : colors.textMid;

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bg }, style]}
      onPress={onPress}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? t("common.a11y.back")}
    >
      <Ionicons name="chevron-back" size={22} color={iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default BackButton;
