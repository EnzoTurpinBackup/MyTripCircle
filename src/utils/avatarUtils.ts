/**
 * Palette des avatars sans photo. Cinq teintes assez distinctes pour discriminer dans une
 * liste, et toutes assez foncées pour porter du texte blanc dans les deux thèmes — ce qui
 * interdit d'en ajouter une claire sans revoir le contraste.
 */
export const AVATAR_COLORS = ["#C4714A", "#5A8FAA", "#8B70C0", "#6B8C5A", "#C0A040"];

/**
 * Construit les initiales affichées sur un avatar sans photo.
 *
 * Seuls le premier et le dernier segment sont retenus : les prénoms composés et les
 * particules produiraient sinon des pastilles à quatre lettres illisibles à cette taille.
 *
 * @param name Nom complet. Typé `string`, mais l'accès optionnel couvre délibérément `null`
 * et `undefined` : la valeur vient du serveur, où le nom peut manquer, et le typage ne
 * protège pas de ce qui traverse la frontière réseau.
 * @returns Une ou deux lettres majuscules, ou `"?"` sur une entrée nulle, vide ou faite
 * d'espaces — jamais une chaîne vide, qui produirait une pastille muette.
 *
 * @example
 * getInitials("Marie");             // "M"
 * getInitials("Jean de La Fontaine"); // "JF" — segments intermédiaires ignorés
 * getInitials("   ");               // "?"
 */
export function getInitials(name: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + (parts.at(-1)?.charAt(0) ?? "")).toUpperCase();
}

/**
 * Choisit la couleur de fond d'un avatar sans photo, par hachage du nom.
 *
 * Le tirage est déterministe et non aléatoire : la couleur d'une personne doit rester
 * identique d'un écran et d'une session à l'autre, sans quoi elle cesse d'aider à la
 * reconnaître. Le hachage porte sur les points de code, ce qui le rend stable pour les noms
 * accentués et les émojis.
 *
 * @param name Nom complet ; `null` et `undefined` tolérés comme pour les initiales.
 * @returns Une couleur de la palette ; la première sur une entrée nulle, vide ou faite
 * d'espaces — un défaut assumé, non une couleur tirée d'un nom vide.
 */
export function getAvatarColor(name: string): string {
  if (!name?.trim()) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (name.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
