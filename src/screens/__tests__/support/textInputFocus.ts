import React from "react";
import { TextInput } from "react-native";
import { render } from "@testing-library/react-native";

/**
 * Espionne `focus()` sur les champs de saisie.
 *
 * Le déplacement du curseur d'une case à l'autre (saisie d'un code OTP) passe
 * par une `ref` interne à l'écran : ni RNTL ni ses matchers n'exposent l'état de
 * focus d'un `TextInput`. On monte donc un champ témoin le temps de récupérer le
 * prototype partagé par toutes les instances, puis on y pose l'espion — chaque
 * appel à `focus()`, quelle que soit la case, y est alors comptabilisé.
 *
 * L'espion est restauré par `jest.restoreAllMocks()`.
 */
export function spyOnTextInputFocus(): jest.SpyInstance {
  const ref = React.createRef<TextInput>();
  const probe = render(React.createElement(TextInput, { ref }));
  const prototype = Object.getPrototypeOf(ref.current as object);
  probe.unmount();
  return jest.spyOn(prototype, "focus").mockImplementation(() => {});
}
