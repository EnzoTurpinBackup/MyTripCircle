import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { FriendSuggestion } from "../../types";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";
import { F } from "../../theme/fonts";

interface Props {
  item: FriendSuggestion;
  sending: boolean;
  onSend: (email?: string, phone?: undefined, name?: string) => void;
  onViewProfile: (id: string, name: string) => void;
}

const SuggestionCard: React.FC<Props> = ({ item, sending, onSend, onViewProfile }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.suggCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        onPress={() => onViewProfile(item.id, item.name)}
        activeOpacity={0.8}
        style={styles.suggAvatarWrap}
      >
        <View style={[styles.suggAvatar, { backgroundColor: getAvatarColor(item.name), overflow: "hidden" }]}>
          {item.avatar ? (
            /* Décorative : le nom de la suggestion est lu juste à côté. */
            <Image source={{ uri: item.avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} {...DECORATIVE_ELEMENT_PROPS} />
          ) : (
            <Text style={styles.suggAvatarText}>{getInitials(item.name)}</Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => onViewProfile(item.id, item.name)}
        activeOpacity={0.8}
      >
        <Text style={[styles.suggName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.suggSub, { color: colors.textLight }]}>
          {t("addFriend.commonFriend", { count: item.commonFriends })}
        </Text>
        <Text style={[styles.suggViewProfile, { color: colors.terra }]}>{t("addFriend.viewProfile")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.addSuggBtn, { backgroundColor: colors.terra }]}
        onPress={() => onSend(item.email, undefined, item.name)}
        disabled={sending}
        activeOpacity={0.8}
      >
        <Text style={styles.addSuggBtnText}>{t("addFriend.addSuggestion")}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  suggCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  suggAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  suggAvatarText: { fontSize: 14, fontFamily: F.sans600, color: "#FFFFFF" },
  suggAvatarWrap: { flexShrink: 0 },
  suggName: { fontSize: 15, fontFamily: F.sans600 },
  suggSub: { fontSize: 12, fontFamily: F.sans400, marginTop: 2 },
  suggViewProfile: { fontSize: 12, fontFamily: F.sans500, marginTop: 4 },
  addSuggBtn: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addSuggBtnText: { fontSize: 13, fontFamily: F.sans600, color: "#FFFFFF" },
});

export default SuggestionCard;
