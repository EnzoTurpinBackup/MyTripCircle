import React from "react";
import { TouchableOpacity, Image, Text, View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const { width: SCREEN_W } = Dimensions.get("window");
export const CARD_W = (SCREEN_W - 24 * 2 - 12) / 2;
export const CARD_H = 175;

type Destination = {
  id: string;
  category: string;
  image: string;
  name: string;
  country: string;
};

type Props = {
  item: Destination;
  index: number;
};

const IdeaCard: React.FC<Props> = ({ item, index }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity
      style={[styles.card, index % 2 === 0 ? { marginRight: 6 } : { marginLeft: 6 }]}
      onPress={() => navigation.navigate("IdeaDetail", { ideaId: item.id })}
      activeOpacity={0.88}
    >
      {/* Décorative : le nom et le pays de la destination sont lus en dessous. */}
      <Image source={{ uri: item.image }} style={styles.cardImg} resizeMode="cover" {...DECORATIVE_ELEMENT_PROPS} />
      <LinearGradient
        colors={["transparent", "rgba(15,8,2,0.75)"]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardCountry}>{item.country}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#2A2318",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  cardImg: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  cardGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: CARD_H,
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  cardName: {
    fontSize: 16,
    fontFamily: F.sans700,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardCountry: {
    fontSize: 12,
    fontFamily: F.sans400,
    color: "rgba(255,255,255,0.72)",
    marginTop: 1,
  },
});

export default IdeaCard;
