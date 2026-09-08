/**
 * Écran d'aide et de contact du support, dernier recours de l'utilisateur bloqué.
 *
 * Besoin couvert : répondre d'abord seul aux questions les plus courantes —
 * créer un voyage, inviter des proches, gérer les réservations, retrouver les
 * adresses sur la carte — puis, si la réponse n'y est pas, écrire au support
 * sans avoir à chercher son adresse ailleurs.
 *
 * Position dans le parcours : ouvert depuis la section « Préférences » de
 * ProfileScreen et quitté par le bouton de retour. Aucun autre écran de
 * l'application n'en découle ; la seule sortie est vers l'extérieur, le client
 * de messagerie du téléphone.
 *
 * Données : aucune requête réseau ni aucun contexte métier. Les quatre questions
 * et leurs réponses sont bâties à partir des clés `helpSupport.*` des fichiers
 * i18n embarqués dans l'application, et ThemeContext fournit la palette. Le
 * contenu est donc disponible hors connexion.
 *
 * États pris en charge : ni chargement, ni erreur, ni état vide — la liste des
 * questions est constante. Le seul aléa est l'ouverture du client de messagerie,
 * qui dépend de l'appareil ; l'adresse du support reste affichée en clair en bas
 * de page pour que l'utilisateur puisse la reprendre à la main si le bouton
 * n'aboutit pas.
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  LayoutAnimation,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";
import BackButton from "../components/ui/BackButton";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Compose la page d'aide.
 *
 * Montée par la pile racine sans paramètre de route ; son seul état est
 * l'identifiant de la question dépliée. Effet de bord notable : le bouton de
 * contact quitte l'application pour ouvrir le client de messagerie du système
 * sur un brouillon pré-rempli.
 */
