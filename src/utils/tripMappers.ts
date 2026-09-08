import { Trip, Booking, Address, TripInvitation } from "../types";

/**
 * Transposition des documents bruts de l'API vers les entités typées de l'application.
 *
 * Frontière assumée entre un schéma que le client ne contrôle pas et des types sur lesquels
 * le reste du code s'appuie sans vérifier. Trois règles la gouvernent :
 *
 * 1. L'identifiant est lu sous ses deux noms possibles, la base l'exposant sous une forme
 *    que certaines routes normalisent et d'autres non.
 * 2. Toute date est ranimée en `Date`, JSON ne transportant que des chaînes. Une date absente
 *    devient l'instant courant plutôt que `undefined` : les écrans trient et comparent ces
 *    champs sans les tester, et un trou y provoquerait une exception de rendu.
 * 3. Tout champ de collection ou de structure reçoit une valeur par défaut, pour la même
 *    raison — un tableau vide se parcourt, `undefined` non.
 *
 * Le prix de cette tolérance est qu'un champ manquant devient indiscernable d'un champ
 * légitimement vide. C'est un compromis délibéré : ces fonctions servent l'affichage, où un
 * écran dégradé vaut mieux qu'un écran en erreur.
 */

/**
 * Transpose un collaborateur, qui peut arriver sous deux formes selon la route.
 *
 * Une chaîne signifie que le serveur n'a renvoyé que l'identifiant, sans peupler la
 * relation ; les permissions sont alors déduites du rôle par défaut, la seule information
 * disponible. Un objet fournit ses propres valeurs, chacune retombant sur le même défaut si
 * elle manque.
 *
 * @param collab Identifiant seul, ou objet collaborateur complet.
 * @param defaultRole Rôle appliqué faute d'information ; `"viewer"`, le moins permissif, par
 * défaut. Les droits d'invitation et de suppression, eux, ne sont jamais déduits : ils
 * restent refusés tant que le serveur ne les a pas explicitement accordés.
 * @returns Le collaborateur avec un bloc de permissions toujours renseigné.
 *
 * @remarks Un objet sans `userId` retombe sur l'objet lui-même, forme dégradée qui ne
 * correspond à aucune donnée valide : elle traduit un document malformé et se manifestera à
 * l'affichage, non ici.
 */
export function mapCollaborator(collab: any, defaultRole: "viewer" | "editor" = "viewer") {
  if (typeof collab === "string") {
    return {
      userId: collab,
      role: defaultRole,
      joinedAt: new Date(),
      permissions: {
        canEdit: defaultRole === "editor",
        canInvite: false,
        canDelete: false,
      },
    };
  }
  return {
    userId: collab.userId || collab,
    role: collab.role || defaultRole,
    joinedAt: collab.joinedAt ? new Date(collab.joinedAt) : new Date(),
    permissions: collab.permissions || {
      canEdit: defaultRole === "editor",
      canInvite: false,
      canDelete: false,
    },
    invitedBy: collab.invitedBy,
  };
}

/**
 * Transpose un voyage.
 *
 * La visibilité est dérivée du drapeau public lorsque le champ dédié manque : les deux ont
 * coexisté, et un voyage créé avant la migration doit rester correctement classé.
 *
 * @param raw Document brut renvoyé par l'API.
 * @returns Le voyage typé. Les statistiques et la position reçoivent des valeurs neutres si
 * elles manquent, les écrans les lisant sans garde. Le statut est présumé `"draft"`, l'état
 * le moins engageant : un voyage improprement présenté comme validé induirait en erreur.
 */
export function mapTrip(raw: any): Trip {
  return {
    id: raw._id ?? raw.id,
    title: raw.title,
    description: raw.description,
    destination: raw.destination,
    coverImage: raw.coverImage,
    startDate: raw.startDate ? new Date(raw.startDate) : new Date(),
    endDate: raw.endDate ? new Date(raw.endDate) : new Date(),
    ownerId: raw.ownerId,
    collaborators: raw.collaborators
      ? raw.collaborators.map((c: any) => mapCollaborator(c, "viewer"))
      : [],
    isPublic: raw.isPublic,
    visibility: raw.visibility || (raw.isPublic ? "public" : "private"),
    status: raw.status || "draft",
    stats: raw.stats || {
      totalBookings: 0,
      totalAddresses: 0,
      totalCollaborators: 0,
    },
    location: raw.location || { type: "Point", coordinates: [0, 0] },
    tags: raw.tags || [],
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
  };
}

