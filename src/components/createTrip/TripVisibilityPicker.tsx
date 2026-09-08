import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { F } from "../../theme/fonts";
import { COLORS as C } from "../../theme/colors";
import { SHADOW } from "../../theme";
import { TripVisibility } from "../../hooks/useCreateTrip";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const VISIBILITY_CYCLE: TripVisibility[] = ["private", "friends", "public"];

interface TripVisibilityPickerProps {
  visible: boolean;
  currentVisibility: TripVisibility;
  colors: Record<string, any>;
  onSelect: (option: TripVisibility) => void;
  onClose: () => void;
}

const TripVisibilityPicker: React.FC<TripVisibilityPickerProps> = ({
  visible,
  currentVisibility,
  colors,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();

  const VISIBILITY_LABELS: Record<TripVisibility, string> = {
    private: t("createTrip.visibilityPrivate"),
    friends: t("createTrip.visibilityFriends"),
    public: t("createTrip.visibilityPublic"),
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.visibilityModal, { backgroundColor: colors.bgLight }]}>
          <Text style={[styles.visibilityModalTitle, { color: colors.text }]}>
            {t("createTrip.visibilityLabel")}
          </Text>
          {VISIBILITY_CYCLE.map((option) => {
            const isSelected = currentVisibility === option;
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.visibilityOption,
                  { backgroundColor: colors.bgMid },
                  isSelected && {
                    backgroundColor: colors.terraLight,
                    borderWidth: 1,
                    borderColor: C.terra,
                  },
                ]}
                onPress={() => onSelect(option)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.visibilityOptionText,
                    { color: colors.text },
                    isSelected && {
                      color: colors.terraDark,
                      fontFamily: F.sans600,
                    },
                  ]}
                >
                  {VISIBILITY_LABELS[option]}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={C.terra} {...DECORATIVE_ELEMENT_PROPS} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  visibilityModal: {
    backgroundColor: C.sandLight,
    borderRadius: 20,
    padding: 20,
    width: "85%",
    maxWidth: 360,
    ...SHADOW.strong,
  },
  visibilityModalTitle: {
    fontSize: 17,
    fontFamily: F.sans700,
    color: C.ink,
    marginBottom: 14,
    textAlign: "center",
  },
  visibilityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: C.sandMid,
  },
  visibilityOptionText: {
    fontSize: 16,
    fontFamily: F.sans400,
    color: C.ink,
  },
});

export default TripVisibilityPicker;
