import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { TabKey } from "../../utils/invitationUtils";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const EMPTY_ICONS: Record<TabKey, string> = {
  all:     "mail-unread-outline",
  pending: "time-outline",
  sent:    "paper-plane-outline",
};

interface EmptyStateProps {
  tab: TabKey;
}

const TITLE_KEYS: Record<TabKey, string> = {
  all:     "invitation.emptyAllTitle",
  pending: "invitation.emptyPendingTitle",
  sent:    "invitation.emptySentTitle",
};
const SUB_KEYS: Record<TabKey, string> = {
  all:     "invitation.emptyAllSub",
  pending: "invitation.emptyPendingSub",
  sent:    "invitation.emptySentSub",
};

const EmptyState: React.FC<EmptyStateProps> = ({ tab }) => {
  const { t }      = useTranslation();
  const { colors } = useTheme();

  const icon  = EMPTY_ICONS[tab];
  const title = t(TITLE_KEYS[tab]);
  const sub   = t(SUB_KEYS[tab]);

  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyCircle, { backgroundColor: colors.bgMid }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={46} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: colors.textMid }]}>{sub}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyWrap:   { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle:  { fontSize: 20, fontFamily: F.sans600, marginBottom: 10 },
  emptySub:    { fontSize: 15, fontFamily: F.sans400, textAlign: "center", paddingHorizontal: 32, lineHeight: 22 },
});

export default EmptyState;
