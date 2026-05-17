import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppColors } from "../../contexts/ThemeContext";
import { F } from "../../theme/fonts";
import { RADIUS, DISABLED_OPACITY } from "../../theme";
import LabelledInput from "./LabelledInput";
import SocialAuthButtons from "./SocialAuthButtons";

interface LoginFormProps {
  email: string;
  setEmail: (v: string) => void;
  emailError: string;
  setEmailError: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  passwordError: string;
  setPasswordError: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  busy: boolean;
  onSubmit: () => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
  onGooglePress: () => void;
  onApplePress: () => void;
  googleDisabled: boolean;
  validateEmail: (v: string) => boolean;
  validatePasswordRequired: (v: string) => boolean;
  colors: AppColors;
}

const LoginForm: React.FC<LoginFormProps> = ({
  email,
  setEmail,
  emailError,
  setEmailError,
  password,
  setPassword,
  passwordError,
  setPasswordError,
  showPassword,
  setShowPassword,
  busy,
  onSubmit,
  onSwitchToRegister,
  onForgotPassword,
  onGooglePress,
  onApplePress,
  googleDisabled,
  validateEmail,
  validatePasswordRequired,
  colors,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section haute */}
          <View>
            <Text style={[styles.logo, { color: colors.terra }]}>MTC</Text>
            <View style={styles.titleBlock}>
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>{t("auth.welcomeBackTitle")}</Text>
              <Text style={[styles.welcomeSub, { color: colors.textLight }]}>{t("auth.loginSubtitle")}</Text>
            </View>
            <View style={styles.inputsArea}>
              <LabelledInput
                label={t("common.email")}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError("");
                }}
                onBlur={() => validateEmail(email)}
                placeholder={t("common.emailPlaceholder")}
                keyboardType="email-address"
                hasError={!!emailError}
                errorText={emailError}
                colors={colors}
              />
              <LabelledInput
                label={t("common.password")}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError("");
                }}
                onBlur={() => validatePasswordRequired(password)}
                placeholder={t("common.passwordMaskedPlaceholder")}
                secureTextEntry
                showToggle
                showValue={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                hasError={!!passwordError}
                errorText={passwordError}
                colors={colors}
              />
            </View>
            <TouchableOpacity style={styles.forgotRow} onPress={onForgotPassword} activeOpacity={0.8}>
              <Text style={[styles.forgotText, { color: colors.terra }]}>{t("common.forgotPassword")}</Text>
            </TouchableOpacity>
          </View>

          {/* Section basse */}
          <View style={{ marginTop: 48 }}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.terra }, busy && styles.primaryBtnDisabled]}
              onPress={onSubmit}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {busy ? t("common.pleaseWait") : t("common.signIn")}
              </Text>
            </TouchableOpacity>

            <SocialAuthButtons
              onGooglePress={onGooglePress}
              onApplePress={onApplePress}
              googleDisabled={googleDisabled}
              busy={busy}
              colors={colors}
            />

            <View style={styles.footer}>
              <Text style={[styles.footerLabel, { color: colors.textLight }]}>{t("auth.loginFooterPrompt")}</Text>
              <TouchableOpacity onPress={onSwitchToRegister} activeOpacity={0.8}>
                <Text style={[styles.footerLink, { color: colors.terra }]}>{t("common.signUp")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  logo: {
    fontFamily: F.sans700,
    fontSize: 32,
    letterSpacing: 2,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  titleBlock: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  welcomeTitle: {
    fontFamily: F.sans700,
    fontSize: 32,
    lineHeight: 40,
  },
  welcomeSub: {
    fontFamily: F.sans400,
    fontSize: 15,
    marginTop: 6,
  },
  inputsArea: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  forgotRow: {
    paddingHorizontal: 24,
    alignItems: "flex-end",
    marginBottom: 12,
    marginTop: 4,
  },
  forgotText: {
    fontFamily: F.sans400,
    fontSize: 14,
  },
  primaryBtn: {
    borderRadius: RADIUS.button,
    marginHorizontal: 24,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnDisabled: {
    opacity: DISABLED_OPACITY,
  },
  primaryBtnText: {
    fontFamily: F.sans600,
    fontSize: 17,
    color: "#FFFFFF",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 24,
  },
  footerLabel: {
    fontFamily: F.sans400,
    fontSize: 14,
  },
  footerLink: {
    fontFamily: F.sans400,
    fontSize: 14,
  },
});

export default LoginForm;
