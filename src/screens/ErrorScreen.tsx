/**
 * Écran de panne générique : ce que voit l'utilisateur lorsqu'une opération
 * échoue sans que l'écran d'origine puisse rester utilisable.
 *
 * Besoin couvert : comprendre qu'un incident s'est produit, en lire la cause
 * lorsqu'elle est communicable, et disposer d'une sortie.
 *
 * Position dans le parcours : AppNavigator déclare cette route dans la pile
 * racine, hors de la barrière d'authentification — elle reste donc montable que
 * la session soit ouverte ou non, et même avant le consentement initial. Elle
 * n'est atteinte que par un `navigation.navigate("Error", { message })`
 * explicite, qu'aucun écran du dépôt n'émet aujourd'hui. Deux sorties : la
 * racine des onglets et, si l'appelant l'autorise, l'écran précédent.
 *
 * Données : aucune requête ni contexte métier. Le message vient de
 * `route.params`, les libellés des clés `errorScreen.*`, la palette de
 * ThemeContext.
 *
 * États pris en charge : aucun — l'écran est lui-même l'état d'erreur.
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
import { NavigationProp, useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { F } from "../theme/fonts";
import { RootStackParamList } from "../types";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

interface ErrorScreenParams {
  message?: string;
  canGoBack?: boolean;
}

/**
 * Compose l'écran de panne.
 *
 * @param route.params.message Message déjà traduit et présentable ; en son
 * absence un texte générique est affiché. Il n'a pas vocation à recevoir une
 * trace technique, qui exposerait le fonctionnement interne de l'application.
 * @param route.params.canGoBack Masque le bouton de retour lorsque l'écran
 * précédent est justement celui qui a échoué et qu'y revenir rejouerait la panne.
 *
 * Aucun effet de bord : l'écran ne fait qu'afficher et naviguer sur pression.
 */
const ErrorScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  // La route est déclarée avec des paramètres facultatifs et peut être ouverte
  // sans aucun, d'où l'objet vide de repli avant déstructuration.
  const params = (route.params ?? {}) as ErrorScreenParams;
  // Le retour arrière est offert par défaut : dans le cas courant, l'écran
  // précédent est intact et y revenir est la sortie la moins coûteuse. C'est à
  // l'appelant qui sait sa pile compromise de le désactiver.
  const { message, canGoBack = true } = params;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.dangerLight ?? "#FDEAEA" }]}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.danger ?? "#C04040"} {...DECORATIVE_ELEMENT_PROPS} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {t("errorScreen.title")}
        </Text>
        <Text style={[styles.description, { color: colors.textMid }]}>
          {message ?? t("errorScreen.defaultMessage")}
        </Text>

        {/*
          « Main » n'est enregistré que par MainStack, c'est-à-dire uniquement
          lorsqu'une session est ouverte : ce bouton suppose donc un utilisateur
          connecté, alors que l'écran lui-même est déclaré hors de cette barrière.
        */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.terra }]}
          onPress={() => navigation.navigate("Main")}
          activeOpacity={0.8}
        >
          <Ionicons name="home-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={styles.buttonText}>{t("errorScreen.goHome")}</Text>
        </TouchableOpacity>

        {canGoBack && (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textMid }]}>
              {t("errorScreen.goBack")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    // Marge haute réservée à la main faute de SafeAreaView : l'écran peut être
    // affiché alors que la pile d'origine est compromise, et ne doit dépendre
    // d'aucun fournisseur de contexte autre que le thème.
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

export default ErrorScreen;
