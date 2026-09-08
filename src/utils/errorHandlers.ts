import i18n from "i18next";

/**
 * Traduction des messages d'erreur venus du serveur.
 *
 * Le serveur répond en texte libre, dans une langue qui n'est pas nécessairement celle de
 * l'interface. La table ci-dessous ramène les messages connus à des clés de traduction ; les
 * autres passent par une heuristique de langue. Le repli est asymétrique et assumé : un
 * message dont la langue ne correspond pas à l'interface est remplacé par un libellé
 * générique, alors qu'un message dans la bonne langue est affiché tel quel. Mieux vaut une
 * phrase vague et cohérente qu'une phrase précise dans la mauvaise langue.
 *
 * La table conserve les formulations françaises historiques à côté des formulations
 * anglaises actuelles : le serveur a changé de langue de référence, et les deux peuvent
 * encore arriver selon la version déployée.
 */

/** Raw API / backend messages → i18n keys (FR legacy + EN canonical). */
const API_ERROR_KEY_BY_MESSAGE: Record<string, string> = {
  "Token manquant": "apiErrors.tokenMissing",
  "Token manquant.": "apiErrors.tokenMissing",
  "Missing token": "apiErrors.tokenMissing",
  "Lien invalide ou déjà utilisé": "apiErrors.invalidOrUsedLink",
  "Invalid or already used link": "apiErrors.invalidOrUsedLink",
  "Vous ne pouvez pas vous ajouter vous-même": "apiErrors.cannotAddSelfFriend",
  "You cannot add yourself": "apiErrors.cannotAddSelfFriend",
  "Vous êtes déjà amis": "apiErrors.alreadyFriends",
  "You are already friends": "apiErrors.alreadyFriends",
  "Lien d'invitation introuvable": "apiErrors.invitationLinkNotFound",
  "Invitation link not found": "apiErrors.invitationLinkNotFound",
  "Utilisateur introuvable": "apiErrors.userNotFound",
  "User not found": "apiErrors.userNotFound",
  "Phone number already in use": "common.phoneAlreadyInUse",
  "Ce numéro de téléphone est déjà utilisé par un autre compte.": "common.phoneAlreadyInUse",
  "Ce numéro de téléphone est déjà utilisé par un autre compte": "common.phoneAlreadyInUse",
  Unauthorized: "apiErrors.unauthorized",
  "Missing required fields": "apiErrors.missingRequiredFields",
  "Weak password": "common.invalidPassword", // NOSONAR — clé de traduction, pas un mot de passe
  "Invalid phone number": "apiErrors.invalidPhoneNumber",
  "Account not verified. A new code has been sent to your email.": "apiErrors.accountNotVerifiedNewCode",
  "Email already in use": "common.emailAlreadyInUse",
  "Invalid credentials": "common.invalidCredentials",
  "Please verify your account with the OTP sent to your email": "common.requiresOtp",
  "Your verification code expired. A new code has been sent to your email": "common.requiresOtpExpired",
  "Name and email are required": "apiErrors.nameAndEmailRequired",
  "Invalid language. Supported: en, fr": "apiErrors.invalidLanguage",
  "Current password is incorrect": "apiErrors.currentPasswordIncorrect", // NOSONAR — clé de traduction
  "Email is required": "apiErrors.emailRequired",
  "Token and new password are required": "apiErrors.tokenAndPasswordRequired", // NOSONAR — clé de traduction
  "Invalid or expired reset token": "apiErrors.invalidOrExpiredResetToken",
  "User ID and OTP are required": "apiErrors.userIdAndOtpRequired",
  "Invalid OTP": "apiErrors.invalidOtp",
  "OTP has expired": "apiErrors.otpExpired",
  "User ID is required": "apiErrors.userIdRequired",
  "User is already verified": "apiErrors.userAlreadyVerified",
  "Missing accessToken": "apiErrors.missingAccessToken",
  "Invalid Google token": "apiErrors.invalidGoogleToken",
  "No email returned from Google": "apiErrors.noEmailFromGoogle",
  "Google authentication failed": "apiErrors.googleAuthFailed",
  "Missing identityToken": "apiErrors.missingIdentityToken",
  "Invalid Apple token format": "apiErrors.invalidAppleTokenFormat",
  "Invalid Apple token": "apiErrors.invalidAppleToken",
  "Apple authentication failed": "apiErrors.appleAuthFailed",
  "No Google account found. Please sign up first.": "apiErrors.googleAccountNotFound",
  "No Apple account found. Please sign up first.": "apiErrors.appleAccountNotFound",
  "Not found": "apiErrors.notFound",
  "Access denied": "apiErrors.accessDenied",
  "End date must be after start date": "createTrip.invalidDates",
  "Start date cannot be in the past": "createTrip.startDatePast",
  "Trip not found": "apiErrors.tripNotFound",
  "Not authorized to edit this trip": "apiErrors.notAuthorizedEditTrip",
  "Only the owner can delete this trip": "apiErrors.onlyOwnerCanDeleteTrip",
  "Only the owner can remove members": "apiErrors.onlyOwnerCanRemoveMembers",
  "Cannot remove yourself": "apiErrors.cannotRemoveYourself",
  "newOwnerId is required": "apiErrors.newOwnerIdRequired",
  "Only the owner can transfer ownership": "apiErrors.onlyOwnerCanTransfer",
  "New owner must already be a member": "apiErrors.newOwnerMustBeMember",
  "Invitation not found": "apiErrors.invitationNotFound",
  "Cannot cancel someone else's invitation": "apiErrors.cannotCancelOthersInvitation",
  "Booking not found": "apiErrors.bookingNotFound",
  "Address not found": "apiErrors.addressNotFound",
  "Email or phone number is required": "apiErrors.emailOrPhoneRequired",
  "Not authorized to invite": "apiErrors.notAuthorizedInvite",
  "User is already a collaborator": "apiErrors.alreadyCollaborator",
  "Invitation already pending": "apiErrors.invitationAlreadyPending",
  "Not authorized to create invitation link": "apiErrors.notAuthorizedCreateInviteLink",
  "Invalid action": "apiErrors.invalidAction",
  "userId is required to join via link": "apiErrors.userIdRequiredToJoinLink",
  "Invitation has expired": "apiErrors.invitationExpired",
  "Invitation already processed": "apiErrors.invitationAlreadyProcessed",
};

