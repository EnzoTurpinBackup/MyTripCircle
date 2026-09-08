import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle, DimensionValue } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

interface SkeletonBoxProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  // Le squelette n'est qu'une silhouette d'attente : le contenu qu'il préfigure
  // le remplace dès son arrivée. L'annoncer ferait lire au lecteur d'écran une
  // suite de blocs vides à la place de l'information attendue.
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.bgMid,
          opacity: anim,
        },
        style,
      ]}
      {...DECORATIVE_ELEMENT_PROPS}
    />
  );
};

export default SkeletonBox;
