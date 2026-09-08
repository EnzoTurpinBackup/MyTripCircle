/**
 * Écran de saisie du code à usage unique envoyé par courriel.
 *
 * Besoin couvert : prouver que l'adresse déclarée appartient bien à la personne qui
 * s'inscrit ou se connecte, en recopiant les six chiffres reçus. C'est le seul point
 * du parcours où l'application vérifie l'adresse ; tant qu'il n'est pas franchi,
 * aucune session n'est ouverte.
 *
 * Position dans le parcours : atteint depuis AuthScreen, à l'inscription comme à la
 * connexion d'un compte resté non vérifié, l'identifiant du compte et l'adresse étant
 * transmis en paramètres de route. Il n'y a pas d'écran de sortie : un code accepté
 * fait publier l'utilisateur par AuthContext, et AppNavigator remplace alors AuthStack
 * par MainStack. Le retour arrière ramène au formulaire d'authentification.
 *
 * Données : `verifyOtp` d'AuthContext soumet le code et, si le serveur délivre des
 * jetons, ouvre la session ; `ApiService.resendOtp` déclenche un nouvel envoi. Rien
 * n'est lu au montage — l'écran ne dispose que de ce que la route lui a passé.
 *
 * États pris en charge : compte à rebours avant que le renvoi ne devienne possible,
 * envoi en cours (le bouton porte un libellé d'attente et se neutralise), code refusé
 * (message sous les cases et bordure d'erreur), renvoi effectué (le lien cède la place
 * à une confirmation). Un échec du renvoi s'annonce par une boîte de dialogue. Le
 * hors-ligne n'est pas traité à part : sans réseau, la vérification échoue avec le
 * message générique.
 */
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

/** Longueur du code émise par le serveur ; commande le nombre de cases et la garde de saisie. */
const OTP_LENGTH = 6;

/**
 * Délai, en secondes, avant que le renvoi du code ne soit proposé. Il correspond au
 * temps qu'un courriel met raisonnablement à arriver : offrir le renvoi plus tôt
 * inciterait à multiplier les demandes, que le serveur limite par ailleurs en cadence.
 */
const RESEND_DELAY = 60;

/**
 * Clés de rendu fixes pour les cases. Les chiffres saisis ne peuvent servir de clé —
 * ils se répètent et changent — et l'indice de boucle est proscrit ; ces identifiants
 * constants garantissent que React conserve chaque champ, et donc son focus, d'un
 * rendu à l'autre.
 */
const OTP_KEYS = ["otp-0", "otp-1", "otp-2", "otp-3", "otp-4", "otp-5"] as const;

/**
 * Compose l'écran de vérification du code.
 *
 * Le composant ne reçoit pas de prop : `userId` et `email` sont lus dans
 * `route.params`, le premier identifiant le compte à vérifier auprès du serveur, le
 * second ne servant qu'à rappeler à l'utilisateur où le code a été adressé.
 *
 * Effets de bord : un intervalle d'une seconde démarre au montage pour le compte à
 * rebours et est libéré au démontage ; la vérification acceptée fait écrire les jetons
 * en stockage sécurisé par AuthContext, ce qui change la pile affichée sans que cet
 * écran n'appelle la navigation.
 */
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
  // Le décompte n'est lancé qu'au montage et n'est jamais relancé : un seul renvoi est
  // proposé, `hasResent` fermant définitivement l'offre. Au-delà, l'utilisateur doit
  // repasser par le formulaire de connexion, ce qui régénère un code côté serveur.
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

  // Ne retenir que le dernier chiffre couvre deux gestes : la saisie dans une case déjà
  // remplie, où le champ transmet l'ancien et le nouveau caractère, et le remplissage
  // automatique du code par le système, qui pousse la chaîne entière dans un seul champ.
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

  // Le retour arrière sur une case déjà vide recule le focus : sans cela, corriger un
  // chiffre exigerait de viser la case précédente au doigt, alors que la progression
  // s'est faite automatiquement. La suppression du contenu reste à la charge du champ.
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
      // Le succès ne déclenche aucune navigation : c'est la publication de l'utilisateur
      // par AuthContext qui fait basculer AppNavigator sur la pile authentifiée. Naviguer
      // ici démonterait l'écran pendant que le contexte se met à jour.
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
      // Le code précédent est invalidé par l'envoi du nouveau : vider les cases évite
      // qu'un chiffre déjà saisi ne se mêle au code fraîchement reçu.
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

  // Les trois états du bloc de renvoi sont exclusifs et se succèdent dans cet ordre :
  // attente du délai, offre de renvoi, puis confirmation définitive. `hasResent` est
  // testé avant `canResend` pour que la confirmation ne repasse jamais en lien actif.
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
      {/* Le contenu tient dans un écran : le défilement est coupé pour qu'un balayage
          malencontreux ne déplace pas les cases pendant la frappe. La vue conserve en
          revanche `keyboardShouldPersistTaps`, sans quoi le premier appui sur le bouton
          ne servirait qu'à refermer le clavier numérique resté ouvert. */}
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
              // Seule la première case prend le focus au montage : la progression est
              // ensuite conduite par la saisie, et le clavier numérique s'ouvre d'emblée.
              autoFocus={i === 0}
              textAlign="center"
              selectionColor={colors.terra}
              // Le curseur est masqué parce qu'une case ne contient qu'un caractère
              // centré : il n'indiquerait aucune position utile et perturberait le cadrage.
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
    // L'écran n'a pas d'en-tête de navigation : sous iOS, la marge haute dégage
    // l'encoche et la barre d'état, qu'Android gère lui-même.
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
