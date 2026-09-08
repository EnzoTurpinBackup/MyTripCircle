import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { userApi } from "../services/api/userApi";

const PUSH_TOKEN_KEY = "@mytripcircle_push_token_v1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Demande l'autorisation d'envoyer des notifications puis déclare le jeton de
 * l'appareil au serveur, condition pour que celui-ci puisse alerter
 * l'utilisateur d'une invitation ou d'une modification de voyage.
 *
 * @returns Une promesse résolue une fois la tentative terminée, qu'elle ait
 * abouti ou non : l'appelant poursuit son démarrage sans se soucier du
 * résultat.
 *
 * @remarks Le jeton est mémorisé localement et n'est réenvoyé au serveur que
 * s'il a changé, un jeton restant stable entre deux lancements. Un refus de
 * l'utilisateur interrompt la procédure sans erreur, la notification n'étant
 * pas indispensable au fonctionnement. Les échecs sont absorbés : ni le
 * simulateur ni Expo Go ne disposent des droits nécessaires, et une exception y
 * serait attendue plutôt qu'anormale. Le web est écarté, l'API n'y étant pas
 * disponible.
 */
export async function requestPermissionAndRegisterToken(): Promise<void> {
  if (Platform.OS === "web") return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;

    const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (stored === token) return;

    await userApi.registerPushToken(token);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch {
    // Silencieux : simulateur ou Expo Go sans entitlement aps-environment
  }
}

/**
 * Oublie le jeton mémorisé, à la déconnexion. Sans cet effacement, le prochain
 * utilisateur de l'appareil verrait le jeton considéré comme déjà déclaré et ne
 * serait donc jamais rattaché à ses propres notifications.
 */
export async function clearStoredPushToken(): Promise<void> {
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}
