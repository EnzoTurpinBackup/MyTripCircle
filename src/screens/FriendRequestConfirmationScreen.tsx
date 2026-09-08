/**
 * Écran d'accusé de réception après l'envoi d'une demande d'amitié.
 *
 * Besoin couvert : confirmer sans ambiguïté à qui la demande est partie, et
 * distinguer les deux issues possibles — une demande en attente de réponse, ou
 * une amitié déjà nouée lorsque le destinataire avait lui-même sollicité le
 * lien. L'écran enchaîne ensuite sur un nouvel ajout ou le retour à la liste.
 *
 * Position dans le parcours : atteint depuis AddFriendScreen, qui s'y substitue
 * après l'envoi, et depuis FriendsScreen après une demande adressée à une
 * suggestion. En sortie, AddFriend pour recommencer, ou le retour à l'écran
 * précédent.
 *
 * Données : uniquement les paramètres de route. Aucune requête n'est émise ici,
 * l'envoi ayant déjà eu lieu chez l'appelant ; l'issue est portée par le seul
 * indicateur `autoAccepted`.
 *
 * États pris en charge : aucun chargement ni erreur, l'écran n'étant affiché
 * qu'après une opération réussie. L'adresse du destinataire est facultative :
 * une demande adressée à un numéro de téléphone n'en fournit pas, la ligne est
 * alors omise plutôt que laissée vide.
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { F } from "../theme/fonts";
import { useTheme } from "../contexts/ThemeContext";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Teintes d'avatar de repli. Le destinataire n'a pas encore de photo connue de
 * l'application au moment de la confirmation : la carte affiche ses initiales
 * sur l'une de ces couleurs, choisie d'après son nom pour rester la même d'un
 * affichage à l'autre.
 */
const AVATAR_COLORS = ["#C4714A", "#5A8FAA", "#8B70C0", "#6B8C5A", "#C0A040"];

const getInitials = (name: string) => {
  // Le premier et le dernier fragment plutôt que les deux premiers : un nom
  // composé ou un second prénom ne doit pas évincer l'initiale du patronyme.
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + (parts.at(-1)?.charAt(0) ?? "")).toUpperCase();
};

const getAvatarColor = (name: string) =>
  AVATAR_COLORS[(name.codePointAt(0) ?? 0) % AVATAR_COLORS.length];

/**
 * Compose l'accusé de réception d'une demande d'amitié.
 *
 * @param route.params.recipientName Nom affiché du destinataire, seul
 * paramètre obligatoire ; il alimente le titre, la carte, les initiales et la
 * couleur d'avatar.
 * @param route.params.recipientEmail Adresse du destinataire, omise lorsque la
 * demande visait un numéro de téléphone.
 * @param route.params.autoAccepted Vrai lorsque le destinataire avait déjà une
 * demande en attente vers le compte courant : l'amitié est alors établie, et
 * l'écran l'annonce au lieu d'une attente.
 *
 * L'écran est purement déclaratif : aucun appel réseau, aucun état local, aucun
 * effet de bord hormis la navigation déclenchée par les deux boutons.
 */
const FriendRequestConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { recipientName, recipientEmail, autoAccepted } = route.params as {
    recipientName: string;
    recipientEmail?: string;
    autoAccepted?: boolean;
  };

  const initials = getInitials(recipientName);
  const avatarColor = getAvatarColor(recipientName);

  const handleAddAnother = () => {
    // replace : la confirmation cède sa place à la recherche plutôt que de
    // s'empiler avec elle. Enchaîner plusieurs ajouts laisserait sinon autant
    // de confirmations obsolètes à retraverser au retour.
    navigation.replace("AddFriend");
  };

  const handleBackToFriends = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} />

      <View style={styles.container}>
        {/* Icône centrale */}
        <View style={[styles.iconCircle, { backgroundColor: colors.terraLight, borderColor: colors.terra, shadowColor: colors.terra }]}>
          <Ionicons name="people" size={52} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
        </View>

        {/* Titre */}
        <Text style={[styles.title, { color: colors.text }]}>
          {autoAccepted ? t("friendRequestConfirmation.titleAccepted") : t("friendRequestConfirmation.titlePending")}
        </Text>

        {/* Sous-titre */}
        <Text style={[styles.subtitle, { color: colors.textMid }]}>
          <Text style={[styles.subtitleBold, { color: colors.text }]}>{recipientName}</Text>
          {autoAccepted
            ? t("friendRequestConfirmation.subtitleAcceptedRest")
            : t("friendRequestConfirmation.subtitlePendingRest")}
        </Text>

        {/* Carte profil en attente */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.profileNameRow}>
              <Text style={[styles.profileName, { color: colors.text }]}>{recipientName}</Text>
              <View style={[styles.statusBadge, autoAccepted ? styles.statusBadgeAccepted : { backgroundColor: colors.terraLight }]}>
                {autoAccepted ? (
                  <>
                    <Ionicons name="checkmark-circle" size={13} color="#6B8C5A" {...DECORATIVE_ELEMENT_PROPS} />
                    <Text style={[styles.statusText, { color: "#6B8C5A" }]}>
                      {t("friendRequestConfirmation.statusFriend")}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="hourglass-outline" size={13} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
                    <Text style={[styles.statusText, { color: colors.terra }]}>{t("friendRequestConfirmation.statusPending")}</Text>
                  </>
                )}
              </View>
            </View>
            {/* Une demande adressée à un numéro n'a pas d'adresse à montrer :
                la ligne disparaît au lieu d'occuper la carte à vide. */}
            {recipientEmail ? (
              <Text style={[styles.profileEmail, { color: colors.textLight }]}>{recipientEmail}</Text>
            ) : null}
          </View>
        </View>

        {/* Boutons d'action */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: colors.terra, shadowColor: colors.terra }]}
            onPress={handleAddAnother}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add" size={22} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={styles.btnPrimaryText}>{t("friendRequestConfirmation.addAnother")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSecondary, { backgroundColor: colors.bgMid }]}
            onPress={handleBackToFriends}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSecondaryText, { color: colors.textMid }]}>{t("friendRequestConfirmation.backToFriends")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },

  title: {
    fontSize: 32,
    fontFamily: F.sans700,
    marginBottom: 12,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 18,
    fontFamily: F.sans400,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 36,
  },
  subtitleBold: {
    fontFamily: F.sans600,
  },

  // Profile card
  profileCard: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 36,
    shadowColor: "#2A2318",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 22, fontFamily: F.sans700, color: "#FFFFFF" },
  profileInfo: { flex: 1 },
  profileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  profileName: { fontSize: 18, fontFamily: F.sans600, flexShrink: 1 },
  profileEmail: { fontSize: 14, fontFamily: F.sans400, marginTop: 4 },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexShrink: 0,
  },
  statusBadgeAccepted: {
    backgroundColor: "#E2EDD9",
  },
  statusText: {
    fontSize: 14,
    fontFamily: F.sans600,
  },

  // Buttons
  actions: {
    width: "100%",
    gap: 14,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    paddingVertical: 20,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  btnPrimaryText: { fontSize: 19, fontFamily: F.sans600, color: "#FFFFFF" },

  btnSecondary: {
    borderRadius: 18,
    paddingVertical: 19,
    alignItems: "center",
  },
  btnSecondaryText: { fontSize: 19, fontFamily: F.sans600 },
});

export default FriendRequestConfirmationScreen;
