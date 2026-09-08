/**
 * Écran d'atterrissage d'un lien d'invitation personnel : quelqu'un a partagé
 * son lien d'amitié, le destinataire l'ouvre et décide de nouer ou non la
 * relation.
 *
 * Besoin couvert : savoir qui invite avant d'accepter — le lien circule par
 * message ou réseau social, sans contexte — puis établir le lien d'un seul
 * geste, sans que l'émetteur ait eu à connaître l'adresse du destinataire.
 *
 * Position dans le parcours : atteint par le deep link
 * `mytripcircle://friend-invite/:token`, distinct de
 * `mytripcircle://invitation/:token` qui, lui, mène à InvitationScreen et
 * concerne l'adhésion à un voyage. L'écran est déclaré dans MainStack comme
 * dans AuthStack : un visiteur non connecté l'atteint donc aussi. Dans ce cas
 * la fiche de l'émetteur reste consultable, mais l'acceptation est remplacée
 * par une invitation à se connecter ou à créer un compte, qui renvoie vers
 * AuthScreen. En sortie une fois le lien noué, FriendsScreen.
 *
 * Données : le jeton vient des paramètres de route ; l'identité de l'émetteur
 * et l'acceptation passent par ApiService, c'est-à-dire friendsApi
 * (`getFriendInviteByToken` puis `acceptFriendInviteLink`). Aucun contexte
 * n'est alimenté : c'est FriendsScreen qui redemandera ses listes à sa prise de
 * focus. AuthContext ne sert qu'à reconnaître le compte courant.
 *
 * États pris en charge, portés par une union discriminée plutôt que par des
 * drapeaux indépendants — les combinaisons impossibles cessent ainsi d'être
 * représentables : chargement (squelette), lien invalide ou expiré, lien émis
 * par soi-même, acceptation en cours, relation nouée, relation déjà existante,
 * et l'état nominal où l'émetteur est présenté avant décision. Hors connexion,
 * le bouton d'acceptation est neutralisé.
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { ApiService } from "../services/ApiService";
import { useAuth } from "../contexts/AuthContext";
import { RootStackParamList } from "../types";
import { useTranslation } from "react-i18next";
import { F } from "../theme/fonts";
import { parseApiError } from "../utils/i18n";
import { getInitials, getAvatarColor } from "../utils/avatarUtils";
import { useTheme } from "../contexts/ThemeContext";
import SkeletonBox from "../components/SkeletonBox";
import BackButton from "../components/ui/BackButton";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";


type RouteT = RouteProp<RootStackParamList, "FriendInvitation">;

/**
 * États successifs de l'écran. `self` et `already_friends` sont des issues à
 * part entière et non des erreurs : elles n'appellent aucune correction de la
 * part de l'utilisateur, seulement une explication et une sortie.
 */
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; ownerName: string; ownerAvatar: string | null; ownerId: string }
  | { status: "self" }
  | { status: "already_friends"; ownerName: string }
  | { status: "success"; ownerName: string }
  | { status: "accepting" };

/**
 * Présente l'émetteur d'un lien d'invitation personnel et permet d'y donner
 * suite.
 *
 * @param route.params.token Jeton extrait du lien, seul paramètre de l'écran ;
 * il identifie à la fois l'invitation et son émetteur.
 *
 * Effets de bord notables — l'identité de l'émetteur est demandée au réseau dès
 * le montage et à chaque changement de jeton ; l'acceptation écrit la relation
 * côté serveur. Un visiteur non connecté est redirigé vers AuthScreen.
 */
const FriendInvitationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteT>();
  const { token } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const { disabled: offlineDisabled, style: offlineStyle } = useOfflineDisabled();

  const [state, setState] = useState<State>({ status: "loading" });
  const { t } = useTranslation();

  // Le jeton est en dépendance et non le seul montage : ouvrir un second lien
  // alors que l'écran est déjà affiché ne le remonte pas, il faut alors
  // recharger l'identité de l'émetteur.
  useEffect(() => {
    loadLinkInfo();
  }, [token]);

  const loadLinkInfo = async () => {
    setState({ status: "loading" });
    try {
      const data = await ApiService.getFriendInviteByToken(token);
      // Ouvrir son propre lien arrive couramment, ne serait-ce que pour le
      // vérifier avant de l'envoyer ; mieux vaut l'expliquer que laisser le
      // serveur refuser l'acceptation. La comparaison est sans effet pour un
      // visiteur non connecté, dont l'identifiant est indéfini.
      if (data.userId === user?.id) {
        setState({ status: "self" });
        return;
      }
      setState({ status: "ready", ownerName: data.name, ownerAvatar: data.avatar, ownerId: data.userId });
    } catch (error: unknown) {
      setState({
        status: "error",
        message: parseApiError(error) || t("friendInvitation.errorFallback"),
      });
    }
  };

  const handleAccept = async () => {
    if (!user) {
      navigation.navigate("Auth", { initialMode: "login" });
      return;
    }

    const current = state;
    if (current.status !== "ready") return;
    // Le nom est retenu avant de basculer sur « acceptation en cours » : cet
    // état ne le porte pas, et les écrans de réussite comme de relation déjà
    // établie doivent pouvoir nommer l'émetteur.
    const ownerName = current.ownerName;

    setState({ status: "accepting" });
    try {
      await ApiService.acceptFriendInviteLink(token);
      setState({ status: "success", ownerName });
    } catch (error: unknown) {
      const raw =
        error instanceof Error ? error.message : "";
      // Le serveur ne distingue pas ce refus par un code : la relation déjà
      // établie n'est reconnaissable qu'au libellé, d'où la comparaison dans
      // les deux langues. Toute autre défaillance reste une erreur affichée.
      if (raw.includes("déjà amis") || raw.includes("Already friends")) {
        setState({ status: "already_friends", ownerName });
      } else {
        setState({
          status: "error",
          message:
            parseApiError(error) || t("friendInvitation.acceptErrorFallback"),
        });
      }
    }
  };

  const renderContent = () => {
    switch (state.status) {
      case "loading":
        return (
          <View style={styles.centerBox}>
            <SkeletonBox width={100} height={100} borderRadius={50} style={{ marginBottom: 20 }} />
            <SkeletonBox width={180} height={22} borderRadius={8} style={{ marginBottom: 10 }} />
            <SkeletonBox width={130} height={14} borderRadius={6} style={{ marginBottom: 32 }} />
            <SkeletonBox width={260} height={50} borderRadius={14} />
          </View>
        );

      case "error":
        return (
          <View style={styles.centerBox}>
            <View style={[styles.iconCircle, { backgroundColor: "#FDEAEA" }]}>
              <Ionicons name="close-circle-outline" size={52} color="#C04040" {...DECORATIVE_ELEMENT_PROPS} />
            </View>
            <Text style={[styles.titleText, { color: colors.text }]}>{t("friendInvitation.errorTitle")}</Text>
            <Text style={[styles.subtitleText, { color: colors.textMid }]}>{state.message}</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.terra, shadowColor: colors.terra }]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{t("friendInvitation.back")}</Text>
            </TouchableOpacity>
          </View>
        );

      case "self":
        return (
          <View style={styles.centerBox}>
            <View style={[styles.iconCircle, { backgroundColor: colors.terraLight }]}>
              <Ionicons name="person-outline" size={52} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
            </View>
            <Text style={[styles.titleText, { color: colors.text }]}>{t("friendInvitation.selfTitle")}</Text>
            <Text style={[styles.subtitleText, { color: colors.textMid }]}>{t("friendInvitation.selfSubtitle")}</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.terra, shadowColor: colors.terra }]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{t("friendInvitation.back")}</Text>
            </TouchableOpacity>
          </View>
        );

      case "already_friends":
        return (
          <View style={styles.centerBox}>
            <View style={[styles.iconCircle, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="checkmark-circle-outline" size={52} color="#4CAF50" {...DECORATIVE_ELEMENT_PROPS} />
            </View>
            <Text style={[styles.titleText, { color: colors.text }]}>{t("friendInvitation.alreadyFriendsTitle")}</Text>
            <Text style={[styles.subtitleText, { color: colors.textMid }]}>
              {t("friendInvitation.alreadyFriendsSubtitle", { name: state.ownerName })}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.terra, shadowColor: colors.terra }]}
              onPress={() => navigation.navigate("Friends")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{t("friendInvitation.viewFriends")}</Text>
            </TouchableOpacity>
          </View>
        );

      case "success":
        return (
          <View style={styles.centerBox}>
            <View style={[styles.iconCircle, { backgroundColor: "#E2EDD9" }]}>
              <Ionicons name="people" size={52} color="#6B8C5A" {...DECORATIVE_ELEMENT_PROPS} />
            </View>
            <Text style={[styles.titleText, { color: colors.text }]}>{t("friendInvitation.successTitle")}</Text>
            <Text style={[styles.subtitleText, { color: colors.textMid }]}>
              {t("friendInvitation.successSubtitle", { name: state.ownerName })}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.terra, shadowColor: colors.terra }]}
              onPress={() => navigation.navigate("Friends")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{t("friendInvitation.viewFriends")}</Text>
            </TouchableOpacity>
          </View>
        );

      case "accepting":
        return (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.terra} />
            <Text style={[styles.loadingText, { color: colors.textMid }]}>{t("friendInvitation.accepting")}</Text>
          </View>
        );

      case "ready": {
        const { ownerName, ownerAvatar } = state;
        return (
          <View style={styles.centerBox}>
            <View style={styles.avatarWrap}>
              {ownerAvatar ? (
                /* Décorative : le nom de l'hôte est lu juste en dessous. */
                <Image source={{ uri: ownerAvatar }} style={styles.avatarImage} {...DECORATIVE_ELEMENT_PROPS} />
              ) : (
                <View style={[styles.avatarImage, styles.avatarFallback, { backgroundColor: getAvatarColor(ownerName) }]}>
                  <Text style={styles.avatarInitials}>{getInitials(ownerName)}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.eyebrowText, { color: colors.textLight }]}>{t("friendInvitation.eyebrow")}</Text>
            <Text style={[styles.titleText, { color: colors.text }]}>{ownerName}</Text>
            <Text style={[styles.subtitleText, { color: colors.textMid }]}>{t("friendInvitation.readySubtitle")}</Text>

            {/* L'écran est aussi déclaré dans AuthStack : un visiteur non
                connecté voit l'émetteur mais se voit proposer la connexion ou
                la création de compte à la place de l'acceptation, celle-ci
                supposant un compte auquel rattacher la relation. */}
            {user ? (
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.terra, shadowColor: colors.terra }, offlineStyle]} onPress={handleAccept} disabled={offlineDisabled} activeOpacity={0.85}>
                <Ionicons name="person-add-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} {...DECORATIVE_ELEMENT_PROPS} />
                <Text style={styles.primaryBtnText}>{t("friendInvitation.addAsFriend")}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.terra, shadowColor: colors.terra }]}
                  onPress={() => navigation.navigate("Auth", { initialMode: "login" })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>{t("friendInvitation.loginToAccept")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { backgroundColor: colors.bg, borderColor: colors.terra }]}
                  onPress={() => navigation.navigate("Auth", { initialMode: "register" })}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.secondaryBtnText, { color: colors.terra }]}>{t("friendInvitation.createAccount")}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Refuser revient à quitter l'écran : aucun refus n'est notifié à
                l'émetteur, un lien non consommé restant simplement valide. */}
            <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={[styles.ghostBtnText, { color: colors.textLight }]}>{t("friendInvitation.decline")}</Text>
            </TouchableOpacity>
          </View>
        );
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} />
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
      </View>
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrap: {
    marginBottom: 24,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 36,
    fontFamily: F.sans700,
    color: "#FFFFFF",
  },
  eyebrowText: {
    fontSize: 13,
    fontFamily: F.sans500,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  titleText: {
    fontSize: 26,
    fontFamily: F.sans700,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitleText: {
    fontSize: 16,
    fontFamily: F.sans400,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: F.sans400,
    marginTop: 16,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: "100%",
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 17,
    fontFamily: F.sans600,
    color: "#FFFFFF",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    marginBottom: 12,
  },
  secondaryBtnText: {
    fontSize: 17,
    fontFamily: F.sans600,
  },
  ghostBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  ghostBtnText: {
    fontSize: 15,
    fontFamily: F.sans400,
  },
});

export default FriendInvitationScreen;
