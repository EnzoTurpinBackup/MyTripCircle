import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FriendSuggestion } from "../../types";
import { F } from "../../theme/fonts";
import { RADIUS } from "../../theme";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface SuggestionsTabProps {
  suggestions: FriendSuggestion[];
  sending: boolean;
  colors: any;
  t: (key: string, opts?: any) => string;
  onSuggestionPress: (friendId: string, friendName: string) => void;
  onAddSuggestion: (suggestion: FriendSuggestion) => void;
}

const SuggestionsTab: React.FC<SuggestionsTabProps> = ({
  suggestions,
  sending,
  colors,
  t,
  onSuggestionPress,
  onAddSuggestion,
}) => {
  const renderSuggestionItem = ({ item }: { item: FriendSuggestion }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.suggLeft}
        onPress={() => onSuggestionPress(item.id, item.name)}
        activeOpacity={0.8}
      >
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name), overflow: "hidden" }]}>
          {item.avatar
            /* Décorative : le nom de la suggestion est lu juste à côté. */
            ? <Image source={{ uri: item.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} {...DECORATIVE_ELEMENT_PROPS} />
            : <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          }
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.cardSub, { color: colors.textLight }]}>
            {t("friends.commonFriend", { count: item.commonFriends })}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: colors.terra }]}
        onPress={() => onAddSuggestion(item)}
        disabled={sending}
        activeOpacity={0.8}
      >
        <Text style={styles.addBtnText}>{t("friends.addButton")}</Text>
      </TouchableOpacity>
    </View>
  );

  if (suggestions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIconWrap, { backgroundColor: colors.terraLight }]}>
          <Ionicons name="person-add-outline" size={40} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("friends.noSuggestions")}</Text>
        <Text style={[styles.emptyText, { color: colors.textMid }]}>{t("friends.noSuggestionsDesc")}</Text>
      </View>
    );
  }

  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textLight }]}>{t("friends.youMightKnow")}</Text>
      <FlatList data={suggestions} renderItem={renderSuggestionItem} keyExtractor={(item) => item.id} scrollEnabled={false} />
    </>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: RADIUS.card, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, marginHorizontal: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarText: { fontSize: 17, fontFamily: F.sans600, color: "#FFFFFF" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 17, fontFamily: F.sans600 },
  cardSub: { fontSize: 14, fontFamily: F.sans400, marginTop: 2 },
  suggLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  addBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { fontSize: 14, fontFamily: F.sans600, color: "#FFFFFF" },
  sectionLabel: { fontSize: 13, fontFamily: F.sans600, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10, marginTop: 4, marginHorizontal: 20 },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 19, fontFamily: F.sans600, marginBottom: 6 },
  emptyText: { fontSize: 15, fontFamily: F.sans400, textAlign: "center", paddingHorizontal: 32 },
});

export default SuggestionsTab;
