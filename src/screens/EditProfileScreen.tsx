/**
 * Écran de modification des informations personnelles : nom affiché, adresse de
 * courriel et photo de profil.
 *
 * Besoin couvert : corriger l'identité sous laquelle les autres membres voient
 * l'utilisateur — c'est ce nom et cette photo qui figurent sur les invitations,
 * dans la liste des amis et sur les voyages partagés.
 *
 * Position dans le parcours : atteint depuis ProfileScreen, par la pastille
 * « modifier » de la bannière ou par la ligne « informations personnelles ».
 * Retour à l'écran appelant après enregistrement. Le changement de mot de passe
 * est renvoyé à ChangePassword : aucun mot de passe ne transite par ce
 * formulaire, qui ne demande donc pas de réauthentification.
 *
 * Données : le profil courant vient d'AuthContext, dont `updateUser` et
 * `updateAvatar` délèguent à useUserProfile puis à userApi. C'est l'utilisateur
 * renvoyé par le serveur, et non la saisie, qui est persisté et propagé aux
 * écrans : le serveur peut normaliser un champ ou refuser une adresse déjà
 * rattachée à un autre compte.
 *
 * États pris en charge : envoi de la photo en cours (l'indicateur remplace
 * l'icône d'appareil photo et les deux commandes de sélection sont neutralisées)
 * et échec d'enregistrement ou d'envoi, rapporté par une alerte. Le refus de
 * l'accès à la photothèque est signalé et interrompt la sélection. L'écran ne
 * valide pas la saisie et ne traite pas la perte de réseau : un enregistrement
 * hors connexion échoue et se solde par l'alerte d'erreur.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { F } from "../theme/fonts";
import * as ImagePicker from "expo-image-picker";
import BackButton from "../components/ui/BackButton";
import { getInitials, getAvatarColor } from "../utils/avatarUtils";
import { useTheme } from "../contexts/ThemeContext";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Compose le formulaire d'identité du compte.
 *
 * Poussé sur la pile sans paramètre de route : l'écran lit le profil dans
 * AuthContext et n'a donc rien à recevoir de l'appelant. Effets de bord
 * notables — il demande l'accès à la photothèque, ouvre le sélecteur d'images du
 * système, envoie la photo puis l'identité au serveur, et fait revenir en
 * arrière une fois l'enregistrement confirmé.
 */
