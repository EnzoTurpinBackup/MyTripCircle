import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { F } from "../../theme/fonts";
import BackButton from "../ui/BackButton";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const HERO_H = SCREEN_H * 0.46;

const DESTINATION_IMAGES: Record<string, string> = {
  "1": "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=800&q=80&fit=crop",
  "2": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80&fit=crop",
  "3": "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80&fit=crop",
  "4": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80&fit=crop",
  "5": "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80&fit=crop",
  "6": "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80&fit=crop",
  "7": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80&fit=crop",
  "8": "https://images.unsplash.com/photo-1597211684565-dca64d72bdfe?w=800&q=80&fit=crop",
  "9": "https://images.unsplash.com/photo-1520769945061-0a448c463865?w=800&q=80&fit=crop",
  "10": "https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=800&q=80&fit=crop",
};

interface Props {
  ideaId: string;
  name: string;
  country: string;
  onBack: () => void;
}

const IdeaHero: React.FC<Props> = ({ ideaId, name, country, onBack }) => {
  const { top: insetTop } = useSafeAreaInsets();
  return (
    <View style={s.heroContainer}>
      {/* Décorative : le nom et le pays de la destination sont lus en dessous. */}
      <Image
        source={{ uri: DESTINATION_IMAGES[ideaId] }}
        style={s.heroImage}
        resizeMode="cover"
        {...DECORATIVE_ELEMENT_PROPS}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.25)", "transparent", "rgba(15,8,2,0.65)"]}
        style={s.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <BackButton
        variant="overlay"
        onPress={onBack}
        style={[s.backBtn, { top: insetTop + 10 }]}
      />
      <View style={s.heroContent}>
        <Text style={s.heroName}>{name}</Text>
        <Text style={s.heroCountry}>{country}</Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  heroContainer: {
    width: SCREEN_W,
    height: HERO_H,
    position: "relative",
  },
  heroImage: { width: "100%", height: "100%" },
  heroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  heroContent: { position: "absolute", bottom: 24, left: 24, right: 24 },
  heroName: {
    fontFamily: F.sans700,
    fontSize: 28,
    lineHeight: 34,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroCountry: {
    fontFamily: F.sans400,
    fontSize: 19,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
  },
});

export default IdeaHero;
