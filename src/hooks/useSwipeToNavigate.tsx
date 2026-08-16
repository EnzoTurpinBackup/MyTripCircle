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
