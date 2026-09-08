import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Address } from "../../types";
import { getTypeIcon, getIconColors, getTagColors, getTagLabel } from "./addressHelpers";
import { styles } from "./addressStyles";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface AddressCardProps {
  item: Address;
  colors: any;
  isDark?: boolean;
  t: (k: string) => string;
  onPress: (address: Address) => void;
}

const AddressCard: React.FC<AddressCardProps> = ({ item, colors, isDark = false, t, onPress }) => {
  const ic = getIconColors(item.type, isDark);
  const tag = getTagColors(item.type, isDark);
  const iconBg = ic.bg ?? colors.bgDark;
  const iconColor = ic.icon ?? colors.textMid;
  const tagBg = tag.bg ?? colors.bgDark;
  const tagText = tag.text ?? colors.textMid;

  return (
    <TouchableOpacity
      style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onPress(item)}
      activeOpacity={0.85}
    >
      <View style={[styles.addressIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={getTypeIcon(item.type) as keyof typeof Ionicons.glyphMap} size={26} color={iconColor} {...DECORATIVE_ELEMENT_PROPS} />
      </View>
      <View style={styles.addressInfo}>
        <Text style={[styles.addressName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.addressDetail, { color: colors.textLight }]} numberOfLines={1}>
          {item.city}, {item.country}
        </Text>
      </View>
      <View style={[styles.tagPill, { backgroundColor: tagBg }]}>
        <Text style={[styles.tagText, { color: tagText }]}>
          {getTagLabel(item.type, t)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default AddressCard;
