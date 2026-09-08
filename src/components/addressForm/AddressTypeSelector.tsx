import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Address } from "../../types";
import { useTheme } from "../../contexts/ThemeContext";
import { F } from "../../theme/fonts";
import { ADDRESS_TYPES, getTypeIcon } from "../../hooks/useAddressForm";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

type Props = {
  selectedType: Address["type"];
  onSelect: (type: Address["type"]) => void;
};

const AddressTypeSelector: React.FC<Props> = ({ selectedType, onSelect }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {ADDRESS_TYPES.map((type) => {
        const selected = selectedType === type;
        return (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              { backgroundColor: colors.bgLight, borderColor: colors.border },
              selected && [styles.typeButtonSelected, { backgroundColor: colors.terra, borderColor: colors.terra, shadowColor: colors.terra }],
            ]}
            onPress={() => onSelect(type)}
            activeOpacity={0.75}
          >
            <View style={[
              styles.iconContainer,
              { backgroundColor: colors.terraLight },
              selected && styles.iconContainerSelected,
            ]}>
              <Ionicons
                name={getTypeIcon(type) as keyof typeof Ionicons.glyphMap}
                size={22}
                color={selected ? "#FFFFFF" : colors.terra}
                {...DECORATIVE_ELEMENT_PROPS}
              />
            </View>
            <Text
              style={[
                styles.typeText,
                { color: colors.textMid },
                selected && styles.typeTextSelected,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {t(`addresses.filters.${type}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 6,
  },
  typeButton: {
    flexDirection: "column",
    alignItems: "center",
    borderRadius: 18,
    padding: 14,
    paddingHorizontal: 16,
    minWidth: 100,
    borderWidth: 1,
    shadowColor: "#2A2318",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  typeButtonSelected: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  typeText: {
    fontSize: 13,
    textAlign: "center",
    fontFamily: F.sans500,
  },
  typeTextSelected: {
    color: "#FFFFFF",
    fontFamily: F.sans600,
  },
});

export default AddressTypeSelector;
