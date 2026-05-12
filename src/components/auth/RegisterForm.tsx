import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "../ui/BackButton";
import { useTranslation } from "react-i18next";
import { AppColors } from "../../contexts/ThemeContext";
import { F } from "../../theme/fonts";
import { RADIUS, DISABLED_OPACITY } from "../../theme";
import LabelledInput from "./LabelledInput";
import SocialAuthButtons from "./SocialAuthButtons";

interface RegisterFormProps {
  name: string;
  setName: (v: string) => void;
  nameError: string;
  setNameError: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  emailError: string;
  setEmailError: (v: string) => void;
  phone: string;
  phoneError: string;
  handlePhoneChange: (text: string) => void;
  password: string;
  setPassword: (v: string) => void;
  passwordError: string;
  setPasswordError: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  confirmPasswordError: string;
  setConfirmPasswordError: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  busy: boolean;
  onSubmit: () => void;
  onSwitchToLogin: () => void;
  onBackToWelcome: () => void;
  onNavigateTerms: () => void;
  onNavigatePrivacy: () => void;
  onGooglePress: () => void;
  onApplePress: () => void;
  googleDisabled: boolean;
  validateEmail: (v: string) => boolean;
  validatePasswordStrong: (v: string) => boolean;
  validateName: (v: string) => boolean;
  validatePhone: (v: string) => boolean;
  validateConfirmPassword: (v: string) => boolean;
  colors: AppColors;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  name,
  setName,
  nameError,
  setNameError,
  email,
  setEmail,
  emailError,
  setEmailError,
  phone,
  phoneError,
  handlePhoneChange,
  password,
  setPassword,
  passwordError,
  setPasswordError,
  confirmPassword,
  setConfirmPassword,
  confirmPasswordError,
  setConfirmPasswordError,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  termsAccepted,
  setTermsAccepted,
  busy,
  onSubmit,
  onSwitchToLogin,
  onBackToWelcome,
  onNavigateTerms,
  onNavigatePrivacy,
  onGooglePress,
  onApplePress,
  googleDisabled,
  validateEmail,
  validatePasswordStrong,
  validateName,
  validatePhone,
  validateConfirmPassword,
  colors,
}) => {
  const { t } = useTranslation();

  const guardTerms = (handler: () => void) => () => {
    if (!termsAccepted) {
      Alert.alert(t("common.error"), t("auth.termsRequired"));
      return;
    }
    handler();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section haute */}
          <View>
            <BackButton
              onPress={onBackToWelcome}
              style={styles.backButton}
            />
            <View style={styles.titleBlock}>
              <Text style={[styles.registerTitle, { color: colors.text }]}>{t("auth.registerTitle")}</Text>
              <Text style={[styles.welcomeSub, { color: colors.textLight }]}>{t("auth.registerSubtitle")}</Text>
            </View>
            <View style={styles.inputsArea}>
              <LabelledInput
                label={t("common.fullName")}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) setNameError("");
                }}
                onBlur={() => validateName(name)}
                placeholder={t("common.namePlaceholderExample")}
                autoCapitalize="words"
                hasError={!!nameError}
                errorText={nameError}
                colors={colors}
              />
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
                label={t("common.phoneOptional")}
                value={phone}
                onChangeText={handlePhoneChange}
                onBlur={() => validatePhone(phone)}
                placeholder={t("common.phonePlaceholderExample")}
                keyboardType="phone-pad"
                hasError={!!phoneError}
                errorText={phoneError}
                colors={colors}
              />
              <LabelledInput
                label={t("common.password")}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError("");
                }}
                onBlur={() => validatePasswordStrong(password)}
                placeholder={t("common.passwordMaskedPlaceholder")}
                secureTextEntry
                showToggle
                showValue={showPassword}
                onToggleShow={() => setShowPassword(!showPassword)}
                hasError={!!passwordError}
                errorText={passwordError}
                colors={colors}
              />
              <LabelledInput
                label={t("common.confirmPassword")}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) setConfirmPasswordError("");
                }}
                onBlur={() => validateConfirmPassword(confirmPassword)}
                placeholder={t("common.passwordMaskedPlaceholder")}
                secureTextEntry
                showToggle
                showValue={showConfirmPassword}
                onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
                hasError={!!confirmPasswordError}
                errorText={confirmPasswordError}
                colors={colors}
              />
            </View>
            <View style={styles.termsRow}>
              <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)} activeOpacity={0.8}>
                <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: colors.surface }, termsAccepted && [styles.checkboxChecked, { backgroundColor: colors.terra, borderColor: colors.terra }]]}>
                  {termsAccepted && <Ionicons name="checkmark" size={9} color={colors.white} />}
                </View>
              </TouchableOpacity>
              <Text style={[styles.termsText, { color: colors.textMid }]}>
                {t("auth.termsPrefix")}
                <Text style={[styles.termsLink, { color: colors.terra }]} onPress={onNavigateTerms}>
                  {t("auth.termsLink")}
                </Text>
                {t("auth.termsMiddle")}
                <Text style={[styles.termsLink, { color: colors.terra }]} onPress={onNavigatePrivacy}>
                  {t("auth.privacyLink")}
                </Text>
              </Text>
            </View>
          </View>

          {/* Section basse */}
          <View>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.terra }, (busy || !termsAccepted) && styles.primaryBtnDisabled]}
              onPress={onSubmit}
              disabled={busy || !termsAccepted}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {busy ? t("common.pleaseWait") : t("auth.createMyAccount")}
              </Text>
            </TouchableOpacity>

            <SocialAuthButtons
              onGooglePress={guardTerms(onGooglePress)}
              onApplePress={guardTerms(onApplePress)}
              googleDisabled={googleDisabled}
              busy={busy}
              colors={colors}
            />

            <View style={styles.footer}>
              <Text style={[styles.footerLabel, { color: colors.textLight }]}>{t("auth.registerFooterPrompt")}</Text>
              <TouchableOpacity onPress={onSwitchToLogin} activeOpacity={0.8}>
                <Text style={[styles.footerLink, { color: colors.terra }]}>{t("common.signIn")}</Text>
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
  backButton: {
    marginLeft: 24,
    marginTop: 12,
    marginBottom: 8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  titleBlock: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  registerTitle: {
    fontFamily: F.sans700,
    fontSize: 30,
    lineHeight: 38,
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
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
    marginTop: 8,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {},
  termsText: {
    fontFamily: F.sans400,
    fontSize: 13,
    flex: 1,
  },
  termsLink: {
    fontFamily: F.sans400,
    fontSize: 13,
  },
});

export default RegisterForm;