/**
 * Détecte un message rédigé en français.
 *
 * Deux indices, du plus fiable au plus faible : la présence d'un caractère accentué, puis
 * celle d'un mot fonctionnel courant. Le second est nécessaire — bien des messages français
 * n'ont aucun accent — mais l'ancrage sur des mots entiers évite les faux positifs sur des
 * fragments anglais.
 *
 * @param s Message brut.
 * @returns `true` si le message est vraisemblablement français. Une heuristique, non une
 * détection : elle n'est utilisée que pour choisir entre le message et un repli générique,
 * jamais pour altérer le message lui-même.
 */
function messageLooksFrench(s: string): boolean {
  if (/[àâäéèêëïîôùûüçœÀÂÉÈÊËÎÏÔÙÛÜÇ]/.test(s)) return true;
  return /\b(veuillez|impossible|introuvable|utilisateur|brouillon|voyage|erreur|déjà|n'est |cette |vos |vous |êtes|s'il vous plaît)\b/i.test(s);
}

const ENGLISH_ERROR_PREFIXES = [
  "invalid ", "missing ", "not ", "unauthorized", "weak password", "email already",
  "please verify", "your verification", "account not verified", "token ", "user ",
  "google ", "apple ", "end date", "start date", "only the", "cannot ",
  "invitation ", "booking ", "address ", "trip ", "access denied",
  "something went ", "failed to", "network request",
];

/**
 * Détecte un message d'erreur technique rédigé en anglais.
 *
 * Trois filtres avant l'analyse lexicale. La chaîne vide n'est pas un message. Un texte long
 * n'est pas une erreur d'API mais probablement une page HTML ou une trace, qu'il ne faut pas
 * réécrire. Un accent exclut d'emblée l'anglais.
 *
 * @param s Message brut.
 * @returns `true` si le message ressemble à une erreur d'API anglaise. La reconnaissance
 * porte sur des préfixes et des mots-clés récurrents, non sur la langue en général : un
 * message anglais qui n'en relève pas sera affiché tel quel.
 */
