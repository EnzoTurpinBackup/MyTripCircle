/**
 * Frontières natives supplémentaires du lot « voyages » de `src/screens`.
 *
 * Complète `screenMocks` (stockage asynchrone, safe area, police d'icônes) par
 * les trois modules natifs que les écrans de voyage montent et qui n'existent
 * pas sous Jest : le dégradé Expo, Gesture Handler (bandeau de navigation par
 * balayage) et le sélecteur de date natif.
 *
 * Comme `screenMocks`, ce module doit être importé EN PREMIER par chaque suite,
 * afin que ses `jest.mock` soient enregistrés avant le chargement de l'écran.
 */

import "./screenMocks";

// Le dégradé n'expose rien d'interrogeable : on le remplace par une vue dont le
// `testID` porte sa palette, ce qui permet de distinguer un voile d'un fond.
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: ({ colors, children, ...rest }: { colors: string[]; children?: unknown }) =>
      React.createElement(View, { testID: `gradient:${colors.join("/")}`, ...rest }, children),
  };
});

// Le geste de balayage appartient à Gesture Handler et est déjà couvert par
// `useSwipeToNavigate.test.tsx` : ici on ne veut que laisser passer l'arbre.
jest.mock("react-native-gesture-handler", () => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.activeOffsetX = jest.fn(chain);
  builder.failOffsetY = jest.fn(chain);
  builder.onEnd = jest.fn(chain);
  return {
    Gesture: { Pan: jest.fn(chain) },
    GestureDetector: ({ children }: { children: unknown }) => children,
    GestureHandlerRootView: ({ children }: { children: unknown }) => children,
  };
});

// Le sélecteur de date est un module natif : une vue inspectable suffit, sa
// logique propre étant couverte par `TripDatePicker.test.tsx`.
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: "date-picker", ...props }),
  };
});

/**
 * Forme minimale d'un nœud de l'arbre rendu, suffisante pour remonter la
 * hiérarchie. `react-test-renderer` n'expose pas de déclarations de types dans
 * ce dépôt : on décrit donc ici les seuls membres utilisés.
 */
interface TreeNode {
  type: string | unknown;
  parent: TreeNode | null;
}

/**
 * Remonte jusqu'au premier élément hôte au-dessus de `element`.
 *
 * `element.parent` renvoie l'élément composite (le composant React) et non la
 * vue native rendue : les matchers de style, qui exigent un élément hôte, le
 * rejettent. Ce helper saute les composites et rend la conteneur réellement
 * stylé — le seul sur lequel affirmer une couleur ou une hauteur.
 */
export function hostParent<T extends TreeNode>(element: T): T {
  let current = element.parent;
  while (current && typeof current.type !== "string") {
    current = current.parent;
  }
  if (!current) throw new Error("Aucun élément hôte parent trouvé");
  return current as T;
}
