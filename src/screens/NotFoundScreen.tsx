/**
 * Écran affiché lorsqu'une destination demandée n'existe pas ou n'est plus
 * accessible.
 *
 * Besoin couvert : ne pas laisser l'utilisateur devant une vue vide quand le
 * contenu visé a disparu — voyage supprimé, lien périmé — et lui rendre la main
 * sur un point de départ sûr.
 *
 * Position dans le parcours : route de la pile racine déclarée par AppNavigator
 * hors de la barrière d'authentification, donc montable session ouverte ou non.
 * La configuration de liens profonds ne désigne aucune route de repli : cet
 * écran ne se substitue pas de lui-même à une URL inconnue, il faut y naviguer
 * explicitement, ce qu'aucun écran du dépôt ne fait aujourd'hui. Deux sorties
 * seulement, la racine des onglets et l'écran précédent.
 *
 * Données : aucune requête ni contexte métier ; libellés issus des clés
 * `notFound.*` et palette de ThemeContext.
 *
 * États pris en charge : aucun — l'écran ne dépend d'aucun paramètre de route et
 * affiche toujours le même contenu.
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { F } from "../theme/fonts";
import { RootStackParamList } from "../types";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Compose l'écran « page introuvable ».
 *
 * Ne reçoit aucune prop et n'accepte aucun paramètre de route : son contenu est
 * fixe, seules la langue et la palette le font varier. Aucun effet de bord.
 */
const NotFoundScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.bgDark }]}>
          <Ionicons name="map-outline" size={56} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
        </View>

        {/*
          Code repris tel quel de la convention du Web : il est reconnu sans être
          lu, et n'a pas à passer par les fichiers de traduction puisqu'il est
          identique dans toutes les langues.
        */}
        <Text style={[styles.code, { color: colors.textLight }]}>404</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("notFound.title")}
        </Text>
        <Text style={[styles.description, { color: colors.textMid }]}>
          {t("notFound.description")}
        </Text>

        {/*
          « Main » n'est enregistré que par MainStack, donc seulement lorsqu'une
          session est ouverte : ce bouton suppose un utilisateur connecté, alors
          que l'écran est déclaré hors de la barrière d'authentification.
        */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.terra }]}
          onPress={() => navigation.navigate("Main")}
          activeOpacity={0.8}
        >
          <Ionicons name="home-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={styles.buttonText}>{t("notFound.goHome")}</Text>
        </TouchableOpacity>

        {/*
          Le retour arrière est toujours offert, à la différence d'ErrorScreen :
          une destination introuvable ne dit rien de l'écran précédent, qui reste
          en principe utilisable.
        */}
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.textMid }]}>
            {t("notFound.goBack")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    // Marge haute réservée à la main plutôt que par une SafeAreaView : l'écran
    // n'affiche pas d'en-tête et doit tenir sans dépendre d'un fournisseur de
    // contexte autre que le thème.
    paddingTop: Platform.OS === "ios" ? 60 : 20,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  iconContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  code: {
    fontSize: 72,
    fontFamily: F.sans700,
    lineHeight: 80,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: F.sans700,
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: F.sans400,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#A35830",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: F.sans700,
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 17,
    fontFamily: F.sans600,
  },
});

export default NotFoundScreen;
