/**
 * Contexte d'authentification — identité de l'utilisateur et cycle de vie de sa session.
 *
 * Cet état est global parce qu'il conditionne le rendu de l'arbre entier : le routeur
 * racine choisit la pile connectée ou la pile publique à partir de `user`, et les autres
 * contextes (voyages, amis, abonnement, notifications) s'y branchent pour savoir quand
 * charger ou vider leurs données. Le tenir dans un écran obligerait chaque consommateur à
 * le faire remonter, et deux copies concurrentes pourraient diverger le temps d'un rendu.
 *
 * Consommateurs : la navigation racine, les écrans d'authentification et de profil, et les
 * providers `TripsProvider`, `FriendsProvider`, `SubscriptionProvider` et
 * `NotificationProvider`, qui lisent tous `user` et `loading` via `useAuth`.
 *
 * Réinitialisation — `user` repasse à `null` dans trois cas seulement : `logout`,
 * `deleteAccount`, et la réception d'un statut 401 par la couche API, qui déclenche le
 * rappel enregistré au montage. Ce dernier est la seule sortie automatique : aucun minuteur
 * local ne surveille la durée de vie du jeton, l'expiration n'est constatée qu'au premier
 * appel refusé par le serveur.
 *
 * Garanties en cas de perte de réseau ou de session expirée :
 * - la session survit au redémarrage de l'application, `loadUser` relisant le profil depuis
 *   le stockage sécurisé ; aucune requête réseau n'est nécessaire pour la rouvrir ;
 * - en contrepartie, hors ligne l'utilisateur reste connecté avec un profil possiblement
 *   périmé : c'est son identité qui est garantie, jamais la fraîcheur de ses données ;
 * - un jeton révoqué côté serveur reste invisible tant qu'aucun appel authentifié n'a lieu ;
 * - aucune action d'écriture n'est mise en file d'attente : hors ligne elle échoue et
 *   retourne `success: false`, sans reprise ultérieure ni notification différée.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import * as secureStorage from "../utils/secureStorage";
import { User } from "../types";
import ApiService from "../services/ApiService";
import { setUnauthorizedCallback, clearUnauthorizedCallback } from "../services/api/apiCore";
import i18n, { parseApiError as translateApiMessage } from "../utils/i18n";
import { useUserProfile } from "../hooks/useUserProfile";

/** Champ de formulaire mis en cause par le serveur, pour le surligner à la bonne place. */
export type AuthField = "email" | "password" | "name" | "phone";
/**
 * Issue d'une opération d'authentification.
 *
 * L'échec porte un message déjà traduit — la couche appelante ne fait jamais de mapping
 * d'erreur elle-même. Le couple `requiresOtp` / `userId` décrit un cas qui n'est pas une
 * erreur de saisie : le compte existe mais n'est pas vérifié, et l'écran doit rediriger
 * vers la saisie du code plutôt qu'afficher une alerte.
 */
