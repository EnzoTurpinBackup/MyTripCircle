import i18n from "i18next";

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

/** Message probablement en français (API ou legacy) alors que l'UI est en anglais. */
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

/** Réponse d'erreur typique en anglais (backend) alors que l'UI est en français. */
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

export const getBookingStatusTranslation = (status: string): string => {
  const statusKey = `bookings.status.${status}`;
  const translation = i18n.t(statusKey);
  // Si la traduction retourne la clé elle-même, c'est qu'elle n'existe pas
  if (translation === statusKey) return status;
  return translation;
};
