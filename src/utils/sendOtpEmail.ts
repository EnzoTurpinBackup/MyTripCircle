/**
 * Envoi d'un code de vérification par e-mail.
 *
 * Utilitaire hérité, aujourd'hui référencé par aucun module de `src` : l'envoi effectif des
 * codes est assuré côté serveur, seul détenteur des identifiants de messagerie. Le client
 * n'a pas à les connaître, et ne les possède d'ailleurs pas — les variables d'environnement
 * lues ici sont absentes d'un bundle mobile.
 *
 * La dépendance de messagerie est chargée à la demande et son absence est traitée comme un
 * cas normal : elle n'est pas installée dans l'application mobile, où ce module ne doit
 * jamais faire échouer un import.
 */

// OTP email sending utility (requires nodemailer package)
// To use this, install: npm install nodemailer @types/nodemailer

let nodemailer: any;
try {
  nodemailer = require("nodemailer");
} catch (e) {
  if (__DEV__) console.warn("[sendOtpEmail] nodemailer non disponible:", e);
  nodemailer = null;
}

/**
 * Envoie un code de vérification à une adresse.
 *
 * @param to Adresse du destinataire.
 * @param otp Code à usage unique.
 * @returns Se résout sans rien envoyer si la dépendance de messagerie manque ou si les
 * identifiants ne sont pas configurés. Ces deux abandons sont silencieux et indiscernables
 * d'un envoi réussi du point de vue de l'appelant — limite connue de cet utilitaire, qui
 * n'est pas sur un chemin de production.
 */
export const sendOtpEmail = async (to: string, otp: string) => {
  if (!nodemailer) {
    return;
  }

  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"MyTripCircle" <${process.env.MAIL_USER}>`,
    to,
    subject: "Your OTP code",
    text: `Your OTP code is: ${otp}`,
  });
};
