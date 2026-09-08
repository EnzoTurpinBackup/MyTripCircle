import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types";
import ApiService from "../services/ApiService";

interface UseUserProfileOptions {
  onUserUpdated: (user: User) => void;
}

/**
 * Regroupe les modifications du profil de l'utilisateur connecté et garantit
 * que le cache local et l'état applicatif restent alignés sur la réponse du
 * serveur après chaque enregistrement.
 *
 * @param options.onUserUpdated Appelé avec l'utilisateur renvoyé par le
 * serveur, afin que le contexte d'authentification propage la nouvelle version
 * aux écrans.
 * @returns `updateUser` pour l'identité, `updateAvatar` pour la photo et
 * `updateSettings` pour la visibilité du profil.
 *
 * @remarks C'est l'utilisateur renvoyé par le serveur qui est persisté, jamais
 * les données saisies : le serveur peut normaliser ou refuser un champ, et le
 * cache doit refléter l'état réellement enregistré. En l'absence de succès
 * déclaré, ni le cache ni l'état ne sont touchés.
 */
export function useUserProfile({ onUserUpdated }: UseUserProfileOptions) {
  const updateUser = async (userData: Partial<User>): Promise<void> => {
    const filteredData = Object.fromEntries(
      Object.entries(userData).filter(([, value]) => value !== undefined),
    ) as { name?: string; email?: string };

    const res = await ApiService.updateProfile(
      filteredData as { name: string; email: string },
    );

    if (res.success) {
      await AsyncStorage.setItem("user", JSON.stringify(res.user));
      onUserUpdated(res.user);
    }
  };

  const updateAvatar = async (avatar: string): Promise<void> => {
    const res = await ApiService.uploadAvatar(avatar);
    if (res.success) {
      await AsyncStorage.setItem("user", JSON.stringify(res.user));
      onUserUpdated(res.user);
    }
  };

  const updateSettings = async (data: { isPublicProfile: boolean }): Promise<void> => {
    const res = await ApiService.updateSettings(data);
    if (res.success) {
      await AsyncStorage.setItem("user", JSON.stringify(res.user));
      onUserUpdated(res.user);
    }
  };

  return { updateUser, updateAvatar, updateSettings };
}