function messageLooksLikeEnglishApiError(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed || trimmed.length > 220) return false;
  if (/[àâäéèêëïîôùûüçœ]/.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  return (
    ENGLISH_ERROR_PREFIXES.some((p) => lower.startsWith(p)) ||
    /\b(not found|required|expired|denied|incorrect)\b/i.test(trimmed)
  );
}

/**
 * Décide, pour un message non répertorié, entre l'afficher tel quel et lui substituer un
 * repli générique.
 *
 * Le remplacement n'a lieu que si la langue détectée s'oppose à celle de l'interface. Un
 * message dont la langue n'est pas identifiée passe donc sans modification : l'heuristique
 * est faillible, et le doute profite au message original, qui porte l'information utile.
 *
 * @param raw Message déjà extrait et débarrassé de ses espaces de bordure.
 * @returns Le message, le repli générique, ou — sur une chaîne vide — le message d'erreur
 * inattendue, qui est le seul cas où l'appelant n'a strictement rien à afficher.
 */
function resolveLocalizedMessage(raw: string): string {
  const lang = i18n.language || "en";
  if (raw && messageLooksFrench(raw) && lang.startsWith("en")) {
    return i18n.t("apiErrors.unmappedFallback");
  }
  if (raw && messageLooksLikeEnglishApiError(raw) && lang.startsWith("fr")) {
    return i18n.t("apiErrors.unmappedFallback");
  }
  return raw || i18n.t("common.unexpectedError");
}

/**
 * Convertit un rejet quelconque en message affichable dans la langue de l'interface.
 *
 * Point de passage unique des erreurs d'API vers l'écran. La résolution procède du plus sûr
 * au plus incertain : corps JSON analysé, message répertorié dans la table, puis reconnaissance
 * par motif du seul cas où le serveur formule une même erreur de plusieurs façons — le numéro
 * de téléphone déjà pris — et enfin arbitrage heuristique sur la langue.
 *
 * @param error Rejet intercepté, de type inconnu : `Error`, chaîne, ou toute autre valeur.
 * @returns Un message non vide, toujours. Trois cas limites y mènent : un corps qui n'est pas
 * du JSON est repris comme message brut plutôt que masqué ; un rejet qui n'est pas une `Error`
 * est converti en chaîne ; et une défaillance de la résolution elle-même est rattrapée par un
 * second niveau qui retombe sur le message brut, ou sur le libellé d'erreur inattendue.
 */
export const parseApiError = (error: unknown): string => {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);

    let parsedError: any;
    try {
      parsedError = JSON.parse(errorMessage);
    } catch (parseErr) {
      if (__DEV__) console.warn("[errorHandlers] parseApiError: JSON invalide:", parseErr);
      parsedError = { error: errorMessage };
    }

    const apiError = parsedError.error || parsedError.message || errorMessage;
    const trimmed = typeof apiError === "string" ? apiError.trim() : String(apiError);

    const mappedKey = API_ERROR_KEY_BY_MESSAGE[trimmed];
    if (mappedKey) return i18n.t(mappedKey);

    if (
      /phone number already in use/i.test(trimmed) ||
      /numéro de téléphone est déjà utilisé/i.test(trimmed)
    ) {
      return i18n.t("common.phoneAlreadyInUse");
    }

    return resolveLocalizedMessage(trimmed);
  } catch (e) {
    if (__DEV__) console.warn("[errorHandlers] parseApiError: erreur inattendue:", e);
    const raw = error instanceof Error ? error.message : "";
    return resolveLocalizedMessage(raw);
  }
};

/**
 * Traduit le statut d'une réservation, en tolérant les statuts non traduits.
 *
 * La bibliothèque de traduction rend la clé demandée quand elle ne la connaît pas ; c'est
 * cette égalité qui sert de détection d'absence, faute d'une interrogation directe du
 * catalogue.
 *
 * @param status Statut brut renvoyé par l'API.
 * @returns Le libellé traduit, ou le statut brut lorsqu'aucune traduction n'existe. Afficher
 * la valeur technique reste préférable à une case vide : l'utilisateur voit au moins que le
 * statut est renseigné, et la chaîne est repérable en support.
 */
export const getBookingStatusTranslation = (status: string): string => {
  const statusKey = `bookings.status.${status}`;
  const translation = i18n.t(statusKey);
  // Si la traduction retourne la clé elle-même, c'est qu'elle n'existe pas
  if (translation === statusKey) return status;
  return translation;
};
