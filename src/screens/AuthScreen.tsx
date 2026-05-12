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

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     ?? "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
const GOOGLE_WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? "";

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, "Auth">;

const AuthScreen: React.FC<{ route?: { params?: { initialMode?: "login" | "register" } } }> = ({ route }) => {
  const navigation = useNavigation<AuthScreenNavigationProp>();
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
  React.useEffect(() => {
    if (googleResponse?.type === "success" && googleResponse.authentication?.accessToken) {
      form.handleGoogleToken(googleResponse.authentication.accessToken);
    }
  }, [googleResponse]);

  const handleOtpRedirect = (userId: string, email: string) => {
    navigation.navigate("Otp", { userId, email });
  };

  const handleSwitchMode = () => {
    setIsLogin((prev) => !prev);
    form.switchMode();
  };

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
