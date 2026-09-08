import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { RADIUS } from "../../theme";
import { F } from "../../theme/fonts";
import { useTheme } from "../../contexts/ThemeContext";
import { timeAgo, iconForStatus, titleForInvitation, subtitleForInvitation } from "../../utils/notificationHelpers";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

export interface NotifItemProps {
  invitation: any;
  unread: boolean;
  responding: boolean;
  onPress: () => void;
  onAccept: () => void;
  onDecline: () => void;
}

const NotifItem: React.FC<NotifItemProps> = ({
  invitation, unread, responding, onPress, onAccept, onDecline,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const status   = invitation.status ?? "pending";
  const { emoji, bg } = iconForStatus(status);
  const title    = titleForInvitation(invitation);
  const date     = invitation.createdAt ? timeAgo(invitation.createdAt) : "";
  const subtitle = subtitleForInvitation(invitation, date);

  return (
    <TouchableOpacity
      style={[
        styles.item,
        { backgroundColor: colors.surface, borderColor: colors.border },
        unread ? styles.itemUnread : styles.itemRead,
        status === "pending" && styles.itemPending,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.notifIcon, { backgroundColor: bg }]}>
        <Text style={styles.notifEmoji}>{emoji}</Text>
      </View>

      <View style={styles.itemBody}>
        <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
        <Text style={[styles.notifSub, { color: colors.textLight }]} numberOfLines={1}>{subtitle}</Text>

        {status === "pending" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: colors.terra }]}
              onPress={onAccept}
              disabled={responding}
              activeOpacity={0.8}
            >
              {responding ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={15} color="#FFFFFF" style={{ marginRight: 4 }} {...DECORATIVE_ELEMENT_PROPS} />
                  <Text style={styles.acceptText}>{t("notifications.accept")}</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.declineBtn, { backgroundColor: colors.bgMid }]}
              onPress={onDecline}
              disabled={responding}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={15} color={colors.textMid} style={{ marginRight: 4 }} {...DECORATIVE_ELEMENT_PROPS} />
              <Text style={[styles.declineText, { color: colors.textMid }]}>{t("notifications.decline")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {unread && <View style={[styles.unreadDot, { backgroundColor: colors.terra }]} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderRadius: RADIUS.card,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 10,
    marginHorizontal: 20,
  },
  itemUnread: { borderColor: "rgba(196,113,74,0.3)", borderWidth: 1.5 },
  itemRead: {},
  itemPending: { alignItems: "flex-start" },

  notifIcon: { width: 58, height: 58, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notifEmoji: { fontSize: 26 },

  itemBody: { flex: 1 },
  notifTitle: { fontSize: 17, fontFamily: F.sans600, lineHeight: 23 },
  notifSub: { fontSize: 14, fontFamily: F.sans400, marginTop: 3 },

  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 20 },
  acceptBtn: {},
  declineBtn: {},
  acceptText: { fontSize: 14, fontFamily: F.sans600, color: "#FFFFFF" },
  declineText: { fontSize: 14, fontFamily: F.sans600 },

  unreadDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0, marginTop: 6 },
});

export default NotifItem;
