import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface AcceptedToastProps {
  toastTrip: { name: string; id: string } | null;
  toastAnim: Animated.Value;
  onView: (tripId: string) => void;
}

const AcceptedToast: React.FC<AcceptedToastProps> = ({ toastTrip, toastAnim, onView }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!toastTrip) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity: toastAnim,
          transform: [
            {
              translateY: toastAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.toastIcon}>
        <Ionicons name="checkmark" size={20} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
      </View>
      <View style={styles.toastBody}>
        <Text style={styles.toastTitle} numberOfLines={1}>
          {t("invitation.toastJoinedTitle", { name: toastTrip.name })}
        </Text>
        <Text style={styles.toastSub}>{t("invitation.toastJoinedSub")}</Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
          if (toastTrip.id) onView(toastTrip.id);
        }}
        activeOpacity={0.8}
      >
        <Text style={[styles.toastAction, { color: colors.terra }]}>{t("invitation.toastView")}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: "absolute", bottom: 20, left: 16, right: 16,
    backgroundColor: "#2A2318", borderRadius: 16,
    padding: 16, flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#2A2318", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  toastIcon:   { width: 38, height: 38, borderRadius: 10, backgroundColor: "#6B8C5A", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  toastBody:   { flex: 1 },
  toastTitle:  { fontSize: 14, fontFamily: F.sans600, color: "#FFFFFF" },
  toastSub:    { fontSize: 12, fontFamily: F.sans400, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  toastAction: { fontSize: 14, fontFamily: F.sans600 },
});

export default AcceptedToast;
