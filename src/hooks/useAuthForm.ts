import { useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { parseApiError } from "../utils/i18n";
import {
  isEmailValid,
  isPasswordPresent,
  isPasswordStrong,
  isNameValid,
  isPhoneValid,
  formatPhoneNumber,
} from "../utils/authValidators";
import useSocialAuth from "./useSocialAuth";

/**
 * Messages d'erreur par champ. Une chaîne vide vaut absence d'erreur, ce qui
 * permet de lier directement chaque entrée au champ correspondant sans test
 * d'existence dans la vue.
 */
export interface AuthFormErrors {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
}

/**
 * Surface consommée par les écrans de connexion et d'inscription. Elle est
 * déclarée explicitement afin que les deux écrans s'appuient sur un contrat
 * stable, et non sur ce que l'implémentation se trouve renvoyer.
 */
export interface UseAuthFormReturn {
  name: string;
  setName: (v: string) => void;
  phone: string;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  errors: AuthFormErrors;
  setEmailError: (v: string) => void;
  setPasswordError: (v: string) => void;
  setConfirmPasswordError: (v: string) => void;
  setNameError: (v: string) => void;
  setPhoneError: (v: string) => void;
  isSubmitting: boolean;
  busy: boolean;
  handlePhoneChange: (text: string) => void;
  validateEmail: (v: string) => boolean;
  validatePasswordRequired: (v: string) => boolean;
  validatePasswordStrong: (v: string) => boolean;
  validateName: (v: string) => boolean;
  validatePhone: (v: string) => boolean;
  validateConfirmPassword: (v: string) => boolean;
  handleSubmit: (isLogin: boolean, onOtpRedirect: (userId: string, email: string) => void) => Promise<void>;
  handleGoogleToken: (accessToken: string) => Promise<void>;
  handleAppleSignIn: () => Promise<void>;
  switchMode: () => void;
}

/**
 * Tient l'ensemble du formulaire d'authentification, connexion et inscription
 * confondues : saisie, validation champ par champ, soumission et traduction des
 * refus du serveur en messages rattachés au bon champ. Les deux parcours
 * partagent l'essentiel de leurs champs et de leurs règles, d'où leur
 * réunion ici.
 *
 * @param isLogin Détermine le parcours : la connexion se contente d'une adresse
 * et d'un mot de passe, l'inscription exige en plus le nom, le téléphone, la
 * confirmation et l'acceptation des conditions.
 * @returns Les valeurs de tous les champs et leurs accesseurs, les erreurs par
 * champ, les indicateurs `isSubmitting` et `busy`, les validateurs unitaires à
 * brancher sur la perte de focus, `handleSubmit`, les deux entrées
 * d'authentification par compte tiers et `switchMode`.
 *
 * @remarks Les validateurs sont exposés individuellement pour être appelés à la
 * sortie de chaque champ : signaler l'erreur au fil de la saisie évite de tout
 * découvrir au moment de valider. La règle de robustesse du mot de passe n'est
 * appliquée qu'à l'inscription, un compte ancien pouvant avoir un mot de passe
 * qui ne la respecte plus. Les refus du serveur sont replacés sur le champ
 * qu'ils concernent plutôt qu'affichés en boîte de dialogue, sauf lorsqu'aucun
 * champ n'est désigné. Le cas d'un compte non vérifié n'est pas une erreur mais
 * une redirection vers la saisie du code, d'où le rappel `onOtpRedirect` confié
 * par l'écran. `busy` combine l'envoi local et le chargement du contexte
 * d'authentification, l'un et l'autre devant neutraliser le bouton.
 */
export function useAuthForm(isLogin: boolean = false): UseAuthFormReturn {
  const [name,            setName]            = useState("");
  const [phone,           setPhone]           = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [emailError,           setEmailError]           = useState("");
  const [passwordError,        setPasswordError]        = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [nameError,  setNameError]  = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const { login, register, loading } = useAuth();
  const { t } = useTranslation();
  const socialAuth = useSocialAuth(isLogin ? "login" : "register");

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateEmail = (v: string): boolean => {
    if (!v) { setEmailError(t("common.fillAllFields")); return false; }
    if (!isEmailValid(v)) { setEmailError(t("common.invalidEmail")); return false; }
    setEmailError(""); return true;
  };

  const validatePasswordRequired = (v: string): boolean => {
    if (!isPasswordPresent(v)) { setPasswordError(t("common.fillAllFields")); return false; }
    setPasswordError(""); return true;
  };

  const validatePasswordStrong = (v: string): boolean => {
    if (!validatePasswordRequired(v)) return false;
    if (!isPasswordStrong(v)) { setPasswordError(t("common.invalidPassword")); return false; }
    setPasswordError(""); return true;
  };

  const validateName = (v: string): boolean => {
    if (!isNameValid(v)) { setNameError(t("common.fillAllFields")); return false; }
    setNameError(""); return true;
  };

  const validatePhone = (v: string): boolean => {
    if (!isPhoneValid(v)) { setPhoneError(t("common.invalidPhone")); return false; }
    setPhoneError(""); return true;
  };

  const validateConfirmPassword = (v: string): boolean => {
    if (!v) { setConfirmPasswordError(t("common.fillAllFields")); return false; }
    if (v !== password) { setConfirmPasswordError(t("common.passwordsDoNotMatch")); return false; }
    setConfirmPasswordError(""); return true;
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhoneNumber(text));
    if (phoneError) setPhoneError("");
  };

  const switchMode = () => {
    setEmailError(""); setPasswordError(""); setConfirmPasswordError("");
    setNameError(""); setPhoneError(""); setPhone(""); setConfirmPassword(""); setTermsAccepted(false);
  };

  // ─── Soumission ────────────────────────────────────────────────────────────

  const handleLoginErrors = (result: any, onOtpRedirect: (userId: string, email: string) => void) => {
    if (result.requiresOtp && result.userId) {
      const isExpired = (result.error ?? "").toLowerCase().includes("expired") || (result.error ?? "").toLowerCase().includes("expiré");
      Alert.alert(t("common.info"), isExpired ? t("common.requiresOtpExpired") : t("common.requiresOtp"), [
        { text: t("common.ok"), onPress: () => onOtpRedirect(result.userId, email) },
      ]);
      return;
    }
    if (result.field === "email") { setEmailError(parseApiError(new Error(result.error))); }
    else {
      const isInvalidCreds = result.error.includes("Invalid credentials");
      setPasswordError(isInvalidCreds ? t("common.invalidCredentials") : parseApiError(new Error(result.error)));
    }
  };

  const handleRegisterErrors = (result: any, onOtpRedirect: (userId: string, email: string) => void) => {
    if (result.requiresOtp && result.userId) {
      Alert.alert(t("common.info"), t("common.requiresOtp"), [
        { text: t("common.ok"), onPress: () => onOtpRedirect(result.userId, email) },
      ]);
      return;
    }
    if (result.field === "name") { setNameError(parseApiError(new Error(result.error))); }
    else if (result.field === "phone") {
      setPhoneError(result.error.includes("Invalid phone") ? t("common.invalidPhone") : parseApiError(new Error(result.error)));
    } else if (result.field === "email") {
      setEmailError(result.error.includes("Email already in use") ? t("common.emailAlreadyInUse") : parseApiError(new Error(result.error)));
    } else if (result.field === "password") {
      setPasswordError(
        result.error.includes("Weak password") || result.error.includes("Password must be at least")
          ? t("common.invalidPassword") : parseApiError(new Error(result.error))
      );
    } else {
      Alert.alert(t("common.error"), result.error ? parseApiError(new Error(result.error)) : t("common.registerFailed"));
    }
  };

  const handleSubmit = async (isLogin: boolean, onOtpRedirect: (userId: string, email: string) => void) => {
    setEmailError(""); setPasswordError(""); setConfirmPasswordError(""); setNameError(""); setPhoneError("");

    const isValid = isLogin
      ? validateEmail(email) && validatePasswordRequired(password)
      : validateName(name) && validatePhone(phone) && validateEmail(email) && validatePasswordStrong(password) && validateConfirmPassword(confirmPassword);

    if (!isValid) return;

    if (!isLogin && !termsAccepted) {
      Alert.alert(t("common.error"), t("auth.termsRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        const result = await login(email, password);
        if (!result.success) handleLoginErrors(result, onOtpRedirect);
      } else {
        const result = await register(name, email, password, phone.trim());
        if (!result.success) { handleRegisterErrors(result, onOtpRedirect); return; }
        if (result.userId) onOtpRedirect(result.userId, email);
      }
    } catch (error) {
      Alert.alert(t("common.error"), parseApiError(error) || t("common.unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    name, setName, phone, email, setEmail, password, setPassword,
    confirmPassword, setConfirmPassword, showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword, termsAccepted, setTermsAccepted,
    errors: { email: emailError, password: passwordError, confirmPassword: confirmPasswordError, name: nameError, phone: phoneError },
    setEmailError, setPasswordError, setConfirmPasswordError, setNameError, setPhoneError,
    isSubmitting, busy: loading || isSubmitting,
    handlePhoneChange, validateEmail, validatePasswordRequired, validatePasswordStrong,
    validateName, validatePhone, validateConfirmPassword, handleSubmit, switchMode,
    handleGoogleToken: socialAuth.handleGoogleToken,
    handleAppleSignIn: socialAuth.handleAppleSignIn,
  };
}
