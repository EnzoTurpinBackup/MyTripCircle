/**
 * Écran de réinitialisation de mot de passe, qui couvre les deux moitiés de la
 * procédure : la demande d'envoi du lien, puis le choix du nouveau mot de passe.
 *
 * Besoin couvert : reprendre la main sur un compte dont on a perdu le mot de passe,
 * sans passer par une assistance. La procédure se déroule en deux temps séparés par
 * un courriel, et l'écran assume les deux : c'est le même écran que l'on ouvre depuis
 * le formulaire de connexion et que le lien du courriel rouvre plus tard.
 *
 * Position dans le parcours : atteint depuis AuthScreen par le lien « mot de passe
 * oublié », sans paramètre, et par le deep link `mytripcircle://reset-password` que
 * la page relais du serveur déclenche depuis le courriel. Le code de réinitialisation
 * est lu dans `route.params.code` et c'est sa seule présence qui bascule l'écran en
 * mode « choix du nouveau mot de passe ». En sortie, AuthScreen lorsque le lien est
 * périmé ou que le serveur n'ouvre pas de session ; sinon aucune navigation, la
 * session ouverte par `loginWithToken` faisant basculer AppNavigator sur MainStack.
 *
 * Données : `ApiService.verifyResetToken` contrôle le code avant d'afficher le
 * formulaire, `ApiService.requestPasswordReset` déclenche l'envoi du courriel,
 * `ApiService.resetPassword` fixe le nouveau mot de passe, et `loginWithToken`
 * d'AuthContext installe la session que le serveur renvoie avec lui.
 *
 * États pris en charge : vérification du code en cours, code invalide ou expiré
 * (impasse assumée, avec retour vers la connexion), courriel envoyé (confirmation et
 * rappel de vérifier les indésirables), envoi ou enregistrement en cours (bouton
 * neutralisé), erreurs de saisie affichées sous le champ concerné et erreurs serveur
 * en boîte de dialogue. Le hors-ligne n'est pas distingué d'une erreur réseau ordinaire.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "../types";
import ApiService from "../services/ApiService";
import { useAuth } from "../contexts/AuthContext";
import { F } from "../theme/fonts";
import { COLORS as C } from "../theme/colors";
import { parseApiError } from "../utils/i18n";
import { useTheme } from "../contexts/ThemeContext";
import LabelledInput from "../components/forgotPassword/LabelledInput";
import BackButton from "../components/ui/BackButton";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

type ForgotPasswordScreenRouteProp     = RouteProp<RootStackParamList, "ForgotPassword">;
type ForgotPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, "ForgotPassword">;

/**
 * Compose l'écran de mot de passe oublié dans l'un ou l'autre de ses deux modes.
 *
 * Aucune prop n'est reçue : le seul paramètre lu est `route.params.code`, le code de
 * réinitialisation extrait du lien reçu par courriel. Son absence vaut mode « demande
 * d'envoi ». Le nom du paramètre est celui que le serveur place dans le lien et que le
 * `parse` du navigateur expose : les trois doivent rester alignés.
 *
 * Effets de bord : vérification du code auprès du serveur au montage lorsqu'il est
 * présent, envoi d'un courriel à la demande, et écriture des jetons en stockage
 * sécurisé par `loginWithToken` quand la réinitialisation ouvre directement la session.
 */
