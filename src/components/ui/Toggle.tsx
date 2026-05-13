import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface ToggleProps {
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
  trackColor?: string;
  /** Libellé du contrôle pour les lecteurs d'écran (ex. « Mode sombre »). */
  accessibilityLabel?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  value,
  onToggle,
  disabled = false,
  trackColor,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  return (
  <TouchableOpacity
    onPress={() => !disabled && onToggle(!value)}
    activeOpacity={disabled ? 1 : 0.8}
    hitSlop={{ top: 8, bottom: 8 }}
    accessibilityRole="switch"
    accessibilityState={{ checked: value, disabled }}
    accessibilityLabel={accessibilityLabel}
    style={[
      styles.track,
      { backgroundColor: value ? (trackColor ?? colors.terra) : colors.border },
    ]}
  >
    <View style={[styles.knob, { transform: [{ translateX: value ? 22 : 0 }] }]} />
  </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 54,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
});

export default Toggle;
