import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface Props {
  responding: boolean;
  onAccept: () => void;
  onDecline: () => void;
  insetBottom: number;
}

const InvitationCtaBar: React.FC<Props> = ({ responding, onAccept, onDecline, insetBottom }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.inviteCta, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insetBottom + 12 }]}>
      <View style={[styles.inviteCtaHint, { backgroundColor: colors.terraLight }]}>
        <Ionicons name="mail-outline" size={16} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
        <Text style={[styles.inviteCtaHintText, { color: colors.terra }]} numberOfLines={1}>
          {t("tripPublicView.inviteHint")}
        </Text>
      </View>
      <View style={styles.inviteCtaButtons}>
        <TouchableOpacity
          style={[styles.inviteCtaDecline, { backgroundColor: colors.bgMid }]}
          onPress={onDecline}
          disabled={responding}
          activeOpacity={0.85}
        >
          <Ionicons name="close" size={20} color={colors.textMid} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={[styles.inviteCtaDeclineText, { color: colors.textMid }]}>
            {t("tripPublicView.decline")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.inviteCtaAccept, { backgroundColor: colors.terra, shadowColor: colors.terra }]}
          onPress={onAccept}
          disabled={responding}
          activeOpacity={0.85}
        >
          {responding ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
              <Text style={styles.inviteCtaAcceptText}>{t("tripPublicView.accept")}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inviteCta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    shadowColor: "#2A2318",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    gap: 10,
  },
  inviteCtaHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inviteCtaHintText: { fontSize: 13, fontFamily: F.sans500, flex: 1 },
  inviteCtaButtons: { flexDirection: "row", gap: 10 },
  inviteCtaDecline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  inviteCtaDeclineText: { fontSize: 16, fontFamily: F.sans600 },
  inviteCtaAccept: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  inviteCtaAcceptText: { fontSize: 16, fontFamily: F.sans600, color: "#FFFFFF" },
});

export default InvitationCtaBar;