const ForgotPasswordScreen: React.FC = () => {
  const route      = useRoute<ForgotPasswordScreenRouteProp>();
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const { t }      = useTranslation();
  const { loginWithToken } = useAuth();
  const { colors } = useTheme();
  const resetCode  = route.params?.code || "";

  const [email, setEmail]                         = useState("");
  const [emailError, setEmailError]               = useState("");
  const [newPassword, setNewPassword]             = useState("");
  const [confirmPassword, setConfirmPassword]     = useState("");
  const [passwordError, setPasswordError]         = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading]                     = useState(false);
  const [emailSent, setEmailSent]                 = useState(false);
  const [tokenInvalid, setTokenInvalid]           = useState(false);
  // La vérification est réputée en cours dès le premier rendu quand un code est présent :
  // initialiser ce drapeau à faux ferait clignoter le formulaire de mot de passe avant
  // que le serveur n'ait eu l'occasion de rejeter un lien périmé.
  const [tokenChecking, setTokenChecking]         = useState(!!resetCode);

  // Contrôler le code avant d'afficher quoi que ce soit évite de laisser composer un mot
  // de passe conforme pour l'apprendre refusé ensuite : un lien de réinitialisation a une
  // durée de validité courte et arrive souvent après coup. L'échec du contrôle lui-même
  // est traité comme un code invalide, faute de pouvoir distinguer les deux ici.
  React.useEffect(() => {
    if (!resetCode) return;
    ApiService.verifyResetToken(resetCode)
      .then((res) => { if (!res.success) setTokenInvalid(true); })
      .catch(() => setTokenInvalid(true))
      .finally(() => setTokenChecking(false));
  }, [resetCode]);

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,}$/;
    if (!emailValue) { setEmailError(t("common.fillAllFields")); return false; }
    if (!emailRegex.test(emailValue)) { setEmailError(t("common.invalidEmail")); return false; }
    setEmailError("");
    return true;
  };

  const validatePasswordStrong = (passwordValue: string): boolean => {
    if (!passwordValue) { setPasswordError(t("common.fillAllFields")); return false; }
    // Huit caractères au moins, avec minuscule, majuscule, chiffre et caractère spécial :
    // la règle reprend celle que le serveur applique à l'inscription, pour signaler le
    // refus pendant la saisie plutôt qu'après un aller-retour réseau. Le serveur reste
    // l'arbitre — cette vérification ne fait qu'anticiper la sienne.
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPasswordRegex.test(passwordValue)) { setPasswordError(t("common.invalidPassword")); return false; }
    setPasswordError("");
    return true;
  };

  const handleRequestReset = async () => {
    setEmailError("");
    if (!validateEmail(email)) return;
    setLoading(true);
    try {
      // La confirmation est affichée sans égard à l'existence du compte : le serveur
      // répond de la même façon dans les deux cas, et l'écran ne doit pas trahir la
      // différence, sous peine de transformer ce formulaire en test d'inscription.
      await ApiService.requestPasswordReset(email);
      setEmailSent(true);
      Alert.alert(t("forgotPassword.emailSentTitle"), t("forgotPassword.emailSentMessage", { email }));
    } catch (error) {
      console.error("Error requesting password reset:", error);
      setEmailError(parseApiError(error) || t("forgotPassword.requestError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setPasswordError("");
    setConfirmPasswordError("");
    let isValid = true;
    if (!validatePasswordStrong(newPassword)) isValid = false;
    if (!confirmPassword) {
      setConfirmPasswordError(t("common.fillAllFields"));
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError(t("forgotPassword.passwordsDontMatch"));
      isValid = false;
    }
    if (!isValid) return;
    setLoading(true);
    try {
      const res = await ApiService.resetPassword(resetCode, newPassword);
      // Le serveur ouvre habituellement la session dans la foulée : exiger une connexion
      // juste après avoir choisi le mot de passe n'apporterait rien. Le repli couvre les
      // réponses sans jeton, où l'écran renvoie explicitement vers le formulaire de
      // connexion plutôt que de laisser l'utilisateur sur une page devenue sans objet.
      if (res.token && res.user) {
        await loginWithToken(res.token, res.user);
      } else {
        Alert.alert(
          t("forgotPassword.successTitle"),
          t("forgotPassword.successMessage"),
          [{ text: t("common.ok"), onPress: () => navigation.navigate("Auth") }],
        );
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      Alert.alert(t("common.error"), parseApiError(error) || t("forgotPassword.resetError"));
    } finally {
      setLoading(false);
    }
  };

  // La présence du code est le seul discriminant entre les deux moitiés de la procédure :
  // l'utilisateur qui arrive par le courriel n'a plus rien à demander, celui qui arrive
  // par le formulaire de connexion n'a encore rien reçu.
  const isResetMode      = !!resetCode;
  const showVerifying    = isResetMode && tokenChecking;
  const showInvalidToken = isResetMode && tokenInvalid;

  const headings = isResetMode
    ? { title: t("forgotPassword.resetPasswordTitle"), subtitle: t("forgotPassword.resetPasswordSubtitle") }
    : { title: t("forgotPassword.title"), subtitle: t("forgotPassword.subtitle") };
  const btnDisabledStyle = loading ? styles.primaryButtonDisabled : undefined;
  const btnLabels = loading
    ? { reset: t("common.pleaseWait"), request: t("common.pleaseWait") }
    : { reset: t("forgotPassword.resetPassword"), request: t("forgotPassword.sendResetLink") };

  // L'ordre des branches est significatif : la vérification du code, puis son rejet
  // éventuel, priment sur tout affichage de formulaire, et la confirmation d'envoi
  // remplace le champ d'adresse pour ne pas inviter à redemander un second courriel.
  let mainContent: React.ReactNode;
  if (showVerifying) {
    mainContent = (
      <View style={styles.successContainer}>
        <Text style={[styles.successTitle, { color: colors.text }]}>{t("forgotPassword.verifyingToken")}</Text>
      </View>
    );
  } else if (showInvalidToken) {
    mainContent = (
      <View style={styles.successContainer}>
        <Ionicons name="lock-closed" size={56} color={colors.danger} {...DECORATIVE_ELEMENT_PROPS} />
        <Text style={[styles.successTitle, { color: colors.danger }]}>{t("forgotPassword.invalidLinkTitle")}</Text>
        <Text style={[styles.successMessage, { color: colors.textMid }]}>{t("forgotPassword.invalidLinkMessage")}</Text>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.terra, shadowColor: colors.terra }]} onPress={() => navigation.navigate("Auth")} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>{t("forgotPassword.backToLogin")}</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (isResetMode) {
    mainContent = (
      <>
        <LabelledInput
          label={t("forgotPassword.newPasswordLabel")}
          value={newPassword}
          onChangeText={(text) => { setNewPassword(text); if (passwordError) setPasswordError(""); }}
          onBlur={() => validatePasswordStrong(newPassword)}
          placeholder={t("forgotPassword.newPasswordPlaceholder")}
          secureTextEntry
          showToggle
          showValue={showPassword}
          onToggleShow={() => setShowPassword(!showPassword)}
          hasError={!!passwordError}
          errorText={passwordError}
        />
        <LabelledInput
          label={t("forgotPassword.confirmPasswordLabel")}
          value={confirmPassword}
          onChangeText={(text) => { setConfirmPassword(text); if (confirmPasswordError) setConfirmPasswordError(""); }}
          placeholder={t("forgotPassword.confirmPasswordPlaceholder")}
          secureTextEntry
          showToggle
          showValue={showConfirmPassword}
          onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
          hasError={!!confirmPasswordError}
          errorText={confirmPasswordError}
        />
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.terra, shadowColor: colors.terra }, btnDisabledStyle]} onPress={handleResetPassword} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>{btnLabels.reset}</Text>
        </TouchableOpacity>
      </>
    );
  } else if (emailSent) {
    mainContent = (
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={56} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
        <Text style={[styles.successTitle, { color: colors.text }]}>{t("forgotPassword.emailSentTitle")}</Text>
        <Text style={[styles.successMessage, { color: colors.textMid }]}>{t("forgotPassword.emailSentMessage", { email })}</Text>
        <View style={styles.hintBox}>
          <Ionicons name="information-circle-outline" size={16} color={C.moss} style={{ marginRight: 6 }} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={styles.hintText}>{t("forgotPassword.checkEmailHint")}</Text>
        </View>
      </View>
    );
  } else {
    mainContent = (
      <>
        <LabelledInput
          label={t("common.email")}
          value={email}
          onChangeText={(text) => { setEmail(text); if (emailError) setEmailError(""); }}
          onBlur={() => validateEmail(email)}
          placeholder={t("forgotPassword.emailPlaceholder")}
          keyboardType="email-address"
          hasError={!!emailError}
          errorText={emailError}
        />
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.terra, shadowColor: colors.terra }, btnDisabledStyle]} onPress={handleRequestReset} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>{btnLabels.request}</Text>
        </TouchableOpacity>
        <View style={styles.hintBox}>
          <Ionicons name="information-circle-outline" size={16} color={C.moss} style={{ marginRight: 6 }} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={styles.hintText}>{t("forgotPassword.spamHint")}</Text>
        </View>
      </>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
      >
        <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />

        <View style={styles.centerBlock}>
          <Text style={styles.emoji}>🔑</Text>
          <Text style={[styles.title, { color: colors.text }]}>{headings.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMid }]}>{headings.subtitle}</Text>
        </View>

        {mainContent}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    // L'écran est affiché sans en-tête de navigation : sous iOS, la marge haute dégage
    // l'encoche et la barre d'état, dont Android tient compte de lui-même.
    paddingTop: Platform.OS === "ios" ? 56 : 24,
    paddingBottom: 48,
  },
  backButton: {
    marginBottom: 32,
  },
  centerBlock: { alignItems: "center", marginBottom: 28 },
  emoji:    { fontSize: 52, marginBottom: 16 },
  title:    { fontSize: 22, fontFamily: F.sans700, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, fontFamily: F.sans400 },

  hintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E2EDD9",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  hintText: { flex: 1, fontSize: 13, color: "#6B8C5A", lineHeight: 18, fontFamily: F.sans400 },

  primaryButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText:     { color: "#FFFFFF", fontSize: 16, fontFamily: F.sans700 },

  successContainer: { alignItems: "center", paddingVertical: 12 },
  successTitle: {
    fontSize: 20,
    fontFamily: F.sans700,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: F.sans400,
  },
});

export default ForgotPasswordScreen;
