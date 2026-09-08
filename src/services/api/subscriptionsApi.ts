/**
 * Enveloppe de l'abonnement payant.
 *
 * Les droits ne sont jamais déduits de l'état rapporté par la boutique du
 * téléphone : le reçu est transmis au serveur, qui seul le vérifie auprès de la
 * plateforme et fait foi. Un client modifié ne peut donc pas s'octroyer un accès
 * premium.
 */
import { request } from "./apiCore";

export const subscriptionsApi = {
  /**
   * Lit l'abonnement de l'utilisateur connecté.
   *
   * @returns L'état de l'abonnement et son échéance, source unique des droits
   *   appliqués par l'interface.
   */
  getSubscription: () => request<any>("/subscriptions/me"),

  /**
   * Soumet un reçu d'achat pour vérification et ouverture des droits.
   *
   * @param data Reçu remis par la boutique, plateforme d'origine, produit
   *   souscrit et référence de transaction ; cette dernière permet au serveur
   *   d'ignorer un reçu déjà traité lors d'une reprise d'achat.
   * @returns Le résultat de la vérification.
   * @throws {Error} Si le reçu est refusé par la plateforme ou déjà rattaché à
   *   un autre compte ; les droits ne sont alors pas ouverts.
   */
  validatePurchase: (data: {
    receiptData: string;
    platform: string;
    productId: string;
    transactionId?: string;
  }) => request<{ success: boolean; message?: string }>("/subscriptions/validate", "POST", data),

  /**
   * Met fin au renouvellement automatique de l'abonnement.
   *
   * @returns La confirmation ; les droits restent ouverts jusqu'à l'échéance
   *   déjà réglée, l'interface ne doit donc pas les retirer sur-le-champ.
   * @throws {Error} Si aucun abonnement actif n'est rattaché au compte.
   */
  cancelSubscription: () =>
    request<{ success: boolean; message?: string }>("/subscriptions/cancel", "POST"),
};
