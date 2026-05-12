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

const { height } = Dimensions.get("window");

type WelcomeNavProp = StackNavigationProp<RootStackParamList, "Welcome">;

// Remplace cette image par ta photo de fond quand elle est prête
// Place le fichier dans assets/welcome-bg.jpg et décommente la ligne ImageBackground
const BG_IMAGE = require("../../assets/background.jpg");

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeNavProp>();
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.background}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {/* Image de fond — remplace BG_IMAGE par ton image quand elle est prête */}
      <ImageBackground source={BG_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover" />
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
