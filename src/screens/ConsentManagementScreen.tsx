/**
 * Écran de révision des consentements, une fois l'application en usage.
 *
 * Besoin couvert : revenir sur un accord donné au premier lancement, l'accord devant
 * rester aussi facile à retirer qu'il a été facile à donner. C'est le pendant durable
 * de ConsentScreen : celui-ci est bloquant et ne se présente qu'une fois, celui-là est
 * consultable à volonté et n'interrompt rien.
 *
 * Position dans le parcours : atteint depuis SettingsScreen, dans MainStack, donc
 * uniquement lorsqu'une session est ouverte. L'enregistrement ramène à l'écran
 * précédent ; le lien de bas de page ouvre Privacy.
 *
 * Données : les choix courants sont relus dans AsyncStorage sous `CONSENT_KEY`, la
 * clé qu'expose ConsentScreen et que se partagent les deux écrans. L'enregistrement
 * réécrit cette même entrée puis transmet les préférences au compte via
 * `userApi.updateConsent`, ce que ConsentScreen ne pouvait pas faire faute de session.
 * Le consentement au traitement des données est réaffirmé sans être présenté comme
 * modifiable : le retirer reviendrait à demander la suppression du compte, qui relève
 * d'un autre écran.
 *
 * États pris en charge : lecture du stockage (indicateur d'activité à la place de la
 * carte), enregistrement en cours (le bouton porte un indicateur et se neutralise),
 * permission de position refusée par le système (l'interrupteur est ramené en arrière
 * et un renvoi vers les réglages est proposé), échec de l'enregistrement (boîte de
 * dialogue, les interrupteurs conservant l'état saisi).
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";
import Toggle from "../components/ui/Toggle";
import { userApi, ConsentPayload } from "../services/api/userApi";
import { CONSENT_KEY, ConsentPreferences } from "./ConsentScreen";
import BackButton from "../components/ui/BackButton";
import { requestPermissionAndRegisterToken } from "../hooks/usePushNotifications";
import logger from "../lib/logger";

/**
 * Compose l'écran de gestion des consentements.
 *
 * Aucune prop n'est reçue : l'écran est empilé sans paramètre depuis les réglages et
 * reconstitue son état à partir du stockage local.
 *
 * Effets de bord : lecture d'AsyncStorage au montage, demande de permission de
 * position au système lors de l'enregistrement, réécriture d'AsyncStorage et appel à
 * `userApi.updateConsent` pour porter les préférences au compte.
 */
const ConsentManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Les interrupteurs partent fermés et ne s'ouvrent qu'au vu du stockage : afficher un
  // consentement actif avant de l'avoir relu donnerait, le temps d'un rendu, une image
  // fausse de ce à quoi l'utilisateur a consenti.
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY)
      .then((raw) => {
        // L'entrée est en principe toujours présente, AppNavigator refusant de monter
        // cette pile sans elle ; son absence est néanmoins tolérée et laisse les deux
        // usages facultatifs à l'arrêt, qui est l'état le moins engageant.
        if (raw) {
          const prefs: ConsentPreferences = JSON.parse(raw);
          setLocationEnabled(prefs.location);
          setNotificationsEnabled(prefs.notifications);
        }
      })
      // Une lecture en échec ou une entrée corrompue laisse les deux usages à l'arrêt
      // plutôt que de figer l'écran en chargement : le bouton d'enregistrement étant
      // conditionné au chargement, l'utilisateur perdrait tout moyen de modifier ses
      // consentements (défaut D-04).
      .catch((error) => {
        logger.warn("[ConsentManagementScreen] lecture des consentements impossible", error);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // La permission système est sollicitée avant l'enregistrement : consentir dans
      // l'application ne donne pas accès à la position, et retenir un accord que le
      // système refuse produirait un réglage affiché comme actif mais inopérant.
      if (locationEnabled) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          // L'interrupteur est ramené en arrière et l'enregistrement abandonné : la
          // permission ayant pu être refusée définitivement, seul un passage par les
          // réglages du système peut désormais la rétablir, d'où le raccourci proposé.
          setLocationEnabled(false);
          Alert.alert(
            t("consentManagement.locationDeniedTitle"),
            t("consentManagement.locationDeniedMessage"),
            [
              { text: t("common.cancel"), style: "cancel" },
              { text: t("consentManagement.openSettings"), onPress: () => Linking.openSettings() },
            ]
          );
          setSaving(false);
          return;
        }
      }

      // `acceptedAt` est redaté à chaque enregistrement : c'est la dernière expression
      // de volonté qui fait foi, et non le premier accord donné à l'installation.
      const prefs: ConsentPreferences = {
        data: true,
        location: locationEnabled,
        notifications: notificationsEnabled,
        acceptedAt: new Date().toISOString(),
      };

      // Le stockage local est écrit avant l'appel au serveur car c'est lui que consultent
      // AppNavigator et cet écran : la copie serveur sert de trace opposable, non de
      // source de vérité pour le fonctionnement de l'application.
      await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));

      const payload: ConsentPayload = {
        data: true,
        location: locationEnabled,
        notifications: notificationsEnabled,
      };
      await userApi.updateConsent(payload);

      // Consentir aux notifications depuis les réglages doit produire le même effet
      // qu'à l'accueil : demander la permission système et enregistrer le jeton push.
      // Sans cela, un utilisateur ayant refusé à l'accueil n'obtenait rien en changeant
      // d'avis ici (défaut D-06). L'appel est sans effet si le jeton est déjà connu.
      if (notificationsEnabled) {
        await requestPermissionAndRegisterToken();
      }

      // Le retour n'a lieu qu'après acquittement : un changement de consentement mérite
      // une confirmation lue, et non un écran qui se referme de lui-même.
      Alert.alert(
        t("consentManagement.savedTitle"),
        t("consentManagement.savedMessage"),
        [{ text: t("common.ok"), onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      if (__DEV__) console.warn("[ConsentManagementScreen] Erreur sauvegarde consentements:", e);
      Alert.alert(t("common.error"), t("consentManagement.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("consentManagement.title")}
        </Text>
        {/* Cale de la largeur du bouton de retour : elle équilibre la rangée pour que le
            titre tombe au centre de l'écran, et non au centre de l'espace restant. */}
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.description, { color: colors.textLight }]}>
          {t("consentManagement.description")}
        </Text>

        {loading ? (
          <ActivityIndicator
            color={colors.terra}
            style={styles.loader}
          />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Données — obligatoire, non modifiable */}
            {/* La ligne obligatoire figure malgré l'absence de choix : l'utilisateur doit
                pouvoir vérifier ce à quoi il reste engagé, et l'interrupteur inerte le
                montre au même titre que les autres plutôt que de le passer sous silence. */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowEmoji}>🔐</Text>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>
                    {t("consent.dataTitle")}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textLight }]}>
                    {t("consentManagement.required")}
                  </Text>
                </View>
              </View>
              <View style={[styles.toggle, { backgroundColor: colors.terra }]}>
                <View style={[styles.toggleThumb, { transform: [{ translateX: 20 }] }]} />
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

            {/* Localisation */}
            {/* Les intitulés et descriptions reprennent les clés de traduction du mur de
                consentement initial : l'utilisateur doit retrouver mot pour mot ce à quoi
                il a consenti, une reformulation rendant la comparaison incertaine. */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowEmoji}>📍</Text>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>
                    {t("consent.locationTitle")}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textLight }]}>
                    {t("consent.locationBody")}
                  </Text>
                </View>
              </View>
              <Toggle
                value={locationEnabled}
                onToggle={setLocationEnabled}
                trackColor={colors.terra}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

            {/* Notifications */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowEmoji}>🔔</Text>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>
                    {t("consent.notificationsTitle")}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textLight }]}>
                    {t("consent.notificationsBody")}
                  </Text>
                </View>
              </View>
              <Toggle
                value={notificationsEnabled}
                onToggle={setNotificationsEnabled}
                trackColor={colors.terra}
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: saving ? colors.bgDark : colors.terra },
          ]}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving || loading}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{t("consentManagement.save")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.privacyLink}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("Privacy")}
        >
          <Text style={[styles.privacyLinkText, { color: colors.terra }]}>
            {t("consent.viewPrivacy")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  description: {
    fontFamily: F.sans400,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 20,
  },
  loader: {
    marginTop: 40,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  rowEmoji: {
    fontSize: 24,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: F.sans600,
    fontSize: 15,
  },
  rowSub: {
    fontFamily: F.sans400,
    fontSize: 12,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    position: "absolute",
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 16,
  },
  saveBtnText: {
    fontFamily: F.sans700,
    fontSize: 17,
    color: "#fff",
  },
  privacyLink: {
    alignItems: "center",
  },
  privacyLinkText: {
    fontFamily: F.sans500,
    fontSize: 13,
    textDecorationLine: "underline",
  },
});

export default ConsentManagementScreen;
