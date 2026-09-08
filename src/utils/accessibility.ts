/**
 * Props d'accessibilité partagées.
 *
 * WCAG 2.1 — 1.1.1 « Contenu non textuel » : une image décorative, ou dont
 * l'information est déjà portée par le texte adjacent, ne doit pas être
 * annoncée. L'annoncer quand même ajoute du bruit au parcours du lecteur
 * d'écran, exactement comme une image informative laissée muette lui retire de
 * l'information.
 */

/**
 * Retire un élément purement décoratif du parcours des technologies d'assistance
 * — image de couverture, avatar redondant, voile de fermeture d'une feuille
 * d'actions.
 *
 * Les trois props sont nécessaires : `accessible` couvre les deux plateformes,
 * `accessibilityElementsHidden` iOS et `importantForAccessibility` Android.
 */
export const DECORATIVE_ELEMENT_PROPS = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: "no" as const,
};
