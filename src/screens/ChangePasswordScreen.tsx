/**
 * Écran de changement de mot de passe pour un utilisateur déjà connecté.
 *
 * Besoin couvert : remplacer volontairement son mot de passe — par hygiène, ou après
 * l'avoir communiqué — sans passer par la procédure d'oubli, qui suppose l'accès à la
 * boîte de courriel. L'ancien mot de passe est exigé : la session seule ne suffit pas
 * à autoriser le changement, un appareil laissé déverrouillé permettrait sinon de
 * verrouiller le compte de son propriétaire.
 *
 * Position dans le parcours : atteint depuis EditProfileScreen, dans MainStack, et
 * n'est donc accessible qu'authentifié. Il n'a pas d'écran de sortie propre : la
 * réussite comme l'abandon ramènent à l'écran précédent.
 *
 * Données : `changePassword` d'AuthContext porte l'appel au serveur ; `useOfflineDisabled`
 * fournit l'état du réseau. Rien n'est lu au montage, les trois champs partent vides.
 *
 * États pris en charge : enregistrement en cours (libellé d'attente et bouton
 * neutralisé), hors ligne (bouton neutralisé et grisé, l'opération exigeant le
 * serveur), refus ou panne (boîte de dialogue unique, sans détail), succès (boîte de
 * confirmation, champs vidés, retour arrière).
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { F } from "../theme/fonts";
import { useTheme, AppColors } from "../contexts/ThemeContext";
import BackButton from "../components/ui/BackButton";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

// ─── Labelled password input ──────────────────────────────────────────────────
interface PasswordInputProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  colors: AppColors;
}

/**
 * Champ de mot de passe étiqueté, avec bascule d'affichage.
 *
 * Défini ici plutôt que partagé : les trois champs de cet écran sont identiques et
 * n'ont pas d'équivalent ailleurs, les autres formulaires disposant de leurs propres
 * composants de saisie.
 *
 * @param label Intitulé affiché au-dessus de la valeur.
 * @param value Contenu courant du champ, tenu par l'écran.
 * @param onChangeText Rappel de saisie.
 * @param placeholder Texte d'invite affiché quand le champ est vide.
 * @param colors Palette active, transmise plutôt que relue afin que les trois champs
 * partagent exactement celle de l'écran.
 */
const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
}) => {
  const { t } = useTranslation();
  // La visibilité est locale à chaque champ : dévoiler le mot de passe actuel ne doit
  // pas dévoiler le nouveau, que l'on saisit souvent sous le regard d'autrui.
  const [show, setShow] = useState(false);
  return (
    <View style={inputStyles.wrapper}>
      <View style={[inputStyles.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[inputStyles.label, { color: colors.textLight }]}>{label}</Text>
        <View style={inputStyles.row}>
          <TextInput
            style={[inputStyles.value, { color: colors.text }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textLight}
            secureTextEntry={!show}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => setShow(!show)}
            style={inputStyles.eye}
            accessibilityRole="button"
            accessibilityLabel={show ? t("common.a11y.hidePassword") : t("common.a11y.showPassword")}
          >
            <Ionicons
              name={show ? "eye-outline" : "eye-off-outline"}
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const inputStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  box: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  label: {
    fontSize: 13,
    marginBottom: 2,
    fontFamily: F.sans500,
  },
  row: { flexDirection: "row", alignItems: "center" },
  value: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
    fontFamily: F.sans400,
  },
  eye: { padding: 4, marginLeft: 4 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
/**
 * Compose le formulaire de changement de mot de passe.
 *
 * Le composant ne reçoit aucune prop : il est empilé sans paramètre depuis les
 * réglages du profil, et son état se réduit aux trois champs saisis.
 *
 * Effets de bord : un appel au serveur par `changePassword`, et un retour arrière
 * après confirmation. La session n'est pas renouvelée — le serveur la maintient.
 */
const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { changePassword } = useAuth();
  const { colors } = useTheme();
  const { disabled: offlineDisabled, style: offlineStyle } = useOfflineDisabled();

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t("common.error"), t("changePassword.fillAllFields"));
      return;
    }

    // min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
    // La règle reprend celle du serveur pour refuser sur place ce qu'il refuserait de
    // toute façon ; elle ne s'applique qu'au nouveau mot de passe, l'ancien pouvant
    // dater d'une politique antérieure et devant rester saisissable tel quel.
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      Alert.alert(t("common.error"), t("common.invalidPassword"));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t("common.error"), t("changePassword.passwordsDontMatch"));
      return;
    }

    // Reconduire le mot de passe existant viderait la démarche de son sens : le
    // changement est presque toujours motivé par un soupçon de divulgation.
    if (currentPassword === newPassword) {
      Alert.alert(
        t("common.error"),
        t("changePassword.passwordMustBeDifferent"),
      );
      return;
    }

    setLoading(true);

    const success = await changePassword(currentPassword, newPassword);

    setLoading(false);

    if (success) {
      Alert.alert(
        t("changePassword.successTitle"),
        t("changePassword.successMessage"),
      );
      // Les champs sont vidés avant de quitter l'écran : la pile peut le conserver en
      // mémoire, et trois mots de passe en clair n'ont pas à y survivre.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      navigation.goBack();
    } else {
      // Le contexte ne renvoie qu'un booléen : distinguer « mot de passe actuel faux »
      // de « nouveau mot de passe refusé » ferait de cet écran un moyen de tester le
      // mot de passe existant. Le message reste donc volontairement indifférencié.
      Alert.alert(t("common.error"), t("changePassword.errorMessage"));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />

        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.text }]}>{t("changePassword.title")}</Text>
          <Text style={[styles.subtitle, { color: colors.textMid }]}>{t("changePassword.subtitle")}</Text>
        </View>

        {/* Form card */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <PasswordInput
            label={t("changePassword.currentPasswordLabel")}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder={t("changePassword.currentPasswordPlaceholder")}
            colors={colors}
          />

          <PasswordInput
            label={t("changePassword.newPasswordLabel")}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t("changePassword.newPasswordPlaceholder")}
            colors={colors}
          />

          <PasswordInput
            label={t("changePassword.confirmPasswordLabel")}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("changePassword.confirmPasswordPlaceholder")}
            colors={colors}
          />

          {/* Save button */}
          {/* Le bouton est neutralisé hors connexion plutôt que masqué : l'opération
              exige le serveur, et laisser l'utilisateur composer trois champs pour
              essuyer un échec réseau serait plus déroutant qu'un bouton grisé. */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.terra, shadowColor: colors.terra }, (loading || offlineDisabled) && styles.primaryButtonDisabled, offlineStyle]}
            onPress={handleSubmit}
            disabled={loading || offlineDisabled}
            activeOpacity={0.85}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
              {...DECORATIVE_ELEMENT_PROPS}
            />
            <Text style={styles.primaryButtonText}>
              {loading
                ? t("changePassword.saving")
                : t("changePassword.saveButton")}
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 48,
    paddingTop: Platform.OS === "ios" ? 56 : 24,
  },
  backButton: {
    marginBottom: 32,
  },
  headerBlock: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontFamily: F.sans700,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: F.sans400,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: F.sans700,
  },
});

export default ChangePasswordScreen;
