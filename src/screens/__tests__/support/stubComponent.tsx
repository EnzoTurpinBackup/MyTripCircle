import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

/**
 * Doublures d'affichage pour les composants enfants des écrans.
 *
 * Chaque enfant monté par un écran du lot social possède déjà sa propre suite à
 * 100 % : les rejouer ici n'ajouterait aucune couverture, mais rendrait les
 * tests d'écran sensibles à leur mise en page. On les remplace donc par une
 * doublure minimale qui expose exactement ce dont l'écran est responsable —
 * les props qu'il transmet et les rappels qu'il branche.
 *
 * La doublure rend :
 *  - un conteneur portant `testID`, pour attester de sa présence ;
 *  - un `Text` `"<testID>:<champ>"` par prop scalaire déclarée dans `fields` ;
 *  - un bouton `"<testID>:<rappel>"` par rappel déclaré dans `callbacks`,
 *    qui invoque la prop correspondante sans argument.
 *
 * Les rappels attendant des arguments (identifiant de ligne, action…) ne sont
 * pas couverts par cette fabrique : les suites concernées écrivent alors une
 * doublure dédiée qui reconstitue la liste rendue par l'enfant.
 */
export function stubComponent(
  testID: string,
  options: { callbacks?: string[]; fields?: string[] } = {},
) {
  const { callbacks = [], fields = [] } = options;

  const Stub: React.FC<Record<string, unknown>> = (props) => (
    <View testID={testID}>
      {fields.map((field) => (
        <Text key={field} testID={`${testID}:${field}`}>
          {String(props[field])}
        </Text>
      ))}
      {callbacks.map((callback) => (
        <TouchableOpacity
          key={callback}
          testID={`${testID}:${callback}`}
          onPress={() => (props[callback] as (() => void) | undefined)?.()}
        >
          <Text>{callback}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  Stub.displayName = `Stub(${testID})`;
  return Stub;
}
