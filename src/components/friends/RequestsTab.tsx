import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FriendRequest } from "../../types";
import { F } from "../../theme/fonts";
import { RADIUS } from "../../theme";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils";
import i18n from "../../utils/i18n";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const timeAgo = (date: Date | string): string => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return i18n.t("friends.timeAgo.justNow");
  return i18n.t("friends.timeAgo.minutes", { count: mins });
};

interface RequestsTabProps {
  receivedRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  colors: any;
  t: (key: string, opts?: any) => string;
  onRespond: (requestId: string, action: "accept" | "decline") => void;
  onCancel: (request: FriendRequest) => void;
}

const RequestsTab: React.FC<RequestsTabProps> = ({
  receivedRequests,
  sentRequests,
  colors,
  t,
  onRespond,
  onCancel,
}) => {
  const renderReceivedItem = ({ item }: { item: FriendRequest }) => (
    <View style={[styles.card, styles.receivedCard, { backgroundColor: colors.surface, borderColor: `${colors.terra}4D` }]}>
      <View style={styles.receivedTop}>
        <View style={[styles.receivedAvatar, { backgroundColor: getAvatarColor(item.senderName || "?") }]}>
          <Text style={styles.receivedAvatarText}>{getInitials(item.senderName || "?")}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.receivedName, { color: colors.text }]}>{item.senderName}</Text>
          <Text style={[styles.receivedSub, { color: colors.textMid }]}>
            {[
              t("friends.receivedTime", { time: timeAgo(item.createdAt) }),
              item.commonFriends ? t("friends.commonFriend", { count: item.commonFriends }) : null,
            ].filter(Boolean).join(" · ")}
          </Text>
        </View>
      </View>
      <View style={styles.receivedActions}>
        <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: colors.terra }]} onPress={() => onRespond(item.id, "accept")} activeOpacity={0.8}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={styles.acceptBtnText}>{t("friends.accept")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.declineBtn, { backgroundColor: colors.bgMid }]} onPress={() => onRespond(item.id, "decline")} activeOpacity={0.7}>
          <Ionicons name="close" size={16} color={colors.textMid} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={[styles.declineBtnText, { color: colors.textMid }]}>{t("friends.decline")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentItem = ({ item }: { item: FriendRequest }) => {
    const displayName = item.recipientName || item.recipientEmail || item.recipientPhone || t("common.unknown");
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(displayName) }]}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.cardSub, { color: colors.textLight }]}>{t("friends.requestSent")}</Text>
        </View>
        <View style={[styles.pendingPill, { backgroundColor: colors.bgMid }]}>
          <Text style={[styles.pendingPillText, { color: colors.textMid }]}>{t("friends.requestPending")}</Text>
        </View>
        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: colors.dangerLight }]}
          onPress={() => onCancel(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("friends.cancelRequest")}
        >
          <Ionicons name="close" size={14} color={colors.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textLight }]}>{t("friends.receivedSection", { count: receivedRequests.length })}</Text>
      {receivedRequests.length === 0 ? (
        <View style={[styles.emptyState, { paddingVertical: 20 }]}>
          <Text style={[styles.emptyText, { color: colors.textMid }]}>{t("friends.noRequestsReceived")}</Text>
        </View>
      ) : (
        <FlatList data={receivedRequests} renderItem={renderReceivedItem} keyExtractor={(item) => item.id} scrollEnabled={false} contentContainerStyle={{ marginBottom: 14 }} />
      )}

      <Text style={[styles.sectionLabel, { color: colors.textLight }]}>{t("friends.sentSection", { count: sentRequests.length })}</Text>
      {sentRequests.length === 0 ? (
        <View style={[styles.emptyState, { paddingVertical: 20 }]}>
          <Text style={[styles.emptyText, { color: colors.textMid }]}>{t("friends.noRequestsSent")}</Text>
        </View>
      ) : (
        <FlatList data={sentRequests} renderItem={renderSentItem} keyExtractor={(item) => item.id} scrollEnabled={false} />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: RADIUS.card, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, marginHorizontal: 20 },
  receivedCard: { flexDirection: "column", gap: 0, borderWidth: 1.5, paddingVertical: 16, paddingHorizontal: 16 },
  receivedTop: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  receivedActions: { flexDirection: "row", gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: "hidden", justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarText: { fontSize: 17, fontFamily: F.sans600, color: "#FFFFFF" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 17, fontFamily: F.sans600 },
  cardSub: { fontSize: 14, fontFamily: F.sans400, marginTop: 2 },
  receivedAvatar: { width: 58, height: 58, borderRadius: 29, overflow: "hidden", justifyContent: "center", alignItems: "center", flexShrink: 0 },
  receivedAvatarText: { fontSize: 20, fontFamily: F.sans600, color: "#FFFFFF" },
  receivedName: { fontSize: 19, fontFamily: F.sans700 },
  receivedSub: { fontSize: 15, fontFamily: F.sans400, marginTop: 3 },
  acceptBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: RADIUS.button, paddingVertical: 13 },
  acceptBtnText: { fontSize: 17, fontFamily: F.sans600, color: "#FFFFFF" },
  declineBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: RADIUS.button, paddingVertical: 13 },
  declineBtnText: { fontSize: 17, fontFamily: F.sans600 },
  pendingPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  pendingPillText: { fontSize: 14, fontFamily: F.sans600 },
  cancelBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  sectionLabel: { fontSize: 13, fontFamily: F.sans600, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10, marginTop: 4, marginHorizontal: 20 },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 15, fontFamily: F.sans400, textAlign: "center", paddingHorizontal: 32 },
});

export default RequestsTab;
