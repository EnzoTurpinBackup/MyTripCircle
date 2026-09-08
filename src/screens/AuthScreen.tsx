/**
 * Écran unique de connexion et d'inscription.
 *
 * Besoin couvert : entrer dans l'application, avec ou sans compte existant, par
 * mot de passe ou par une identité Google ou Apple. Les deux parcours sont réunis
 * ici parce qu'on se trompe souvent de porte : passer de la connexion à
 * l'inscription ne doit coûter ni un changement d'écran ni une ressaisie.
 *
 * Position dans le parcours : atteint depuis WelcomeScreen, qui impose le mode de
 * départ par `route.params.initialMode`. En sortie, OtpScreen quand le serveur exige
 * la vérification du courriel, ForgotPasswordScreen, Terms et Privacy depuis les
 * mentions d'inscription, et retour sur Welcome. Une connexion réussie ne navigue
 * pas : AuthContext publie l'utilisateur et AppNavigator substitue MainStack à AuthStack.
 *
 * Données : `useAuthForm` porte toute la saisie, la validation par champ et la
 * soumission via `login` et `register` d'AuthContext, adossés à `authApi` ; il emprunte
 * à `useSocialAuth` les entrées par compte tiers. L'écran n'ajoute que le choix du mode.
 *
 * États pris en charge : `busy` neutralise les commandes pendant l'échange, les refus
 * du serveur sont replacés champ par champ par le hook et ceux sans champ désigné
 * passent par une boîte de dialogue. Aucun état hors ligne distinct : une tentative
 * sans réseau échoue comme une erreur ordinaire.
 */
import React, { useState } from "react";
import { Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { RootStackParamList } from "../types";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthForm } from "../hooks/useAuthForm";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";

// Referme la fenêtre d'authentification restée ouverte si l'application a été
// relancée pendant l'échange : sans cet appel, le navigateur ne rendrait pas la main.
WebBrowser.maybeCompleteAuthSession();

// Un identifiant client par plateforme, Google n'en admettant pas de commun. Le repli
// sur la chaîne vide évite un plantage au montage quand la variable manque : le bouton
// Google est alors inopérant, sans bloquer l'accès au formulaire classique.
const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     ?? "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
const GOOGLE_WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? "";

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, "Auth">;

/**
 * Compose l'écran d'authentification et arbitre entre les deux formulaires.
 *
 * @param route Paramètres de navigation ; seul `initialMode` est lu, au premier rendu.
 *
 * Effets de bord : ouverture du navigateur système pour l'autorisation Google, feuille
 * Apple présentée par `useSocialAuth`, écriture des jetons en stockage sécurisé par
 * AuthContext dès l'identité établie.
 */
const AuthScreen: React.FC<{ route?: { params?: { initialMode?: "login" | "register" } } }> = ({ route }) => {
  const navigation = useNavigation<AuthScreenNavigationProp>();
  // La connexion est le mode par défaut, seule une demande explicite d'inscription
  // l'écarte. Le paramètre n'initialise que l'état : basculer ensuite reste libre.
  const [isLogin, setIsLogin] = useState(route?.params?.initialMode !== "register");
  const { colors } = useTheme();

  const form = useAuthForm(isLogin);

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  // Animation d'entrée
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  // Traitement du retour Google OAuth
  // Le jeton n'arrive pas en retour d'appel mais par mutation de `googleResponse` à la
  // fermeture du navigateur : il faut observer cette valeur, non attendre la promesse de
  // `googlePromptAsync`. L'abandon est ignoré, sa raison ayant déjà été vue côté Google.
  React.useEffect(() => {
    if (googleResponse?.type === "success" && googleResponse.authentication?.accessToken) {
      form.handleGoogleToken(googleResponse.authentication.accessToken);
    }
  }, [googleResponse]);

  // Un courriel non confirmé n'est pas un échec de connexion : le hook remonte
  // l'identifiant du compte et l'écran dérive vers la saisie du code, avec l'adresse.
  const handleOtpRedirect = (userId: string, email: string) => {
    navigation.navigate("Otp", { userId, email });
  };

  // Changer de mode purge les erreurs et les champs propres à l'inscription — un message
  // survivrait sinon à la disparition de son champ — mais le hook conserve l'adresse et
  // le mot de passe déjà tapés, qui valent pour les deux parcours.
  const handleSwitchMode = () => {
    setIsLogin((prev) => !prev);
    form.switchMode();
  };

  // `googleRequest` est nul tant que la demande n'est pas prête, et le reste si
  // l'identifiant client manque : le bouton est neutralisé plutôt que masqué. Le bouton
  // Apple n'est rendu que sous iOS par SocialAuthButtons, d'où l'absence de garde ici.
  if (isLogin) {
    return (
      <LoginForm
        email={form.email}
        setEmail={form.setEmail}
        emailError={form.errors.email}
        setEmailError={form.setEmailError}
        password={form.password}
        setPassword={form.setPassword}
        passwordError={form.errors.password}
        setPasswordError={form.setPasswordError}
        showPassword={form.showPassword}
        setShowPassword={form.setShowPassword}
        busy={form.busy}
        onSubmit={() => form.handleSubmit(true, handleOtpRedirect)}
        onSwitchToRegister={handleSwitchMode}
        onForgotPassword={() => navigation.navigate("ForgotPassword", {})}
        onBackToWelcome={() => navigation.navigate("Welcome")}
        onGooglePress={() => googlePromptAsync()}
        onApplePress={form.handleAppleSignIn}
        googleDisabled={!googleRequest}
        validateEmail={form.validateEmail}
        validatePasswordRequired={form.validatePasswordRequired}
        colors={colors}
      />
    );
  }

  return (
    <RegisterForm
      name={form.name}
      setName={form.setName}
      nameError={form.errors.name}
      setNameError={form.setNameError}
      email={form.email}
      setEmail={form.setEmail}
      emailError={form.errors.email}
      setEmailError={form.setEmailError}
      phone={form.phone}
      phoneError={form.errors.phone}
      handlePhoneChange={form.handlePhoneChange}
      password={form.password}
      setPassword={form.setPassword}
      passwordError={form.errors.password}
      setPasswordError={form.setPasswordError}
      confirmPassword={form.confirmPassword}
      setConfirmPassword={form.setConfirmPassword}
      confirmPasswordError={form.errors.confirmPassword}
      setConfirmPasswordError={form.setConfirmPasswordError}
      showPassword={form.showPassword}
      setShowPassword={form.setShowPassword}
      showConfirmPassword={form.showConfirmPassword}
      setShowConfirmPassword={form.setShowConfirmPassword}
      termsAccepted={form.termsAccepted}
      setTermsAccepted={form.setTermsAccepted}
      busy={form.busy}
      onSubmit={() => form.handleSubmit(false, handleOtpRedirect)}
      onSwitchToLogin={handleSwitchMode}
      onBackToWelcome={() => navigation.navigate("Welcome")}
      onNavigateTerms={() => navigation.navigate("Terms")}
      onNavigatePrivacy={() => navigation.navigate("Privacy")}
      onGooglePress={() => googlePromptAsync()}
      onApplePress={form.handleAppleSignIn}
      googleDisabled={!googleRequest}
      validateEmail={form.validateEmail}
      validatePasswordStrong={form.validatePasswordStrong}
      validateName={form.validateName}
      validatePhone={form.validatePhone}
      validateConfirmPassword={form.validateConfirmPassword}
      colors={colors}
    />
  );
};

export default AuthScreen;
