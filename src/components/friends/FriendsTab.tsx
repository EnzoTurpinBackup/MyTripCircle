import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Friend } from "../../types";
import { F } from "../../theme/fonts";
import { RADIUS, SHADOW } from "../../theme";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface FriendsTabProps {
  friends: Friend[];
  sharingLink: boolean;
  searchQuery: string;
  colors: any;
  t: (key: string, opts?: any) => string;
  onShareInviteLink: () => void;
  onSearchChange: (query: string) => void;
  onFriendPress: (friendId: string, friendName: string) => void;
  onFriendLongPress: (friend: Friend) => void;
}

const FriendsTab: React.FC<FriendsTabProps> = ({
  friends,
  sharingLink,
  searchQuery,
  colors,
  t,
  onShareInviteLink,
  onSearchChange,
  onFriendPress,
  onFriendLongPress,
}) => {
  const renderFriendItem = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onFriendPress(item.friendId, item.name)}
      onLongPress={() => onFriendLongPress(item)}
      activeOpacity={0.85}
    >
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
        {item.avatar ? (
          /* Décorative : le nom de l'ami est lu juste à côté. */
          <Image source={{ uri: item.avatar }} style={styles.avatarPhoto} {...DECORATIVE_ELEMENT_PROPS} />
        ) : (
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.cardSub, { color: colors.textLight }]}>
          {(item as any).commonTrips
            ? t("friends.commonTrips", { count: (item as any).commonTrips })
            : item.email || item.phone || t("friends.tabs.friends", { count: 1 }).replace(/ \(.*\)/, "")}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.inviteBanner, { backgroundColor: colors.terraLight }]}
        onPress={onShareInviteLink}
        disabled={sharingLink}
        activeOpacity={0.85}
      >
        <View style={[styles.inviteBannerIcon, { backgroundColor: colors.surface }]}>
          <Ionicons name="link-outline" size={20} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
        </View>
        <View style={styles.inviteBannerText}>
          <Text style={[styles.inviteBannerTitle, { color: colors.terraDark }]}>{t("friends.shareInviteLink")}</Text>
          <Text style={[styles.inviteBannerSub, { color: colors.textMid }]}>
            {sharingLink ? t("friends.generatingLink") : t("friends.shareInviteDescription")}
          </Text>
        </View>
        <Ionicons name="share-outline" size={20} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
      </TouchableOpacity>

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t("friends.searchPlaceholder")}
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCorrect={false}
        />
      </View>

      {friends.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.terraLight }]}>
            <Ionicons name="people-outline" size={40} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("friends.emptyFriends")}</Text>
          <Text style={[styles.emptyText, { color: colors.textMid }]}>{t("friends.emptyFriendsSubtitle")}</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  inviteBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(196,113,74,0.25)", borderRadius: RADIUS.card, paddingVertical: 13, paddingHorizontal: 14, marginHorizontal: 20, marginBottom: 14 },
  inviteBannerIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  inviteBannerText: { flex: 1 },
  inviteBannerTitle: { fontSize: 14, fontFamily: F.sans600, marginBottom: 2 },
  inviteBannerSub: { fontSize: 12, fontFamily: F.sans400 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, marginBottom: 14, borderWidth: 1, borderRadius: 28, paddingHorizontal: 16, paddingVertical: 12, ...SHADOW.light },
  searchInput: { flex: 1, fontSize: 17, fontFamily: F.sans400, padding: 0, margin: 0 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: RADIUS.card, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, marginHorizontal: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: "hidden", justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarPhoto: { width: 48, height: 48, borderRadius: 24 },
  avatarText: { fontSize: 17, fontFamily: F.sans600, color: "#FFFFFF" },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 17, fontFamily: F.sans600 },
  cardSub: { fontSize: 14, fontFamily: F.sans400, marginTop: 2 },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 19, fontFamily: F.sans600, marginBottom: 6 },
  emptyText: { fontSize: 15, fontFamily: F.sans400, textAlign: "center", paddingHorizontal: 32 },
});

export default FriendsTab;
