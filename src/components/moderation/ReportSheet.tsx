import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { F } from "../../theme/fonts";
import { useTheme } from "../../contexts/ThemeContext";
import { ReportReason } from "../../services/api/moderationApi";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface Props {
  visible: boolean;
  targetType: "user" | "trip";
  onClose: () => void;
  onSubmit: (reason: ReportReason) => void;
}

const REASONS: { key: ReportReason; icon: string }[] = [
  { key: "inappropriate", icon: "warning-outline" },
  { key: "spam",          icon: "mail-unread-outline" },
  { key: "harassment",    icon: "hand-left-outline" },
  { key: "fake",          icon: "person-remove-outline" },
  { key: "other",         icon: "ellipsis-horizontal-outline" },
];

const ReportSheet: React.FC<Props> = ({ visible, targetType, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1,   duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0,   useNativeDriver: true, bounciness: 4 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0,   duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <Text style={[styles.title, { color: colors.text }]}>
          {t(targetType === "user" ? "moderation.titleUser" : "moderation.titleTrip")}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textLight }]}>
          {t("moderation.subtitle")}
        </Text>

        <View style={styles.reasons}>
          {REASONS.map(({ key, icon }) => (
            <TouchableOpacity
              key={key}
              style={[styles.reasonRow, { borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => onSubmit(key)}
            >
              <View style={[styles.reasonIcon, { backgroundColor: colors.bgMid }]}>
                <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <Text style={[styles.reasonLabel, { color: colors.text }]}>
                {t(`moderation.reasons.${key}`)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: colors.border }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { color: colors.textLight }]}>
            {t("common.cancel")}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    fontFamily: F.sans700,
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: F.sans400,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  reasons: { gap: 8 },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  reasonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  reasonLabel: {
    flex: 1,
    fontFamily: F.sans500,
    fontSize: 15,
  },
  cancelBtn: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: {
    fontFamily: F.sans500,
    fontSize: 15,
  },
});

export default ReportSheet;
