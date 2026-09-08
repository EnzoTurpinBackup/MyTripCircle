/**
 * Mur de consentement affiché au tout premier lancement de l'application.
 *
 * Besoin couvert : recueillir, avant tout traitement, l'accord de la personne sur
 * l'usage de ses données, de sa position et des notifications, et lui donner accès
 * aux textes qui les détaillent. Le recueil précède l'authentification : l'accord
 * porte sur l'application, pas sur un compte, et vaut donc même pour qui repartira
 * sans s'inscrire.
 *
 * Position dans le parcours : premier écran affiché, en amont d'AuthStack comme de
 * MainStack. AppNavigator lit `CONSENT_KEY` au démarrage et, tant que la clé est
 * absente, ne monte que cet écran — sans autre sortie que Terms et Privacy, que l'on
 * ouvre puis referme. Le rappel `onConsentGiven` rend la main au navigateur. La
 * révision ultérieure de ces choix relève de ConsentManagementScreen, dans les réglages.
 *
 * Données : aucune lecture. Les choix sont écrits dans AsyncStorage sous `CONSENT_KEY`,
 * puis, s'ils sont positifs, convertis en demandes de permission système via
 * `expo-location` et `requestPermissionAndRegisterToken`. Rien n'est envoyé au serveur
 * ici, faute de session : ConsentManagementScreen s'en chargera plus tard.
 *
 * États pris en charge : aucun chargement ni erreur — l'écran est purement local et
 * fonctionne hors ligne. Le refus du traitement des données neutralise les deux boutons
 * de validation, la suite de l'application étant alors sans objet.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { requestPermissionAndRegisterToken } from "../hooks/usePushNotifications";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Clé de stockage local des consentements, lue par AppNavigator pour décider s'il
 * faut présenter ce mur, et par ConsentManagementScreen pour rouvrir les choix déjà
 * faits. Le suffixe de version en fait partie intégrante : une évolution du texte
 * soumis à l'utilisateur s'accompagne d'une nouvelle clé, ce qui rend l'accord
 * précédent introuvable et provoque une nouvelle demande, l'ancien consentement ne
 * couvrant pas le nouveau texte.
 */
export const CONSENT_KEY = "@mytripcircle_consent_v1";

/**
 * Trace de l'accord donné, telle qu'elle est sérialisée sous {@link CONSENT_KEY}.
 * `data` est typé par le littéral `true` : un enregistrement ne peut exister sans le
 * consentement obligatoire, puisqu'il n'est écrit qu'après son obtention.
 * `acceptedAt` en date le recueil, ce qui permet d'établir à quel moment l'accord a
 * été donné.
 */
export interface ConsentPreferences {
  data: true;        // Obligatoire — traitement des données (toujours true)
  location: boolean; // Optionnel — géolocalisation
  notifications: boolean; // Optionnel — notifications
  acceptedAt: string;
}

interface ConsentItemProps {
  icon: string;
  title: string;
  body: string;
  badge: string;
  badgeRequired: boolean;
  enabled: boolean;
  toggleable: boolean;
  onToggle?: () => void;
}

/**
 * Ligne décrivant un usage soumis à consentement, avec son interrupteur.
 *
 * @param icon Pictogramme identifiant l'usage.
 * @param title Intitulé de l'usage.
 * @param body Explication de l'usage fait de la donnée, sans laquelle l'accord ne
 * serait pas éclairé.
 * @param badge Libellé de la pastille « obligatoire » ou « facultatif ».
 * @param badgeRequired Colore la pastille en accent quand l'usage est obligatoire ;
 * l'information ne repose pas sur la seule couleur, le libellé la porte aussi.
 * @param enabled État courant de l'interrupteur.
 * @param toggleable Autorise la manipulation ; un usage figé affiche tout de même un
 * interrupteur, en position active, pour que la ligne reste lisible.
 * @param onToggle Rappel de bascule, sans objet si `toggleable` est faux.
 */
