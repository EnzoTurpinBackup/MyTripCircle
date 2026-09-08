/**
 * Enveloppe des points d'entrée d'authentification.
 *
 * C'est le seul domaine dont les réponses alimentent le stockage sécurisé :
 * les couples de jetons retournés ici sont ceux que {@link request} réutilise
 * ensuite pour toutes les requêtes de l'application.
 */
import { request } from "./apiCore";

export const authApi = {
  /**
   * Ouvre une session à partir d'identifiants saisis.
   *
   * @param data Couple courriel / mot de passe fourni par l'utilisateur.
   * @returns Les jetons et le profil, ou `requiresOtp` avec l'identifiant du
   *   compte lorsqu'une seconde étape de vérification est exigée : l'appelant
   *   doit alors orienter vers la saisie du code plutôt que vers l'accueil.
   * @throws {Error} Si les identifiants sont refusés ou le compte verrouillé.
   */
  login: (data: { email: string; password: string }) =>
    request<{
      success: boolean;
      token?: string;
      refreshToken?: string;
      user?: any;
      requiresOtp?: boolean;
      userId?: string;
      error?: string;
    }>("/users/login", "POST", data),

  /**
   * Crée un compte.
   *
   * @param data Identité déclarée : nom affiché, courriel, mot de passe et
   *   numéro de téléphone facultatif servant aux invitations entre proches.
   * @returns Les jetons de session, ou `requiresOtp` si le courriel doit être
   *   confirmé avant tout accès.
   * @throws {Error} Si le courriel est déjà rattaché à un compte ou si le mot
   *   de passe ne satisfait pas la politique du serveur.
   */
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    request<{
      success: boolean;
      token?: string;
      refreshToken?: string;
      user?: any;
      userId?: string;
      error?: string;
      requiresOtp?: boolean;
    }>("/users/register", "POST", data),

  /**
   * Échange une autorisation Google contre une session applicative.
   *
   * @param data Jeton d'accès obtenu du fournisseur, et `mode` indiquant si
   *   l'utilisateur cherchait à se connecter ou à s'inscrire ; le serveur s'en
   *   sert pour refuser une création implicite de compte.
   * @returns Les jetons de session, `isNewUser` signalant une première venue
   *   afin de déclencher l'accueil initial.
   * @throws {Error} Si le jeton est expiré ou si le mode contredit l'état réel
   *   du compte.
   */
  loginWithGoogle: (data: { accessToken: string; mode: "login" | "register" }) =>
    request<{ success: boolean; token?: string; refreshToken?: string; user?: any; error?: string; isNewUser?: boolean }>(
      "/users/google", "POST", data
    ),

  /**
   * Échange une identité Apple contre une session applicative.
   *
   * @param data Jeton d'identité signé, ainsi que courriel et nom que la
   *   plateforme ne transmet qu'à la toute première autorisation ; ils sont
   *   donc renvoyés tels quels pour que le serveur les enregistre à temps.
   * @returns Les jetons de session, `isNewUser` signalant une première venue.
   * @throws {Error} Si la signature du jeton est invalide ou expirée.
   */
  loginWithApple: (data: {
    identityToken: string;
    email?: string;
    fullName?: { givenName?: string | null; familyName?: string | null } | null;
    mode: "login" | "register";
  }) =>
    request<{ success: boolean; token?: string; refreshToken?: string; user?: any; error?: string; isNewUser?: boolean }>(
      "/users/apple", "POST", data
    ),

  /**
   * Achève une connexion en attente en soumettant le code à usage unique.
   *
   * @param data Identifiant du compte issu de l'étape précédente et code reçu
   *   par l'utilisateur.
   * @returns Les jetons de session, la connexion n'étant effective qu'ici.
   * @throws {Error} Si le code est erroné, expiré, ou si le nombre de
   *   tentatives autorisées est dépassé.
   */
  verifyOtp: (data: { userId: string; otp: string }) =>
    request<{ success: boolean; token?: string; refreshToken?: string; user?: any; error?: string }>(
      "/users/verify-otp", "POST", data
    ),

  /**
   * Révoque la session courante côté serveur.
   *
   * @param data Refresh token à invalider ; le transmettre explicitement permet
   *   de ne clore que l'appareil concerné et de laisser les autres actifs.
   * @returns La confirmation de révocation.
   */
  logout: (data: { refreshToken: string }) =>
    request<{ success: boolean }>("/users/logout", "POST", data),

  /**
   * Demande l'envoi d'un nouveau code de vérification.
   *
   * @param userId Compte dont la vérification est en attente.
   * @returns La confirmation d'envoi.
   * @throws {Error} Si la cadence d'envoi autorisée est dépassée ; l'appelant
   *   doit inviter à patienter plutôt que réessayer.
   */
  resendOtp: (userId: string) =>
    request<{ success: boolean }>("/users/resend-otp", "POST", { userId }),

  /**
   * Déclenche l'envoi d'un lien de réinitialisation de mot de passe.
   *
   * @param email Adresse à laquelle adresser le lien.
   * @returns Une confirmation volontairement identique que l'adresse existe ou
   *   non, afin de ne pas révéler quels comptes sont enregistrés.
   */
  requestPasswordReset: (email: string) =>
    request<{ success: boolean; message?: string }>("/users/forgot-password", "POST", { email }),

  /**
   * Contrôle la validité d'un code de réinitialisation avant d'ouvrir le formulaire.
   *
   * @param code Code extrait du lien reçu par courriel.
   * @returns L'état de validité du code, permettant d'écarter d'emblée un lien
   *   périmé plutôt que de laisser l'utilisateur saisir un mot de passe en pure
   *   perte.
   */
  verifyResetToken: (code: string) =>
    request<{ success: boolean; error?: string }>(
      `/users/verify-reset-token?code=${encodeURIComponent(code)}`
    ),

  /**
   * Fixe un nouveau mot de passe au moyen d'un code de réinitialisation.
   *
   * @param code Code de réinitialisation, consommé par cet appel.
   * @param newPassword Mot de passe choisi par l'utilisateur.
   * @returns Une session déjà ouverte, évitant une reconnexion immédiate.
   * @throws {Error} Si le code a expiré, a déjà servi, ou si le mot de passe
   *   est refusé par la politique du serveur.
   */
  resetPassword: (code: string, newPassword: string) =>
    request<{ success: boolean; token?: string; user?: any }>(
      "/users/reset-password", "POST", { code, newPassword }
    ),

  /**
   * Recherche un utilisateur par courriel ou par téléphone.
   *
   * Sert avant l'envoi d'une invitation, pour distinguer un proche déjà inscrit
   * d'un contact à convier depuis l'extérieur.
   *
   * @param params Critère de recherche ; le courriel prime lorsque les deux
   *   sont renseignés.
   * @returns Le profil public correspondant.
   * @throws {Error} Si aucun compte ne correspond.
   */
  lookupUser: (params: { email?: string; phone?: string }) => {
    const qs = params.email
      ? `email=${encodeURIComponent(params.email)}`
      : `phone=${encodeURIComponent(params.phone!)}`;
    return request<any>(`/users/lookup?${qs}`);
  },

  /**
   * Résout plusieurs profils en un seul appel.
   *
   * Le regroupement est délibéré : afficher les participants d'un voyage
   * déclencherait autrement autant de requêtes que de collaborateurs.
   *
   * @param ids Identifiants des comptes à résoudre.
   * @returns Les profils publics trouvés, les identifiants inconnus étant
   *   simplement absents du résultat.
   */
  getUsersByIds: (ids: string[]) =>
    request<any[]>("/users/batch", "POST", { ids }),
};
