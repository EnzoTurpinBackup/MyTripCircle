import { useRef } from "react";
import { Animated } from "react-native";

interface UseBottomSheetOptions {
  outputRange?: [number, number];
  bounciness?: number;
}

/**
 * Anime l'ouverture et la fermeture d'un panneau glissant depuis le bas de
 * l'écran, ainsi que le voile qui l'accompagne. Mutualise la chorégraphie
 * commune aux nombreuses feuilles de l'application, qui ne diffèrent que par
 * leur hauteur.
 *
 * @param options.outputRange Décalage vertical parcouru par le panneau, du
 * hors-écran à sa position ouverte ; à ajuster à la hauteur de la feuille.
 * @param options.bounciness Rebond du ressort à l'ouverture.
 * @returns Les valeurs animées brutes, la translation `translateY` à appliquer
 * au conteneur, et les commandes `open` et `close`.
 *
 * @remarks Les animations utilisent le pilote natif, ce qui les exécute hors du
 * fil JavaScript et les rend insensibles à une pression de rendu, mais
 * restreint l'interpolation aux propriétés de transformation et d'opacité. La
 * fermeture accepte un rappel : le démontage du panneau doit attendre la fin de
 * l'animation, sans quoi il disparaîtrait d'un coup.
 */
export function useBottomSheet({
  outputRange = [340, 0],
  bounciness = 4,
}: UseBottomSheetOptions = {}) {
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const open = () => {
    Animated.parallel([
      Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, bounciness }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const close = (onComplete?: () => void) => {
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(onComplete ? () => onComplete() : undefined);
  };

  const translateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange });

  return { sheetAnim, backdropAnim, translateY, open, close };
}