export type AuthResult =
  | { success: true }
  | { success: false; error: string; field?: AuthField; requiresOtp?: boolean; userId?: string };

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ) => Promise<AuthResult & { userId?: string }>;
  loginWithGoogle: (accessToken: string, mode: "login" | "register") => Promise<AuthResult>;
  loginWithApple: (
    identityToken: string,
    email?: string,
    fullName?: { givenName?: string | null; familyName?: string | null } | null,
    mode?: "login" | "register",
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; scheduledAt?: Date }>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  updateAvatar: (avatar: string) => Promise<void>;
  updateSettings: (data: { isPublicProfile: boolean }) => Promise<void>;
  verifyOtp: (
    userId: string,
    otp: string,
  ) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<boolean>;
  loginWithToken: (token: string, user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Donne accès à la session courante et aux actions d'authentification.
 *
 * @returns L'état de session (`user`, `loading`) et les actions du contexte.
 * @throws Error lorsque le hook est appelé hors d'un `AuthProvider`. Retourner `undefined`
 * ferait échouer silencieusement les gardes de navigation, qui interpréteraient l'absence
 * de contexte comme une absence d'utilisateur et ouvriraient la pile publique.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Fournit la session à l'arbre React.
 *
 * `loading` reste vrai tant que le stockage sécurisé n'a pas répondu, et c'est ce drapeau
 * — non `user` — que les contextes dépendants doivent attendre avant de purger leurs
 * caches : sur la première frame `user` vaut `null` sans qu'aucune déconnexion ait eu lieu.
 *
 * Les deux effets de montage sont séparés à dessein. Le premier relit le profil persisté et
 * ne doit s'exécuter qu'une fois. Le second enregistre le rappel de déconnexion forcée
 * auprès de la couche API et doit impérativement le retirer au démontage, faute de quoi un
 * intercepteur survivant appellerait un `setState` d'un provider démonté.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  // Enregistre le callback de déconnexion forcée en cas de 401 (token expiré côté serveur)
  useEffect(() => {
    setUnauthorizedCallback(() => setUser(null));
    return () => clearUnauthorizedCallback();
  }, []);

  /**
   * Extrait un message exploitable d'une erreur remontée par la couche API.
   *
   * Les rejets arrivent ici sous forme d'`Error` dont le message est le corps JSON de la
   * réponse. Quand ce corps n'est pas du JSON — coupure réseau, page d'erreur d'un
   * intermédiaire, message déjà en clair — le texte brut est conservé plutôt que masqué par
   * un libellé générique : il porte souvent la seule information exploitable. Le libellé
   * générique n'intervient que si ce texte est vide.
   *
   * @param error Rejet intercepté, de type inconnu.
   * @returns Le message à afficher, plus le champ fautif et l'éventuel besoin de vérifier
   * un code à usage unique lorsque le serveur les a précisés.
   */
  const parseApiError = (
    error: unknown,
  ): { message: string; field?: AuthField; requiresOtp?: boolean; userId?: string } => {
    const defaultMessage = i18n.t("common.unexpectedError");

    const raw = error instanceof Error ? error.message : String(error);
    try {
      const parsed = JSON.parse(raw) as {
        error?: string;
        message?: string;
        field?: AuthField;
        requiresOtp?: boolean;
        userId?: string;
      };
      const message = parsed.error || parsed.message || defaultMessage;
      return { message, field: parsed.field, requiresOtp: parsed.requiresOtp, userId: parsed.userId };
    } catch (e) {
      if (__DEV__) console.warn("[AuthContext] parseError JSON invalide:", e);
      return { message: raw || defaultMessage };
    }
  };

  /**
   * Restaure la session depuis le stockage sécurisé au démarrage de l'application.
   *
   * `createdAt` est reconstruit en `Date` : la sérialisation JSON l'a réduit à une chaîne et
   * les écrans de profil appellent des méthodes de `Date` dessus. Une entrée illisible est
   * journalisée puis abandonnée — l'utilisateur retombe sur l'écran de connexion, ce qui est
   * préférable à un blocage sur l'écran de chargement. `loading` est libéré dans tous les cas.
   */
  const loadUser = async () => {
    try {
      const userData = await secureStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        // Convert date strings back to Date objects
        setUser({
          ...user,
          createdAt: new Date(user.createdAt),
        });
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Authentifie par e-mail et mot de passe, puis persiste jeton et profil.
   *
   * Le compte non vérifié n'est pas traité comme un échec de saisie. Le serveur peut le
   * signaler aussi bien dans une réponse en succès que dans un rejet ; les deux chemins sont
   * donc couverts et remontent l'identifiant nécessaire à l'écran de vérification.
   *
   * Le `refreshToken` n'est écrit que si le serveur en fournit un : son absence n'est pas
   * une erreur, elle raccourcit simplement la session à la durée de vie du jeton d'accès.
   *
   * @param email Adresse saisie, transmise sans normalisation locale.
   * @param password Mot de passe en clair, jamais journalisé ni conservé après l'appel.
   * @returns `{ success: true }`, ou l'échec avec message traduit, champ fautif éventuel, ou
   * demande de vérification par code.
   */
  const login = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    try {
      const res = await ApiService.login({ email, password });

      // Check if user needs to verify OTP first
      if (res && res.requiresOtp && res.userId) {
        return {
          success: false,
          error: res.error || i18n.t("common.requiresOtp"),
          requiresOtp: true,
          userId: res.userId,
        };
      }

      if (!res?.success || !res?.token || !res?.user) {
        return { success: false, error: i18n.t("common.loginFailed") };
      }

      await secureStorage.setItem("token", res.token);
      if (res.refreshToken) await secureStorage.setItem("refreshToken", res.refreshToken);
      await secureStorage.setItem("user", JSON.stringify(res.user));
      setUser({
        ...res.user,
        createdAt: new Date(res.user.createdAt),
      });
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      const parsed = parseApiError(error);
      // Check if user needs to verify OTP (from error response)
      if (parsed.requiresOtp && parsed.userId) {
        return { success: false, error: parsed.message, requiresOtp: true, userId: parsed.userId };
      }
      return { success: false, error: parsed.message, field: parsed.field };
    }
  };

  /**
   * Crée un compte, et ouvre la session seulement si le serveur la juge utilisable.
   *
   * Trois issues se distinguent par ce que renvoie le serveur, et non par le statut HTTP :
   * un `userId` sans jeton signifie que le compte attend sa vérification par code ; un jeton
   * accompagné d'un utilisateur signifie que le parcours de vérification est désactivé et
   * que la session s'ouvre immédiatement ; un jeton sans utilisateur est traité comme une
   * réponse incomplète et n'ouvre rien, pour ne pas laisser un état partiel en mémoire.
   *
   * @param name Nom affiché, validé côté serveur.
   * @param email Adresse de connexion, unique.
   * @param password Mot de passe en clair, jamais journalisé.
   * @param phone Numéro facultatif.
   * @returns Le succès accompagné de l'identifiant quand une vérification est attendue, ou
   * l'échec avec message traduit et champ fautif.
   */
  const register = async (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ): Promise<AuthResult & { userId?: string }> => {
    try {
      const res = await ApiService.register({ name, email, password, phone });
      if (!res?.success) {
        if (res?.requiresOtp && res?.userId) {
          return {
            success: false,
            error: res.error || i18n.t("common.requiresOtp"),
            requiresOtp: true,
            userId: res.userId,
          };
        }
        return {
          success: false,
          error: res?.error || i18n.t("common.registerFailed"),
        };
      }

      // If OTP is required, return userId for OTP verification
      if (res.userId && !res.token) {
        return { success: true, userId: res.userId };
      }

      // If token is provided, user is already verified (no OTP flow)
      if (res.token && res.user) {
        await secureStorage.setItem("token", res.token);
        if (res.refreshToken) await secureStorage.setItem("refreshToken", res.refreshToken);
        await secureStorage.setItem("user", JSON.stringify(res.user));
        setUser({
          ...res.user,
          createdAt: new Date(res.user.createdAt),
        });
      }

      return { success: true, userId: res.userId };
    } catch (error) {
      console.error("Registration error:", error);
      const parsed = parseApiError(error);
      if (parsed.requiresOtp && parsed.userId) {
        return { success: false, error: parsed.message, requiresOtp: true, userId: parsed.userId };
      }
      return { success: false, error: parsed.message, field: parsed.field };
    }
  };

  /**
   * Ouvre une session à partir d'un jeton Google déjà obtenu par l'écran appelant.
   *
   * `mode` sépare volontairement inscription et connexion : sans lui, une tentative de
   * connexion sur une identité Google inconnue créerait un compte à l'insu de l'utilisateur.
   * Le serveur refuse alors la demande plutôt que de deviner l'intention.
   *
   * @param accessToken Jeton d'accès délivré par Google, non conservé après l'appel.
   * @param mode `"register"` autorise la création du compte, `"login"` exige qu'il existe.
   * @returns Le succès, ou l'échec avec message traduit.
   */
  const loginWithGoogle = async (accessToken: string, mode: "login" | "register" = "register"): Promise<AuthResult> => {
    try {
      const res = await ApiService.loginWithGoogle({ accessToken, mode });
      if (!res?.success || !res?.token || !res?.user) {
        return {
          success: false,
          error: res?.error || i18n.t("apiErrors.googleAuthFailed"),
        };
      }
      await secureStorage.setItem("token", res.token);
      if (res.refreshToken) await secureStorage.setItem("refreshToken", res.refreshToken);
      await secureStorage.setItem("user", JSON.stringify(res.user));
      setUser({ ...res.user, createdAt: new Date(res.user.createdAt) });
      return { success: true };
    } catch (error) {
      console.error("Google login error:", error);
      const parsed = parseApiError(error);
      return { success: false, error: parsed.message };
    }
  };

  /**
   * Ouvre une session à partir d'une identité Apple.
   *
   * `email` et `fullName` sont facultatifs parce qu'Apple ne les transmet qu'à la toute
   * première autorisation d'un appareil : sur les connexions suivantes seul `identityToken`
   * arrive, et c'est au serveur de retrouver le compte associé. Les passer en paramètres
   * plutôt que de les redemander évite un profil vide sur les comptes créés ici.
   *
   * @param identityToken Jeton d'identité signé par Apple.
   * @param email Adresse communiquée par Apple, absente hors première autorisation.
   * @param fullName Nom communiqué par Apple, aux mêmes conditions.
   * @param mode `"register"` autorise la création du compte, `"login"` exige qu'il existe.
   * @returns Le succès, ou l'échec avec message traduit.
   */
  const loginWithApple = async (
    identityToken: string,
    email?: string,
    fullName?: { givenName?: string | null; familyName?: string | null } | null,
    mode: "login" | "register" = "register",
  ): Promise<AuthResult> => {
    try {
      const res = await ApiService.loginWithApple({ identityToken, email, fullName, mode });
      if (!res?.success || !res?.token || !res?.user) {
        return {
          success: false,
          error: res?.error || i18n.t("apiErrors.appleAuthFailed"),
        };
      }
      await secureStorage.setItem("token", res.token);
      if (res.refreshToken) await secureStorage.setItem("refreshToken", res.refreshToken);
      await secureStorage.setItem("user", JSON.stringify(res.user));
      setUser({ ...res.user, createdAt: new Date(res.user.createdAt) });
      return { success: true };
    } catch (error) {
      console.error("Apple login error:", error);
      const parsed = parseApiError(error);
      return { success: false, error: parsed.message };
    }
  };

  /**
   * Ferme la session : révocation du jeton de rafraîchissement, purge du stockage sécurisé,
   * remise à `null` de l'utilisateur — ce qui déclenche en cascade la purge des autres
   * contextes et de leurs caches.
   *
   * La révocation serveur est délibérément lancée sans être attendue, et son échec est
   * ignoré : réseau coupé ou non, l'utilisateur doit pouvoir se déconnecter de l'appareil.
   * Conséquence assumée : hors ligne, le jeton de rafraîchissement reste techniquement
   * valide côté serveur jusqu'à son expiration naturelle.
   */
  const logout = async (): Promise<void> => {
    try {
      const refreshToken = await secureStorage.getItem("refreshToken");
      // Révoque le refresh token côté serveur (best-effort, pas bloquant)
      if (refreshToken) {
        ApiService.logout({ refreshToken }).catch(() => {});
      }
      await secureStorage.multiRemove(["token", "refreshToken", "user"]);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Les écritures de profil vivent dans un hook dédié : elles partagent toutes la même
  // règle — ne persister que l'utilisateur renvoyé par le serveur — et la garder ici aurait
  // triplé ce fichier sans rien ajouter au cycle de vie de la session, seul sujet du contexte.
  const { updateUser, updateAvatar, updateSettings } = useUserProfile({ onUserUpdated: setUser });

  /**
   * Vérifie le code à usage unique reçu par e-mail et ouvre la session s'il est valide.
   *
   * L'ouverture de session est conditionnelle : certains parcours (renvoi de code sur un
   * compte déjà connecté, vérification depuis un écran de réglages) valident le compte sans
   * que le serveur émette de jeton. On considère alors la vérification réussie sans toucher
   * à l'état de session.
   *
   * @param userId Identifiant remonté par `login` ou `register` avec `requiresOtp`.
   * @param otp Code saisi par l'utilisateur.
   * @returns Le succès, ou l'échec avec un message traduit.
   */
  const verifyOtp = async (
    userId: string,
    otp: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await ApiService.verifyOtp({ userId, otp });
      if (!res?.success) {
        return {
          success: false,
          error: res?.error || i18n.t("otp.genericVerifyError"),
        };
      }

      if (res.token && res.user) {
        await secureStorage.setItem("token", res.token);
        if (res.refreshToken) await secureStorage.setItem("refreshToken", res.refreshToken);
        await secureStorage.setItem("user", JSON.stringify(res.user));
        setUser({
          ...res.user,
          createdAt: new Date(res.user.createdAt),
        });
      }

      return { success: true };
    } catch (error) {
      console.error("OTP verification error:", error);
      return { success: false, error: translateApiMessage(error) };
    }
  };

  /**
   * Ouvre une session à partir d'un jeton déjà délivré, sans repasser par un formulaire.
   *
   * Sert aux parcours où le serveur a authentifié l'utilisateur en amont : vérification de
   * code hors écran de connexion, retour d'un lien de réinitialisation. Aucun jeton de
   * rafraîchissement n'est stocké ici — la session s'éteindra donc à l'expiration du jeton
   * d'accès, sans renouvellement silencieux, contrairement à `login`.
   *
   * Les erreurs ne sont pas rattrapées : un échec d'écriture du stockage sécurisé doit
   * remonter à l'appelant plutôt que produire une session à moitié ouverte.
   *
   * @param token Jeton d'accès émis par le serveur.
   * @param user Profil associé, tel que renvoyé par le serveur.
   */
  const loginWithToken = async (token: string, user: User): Promise<void> => {
    await secureStorage.setItem("token", token);
    await secureStorage.setItem("user", JSON.stringify(user));
    setUser({ ...user, createdAt: new Date(user.createdAt) });
  };

  /**
   * Demande la suppression du compte.
   *
   * L'effacement est différé côté serveur — un délai de rétractation court avant la
   * suppression réelle — mais la session locale, elle, est fermée immédiatement : laisser
   * l'utilisateur connecté à un compte en cours de suppression rendrait la fenêtre de
   * rétractation inintelligible et exposerait des écrans dont les données vont disparaître.
   *
   * @returns `scheduledAt` porte la date d'effacement effective lorsque le serveur la
   * communique ; en cas d'échec réseau, `success` vaut `false` et la session est conservée.
   */
  const deleteAccount = async (): Promise<{ success: boolean; scheduledAt?: Date }> => {
    try {
      const res = await ApiService.deleteAccount() as any;
      // La suppression est planifiée (soft delete 7 jours) : on déconnecte l'utilisateur
      await secureStorage.multiRemove(["token", "refreshToken", "user"]);
      setUser(null);
      return { success: true, scheduledAt: res?.scheduledAt ? new Date(res.scheduledAt) : undefined };
    } catch (error) {
      console.error("Delete account error:", error);
      return { success: false };
    }
  };

  /**
   * Change le mot de passe de l'utilisateur connecté.
   *
   * Ne touche pas à l'état local : le serveur maintient la session en cours, il n'y a donc ni
   * jeton ni profil à rafraîchir. Le motif de l'échec est délibérément écarté au profit d'un
   * booléen — remonter la distinction entre « mot de passe actuel faux » et « nouveau mot de
   * passe refusé » transformerait cet appel en oracle sur le mot de passe existant.
   *
   * @param currentPassword Mot de passe actuel, vérifié côté serveur, jamais journalisé.
   * @param newPassword Nouveau mot de passe, dont la robustesse est arbitrée par le serveur.
   * @returns `true` uniquement si le serveur a confirmé ; `false` sur refus comme sur panne.
   */
  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> => {
    try {
      const res = await ApiService.changePassword({
        currentPassword,
        newPassword,
      });

      return !!res?.success;
    } catch (error) {
      console.error("Change password error:", error);
      return false;
    }
  };

  // La valeur n'est recalculée que sur `user` et `loading` : ce sont les seules données
  // observées par les consommateurs. Les actions sont bien recréées à chaque rendu, mais
  // aucune ne capture d'état — elles ne lisent que leurs paramètres et des setters stables —
  // donc les figer ici ne crée aucune fermeture périmée et épargne un rendu à tout l'arbre.
  const value: AuthContextType = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      logout,
      deleteAccount,
      updateUser,
      updateAvatar,
      updateSettings,
      changePassword,
      verifyOtp,
      loginWithToken,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
