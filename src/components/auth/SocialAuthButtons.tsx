import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, ClipPath, Defs, Rect } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { AppColors } from "../../contexts/ThemeContext";
import { F } from "../../theme/fonts";
import { RADIUS, DISABLED_OPACITY } from "../../theme";

const GoogleLogo: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 48 48">
    <Defs>
      <ClipPath id="clip">
        <Rect width={48} height={48} rx={24} />
      </ClipPath>
    </Defs>
    {/* Partie rouge */}
    <Path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    {/* Partie bleue (rectangle droit) */}
    <Path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    {/* Partie jaune (arc gauche) */}
    <Path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    {/* Partie verte (arc bas) */}
    <Path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
    <Path fill="none" d="M0 0h48v48H0z" />
  </Svg>
);

interface SocialAuthButtonsProps {
  onGooglePress: () => void;
  onApplePress: () => void;
  googleDisabled: boolean;
  busy: boolean;
  colors: AppColors;
}

const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onGooglePress,
  onApplePress,
  googleDisabled,
  busy,
  colors,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerLabel, { color: colors.textLight }]}>{t("auth.orDivider")}</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <TouchableOpacity
        style={[styles.googleBtn, { backgroundColor: colors.bgMid }, (googleDisabled || busy) && styles.disabled]}
        activeOpacity={0.85}
        onPress={onGooglePress}
        disabled={googleDisabled || busy}
      >
        <GoogleLogo />
        <Text style={[styles.googleBtnText, { color: colors.textMid }]}>{t("auth.googleButton")}</Text>
      </TouchableOpacity>

      {Platform.OS === "ios" && (
        <TouchableOpacity
          style={[styles.appleBtn, busy && styles.disabled]}
          activeOpacity={0.85}
          onPress={onApplePress}
          disabled={busy}
        >
          <Ionicons name="logo-apple" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.appleBtnText}>{t("auth.appleButton")}</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    fontFamily: F.sans400,
    fontSize: 13,
    marginHorizontal: 12,
  },
  googleBtn: {
    borderRadius: RADIUS.button,
    marginHorizontal: 24,
    paddingVertical: 17,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  googleBtnText: {
    fontFamily: F.sans600,
    fontSize: 16,
  },
  appleBtn: {
    borderRadius: RADIUS.button,
    marginHorizontal: 24,
    marginTop: 12,
    paddingVertical: 17,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  appleBtnText: {
    fontFamily: F.sans600,
    fontSize: 16,
    color: "#FFFFFF",
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
});

export default SocialAuthButtons;
