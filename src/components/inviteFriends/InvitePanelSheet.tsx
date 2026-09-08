import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { User } from "../../types";
import { AvatarBubble } from "./MemberRow";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface Props {
  inviteAnim: Animated.Value;
  inviteBackdrop: Animated.Value;
  inviteY: Animated.AnimatedInterpolation<number>;
  friendsToInvite: User[];
  alreadyMembers: User[];
  invitedFriends: string[];
  emailInput: string;
  sendingInvitations: boolean;
  inviteCount: number;
  onClose: () => void;
  onToggleFriend: (id: string) => void;
  onChangeEmail: (v: string) => void;
  onSend: () => void;
}

const InvitePanelSheet: React.FC<Props> = ({
  inviteAnim,
  inviteBackdrop,
  inviteY,
  friendsToInvite,
  alreadyMembers,
  invitedFriends,
  emailInput,
  sendingInvitations,
  inviteCount,
  onClose,
  onToggleFriend,
  onChangeEmail,
  onSend,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  let sendBtnText: string;
  if (sendingInvitations) {
    sendBtnText = t("inviteFriends.sendInviteLoading");
  } else if (inviteCount > 0) {
    sendBtnText = t("inviteFriends.sendInviteCount", { count: inviteCount });
  } else {
    sendBtnText = t("inviteFriends.sendInviteBtn");
  }

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[StyleSheet.absoluteFill, s.backdrop, { opacity: inviteBackdrop }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
      >
        <Animated.View
          style={[
            s.inviteSheet,
            { backgroundColor: colors.bgLight, transform: [{ translateY: inviteY }] },
          ]}
        >
          <View style={[s.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[s.inviteSheetTitle, { color: colors.text }]}>
            {t("inviteFriends.inviteSheetTitle")}
          </Text>

          <View style={s.emailRow}>
            <View
              style={[
                s.emailInput,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="mail-outline" size={18} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
              <TextInput
                style={[s.emailInputTxt, { color: colors.text }]}
                placeholder={t("inviteFriends.emailPlaceholder")}
                placeholderTextColor={colors.textLight}
                value={emailInput}
                onChangeText={onChangeEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {friendsToInvite.length > 0 && (
            <>
              <Text style={[s.sec, { marginBottom: 6, color: colors.textMid }]}>
                {t("inviteFriends.friendsNotMembers")}
              </Text>
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                {friendsToInvite.map((f) => {
                  const selected = invitedFriends.includes(f.id);
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[
                        s.mc,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        selected && s.mcSelected,
                      ]}
                      onPress={() => onToggleFriend(f.id)}
                    >
                      <AvatarBubble name={f.name} size={46} avatar={f.avatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.mn, { color: colors.text }]}>{f.name}</Text>
                        <Text style={[s.ms, { color: colors.textLight }]}>{f.email || ""}</Text>
                      </View>
                      <View
                        style={[
                          s.checkbox,
                          { borderColor: colors.border },
                          selected && [s.checkboxSelected, { backgroundColor: colors.terra, borderColor: colors.terra }],
                        ]}
                      >
                        {selected && <Ionicons name="checkmark" size={15} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {alreadyMembers.length > 0 && (
            <>
              <Text style={[s.sec, { marginTop: 8, marginBottom: 6, color: colors.textMid }]}>
                {t("inviteFriends.alreadyInTrip")}
              </Text>
              {alreadyMembers.map((f) => (
                <View
                  key={f.id}
                  style={[
                    s.mc,
                    { backgroundColor: colors.surface, borderColor: colors.border, opacity: 0.55 },
                  ]}
                >
                  <AvatarBubble name={f.name} size={46} avatar={f.avatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.mn, { color: colors.text }]}>{f.name}</Text>
                    <Text style={[s.ms, { color: colors.textLight }]}>
                      {t("inviteFriends.alreadyMemberLabel")}
                    </Text>
                  </View>
                  <View style={s.alreadyMemberTag}>
                    <Text style={s.alreadyMemberTxt}>
                      {t("inviteFriends.alreadyMemberTag")}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: colors.terra, shadowColor: colors.terra }, (sendingInvitations || inviteCount === 0) && [s.sendBtnDisabled, { backgroundColor: colors.border }]]}
            onPress={onSend}
            disabled={sendingInvitations || inviteCount === 0}
          >
            <Text style={s.sendBtnTxt}>{sendBtnText}</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(42,35,24,0.45)" },
  inviteSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    shadowColor: "#2A2318",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 20,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 20,
  },
  inviteSheetTitle: {
    fontFamily: F.sans700,
    fontSize: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  emailRow: { marginBottom: 14 },
  emailInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emailInputTxt: {
    flex: 1,
    fontFamily: F.sans400,
    fontSize: 15,
    paddingVertical: 0,
  },
  sec: {
    fontFamily: F.sans700,
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingTop: 10,
    paddingBottom: 10,
  },
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
  mcSelected: { borderWidth: 2, borderColor: "rgba(196,113,74,0.45)" },
  mn: { fontFamily: F.sans600, fontSize: 18 },
  ms: { fontFamily: F.sans400, fontSize: 14, marginTop: 4 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {},
  alreadyMemberTag: {
    backgroundColor: "#E2EDD9",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  alreadyMemberTxt: { fontFamily: F.sans500, fontSize: 12, color: "#6B8C5A" },
  sendBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  sendBtnDisabled: { shadowOpacity: 0 },
  sendBtnTxt: { fontFamily: F.sans600, fontSize: 16, color: "#FFFFFF" },
});

export default InvitePanelSheet;