const HelpSupportScreen: React.FC = () => {
  // Une seule question ouverte à la fois, d'où un identifiant plutôt qu'un
  // ensemble : la liste tient alors dans un écran sans défilement acrobatique.
  const [openId, setOpenId] = React.useState<string | null>(null);
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  // La transition est déclarée avant la mise à jour de l'état : LayoutAnimation
  // anime le prochain calcul de disposition, ce qui évite que la réponse
  // n'apparaisse d'un bloc sous la question.
  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId(openId === id ? null : id);
  };

  const navigation = useNavigation();

  // Le sujet est encodé avant d'être inséré dans l'URL : traduit, il contient des
  // espaces et des accents qui invalideraient le lien `mailto:` tel quel. Passer
  // par la messagerie du téléphone plutôt que par un formulaire interne évite de
  // convoyer les coordonnées de l'utilisateur et lui laisse une trace de son
  // message dans ses messages envoyés.
  const openEmail = () => {
    const subject = encodeURIComponent(t("helpSupport.emailSubject"));
    Linking.openURL(`mailto:support@mytripcircle.com?subject=${subject}`);
  };

  // Reconstruit à chaque rendu, et non figé au niveau du module : les libellés
  // dépendent de la langue courante et les couleurs du thème actif, qui changent
  // tous deux en cours de session depuis l'écran de réglages.
  const faqItems = [
    {
      id: "faq-1",
      icon: "airplane-outline",
      title: t("helpSupport.faq1Question"),
      description: t("helpSupport.faq1Answer"),
      iconColor: colors.terra,
      iconBg: colors.terraLight,
    },
    // Les deux entrées suivantes portent des teintes littérales : la palette du
    // thème n'expose qu'un accent, insuffisant pour distinguer quatre sujets d'un
    // coup d'œil. Chaque teinte est déclinée en clair et en sombre pour conserver
    // un contraste suffisant sur les deux fonds.
    {
      id: "faq-2",
      icon: "people-outline",
      title: t("helpSupport.faq2Question"),
      description: t("helpSupport.faq2Answer"),
      iconColor: isDark ? "#8BBF76" : "#6B8C5A",
      iconBg: isDark ? "#1E2E1A" : "#E2EDD9",
    },
    {
      id: "faq-3",
      icon: "calendar-outline",
      title: t("helpSupport.faq3Question"),
      description: t("helpSupport.faq3Answer"),
      iconColor: isDark ? "#76AACC" : "#5A8FAA",
      iconBg: isDark ? "#162230" : "#DCF0F5",
    },
    {
      id: "faq-4",
      icon: "map-outline",
      title: t("helpSupport.faq4Question"),
      description: t("helpSupport.faq4Answer"),
      iconColor: colors.textMid,
      iconBg: colors.bgDark,
    },
  ];

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header bar ── */}
        <View style={[styles.headerBar, { backgroundColor: colors.bg }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("helpSupport.title")}</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.body}>
          {/* ── Info card ── */}
          <View style={[styles.infoCard, { backgroundColor: colors.terraLight, borderColor: colors.border }]}>
            <View style={styles.infoHeader}>
              <View style={styles.infoIconBg}>
                <Ionicons name="chatbubble-ellipses" size={24} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <Text style={[styles.infoTitle, { color: colors.text }]}>{t("helpSupport.needHelp")}</Text>
            </View>
            <Text style={[styles.infoParagraph, { color: colors.textMid }]}>{t("helpSupport.description")}</Text>
          </View>

          {/* ── FAQ section ── */}
          <Text style={[styles.sectionLabel, { color: colors.textLight }]}>{t("helpSupport.faqTitle")}</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {faqItems.map((item, index) => {
              const isOpen = openId === item.id;
              return (
                <React.Fragment key={item.id}>
                  {index > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.bgMid }]} />}
                  <TouchableOpacity
                    style={styles.faqRow}
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.faqIconBg, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={item.iconColor} {...DECORATIVE_ELEMENT_PROPS} />
                    </View>
                    <Text style={[styles.faqTitle, { color: colors.text }]}>{item.title}</Text>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={colors.textLight}
                      {...DECORATIVE_ELEMENT_PROPS}
                    />
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={styles.faqAnswer}>
                      <Text style={[styles.faqAnswerText, { color: colors.textMid }]}>{item.description}</Text>
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* ── Contact button ── */}
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: colors.terra }]}
            onPress={openEmail}
            activeOpacity={0.8}
          >
            <Ionicons name="mail" size={18} color="#FFFFFF" style={{ marginRight: 8 }} {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={styles.contactButtonText}>{t("helpSupport.contactSupport")}</Text>
          </TouchableOpacity>

          {/* ── Contact info card ── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.contactRow}>
              <View style={[styles.contactIconBg, { backgroundColor: colors.bgDark }]}>
                <Ionicons name="mail-outline" size={18} color={colors.textMid} {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <Text style={[styles.contactText, { color: colors.textMid }]}>support@mytripcircle.com</Text>
            </View>
            <View style={[styles.rowDivider, { backgroundColor: colors.bgMid }]} />
            <View style={styles.contactRow}>
              <View style={[styles.contactIconBg, { backgroundColor: colors.bgDark }]}>
                <Ionicons name="time-outline" size={18} color={colors.textMid} {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <Text style={[styles.contactText, { color: colors.textMid }]}>{t("helpSupport.availability")}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Header bar
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // L'en-tête défile avec le contenu, il ne peut donc pas s'appuyer sur une
    // SafeAreaView : la marge haute est réservée à la main, plus large sur iOS
    // où l'encoche et la barre d'état empiètent davantage.
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: F.sans700,
    textAlign: "center",
    flex: 1,
  },

  // Body
  body: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // Info card
  infoCard: {
    borderRadius: 11,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(196,113,74,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoTitle: {
    fontSize: 19,
    fontFamily: F.sans700,
  },
  infoParagraph: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: F.sans400,
    marginBottom: 8,
  },

  // Section label
  sectionLabel: {
    fontSize: 13,
    fontFamily: F.sans600,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 2,
  },

  // Card
  card: {
    borderRadius: 11,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },

  // Row divider
  rowDivider: {
    height: 1,
    marginLeft: 56,
  },

  // FAQ rows
  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 17,
  },
  faqIconBg: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  faqTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: F.sans600,
  },
  faqAnswer: {
    paddingHorizontal: 62,
    paddingBottom: 14,
  },
  faqAnswerText: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: F.sans400,
  },

  // Contact button
  contactButton: {
    borderRadius: 10,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#A35830",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  contactButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: F.sans700,
  },

  // Contact info rows
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 17,
  },
  contactIconBg: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactText: {
    fontSize: 16,
    fontFamily: F.sans400,
  },
});

export default HelpSupportScreen;
