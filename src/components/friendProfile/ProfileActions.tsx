import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface ProfileActionsProps {
  isFriend: boolean;
  sending: boolean;
  dangerBg: string;
  dangerColor: string;
  onInvite: () => void;
  onRemove: () => void;
  onAddFriend: () => void;
  onReport: () => void;
  onBlock: () => void;
}

const ProfileActions: React.FC<ProfileActionsProps> = ({
  isFriend, sending, dangerBg, dangerColor,
  onInvite, onRemove, onAddFriend, onReport, onBlock,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.actions}>
      {isFriend ? (
        <>
          <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: colors.terra, shadowColor: colors.terra }]} activeOpacity={0.85} onPress={onInvite}>
            <Ionicons name="airplane" size={16} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={styles.inviteBtnText}>{t("friendProfile.inviteToTrip")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.bgMid }]}
            onPress={onReport}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("friendProfile.reportUser")}
          >
            <Ionicons name="flag-outline" size={18} color={colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: dangerBg }]}
            onPress={onRemove}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("friendProfile.removeTitle")}
          >
            <Ionicons name="trash-outline" size={18} color={dangerColor} />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.inviteBtn, { backgroundColor: colors.terra, shadowColor: colors.terra }, sending && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={onAddFriend}
            disabled={sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Ionicons name="person-add" size={16} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
            }
            <Text style={styles.inviteBtnText}>{t("friendProfile.addFriend")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.bgMid }]}
            onPress={onReport}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("friendProfile.reportUser")}
          >
            <Ionicons name="flag-outline" size={18} color={colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: dangerBg }]}
            onPress={onBlock}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("friendProfile.blockUser")}
          >
            <Ionicons name="ban-outline" size={18} color={dangerColor} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 18,
  },
  inviteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  inviteBtnText: { fontSize: 14, fontFamily: F.sans600, color: "#FFFFFF" },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ProfileActions;
