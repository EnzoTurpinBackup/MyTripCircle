import React from "react";
import { Text, View } from "react-native";

/**
 * Doublure de formulaire d'authentification.
 *
 * `LoginForm` et `RegisterForm` ont chacun leur propre suite ; `AuthScreen` ne
 * fait que choisir l'un des deux et y brancher des rappels. La doublure expose
 * un bouton nommé `<préfixe>:<rappel>` par rappel attendu, plus l'état du bouton
 * Google, ce qui permet de vérifier ce câblage sans rejouer le rendu des
 * formulaires ni leurs dépendances natives.
 */
export function createFormStub(prefix: string, callbacks: string[]) {
  const FormStub: React.FC<Record<string, unknown>> = (props) => (
    <View>
      {callbacks.map((name) => (
        <Text
          key={name}
          onPress={props[name] as () => void}
          accessibilityRole="button"
          accessibilityLabel={`${prefix}:${name}`}
        >
          {name}
        </Text>
      ))}
      <Text>{`${prefix}:googleDisabled=${String(props.googleDisabled)}`}</Text>
    </View>
  );
  return { __esModule: true, default: FormStub };
}
