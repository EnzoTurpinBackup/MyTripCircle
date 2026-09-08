import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";
import { CollabInfo } from "../../hooks/useInviteFriends";
import { F } from "../../theme/fonts";

interface Props {
  member: CollabInfo;
  isOwner: boolean;
  onPress: (m: CollabInfo) => void;
}

export const AvatarBubble: React.FC<{
  name: string;
  size?: number;
  ownerBorder?: boolean;
  avatar?: string | null;
}> = ({ name, size = 58, ownerBorder = false, avatar }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        s.avatar,
        { width: size, height: size, backgroundColor: getAvatarColor(name) },
        ownerBorder && { borderWidth: 2, borderColor: colors.terraLight },
      ]}
    >
      {avatar ? (
        /* Décorative : le nom du membre est lu juste à côté de sa bulle. */
        <Image
          source={{ uri: avatar }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          {...DECORATIVE_ELEMENT_PROPS}
        />
      ) : (
        <Text style={[s.avatarTxt, { fontSize: size * 0.35 }]}>{getInitials(name)}</Text>
      )}
    </View>
  );
};

const MemberRow: React.FC<Props> = ({ member, isOwner, onPress }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();

  const isMe = member.userId === user?.id;
  const canTap = !isMe && !member.isOwner && isOwner;

  let roleText: string;
  if (member.isOwner) {
    roleText = isMe ? t("inviteFriends.roleOrganizerSelf") : t("inviteFriends.roleOrganizer");
  } else {
    roleText = t("inviteFriends.roleParticipant");
  }

  let trailingEl: React.ReactNode = null;
  if (isMe) {
    trailingEl = <View style={[s.meTag, { backgroundColor: colors.terraLight }]}><Text style={[s.meTagTxt, { color: colors.terra }]}>{t("inviteFriends.meLabel")}</Text></View>;
  } else if (canTap) {
    trailingEl = <Text style={[s.rowChevron, { color: colors.border }]}>›</Text>;
  }

  const inner = (
    <>
      <AvatarBubble name={member.name} size={58} ownerBorder={member.isOwner} avatar={member.avatar} />
      <View style={{ flex: 1 }}>
        <Text style={[s.mn, { color: colors.text }]}>{member.name}</Text>
        <Text style={[s.ms, { color: colors.textLight }]}>{roleText}</Text>
      </View>
      {trailingEl}
    </>
  );

  if (canTap) {
    return (
      <TouchableOpacity
        style={[s.mc, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => onPress(member)}
        activeOpacity={0.75}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[s.mc, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {inner}
    </View>
  );
};

const s = StyleSheet.create({
  mc: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 14,
    minHeight: 98,
  },
  avatar: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarTxt: { fontFamily: F.sans600, color: "#FFFFFF" },
  mn: { fontFamily: F.sans600, fontSize: 18 },
  ms: { fontFamily: F.sans400, fontSize: 14, marginTop: 4 },
  meTag: {
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  meTagTxt: { fontFamily: F.sans600, fontSize: 13 },
  rowChevron: { fontSize: 22, fontFamily: F.sans300, marginLeft: 4 },
});

export default MemberRow;
