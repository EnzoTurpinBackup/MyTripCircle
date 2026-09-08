import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { F } from "../../theme/fonts";
import { useTheme } from "../../contexts/ThemeContext";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const NotifEmptyState: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIconBox, { backgroundColor: colors.bgMid }]}>
        <Ionicons name="notifications-off-outline" size={40} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("notifications.allRead")}</Text>
      <Text style={[styles.emptySub, { color: colors.textMid }]}>{t("notifications.allReadMessage")}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { fontSize: 20, fontFamily: F.sans700, marginBottom: 8 },
  emptySub: { fontSize: 15, fontFamily: F.sans400, textAlign: "center", paddingHorizontal: 32, lineHeight: 22 },
});

export default NotifEmptyState;
