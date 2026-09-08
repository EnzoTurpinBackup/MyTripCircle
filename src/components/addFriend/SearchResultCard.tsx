import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { getInitials, getAvatarColor } from "../../utils/avatarUtils";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";
import { F } from "../../theme/fonts";

const MOSS = "#6B8C5A";
const MOSS_LIGHT = "#E2EDD9";

interface SearchResult {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  relation?: string;
  stats: { totalTrips: number; countries: number; commonFriends: number };
}

interface Props {
  result: SearchResult;
  sending: boolean;
  onSend: () => void;
  onViewProfile: () => void;
}

const SearchResultCard: React.FC<Props> = ({ result: r, sending, onSend, onViewProfile }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const initials = getInitials(r.name);
  const avatarColor = getAvatarColor(r.name);
  const isAlreadyFriend = r.relation === "friend";
  const isPendingSent = r.relation === "pending_sent";
  const isPendingReceived = r.relation === "pending_received";

  let actionEl: React.ReactNode;
  if (isAlreadyFriend) {
    actionEl = (
      <View style={[styles.alreadyPill, { backgroundColor: MOSS_LIGHT }]}>
        <Ionicons name="checkmark-circle" size={17} color={MOSS} {...DECORATIVE_ELEMENT_PROPS} />
        <Text style={[styles.alreadyText, { color: MOSS }]}>{t("addFriend.alreadyFriend")}</Text>
      </View>
    );
  } else if (isPendingSent) {
    actionEl = (
      <View style={[styles.actionBtn, { backgroundColor: colors.bgMid }]}>
        <Ionicons name="hourglass-outline" size={17} color={colors.textMid} {...DECORATIVE_ELEMENT_PROPS} />
        <Text style={[styles.actionBtnText, { color: colors.textMid }]}>{t("addFriend.requestSent")}</Text>
      </View>
    );
  } else {
    actionEl = (
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: colors.terra, shadowColor: colors.terra }, sending && { opacity: 0.6 }]}
        onPress={onSend}
        disabled={sending}
        activeOpacity={0.85}
      >
        {sending ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Ionicons
            name={isPendingReceived ? "checkmark" : "person-add-outline"}
            size={17}
            color={colors.white}
            {...DECORATIVE_ELEMENT_PROPS}
          />
        )}
        <Text style={styles.actionBtnText}>
          {isPendingReceived ? t("addFriend.acceptRequest") : t("addFriend.sendRequest")}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textLight }]}>
        {t("addFriend.sectionResult")}
      </Text>
      <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: "rgba(196,113,74,0.4)" }]}>
        <View style={styles.resultRow}>
          <View style={[styles.avatar, { backgroundColor: avatarColor, overflow: "hidden" }]}>
            {r.avatar ? (
              /* Décorative : le nom et l'e-mail du profil trouvé sont lus juste à côté. */
              <Image source={{ uri: r.avatar }} style={{ width: 52, height: 52, borderRadius: 26 }} {...DECORATIVE_ELEMENT_PROPS} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.resultName, { color: colors.text }]}>{r.name}</Text>
            <Text style={[styles.resultEmail, { color: colors.textLight }]}>{r.email}</Text>
          </View>
          <TouchableOpacity onPress={onViewProfile}>
            <Text style={[styles.seeProfileLink, { color: colors.terra }]}>{t("addFriend.viewProfile")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.bgMid }]}>
            <Text style={[styles.statValue, { color: colors.terra }]}>{r.stats.totalTrips}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>{t("addFriend.statTrips")}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.bgMid }]}>
            <Text style={[styles.statValue, { color: colors.terra }]}>{r.stats.countries}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>{t("addFriend.statCountries")}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.bgMid }]}>
            <Text style={[styles.statValue, { color: colors.terra }]}>{r.stats.commonFriends}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>{t("addFriend.statCommonFriends")}</Text>
          </View>
        </View>

        {actionEl}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontFamily: F.sans600,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  resultCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 17, fontFamily: F.sans700, color: "#FFFFFF" },
  resultName: { fontSize: 17, fontFamily: F.sans600 },
  resultEmail: { fontSize: 13, fontFamily: F.sans400, marginTop: 2 },
  seeProfileLink: { fontSize: 14, fontFamily: F.sans600 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statBox: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  statValue: { fontSize: 20, fontFamily: F.sans700 },
  statLabel: { fontSize: 11, fontFamily: F.sans400, marginTop: 2 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnText: { fontSize: 16, fontFamily: F.sans600, color: "#FFFFFF" },
  alreadyPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
  },
  alreadyText: { fontSize: 15, fontFamily: F.sans600 },
});

export default SearchResultCard;
