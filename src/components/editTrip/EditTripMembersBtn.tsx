import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface EditTripMembersBtnProps {
  surface: string;
  border: string;
  text: string;
  textLight: string;
  iconBg: string;
  onPress: () => void;
}

const EditTripMembersBtn: React.FC<EditTripMembersBtnProps> = ({
  surface, border, text, textLight, iconBg, onPress,
}) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: surface, borderColor: border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 16 }}>👥</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: text }]}>{t("editTrip.manageMembers")}</Text>
        <Text style={[styles.desc, { color: textLight }]}>{t("editTrip.manageMembersSubtitle")}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={border} {...DECORATIVE_ELEMENT_PROPS} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontFamily: F.sans600, fontSize: 14 },
  desc:  { fontFamily: F.sans400, fontSize: 12, marginTop: 2 },
});

export default EditTripMembersBtn;
