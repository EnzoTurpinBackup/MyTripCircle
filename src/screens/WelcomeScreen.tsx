/**
 * Écran d'accueil affiché à l'ouverture de l'application lorsqu'aucune session
 * n'est ouverte.
 *
 * Besoin couvert : présenter le produit en une image et une phrase, puis orienter
 * sans ambiguïté vers la création de compte ou la reconnexion. La personne qui
 * arrive ici n'a aucun contexte à retrouver : l'écran ne propose que ces deux issues.
 *
 * Position dans le parcours : premier écran d'AuthStack, et donc première vue de
 * l'application une fois le mur de consentement franchi. En sortie, AuthScreen
 * dans l'un ou l'autre mode selon le bouton pressé, le mode voyageant par le
 * paramètre de route `initialMode`.
 *
 * Données : aucune. L'écran ne lit que la palette de ThemeContext et les libellés
 * de react-i18next. Il n'appelle pas le réseau et n'a donc ni état de chargement,
 * ni état d'erreur, ni dégradation hors ligne — l'échec survient à l'étape suivante.
 */
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  StatusBar,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "../types";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

const { height } = Dimensions.get("window");

type WelcomeNavProp = StackNavigationProp<RootStackParamList, "Welcome">;

// Remplace cette image par ta photo de fond quand elle est prête
// Place le fichier dans assets/welcome-bg.jpg et décommente la ligne ImageBackground
const BG_IMAGE = require("../../assets/background.jpg");

/**
 * Compose l'écran d'accueil non authentifié.
 *
 * Monté par le navigateur racine, le composant ne reçoit aucune prop : sa seule
 * variable est la couleur d'accent lue dans ThemeContext. Aucun effet de bord — les
 * boutons empilent AuthScreen sans réinitialiser la pile, le retour ramène donc ici.
 */
export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeNavProp>();
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.background}>
      {/* La photo occupe toute la hauteur, barre d'état comprise : celle-ci est rendue
          translucide pour éviter un bandeau opaque en haut de l'image, et passe en clair
          puisque le dégradé assombrit systématiquement le fond derrière elle. */}
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {/* Image de fond décorative — remplace BG_IMAGE par ton image quand elle est prête */}
      <ImageBackground source={BG_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover" {...DECORATIVE_ELEMENT_PROPS} />
      {/* La photo de fond est interchangeable et peut être claire à l'endroit du titre ou
          des boutons. L'assombrissement croissant vers le bas garantit le contraste du
          texte blanc quelle que soit l'image, sans accorder les couleurs à chaque visuel. */}
      <LinearGradient
        colors={["rgba(70,70,70,0.30)", "rgba(15,15,15,0.95)"]}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Spacer pour pousser le titre au centre */}
        <View style={styles.spacer} />

        {/* Titre centré verticalement */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            MyTrip<Text style={[styles.titleOrange, { color: colors.terra }]}>Circle</Text>
          </Text>
          <Text style={styles.subtitle}>{t("welcome.subtitle")}</Text>
        </View>

        {/* Spacer pour pousser les boutons en bas */}
        <View style={styles.spacer} />

        {/* Boutons en bas */}
        <View style={styles.buttonsContainer}>
          {/* Les deux boutons mènent au même écran : `initialMode` choisit seulement le
              formulaire présenté d'emblée, AuthScreen permettant ensuite de basculer. */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.terra }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Auth", { initialMode: "register" })}
          >
            <Text style={styles.primaryButtonText}>{t("welcome.ctaStart")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Auth", { initialMode: "login" })}
          >
            <Text style={styles.secondaryButtonText}>{t("welcome.ctaHaveAccount")}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  gradient: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 52,
    paddingBottom: 52,
    paddingHorizontal: 28,
  },
  spacer: {
    flex: 1,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    fontFamily: F.sans700,
    fontSize: 42,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  titleOrange: {},
  subtitle: {
    fontFamily: F.sans400,
    fontSize: 16,
    color: "rgba(255,255,255,0.80)",
    marginTop: 12,
    textAlign: "center",
  },
  buttonsContainer: {
    width: "100%",
    gap: 14,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    fontFamily: F.sans600,
    fontSize: 16,
    color: "#FFFFFF",
  },
  secondaryButton: {
    backgroundColor: "rgba(100,100,100,0.45)",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  secondaryButtonText: {
    fontFamily: F.sans400,
    fontSize: 16,
    color: "#FFFFFF",
  },
});
