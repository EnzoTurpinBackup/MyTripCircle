/**
 * Écran de réglages du compte, second niveau de l'onglet Profil.
 *
 * Besoin couvert : rassembler en un seul endroit ce qui conditionne l'usage
 * quotidien — être prévenu ou non, apparaître ou non dans les recherches des
 * autres voyageurs, lire l'application en clair ou en sombre, en français ou en
 * anglais — puis, en bas de page, demander la fermeture du compte.
 *
 * Position dans le parcours : ouvert depuis ProfileScreen, quitté par le bouton
 * de retour. Trois lignes prolongent le parcours dans la pile racine —
 * ConsentManagement pour revenir sur les consentements accordés au premier
 * lancement, Privacy et LegalNotice pour les textes réglementaires. La
 * suppression du compte ne navigue pas : elle vide la session, et c'est
 * AppNavigator qui bascule alors sur la pile d'authentification.
 *
 * Données : AuthContext fournit l'utilisateur affiché, `updateSettings` pour la
 * visibilité du profil et `deleteAccount` pour la clôture ; ThemeContext détient
 * le thème et le fond de carte satellite ainsi que leur persistance ;
 * `changeLanguage` (utils/i18n) enregistre la langue choisie et la transmet au
 * serveur afin que les e-mails suivent. Les trois préférences de notification ne
 * passent par aucun contexte : cet écran les lit et les écrit directement dans
 * AsyncStorage.
 *
 * États pris en charge : ni chargement ni hors-ligne ne sont représentés. Les
 * interrupteurs affichent leur valeur par défaut le temps que le stockage
 * réponde, et le seul échec traité est celui de la visibilité du profil, dont
 * l'interrupteur reprend sa position antérieure. Une session absente donne un
 * profil privé.
 */
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
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Compose la page de réglages.
 *
 * Montée par la pile racine sans paramètre de route : tout son état provient des
 * contextes et du stockage local. Effets de bord notables — lecture des
 * préférences de notification dans AsyncStorage au montage puis écriture à
 * chaque bascule, appels réseau pour la visibilité du profil et pour la langue,
 * et suppression de compte qui ferme la session en cours.
 */
const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, updateSettings, deleteAccount } = useAuth();
  const { t, i18n } = useTranslation();
  const { isDark, colors, toggleTheme, satelliteMap, toggleSatelliteMap } = useTheme();
  const insets = useSafeAreaInsets();

  // Clés de stockage des trois préférences de notification, préfixées comme les
  // autres entrées applicatives d'AsyncStorage. Leur périmètre est strictement
  // local : ni le serveur ni un autre module ne les consulte.
  const NOTIF_KEYS = {
    push: "@mytripcircle_notif_push",
    email: "@mytripcircle_notif_email",
    friends: "@mytripcircle_notif_friends",
  };

  // Les trois préférences démarrent activées : un utilisateur qui n'a jamais
  // ouvert cet écran est réputé accepter d'être prévenu, et cette valeur reste
  // affichée tant que la lecture asynchrone du stockage n'a pas répondu.
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailReminders, setEmailReminders] = useState(true);
  const [friendInvitations, setFriendInvitations] = useState(true);

  // Les trois clés sont relues en un seul lot pour éviter que les bascules ne se
  // repositionnent l'une après l'autre. Une clé absente laisse l'état par défaut
  // intact : seule une valeur déjà enregistrée écrase la position initiale.
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

  // Les trois bascules suivantes appliquent l'état avant d'écrire, sans attendre
  // le stockage : l'interrupteur doit suivre le doigt, et une préférence qui ne
  // quitte pas l'appareil ne justifie pas d'immobiliser l'interface.
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
  // Le repli sur `false` couvre autant un champ absent du profil qu'une session
  // non résolue : en cas de doute sur la visibilité voulue, on n'expose pas le
  // compte aux recherches des autres voyageurs.
  const [publicProfile, setPublicProfile] = useState(Boolean(user?.isPublicProfile));
  // Seule préférence de cet écran qui quitte l'appareil, donc la seule dont
  // l'échec est rattrapé : la bascule est appliquée immédiatement puis annulée si
  // le serveur refuse, car laisser l'interrupteur dans une position que le
  // serveur ignore tromperait l'utilisateur sur sa visibilité réelle.
  const handlePublicProfileToggle = async (value: boolean) => {
    setPublicProfile(value);
    try {
      await updateSettings({ isPublicProfile: value });
    } catch (e) {
      // Le détail de l'erreur reste cantonné aux builds de développement ; en
      // production le retour à la position antérieure est le seul signal donné.
      if (__DEV__) console.warn("[SettingsScreen] Erreur mise à jour profil public:", e);
      setPublicProfile(!value);
    }
  };

  // Le test porte sur le français et non sur l'anglais : i18n s'initialise sur la
  // locale du téléphone, qui peut être une langue non traduite. Tout ce qui n'est
  // pas « fr » est donc affiché comme anglais, conformément à `fallbackLng`.
  const currentLangLabel =
    i18n.language === "fr"
      ? t("settings.languageFr")
      : t("settings.languageEn");

  // Deux langues seulement : une boîte de dialogue native coûte moins qu'un écran
  // de sélection dédié, l'annulation restant en dernière position comme l'attendent
  // les deux plateformes. `changeLanguage` persiste ensuite le choix et le transmet
  // au serveur pour que les e-mails suivent la même langue.
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
            <Toggle value={pushNotifications} onToggle={handlePushToggle} trackColor={colors.terra} accessibilityLabel={t("settings.pushNotifications")} />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>✉️</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.emailReminders")}</Text>
            </View>
            <Toggle value={emailReminders} onToggle={handleEmailToggle} trackColor={colors.terra} accessibilityLabel={t("settings.emailReminders")} />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>👥</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.friendInvitations")}</Text>
            </View>
            <Toggle value={friendInvitations} onToggle={handleFriendsToggle} trackColor={colors.terra} accessibilityLabel={t("settings.friendInvitations")} />
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
            <Toggle value={publicProfile} onToggle={handlePublicProfileToggle} trackColor={colors.terra} accessibilityLabel={t("settings.publicProfile")} />
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
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
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
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
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
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
          </TouchableOpacity>
        </View>

        {/* ── Section: APPEARANCE ── */}
        {/*
          Thème et fond de carte n'ont pas d'état local : ThemeContext détient la
          valeur et la persiste, de sorte que le réglage vaut pour toute
          l'application et survit au redémarrage sans que cet écran s'en occupe.
        */}
        <Text style={[styles.sectionLabel, { color: colors.textLight }]}>{t("settings.sections.appearance")}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>{isDark ? "🌙" : "☀️"}</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.darkMode")}</Text>
            </View>
            <Toggle value={isDark} onToggle={() => toggleTheme()} trackColor={colors.terra} accessibilityLabel={t("settings.darkMode")} />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>🛰️</Text>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t("settings.satelliteMap")}</Text>
            </View>
            <Toggle value={satelliteMap} onToggle={() => toggleSatelliteMap()} trackColor={colors.terra} accessibilityLabel={t("settings.satelliteMap")} />
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
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Delete account ── */}
        {/*
          Action irréversible pour l'utilisateur : isolée en fin de page, portée
          par les couleurs de danger et protégée par une confirmation où le bouton
          destructeur n'arrive qu'en second. Le serveur applique une suppression
          différée, d'où un message de succès annonçant une suppression planifiée
          et non déjà faite ; `deleteAccount` ferme la session dans la foulée, ce
          qui ramène l'application sur la pile d'authentification.
        */}
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
