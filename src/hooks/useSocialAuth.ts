import { useState } from "react";
import { Alert } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { parseApiError } from "../utils/i18n";

interface UseSocialAuthReturn {
  isSocialSubmitting: boolean;
  handleGoogleToken: (accessToken: string) => Promise<void>;
  handleAppleSignIn: () => Promise<void>;
}

const useSocialAuth = (mode: "login" | "register" = "register"): UseSocialAuthReturn => {
  const [isSocialSubmitting, setIsSocialSubmitting] = useState(false);
  const { loginWithGoogle, loginWithApple } = useAuth();
  const { t } = useTranslation();

  const handleGoogleToken = async (accessToken: string) => {
    setIsSocialSubmitting(true);
    try {
      const result = await loginWithGoogle(accessToken, mode);
      if (!result.success) {
        Alert.alert(
          t("common.error"),
          result.error ? parseApiError(new Error(result.error)) : t("common.unexpectedError"),
        );
      }
    } catch (e) {
      if (__DEV__) console.warn("[useSocialAuth] Erreur authentification sociale:", e);
      Alert.alert(t("common.error"), t("common.unexpectedError"));
    } finally {
      setIsSocialSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsSocialSubmitting(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        const result = await loginWithApple(
          credential.identityToken,
          credential.email ?? undefined,
          credential.fullName ?? undefined,
          mode,
        );
        if (!result.success) {
          Alert.alert(
            t("common.error"),
            result.error ? parseApiError(new Error(result.error)) : t("common.unexpectedError"),
          );
        }
      }
    } catch (e: any) {
      if (e.code !== "ERR_CANCELED") {
        Alert.alert(t("common.error"), parseApiError(e) || t("common.unexpectedError"));
      }
    } finally {
      setIsSocialSubmitting(false);
    }
  };

  return { isSocialSubmitting, handleGoogleToken, handleAppleSignIn };
};

export default useSocialAuth;