const ConsentItem: React.FC<ConsentItemProps> = ({
  icon, title, body, badge, badgeRequired, enabled, toggleable, onToggle,
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemIcon}>{icon}</Text>
        <View style={styles.itemTitleRow}>
          <Text style={[styles.itemTitle, { color: colors.text }]}>{title}</Text>
          <View style={[
            styles.badge,
            { backgroundColor: badgeRequired ? colors.terraLight : colors.bgMid },
          ]}>
            <Text style={[
              styles.badgeText,
              { color: badgeRequired ? colors.terra : colors.textLight },
            ]}>{badge}</Text>
          </View>
        </View>
        {toggleable && (
          <TouchableOpacity
            onPress={onToggle}
            activeOpacity={0.7}
            style={[styles.toggle, { backgroundColor: enabled ? colors.terra : colors.bgDark }]}
          >
            <View style={[
              styles.toggleThumb,
              { transform: [{ translateX: enabled ? 20 : 2 }] },
            ]} />
          </TouchableOpacity>
        )}
        {!toggleable && (
          <View style={[styles.toggle, { backgroundColor: colors.terra }]}>
            <View style={[styles.toggleThumb, { transform: [{ translateX: 20 }] }]} />
          </View>
        )}
      </View>
      <Text style={[styles.itemBody, { color: colors.textLight }]}>{body}</Text>
    </View>
  );
};

interface ConsentScreenProps {
  onConsentGiven?: () => void;
}

/**
 * Compose le mur de consentement.
 *
 * @param onConsentGiven Rappel invoqué une fois l'accord enregistré ; c'est lui qui
 * autorise AppNavigator à monter la pile ordinaire. Facultatif pour que l'écran reste
 * montable isolément, mais toujours fourni en pratique.
 *
 * Effets de bord : écriture des préférences dans AsyncStorage, puis, selon les choix,
 * ouverture des dialogues de permission système pour la position et les notifications,
 * cette dernière enregistrant en outre le jeton d'envoi auprès du serveur.
 */
