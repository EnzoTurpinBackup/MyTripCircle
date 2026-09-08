import { View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { MainTabParamList } from "../types";

interface SwipeToNavigateProps {
  children: React.ReactNode;
  currentIndex: number;
  totalTabs: number;
}

const TABS: (keyof MainTabParamList)[] = ["Trips", "Bookings", "Ideas", "Addresses", "Profile"];

/**
 * Enveloppe le contenu d'un onglet pour permettre de passer au voisin d'un
 * glissement horizontal, la barre d'onglets n'étant pas toujours atteignable au
 * pouce sur les grands écrans.
 *
 * @param props.children Contenu de l'onglet, rendu tel quel.
 * @param props.currentIndex Rang de l'onglet affiché dans la barre, qui
 * détermine les destinations atteignables.
 * @param props.totalTabs Nombre d'onglets, borne au-delà de laquelle le
 * glissement reste sans effet.
 * @returns Le contenu enveloppé du détecteur de geste.
 *
 * @remarks Le geste n'est reconnu qu'au-delà d'un déplacement horizontal franc
 * et abandonne dès que le doigt part en vertical, faute de quoi il capterait le
 * défilement des listes qu'il enveloppe. Aux deux extrémités de la barre, le
 * glissement est ignoré plutôt que de boucler, pour préserver le repère
 * d'ordre entre les onglets.
 */
export const SwipeToNavigate: React.FC<SwipeToNavigateProps> = ({
  children,
  currentIndex,
  totalTabs,
}) => {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();

  const handleSwipe = (translationX: number) => {
    const threshold = 50; // Distance minimale pour un swipe

    if (Math.abs(translationX) > threshold) {
      if (translationX > 0 && currentIndex > 0) {
        // Swipe vers la droite = onglet précédent
        navigation.navigate(TABS[currentIndex - 1]);
      } else if (translationX < 0 && currentIndex < totalTabs - 1) {
        // Swipe vers la gauche = onglet suivant
        navigation.navigate(TABS[currentIndex + 1]);
      }
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onEnd((event) => {
      handleSwipe(event.translationX);
    });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={panGesture}>
        <View style={{ flex: 1 }}>
          {children}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};