const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { user, updateUser, updateAvatar } = useAuth();
  const { colors } = useTheme();
  // Copie de travail de l'identité : la saisie n'est confirmée qu'à
  // l'enregistrement, et quitter l'écran sans valider laisse le profil intact.
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleSave = async () => {
    try {
      await updateUser({ name, email });
      // Le retour est déclenché sans attendre que l'alerte soit acquittée : la
      // confirmation reste affichée par-dessus l'écran précédent, où le profil
      // déjà mis à jour par le contexte est visible derrière elle.
      Alert.alert(
        t("editProfile.updateSuccessTitle"),
        t("editProfile.updateSuccessMessage"),
      );
      navigation.goBack();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert(t("common.error"), t("editProfile.updateErrorMessage"));
    }
  };

  const handlePickPhoto = async () => {
    // La permission est demandée à l'usage et non au démarrage : l'utilisateur
    // comprend alors ce qu'elle sert. Un refus laisse le reste du formulaire
    // opérant, la photo n'étant pas requise pour enregistrer l'identité.
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), t("editProfile.photoPermissionDenied"));
      return;
    }
    // Cadrage carré imposé au recadrage, l'image étant restituée dans un cercle,
    // et compression franche : la photo voyage encodée dans le corps JSON de la
    // requête, où une prise de vue brute dépasserait la taille admise.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    // Un abandon dans le sélecteur n'est pas une erreur : on ressort sans rien
    // signaler. La garde sur l'encodage couvre le cas d'un fichier illisible.
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    // Repli sur le format le plus courant lorsque le sélecteur ne déclare pas le
    // type : un préfixe de données sans type serait rejeté à la lecture.
    const mimeType = asset.mimeType || "image/jpeg";
    const dataUri = `data:${mimeType};base64,${asset.base64}`;
    try {
      setUploadingAvatar(true);
      await updateAvatar(dataUri);
    } catch (error) {
      console.error("updateAvatar error:", error);
      Alert.alert(t("common.error"), t("editProfile.photoUploadError"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header bar ── */}
        <View style={[styles.headerBar, { backgroundColor: colors.bg }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("editProfile.personalInfo")}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ── Avatar section ── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85} disabled={uploadingAvatar}>
            <View style={styles.avatarWrapper}>
              {/* Les initiales et la couleur suivent le nom en cours de saisie
                  plutôt que celui enregistré : la vignette montre ainsi l'effet
                  de la modification avant qu'elle ne soit confirmée. */}
              <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor(name || user?.name || "") }]}>
                {/* La photo affichée est celle que le serveur a acceptée, sans
                    aperçu local intermédiaire : ce qui est visible ici est donc
                    exactement ce que verront les autres membres. */}
                {user?.avatar ? (
                  /* Informative : signale qu'une photo est déjà en place, ce que le lien « changer » ne dit pas. */
                  <Image source={{ uri: user.avatar }} style={styles.avatarPhoto} accessibilityLabel={t("editProfile.a11y.currentAvatar")} />
                ) : (
                  <Text style={styles.avatarInitials}>{getInitials(name || user?.name || "")}</Text>
                )}
              </View>
              <View style={[styles.cameraOverlay, { backgroundColor: colors.terra }]}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={16} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
                )}
              </View>
            </View>
          </TouchableOpacity>
          {/* Second point d'entrée vers la même action : la vignette seule est
              une cible peu évidente, et les deux commandes sont neutralisées
              ensemble pendant l'envoi pour écarter un double dépôt. */}
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.7} disabled={uploadingAvatar}>
            <Text style={[styles.changeAvatarLink, { color: colors.terra }]}>{t("editProfile.changePhoto")}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Form card ── */}
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Name field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("common.fullName")}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={colors.textLight} style={styles.inputIcon} {...DECORATIVE_ELEMENT_PROPS} />
              <TextInput
                value={name}
                onChangeText={setName}
                style={[styles.input, { color: colors.text }]}
                placeholder={t("editProfile.namePlaceholder")}
                placeholderTextColor={colors.textLight}
              />
            </View>
          </View>

          <View style={[styles.fieldDivider, { backgroundColor: colors.bgMid }]} />

          {/* Email field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("common.email")}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={colors.textLight} style={styles.inputIcon} {...DECORATIVE_ELEMENT_PROPS} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={[styles.input, { color: colors.text }]}
                placeholder={t("editProfile.emailPlaceholder")}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textLight}
              />
            </View>
          </View>
        </View>

        {/* ── Security card ── */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Le mot de passe relève d'un écran distinct : il exige le mot de
              passe actuel, contrôle que ce formulaire n'a pas lieu de demander
              pour une simple correction de nom. */}
          <TouchableOpacity
            style={styles.securityRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("ChangePassword")}
          >
            <View style={styles.securityLeft}>
              <View style={[styles.securityIconBg, { backgroundColor: colors.terraLight }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <Text style={[styles.securityLabel, { color: colors.text }]}>{t("editProfile.changePassword")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
          </TouchableOpacity>
        </View>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.terra }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={styles.saveButtonText}>{t("editProfile.saveChanges")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Header bar
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // L'écran n'est pas enveloppé dans une zone de sécurité : la retenue haute
    // est donc chiffrée par plateforme, iOS devant dégager l'encoche là où
    // Android se contente de la barre d'état.
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: F.sans700,
    textAlign: "center",
    flex: 1,
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2A2318",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
  },
  avatarPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: F.sans700,
    letterSpacing: 1,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  changeAvatarLink: {
    fontSize: 14,
    fontFamily: F.sans600,
  },

  // Form card
  formCard: {
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  fieldGroup: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: F.sans600,
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    fontFamily: F.sans400,
  },
  fieldDivider: {
    height: 1,
    marginHorizontal: 16,
  },

  // Security card
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 24,
    overflow: "hidden",
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  securityLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  securityIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  securityLabel: {
    fontSize: 15,
    fontFamily: F.sans600,
  },

  // Save button
  saveButton: {
    marginHorizontal: 16,
    borderRadius: 10,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A35830",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: F.sans700,
  },
});

export default EditProfileScreen;