/**
 * Transpose un voyage renvoyé juste après sa création.
 *
 * Ne diffère que sur le rôle par défaut des collaborateurs, ici `"editor"` : à la création,
 * les seuls collaborateurs présents sont ceux que l'auteur vient d'ajouter, et il les invite
 * pour qu'ils contribuent. Sur un voyage rechargé, où la provenance des collaborateurs est
 * inconnue, la présomption inverse s'applique.
 *
 * @param raw Document brut renvoyé par la route de création.
 * @returns Le voyage typé.
 */
export function mapTripFromCreate(raw: any): Trip {
  return {
    ...mapTrip(raw),
    collaborators: raw.collaborators
      ? raw.collaborators.map((c: any) => mapCollaborator(c, "editor"))
      : [],
    status: raw.status || "draft",
  };
}

/**
 * Transpose une réservation.
 *
 * `endDate` est le seul champ de date laissé à `undefined` quand il manque, et c'est
 * volontaire : contrairement aux autres, son absence est une information — la réservation
 * se tient à un instant, non sur une période. Lui donner une valeur par défaut ferait
 * afficher une plage horaire fictive sur un billet de train.
 *
 * @param raw Document brut renvoyé par l'API.
 * @returns La réservation typée. Le rattachement au voyage retombe sur la chaîne vide plutôt
 * que `undefined` — les filtres par voyage comparent sans garde. La devise est présumée
 * `"EUR"` et le statut `"pending"`, l'état le moins engageant : présenter par défaut une
 * réservation comme confirmée exposerait à se présenter à un rendez-vous inexistant.
 */
export function mapBooking(raw: any): Booking {
  return {
    id: raw._id ?? raw.id,
    tripId: raw.tripId || "",
    type: raw.type,
    title: raw.title,
    description: raw.description,
    date: raw.date ? new Date(raw.date) : new Date(),
    endDate: raw.endDate ? new Date(raw.endDate) : undefined,
    time: raw.time,
    address: raw.address,
    confirmationNumber: raw.confirmationNumber,
    price: raw.price,
    currency: raw.currency || "EUR",
    status: raw.status || "pending",
    attachments: raw.attachments || [],
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
  };
}

/**
 * Transpose une adresse.
 *
 * La note est validée par son type et non par sa vérité : `0` est une note légitime, et un
 * test de véracité l'aurait effacée comme une absence. Toute valeur non numérique — chaîne
 * héritée, `null` — devient `undefined`, ce qui masque le composant de notation au lieu
 * d'afficher zéro étoile sur une adresse jamais notée.
 *
 * @param raw Document brut renvoyé par l'API.
 * @returns L'adresse typée.
 */
export function mapAddress(raw: any): Address {
  return {
    id: raw._id ?? raw.id,
    type: raw.type,
    name: raw.name,
    address: raw.address,
    city: raw.city,
    country: raw.country,
    phone: raw.phone,
    website: raw.website,
    notes: raw.notes,
    rating: typeof raw.rating === "number" ? raw.rating : undefined,
    tripId: raw.tripId,
    userId: raw.userId,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
  };
}

/**
 * Transpose une invitation à un voyage.
 *
 * Le voyage rattaché retombe explicitement sur `null` et non `undefined` : les écrans
 * distinguent une invitation dont le voyage n'a pas été joint à la réponse d'un champ absent
 * du document, et `null` marque cette première situation.
 *
 * @param raw Document brut renvoyé par l'API.
 * @returns L'invitation typée.
 *
 * @remarks Le statut n'a pas de valeur par défaut, contrairement aux autres entités : une
 * invitation sans statut est indéterminée, et la présumer en attente afficherait des boutons
 * d'acceptation sur une invitation peut-être déjà traitée. Les fonctions d'affichage traitent
 * ce cas de leur côté.
 */
export function mapInvitation(raw: any): TripInvitation {
  return {
    id: raw._id ?? raw.id,
    tripId: raw.tripId,
    inviterId: raw.inviterId,
    inviteeEmail: raw.inviteeEmail,
    inviteePhone: raw.inviteePhone,
    status: raw.status,
    token: raw.token,
    expiresAt: raw.expiresAt ? new Date(raw.expiresAt) : new Date(),
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    trip: raw.trip ?? null,
  };
}

/**
 * Transpose une invitation en conservant les champs que seules certaines routes renvoient :
 * nature de l'invitation, permissions proposées, profil de l'invitant.
 *
 * Le type de retour reste volontairement ouvert : ces champs supplémentaires ne font pas
 * partie du contrat d'invitation et varient d'une route à l'autre. Les figer dans un type
 * donnerait une garantie que le serveur ne tient pas.
 *
 * @param raw Document brut renvoyé par l'API.
 * @returns L'invitation typée, augmentée des champs présents dans le document.
 */
export function mapInvitationWithExtras(raw: any): any {
  return {
    ...mapInvitation(raw),
    type: raw.type,
    permissions: raw.permissions,
    inviter: raw.inviter,
  };
}
