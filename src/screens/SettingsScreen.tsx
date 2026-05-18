import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../utils/i18n";
import { F } from "../theme/fonts";
import Toggle from "../components/ui/Toggle";
import BackButton from "../components/ui/BackButton";
const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, updateSettings, deleteAccount } = useAuth();
  const { t, i18n } = useTranslation();
  const { isDark, colors, toggleTheme, satelliteMap, toggleSatelliteMap } = useTheme();
  const insets = useSafeAreaInsets();

  const NOTIF_KEYS = {
    push: "@mytripcircle_notif_push",
    email: "@mytripcircle_notif_email",
    friends: "@mytripcircle_notif_friends",
  };

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailReminders, setEmailReminders] = useState(true);
  const [friendInvitations, setFriendInvitations] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(NOTIF_KEYS.push),
      AsyncStorage.getItem(NOTIF_KEYS.email),
      AsyncStorage.getItem(NOTIF_KEYS.friends),
    ]).then(([push, email, friends]) => {
      if (push !== null) setPushNotifications(push === "true");
      if (email !== null) setEmailReminders(email === "true");
      if (friends !== null) setFriendInvitations(friends === "true");
    });
  }, []);

  const handlePushToggle = (value: boolean) => {
    setPushNotifications(value);
    AsyncStorage.setItem(NOTIF_KEYS.push, String(value));
  };

  const handleEmailToggle = (value: boolean) => {
    setEmailReminders(value);
    AsyncStorage.setItem(NOTIF_KEYS.email, String(value));
  };

  const handleFriendsToggle = (value: boolean) => {
    setFriendInvitations(value);
    AsyncStorage.setItem(NOTIF_KEYS.friends, String(value));
  };
  const [publicProfile, setPublicProfile] = useState(Boolean(user?.isPublicProfile));
  const handlePublicProfileToggle = async (value: boolean) => {
    setPublicProfile(value);
    try {
      await updateSettings({ isPublicProfile: value });
    } catch (e) {
      if (__DEV__) console.warn("[SettingsScreen] Erreur mise à jour profil public:", e);
      setPublicProfile(!value);
    }
  };

  const currentLangLabel =
    i18n.language === "fr"
      ? t("settings.languageFr")
      : t("settings.languageEn");

  const handleLanguagePress = () => {
    Alert.alert(t("settings.languageSelectTitle"), t("settings.languageSelectMessage"), [
      {
        text: t("settings.languageFr"),
        onPress: () => changeLanguage("fr"),
      },
      {
        text: t("settings.languageEn"),
        onPress: () => changeLanguage("en"),
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={[styles.headerBar, { backgroundColor: colors.bg }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("settings.title")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section: NOTIFICATIONS ── */}
        <Text style={[styles.sectionLabel, { color: colors.textLight }]}>{t("settings.sections.notifications")}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>🔔</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.pushNotifications")}</Text>
            </View>
            <Toggle value={pushNotifications} onToggle={handlePushToggle} trackColor={colors.terra} />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>✉️</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.emailReminders")}</Text>
            </View>
            <Toggle value={emailReminders} onToggle={handleEmailToggle} trackColor={colors.terra} />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>👥</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.friendInvitations")}</Text>
            </View>
            <Toggle value={friendInvitations} onToggle={handleFriendsToggle} trackColor={colors.terra} />
          </View>
        </View>

        {/* ── Section: PRIVACY ── */}
        <Text style={[styles.sectionLabel, { color: colors.textLight }]}>{t("settings.sections.privacy")}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>🔒</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.publicProfile")}</Text>
            </View>
            <Toggle value={publicProfile} onToggle={handlePublicProfileToggle} trackColor={colors.terra} />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("ConsentManagement")}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>🛡️</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.myConsents")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Privacy")}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>📄</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.privacyPolicy")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("LegalNotice")}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>⚖️</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.legalNotice")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* ── Section: APPEARANCE ── */}
        <Text style={[styles.sectionLabel, { color: colors.textLight }]}>{t("settings.sections.appearance")}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>{isDark ? "🌙" : "☀️"}</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.darkMode")}</Text>
            </View>
            <Toggle value={isDark} onToggle={() => toggleTheme()} trackColor={colors.terra} />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>🛰️</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.satelliteMap")}</Text>
            </View>
            <Toggle value={satelliteMap} onToggle={() => toggleSatelliteMap()} trackColor={colors.terra} />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={handleLanguagePress}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>🌐</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.language")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.textLight }]}>{currentLangLabel}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Delete account ── */}
        <TouchableOpacity
          style={[styles.deleteRow, { backgroundColor: colors.dangerLight, borderColor: isDark ? "#4A2020" : "#F0D0C8" }]}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert(
              t("settings.deleteAccountTitle"),
              t("settings.deleteAccountMessage"),
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("common.delete"),
                  style: "destructive",
                  onPress: async () => {
                    const result = await deleteAccount();
                    if (result.success) {
                      Alert.alert(
                        t("settings.deleteAccountScheduledTitle"),
                        t("settings.deleteAccountScheduledMessage"),
                        [{ text: t("common.ok") }]
                      );
                    } else {
                      Alert.alert(t("common.error"), t("settings.deleteAccountError"));
                    }
                  },
                },
              ]
            )
          }
        >
          <Text style={styles.deleteEmoji}>🗑</Text>
          <Text style={[styles.deleteText, { color: colors.danger }]}>{t("settings.deleteAccount")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {},

  // Header
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: F.sans700,
    fontSize: 20,
    textAlign: "center",
  },

  // Section label
  sectionLabel: {
    fontFamily: F.sans600,
    fontSize: 13,
    letterSpacing: 1.4,
    marginHorizontal: 18,
    marginBottom: 6,
    marginTop: 20,
  },

  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginHorizontal: 18,
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  rowDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowEmoji: {
    fontSize: 26,
  },
  rowTitle: {
    fontFamily: F.sans500,
    fontSize: 19,
  },
  rowValue: {
    fontFamily: F.sans400,
    fontSize: 17,
  },

  // Delete account row
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 18,
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  deleteEmoji: {
    fontSize: 24,
  },
  deleteText: {
    fontFamily: F.sans500,
    fontSize: 18,
  },
});

export default SettingsScreen;
