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

const NotFoundScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.bgDark }]}>
          <Ionicons name="map-outline" size={56} color={colors.textLight} />
        </View>

        <Text style={[styles.code, { color: colors.textLight }]}>404</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("notFound.title")}
        </Text>
        <Text style={[styles.description, { color: colors.textMid }]}>
          {t("notFound.description")}
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.terra }]}
          onPress={() => navigation.navigate("Main")}
          activeOpacity={0.8}
        >
          <Ionicons name="home-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>{t("notFound.goHome")}</Text>
        </TouchableOpacity>

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
