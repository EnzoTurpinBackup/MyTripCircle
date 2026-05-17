import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
  TouchableOpacity,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useAuth } from "../contexts/AuthContext";
import ApiService from "../services/ApiService";
import { useTranslation } from "react-i18next";
import { parseApiError } from "../utils/i18n";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";
import BackButton from "../components/ui/BackButton";

type OtpScreenRouteProp = RouteProp<RootStackParamList, "Otp">;
type OtpScreenNavigationProp = StackNavigationProp<RootStackParamList, "Otp">;

const OTP_LENGTH = 6;
const RESEND_DELAY = 60;
const OTP_KEYS = ["otp-0", "otp-1", "otp-2", "otp-3", "otp-4", "otp-5"] as const;

const OtpScreen: React.FC = () => {
  const [digits, setDigits] = useState<string[]>(new Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(RESEND_DELAY);
  const [canResend, setCanResend] = useState(false);
  const [hasResent, setHasResent] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>(new Array(OTP_LENGTH).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const route = useRoute<OtpScreenRouteProp>();
  const navigation = useNavigation<OtpScreenNavigationProp>();
  const { userId, email } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();

  const { verifyOtp } = useAuth();

  // Démarrage du chrono
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current ?? undefined);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current ?? undefined);
  }, []);

  const otp = digits.join("");

  const handleDigitChange = (text: string, index: number) => {
    const numeric = text.replaceAll(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = numeric;
    setDigits(next);
    if (otpError) setOtpError("");
    if (numeric && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    setOtpError("");
    if (otp.length !== OTP_LENGTH) {
      setOtpError(t("otp.codeLengthError"));
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(userId, otp);
      if (!result.success) {
        setOtpError(
          result.error
            ? parseApiError(new Error(result.error))
            : t("otp.invalidCodeError"),
        );
      }
    } catch (e) {
      if (__DEV__) console.warn("[OtpScreen] Erreur vérification OTP:", e);
      setOtpError(t("otp.genericVerifyError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || hasResent) return;
    try {
      await ApiService.resendOtp(userId);
      setHasResent(true);
      setCanResend(false);
      setDigits(new Array(OTP_LENGTH).fill(""));
      setOtpError("");
      Alert.alert(
        t("otp.resendAlertTitle"),
        email ? t("otp.resendAlertWithEmail", { email }) : t("otp.resendAlertNoEmail"),
      );
    } catch (e: unknown) {
      Alert.alert(
        t("otp.resendErrorTitle"),
        parseApiError(e) || t("otp.resendErrorMessage"),
      );
    }
  };

  let resendEl: React.ReactNode;
  if (!canResend && !hasResent) {
    resendEl = <Text style={[styles.resendText, { color: colors.textLight }]}>{t("otp.resendCountdown", { count: countdown })}</Text>;
  } else if (hasResent) {
    resendEl = <Text style={[styles.resendDone, { color: colors.textMid }]}>{t("otp.resendDone")}</Text>;
  } else {
    resendEl = (
      <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
        <Text style={[styles.resendLink, { color: colors.terra }]}>{t("otp.resendLink")}</Text>
      </TouchableOpacity>
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
        {/* Back button */}
        <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />

        {/* Titre + sous-titre */}
        <View style={styles.centerBlock}>
          <Text style={styles.emoji}>✉️</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t("otp.title")}</Text>
          <Text style={[styles.subtitle, { color: colors.textMid }]}>
            {t("otp.subtitlePrefix")}
            {email ? <Text style={[styles.emailHighlight, { color: colors.text }]}>{email}</Text> : t("otp.subtitleEmailFallback")}
          </Text>
        </View>

        {/* Cases OTP */}
        <View style={styles.boxesRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={OTP_KEYS[i]}
              ref={(ref) => { inputRefs.current[i] = ref; }}
              style={[
                styles.otpBox,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                !!digit && [styles.otpBoxFilled, { borderColor: colors.terra }],
                !!otpError && styles.otpBoxError,
              ]}
              value={digit}
              placeholder={t("otp.otpBoxPlaceholder")}
              placeholderTextColor={colors.textLight}
              onChangeText={(text) => handleDigitChange(text, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={i === 0}
              textAlign="center"
              selectionColor={colors.terra}
              caretHidden
            />
          ))}
        </View>

        {!!otpError && <Text style={styles.errorText}>{otpError}</Text>}

        {/* Bouton vérifier */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.terra, shadowColor: colors.terra },
            (loading || otp.length !== OTP_LENGTH) && styles.primaryButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={loading || otp.length !== OTP_LENGTH}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? t("otp.verifying") : t("otp.verifyButton")}
          </Text>
        </TouchableOpacity>

        {/* Renvoyer le code */}
        <View style={styles.resendRow}>{resendEl}</View>
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
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: Platform.OS === "ios" ? 56 : 24,
  },
  backButton: {
    marginBottom: 32,
  },
  centerBlock: {
    alignItems: "center",
    marginBottom: 36,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontFamily: F.sans700,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: F.sans400,
  },
  emailHighlight: {
    fontFamily: F.sans600,
  },
  boxesRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 22,
    fontFamily: F.sans700,
  },
  otpBoxFilled: {
    borderWidth: 2,
  },
  otpBoxError: {
    borderColor: "#C04040",
  },
  errorText: {
    color: "#C04040",
    fontSize: 13,
    textAlign: "center",
    fontFamily: F.sans400,
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: F.sans700,
  },
  resendRow: {
    alignItems: "center",
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    fontFamily: F.sans400,
  },
  resendCountdown: {
    fontFamily: F.sans600,
  },
  resendLink: {
    fontSize: 14,
    fontFamily: F.sans600,
  },
  resendDone: {
    fontSize: 14,
    fontFamily: F.sans400,
  },
});

export default OtpScreen;
