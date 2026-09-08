/**
 * Frontières d'IHM partagées par les écrans qui embarquent un sélecteur de date
 * ou un dégradé.
 *
 * À importer EN PREMIER, avant l'écran testé, pour que les `jest.mock`
 * précèdent son chargement. Le module tire `screenMocks` : les suites qui
 * l'utilisent n'ont pas à l'importer en plus.
 */

import "./screenMocks";

// Le dégradé n'expose rien d'interrogeable : on le remplace par une vue dont le
// `testID` porte sa palette, ce qui permet de distinguer deux dégradés voisins.
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: ({ colors, children, ...rest }: { colors: string[]; children?: unknown }) =>
      React.createElement(View, { testID: `gradient:${colors.join("/")}`, ...rest }, children),
  };
});

/**
 * Dernier gestionnaire `onChange` monté par un sélecteur de date natif. Les
 * suites l'appellent pour simuler la sélection — ou l'abandon — d'une date sans
 * dépendre du composant natif.
 */
export const mockDatePicker: {
  onChange?: (event: unknown, date?: Date) => void;
  props?: Record<string, unknown>;
} = {};

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: any) => {
      mockDatePicker.onChange = props.onChange;
      mockDatePicker.props = props;
      return React.createElement(View, { testID: "date-picker" });
    },
  };
});

/** Réarme le sélecteur de date entre deux tests. */
export const resetDatePicker = () => {
  mockDatePicker.onChange = undefined;
  mockDatePicker.props = undefined;
};