export default function ConsentScreen({ onConsentGiven }: Readonly<ConsentScreenProps>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  // Les interrupteurs facultatifs partent activés : le bouton principal vaut alors
  // acceptation de ce qui est affiché, et celui qui ne veut qu'une partie des usages
  // désactive les lignes concernées avant de valider.
  const [dataEnabled, setDataEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  /**
   * Enregistre l'accord puis sollicite les permissions correspondantes.
   *
   * @param acceptAll `true` retient les interrupteurs tels que l'utilisateur les a
   * laissés ; `false` correspond au second bouton et refuse tous les usages
   * facultatifs, quels que soient les interrupteurs — c'est le sens du « minimum
   * nécessaire », et non un enregistrement de l'état affiché.
   */
  const saveAndContinue = async (acceptAll: boolean) => {
    const notifConsented = acceptAll ? notificationsEnabled : false;
    const prefs: ConsentPreferences = {
      data: true,
      location: acceptAll ? locationEnabled : false,
      notifications: notifConsented,
      acceptedAt: new Date().toISOString(),
    };
    // L'écriture précède les demandes de permission : c'est elle qui matérialise
    // l'accord, et l'utilisateur peut interrompre l'application pendant un dialogue
    // système sans qu'on ait à lui reposer la question au lancement suivant.
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
    // Les dialogues du système ne sont ouverts qu'après un accord explicite dans
    // l'application. Les présenter d'emblée gaspillerait l'unique demande qu'iOS
    // autorise, un refus n'étant ensuite révocable que depuis les réglages.
    if (prefs.location) {
      await Location.requestForegroundPermissionsAsync();
    }
    if (notifConsented) {
      await requestPermissionAndRegisterToken();
    }
    // Aucune transmission au serveur ici : il n'y a pas encore de session à laquelle
    // rattacher ces préférences. ConsentManagementScreen s'en charge une fois connecté.
    onConsentGiven?.();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <View style={styles.content}>

        <ScrollView
          style={styles.top}
          contentContainerStyle={styles.topContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoRow}>
            {/* Informative : seule marque de l'application sur l'écran, aucun texte ne la reprend. */}
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel={t("common.a11y.appLogo")}
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{t("consent.title")}</Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>{t("consent.subtitle")}</Text>

          <View style={styles.items}>
            <ConsentItem
              icon="🔐"
              title={t("consent.dataTitle")}
              body={t("consent.dataBody")}
              badge={t("consent.requiredBadge")}
              badgeRequired
              enabled={dataEnabled}
              toggleable
              onToggle={() => setDataEnabled((v) => !v)}
            />
            <ConsentItem
              icon="📍"
              title={t("consent.locationTitle")}
              body={t("consent.locationBody")}
              badge={t("consent.optionalBadge")}
              badgeRequired={false}
              enabled={locationEnabled}
              toggleable
              onToggle={() => setLocationEnabled((v) => !v)}
            />
            <ConsentItem
              icon="🔔"
              title={t("consent.notificationsTitle")}
              body={t("consent.notificationsBody")}
              badge={t("consent.optionalBadge")}
              badgeRequired={false}
              enabled={notificationsEnabled}
              toggleable
              onToggle={() => setNotificationsEnabled((v) => !v)}
            />
          </View>
        </ScrollView>

        <View style={styles.bottom}>
          {/* Les deux boutons sont neutralisés tant que le traitement des données est
              refusé : ce refus n'a pas de suite possible dans l'application, et le
              signaler en grisant les issues vaut mieux qu'une validation sans effet. */}
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: dataEnabled ? colors.terra : colors.bgDark }]}
            activeOpacity={dataEnabled ? 0.85 : 1}
            onPress={() => dataEnabled && saveAndContinue(true)}
            disabled={!dataEnabled}
          >
            <Text style={[styles.btnPrimaryText, { color: dataEnabled ? "#fff" : colors.textLight }]}>
              {t("consent.acceptAll")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSecondary, { borderColor: dataEnabled ? colors.border : colors.bgDark }]}
            activeOpacity={dataEnabled ? 0.7 : 1}
            onPress={() => dataEnabled && saveAndContinue(false)}
            disabled={!dataEnabled}
          >
            <Text style={[styles.btnSecondaryText, { color: dataEnabled ? colors.textLight : colors.bgDark }]}>
              {t("consent.acceptRequired")}
            </Text>
          </TouchableOpacity>

          {/* Privacy et Terms sont déclarés hors de la branche conditionnelle
              d'AppNavigator : ils restent donc atteignables depuis ce mur, alors qu'aucune
              pile n'est encore montée. Sans quoi l'accord serait demandé sans que les
              textes qu'il vise puissent être consultés. */}
          <View style={styles.links}>
            <TouchableOpacity onPress={() => navigation.navigate("Privacy")} activeOpacity={0.7}>
              <Text style={[styles.link, { color: colors.terra }]}>{t("consent.viewPrivacy")}</Text>
            </TouchableOpacity>
            <Text style={[styles.linkSep, { color: colors.textLight }]}>·</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Terms")} activeOpacity={0.7}>
              <Text style={[styles.link, { color: colors.terra }]}>{t("consent.viewTerms")}</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 20,
    justifyContent: "space-between",
  },
  top: {
    flex: 1,
  },
  topContent: {
    paddingBottom: 12,
  },
  bottom: {
    paddingTop: 12,
  },
  logoRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  title: {
    fontFamily: F.sans700,
    fontSize: 24,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: F.sans400,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  items: {
    gap: 10,
  },
  item: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  itemIcon: {
    fontSize: 22,
  },
  itemTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemTitle: {
    fontFamily: F.sans600,
    fontSize: 15,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: F.sans600,
    fontSize: 11,
  },
  itemBody: {
    fontFamily: F.sans400,
    fontSize: 13,
    lineHeight: 20,
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
  btnPrimary: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  btnPrimaryText: {
    fontFamily: F.sans700,
    fontSize: 17,
    color: "#fff",
  },
  btnSecondary: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 16,
  },
  btnSecondaryText: {
    fontFamily: F.sans500,
    fontSize: 16,
  },
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  link: {
    fontFamily: F.sans500,
    fontSize: 13,
    textDecorationLine: "underline",
  },
  linkSep: {
    fontSize: 16,
  },
});
