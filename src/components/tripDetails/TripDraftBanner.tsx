import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { ModernButton } from "../ModernButton";
import { F } from "../../theme/fonts";
import { RADIUS } from "../../theme";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface Props {
  onValidate: () => void;
}

const TripDraftBanner: React.FC<Props> = ({ onValidate }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[s.validateContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[s.draftBanner, { backgroundColor: colors.terraLight, borderColor: colors.terra }]}>
        <Ionicons name="information-circle" size={22} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
        <Text style={[s.draftBannerText, { color: colors.terraDark ?? colors.terra }]}>{t("tripDetails.draftMessage")}</Text>
      </View>
      <ModernButton
        title={t("tripDetails.validateTrip")}
        onPress={onValidate}
        variant="primary"
        gradient
        size="large"
        fullWidth
        icon="checkmark-circle-outline"
        style={s.validateButton}
      />
    </View>
  );
};

const s = StyleSheet.create({
  validateContainer: {
    borderRadius: RADIUS.card,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1,
  },
  draftBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: RADIUS.input,
    marginBottom: 14,
    borderWidth: 1,
  },
  draftBannerText: {
    fontSize: 14,
    marginLeft: 8,
    fontFamily: F.sans400,
    flex: 1,
  },
  validateButton: {
    marginTop: 0,
  },
});

export default TripDraftBanner;
