/**
 * Parcourt récursivement l'arbre rendu (toJSON) et signale toute chaîne de
 * caractères "brute" présente directement parmi les enfants d'un nœud qui
 * n'est pas un <Text>. C'est exactement le symptôme de la fuite de valeur
 * décrite par la règle SonarCloud typescript:S6439 : `{valeur && <X/>}` rend
 * `valeur` telle quelle lorsqu'elle est falsy mais non booléenne (ex: 0).
 *
 * Les cartes d'invitation enchaînent beaucoup de rendus conditionnels sur des
 * valeurs numériques (durée) ou textuelles (destination) : cet invariant est
 * vérifié dans chaque scénario plutôt que dupliqué à la main.
 */
export function findOrphanTextNodes(node: any, path = "root"): string[] {
  if (node == null || typeof node !== "object") return [];
  const orphans: string[] = [];
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    if (typeof child === "string") {
      if (node.type !== "Text") {
        orphans.push(`${path} > "${child}"`);
      }
      continue;
    }
    orphans.push(...findOrphanTextNodes(child, `${path} > ${child?.type ?? "?"}`));
  }
  return orphans;
}

/**
 * Collecte les URI des images effectivement rendues. Les bannières de voyage
 * n'exposent ni testID ni texte : c'est le seul moyen d'affirmer qu'une photo
 * de couverture est bien affichée plutôt que le dégradé de repli.
 */
export function collectImageUris(node: any): string[] {
  if (node == null || typeof node !== "object") return [];
  const uris: string[] = [];
  const source = node.props?.source;
  if (source?.uri) uris.push(source.uri);
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) uris.push(...collectImageUris(child));
  return uris;
}
