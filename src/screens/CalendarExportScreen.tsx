/**
 * Écran d'abonnement calendrier, réservé aux comptes payants : il publie les
 * réservations de l'utilisateur sous la forme d'un flux iCalendar auquel
 * l'agenda du téléphone peut s'abonner.
 *
 * Besoin couvert : voir ses vols, ses nuitées et ses tables apparaître dans
 * l'agenda habituel, à côté des rendez-vous professionnels, sans ressaisie et
 * sans avoir à rouvrir l'application à chaque modification — l'agenda relit le
 * flux de lui-même.
 *
 * Position dans le parcours : atteint depuis la section « Préférences » de
 * ProfileScreen, entrée qui n'y figure que pour un compte abonné. Retour à
 * l'écran appelant ; la suite du parcours se déroule hors de l'application, dans
 * l'agenda du système, guidée par les marches à suivre affichées ici.
 *
 * Données : le jeton d'abonnement est lu et émis par calendarApi ; l'adresse du
 * flux est recomposée localement à partir de ce jeton et de l'adresse de base du
 * serveur, ce dernier ne renvoyant que le jeton. Le flux lui-même est produit
 * par le serveur : il rassemble les réservations des voyages du compte et celles
 * qui ne sont rattachées à aucun voyage, écarte les réservations annulées, et
 * est refusé si l'abonnement n'est plus actif.
 *
 * États pris en charge : lecture du jeton en cours, absence de jeton (proposition
 * d'en créer un), jeton établi (adresse copiable et renouvellement possible), et
 * émission en cours (commandes neutralisées). Un échec d'émission est rapporté
 * par une alerte ; un échec de lecture est indistinct de l'absence de jeton et
 * conduit à proposer une création.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Clipboard,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import BackButton from "../components/ui/BackButton";
import { useTheme } from "../contexts/ThemeContext";
import { calendarApi } from "../services/api/calendarApi";
import { API_BASE_URL } from "../config/api";
import { F } from "../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Compose l'écran de partage du flux calendrier.
 *
 * Poussé sur la pile sans paramètre de route : le jeton est demandé au serveur
 * au montage. Effets de bord notables — lecture réseau à l'ouverture, émission
 * d'un nouveau jeton à la demande, qui révoque le précédent, et écriture de
 * l'adresse du flux dans le presse-papiers du système.
 */
const CalendarExportScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Le jeton porte à lui seul l'authentification du flux : l'adresse est publique
  // et l'agenda qui s'y abonne ne présente aucun identifiant de session. C'est
  // pourquoi le renouvellement du jeton constitue le seul moyen de reprendre la
  // main sur une adresse partagée par mégarde.
  const calendarUrl = token ? `${API_BASE_URL}/calendar/${token}` : null;

  const fetchToken = useCallback(async () => {
    try {
      const res = await calendarApi.getToken();
      setToken(res.token);
    } catch {
      // Un compte qui n'a jamais ouvert d'abonnement n'a pas de jeton : l'échec
      // est traité comme une absence et l'écran propose une création, plutôt que
      // d'afficher une erreur pour un cas nominal.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Même opération pour la première émission et le renouvellement : le serveur
  // remplace tout jeton existant, il n'y a donc pas deux chemins à distinguer.
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await calendarApi.generateToken();
      setToken(res.token);
    } catch {
      Alert.alert(t("calendar.errorTitle"), t("calendar.errorGenerate"));
    } finally {
      setGenerating(false);
    }
  };

  const renderUrlSection = () => {
    if (loading) {
      return (
        <Text style={[styles.placeholder, { color: colors.textLight }]}>
          {t("common.loading")}
        </Text>
      );
    }
    if (calendarUrl) {
      return (
        <>
          <View style={[styles.urlBox, { backgroundColor: colors.bgMid }]}>
            {/* Adresse tronquée à deux lignes mais sélectionnable : sa longueur
                déborderait la carte, et la sélection manuelle reste le recours
                si le presse-papiers n'est pas accessible. */}
            <Text
              style={[styles.urlText, { color: colors.text }]}
              numberOfLines={2}
              selectable
            >
              {calendarUrl}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: colors.terra }]}
            onPress={handleCopy}
            activeOpacity={0.8}
          >
            <Ionicons name="copy-outline" size={18} color="#fff" {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={styles.btnPrimaryText}>{t("calendar.copyBtn")}</Text>
          </TouchableOpacity>
          {/* Le renouvellement porte les couleurs d'une action destructrice : il
              coupe le service des agendas déjà abonnés, qui cesseront de se
              mettre à jour tant que la nouvelle adresse ne leur sera pas donnée. */}
          <TouchableOpacity
            style={[styles.btnSecondary, { borderColor: colors.danger + "60" }]}
            onPress={handleRegenerate}
            activeOpacity={0.8}
            disabled={generating}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.danger} {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={[styles.btnSecondaryText, { color: colors.danger }]}>
              {generating ? t("calendar.generating") : t("calendar.regenerateBtn")}
            </Text>
          </TouchableOpacity>
        </>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.btnPrimary, { backgroundColor: colors.terra }]}
        onPress={handleGenerate}
        activeOpacity={0.8}
        disabled={generating}
      >
        <Ionicons name="calendar-outline" size={18} color="#fff" {...DECORATIVE_ELEMENT_PROPS} />
        <Text style={styles.btnPrimaryText}>
          {generating ? t("calendar.generating") : t("calendar.generateBtn")}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleRegenerate = () => {
    Alert.alert(
      t("calendar.regenerateTitle"),
      t("calendar.regenerateWarning"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("calendar.regenerateConfirm"),
          style: "destructive",
          onPress: handleGenerate,
        },
      ]
    );
  };

  // Copie dans le presse-papiers plutôt que partage : l'adresse doit être collée
  // dans le champ « ajouter un calendrier par abonnement » de l'agenda, et la
  // feuille de partage du système n'y mène pas.
  const handleCopy = () => {
    if (!calendarUrl) return;
    Clipboard.setString(calendarUrl);
    Alert.alert(t("calendar.copiedTitle"), t("calendar.copiedMessage"));
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("calendar.title")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge premium */}
        {/* Rappel de la contrepartie : le serveur cesse de servir le flux dès que
            l'abonnement expire, et les agendas déjà abonnés se videraient sans
            que rien, dans l'application, ne l'ait annoncé. */}
        <View style={[styles.premiumBadge, { backgroundColor: colors.terraLight }]}>
          <Ionicons name="star" size={14} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={[styles.premiumText, { color: colors.terra }]}>
            {t("calendar.premiumBadge")}
          </Text>
        </View>

        {/* Description */}
        <Text style={[styles.description, { color: colors.textLight }]}>
          {t("calendar.description")}
        </Text>

        {/* Zone URL */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {renderUrlSection()}
        </View>

        {/* Les deux marches à suivre sont présentées quelle que soit la
            plateforme : l'abonnement se règle souvent depuis un ordinateur ou un
            second appareil, et masquer l'autre priverait l'utilisateur de la
            seule information dont il a besoin à ce moment-là. */}
        {/* Instructions iOS */}
        <View style={[styles.instructionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.instructionHeader}>
            <Ionicons name="logo-apple" size={20} color={colors.text} {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={[styles.instructionTitle, { color: colors.text }]}>
              {t("calendar.iosTitle")}
            </Text>
          </View>
          {/* Les étapes sont tenues dans les fichiers de traduction et non dans
              le code : leur nombre et leur formulation dépendent de la langue et
              de la version du système, et n'ont pas à être figés ici. */}
          {(t("calendar.iosSteps", { returnObjects: true }) as string[]).map(
            (step: string, i: number) => (
              <View key={step} style={styles.step}>
                <View style={[styles.stepNum, { backgroundColor: colors.terraLight }]}>
                  <Text style={[styles.stepNumText, { color: colors.terra }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.textLight }]}>{step}</Text>
              </View>
            )
          )}
        </View>

        {/* Instructions Android */}
        <View style={[styles.instructionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.instructionHeader}>
            <Ionicons name="logo-android" size={20} color={colors.text} {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={[styles.instructionTitle, { color: colors.text }]}>
              {t("calendar.androidTitle")}
            </Text>
          </View>
          {(t("calendar.androidSteps", { returnObjects: true }) as string[]).map(
            (step: string, i: number) => (
              <View key={step} style={styles.step}>
                <View style={[styles.stepNum, { backgroundColor: colors.terraLight }]}>
                  <Text style={[styles.stepNumText, { color: colors.terra }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: colors.textLight }]}>{step}</Text>
              </View>
            )
          )}
        </View>

        {/* Note sécurité */}
        <View style={[styles.securityNote, { backgroundColor: colors.bgMid }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={[styles.securityText, { color: colors.textLight }]}>
            {t("calendar.securityNote")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontFamily: F.sans600 },

  content: { padding: 20, gap: 16, paddingBottom: 40 },

  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  premiumText: { fontSize: 13, fontFamily: F.sans600 },

  description: { fontSize: 15, fontFamily: F.sans400, lineHeight: 22 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  placeholder: { fontSize: 14, fontFamily: F.sans400, textAlign: "center", paddingVertical: 8 },

  urlBox: {
    borderRadius: 10,
    padding: 12,
  },
  urlText: { fontSize: 13, fontFamily: F.sans400, lineHeight: 20 },

  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnPrimaryText: { fontSize: 16, fontFamily: F.sans600, color: "#fff" },

  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
  },
  btnSecondaryText: { fontSize: 15, fontFamily: F.sans500 },

  instructionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  instructionTitle: { fontSize: 15, fontFamily: F.sans600 },

  step: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumText: { fontSize: 12, fontFamily: F.sans700 },
  stepText: { flex: 1, fontSize: 14, fontFamily: F.sans400, lineHeight: 20 },

  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 12,
  },
  securityText: { flex: 1, fontSize: 13, fontFamily: F.sans400, lineHeight: 18 },
});

export default CalendarExportScreen;
