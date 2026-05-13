import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, DISABLED_OPACITY } from "../theme";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";

// Design-system tokens (invariants entre thèmes)
const TERRA        = COLORS.terra;       // bordure du bouton outline (contraste >= 3:1, OK clair & sombre)
const TERRA_DARK   = COLORS.terraDark;   // fond du bouton primaire — blanc dessus >= 4.5:1 (WCAG AA), clair & sombre
const TERRA_SHADOW = "rgba(196,113,74,0.30)";
const INK_MID      = COLORS.inkMid;
const SAND_MID     = COLORS.sandMid;
const DANGER       = COLORS.danger;
const DANGER_LIGHT = COLORS.dangerLight;

interface ModernButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "small" | "medium" | "large";
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
  /** Kept for API compatibility — no longer renders a gradient. */
  gradient?: boolean;
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  title,
  variant = "primary",
  size = "medium",
  icon,
  iconPosition = "left",
  loading = false,
  fullWidth = false,
  gradient: _gradient = false, // accepted but ignored
  style,
  disabled,
  ...props
}) => {
  // Accent terracotta adapté au thème : foncé sur fond clair, clair sur fond
  // sombre — garde un contraste >= 4.5:1 pour le texte des boutons outline/ghost.
  const { colors } = useTheme();
  const accent = colors.terraDark;

  const iconSizeMedLarge = size === "medium" ? 18 : 24;
  const iconSize = size === "small" ? 16 : iconSizeMedLarge;

  const iconColor = (() => {
    switch (variant) {
      case "primary":
        return "#FFFFFF";
      case "secondary":
        return INK_MID;
      case "danger":
        return DANGER;
      default:
        return accent; // outline / ghost
    }
  })();

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={iconColor}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              styles[`${size}Text` as keyof typeof styles] as TextStyle,
              styles[`${variant}Text` as keyof typeof styles] as TextStyle,
              (variant === "outline" || variant === "ghost") && { color: accent },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {icon && iconPosition === "right" && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={iconColor}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </>
  );

  const buttonStyle = [
    styles.button,
    styles[size],
    styles[variant],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  return (
    <TouchableOpacity
      style={buttonStyle}
      activeOpacity={0.8}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled || loading, busy: loading }}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ── Base ──────────────────────────────────────────────────────────────────
  button: {
    borderRadius: RADIUS.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },

  // ── Variants ──────────────────────────────────────────────────────────────
  primary: {
    backgroundColor: TERRA_DARK,
    shadowColor: TERRA_SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, // opacity is already baked into TERRA_SHADOW rgba
    shadowRadius: 8,
    elevation: 4,
  },
  secondary: {
    backgroundColor: SAND_MID,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: TERRA,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: DANGER_LIGHT,
  },

  // ── Sizes ─────────────────────────────────────────────────────────────────
  small: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 48,
  },
  large: {
    paddingHorizontal: 28,
    paddingVertical: 18,
    minHeight: 60,
  },

  // ── Text base ─────────────────────────────────────────────────────────────
  text: {
    fontFamily: F.sans600,
    textAlign: "center",
    flex: 1,
  },
  smallText: {
    fontSize: 13,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 17,
  },

  // ── Text per variant ──────────────────────────────────────────────────────
  primaryText: {
    color: "#FFFFFF",
  },
  secondaryText: {
    color: INK_MID,
  },
  outlineText: {
    color: TERRA_DARK,
  },
  ghostText: {
    color: TERRA_DARK,
  },
  dangerText: {
    color: DANGER,
  },

  // ── Icons ─────────────────────────────────────────────────────────────────
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
});
