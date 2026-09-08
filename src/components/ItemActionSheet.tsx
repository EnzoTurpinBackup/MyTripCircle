import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { F } from "../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const ItemActionSheet: React.FC<Props> = ({
  visible,
  title,
  subtitle,
  onClose,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      {/* Voile de fermeture : raccourci tactile que le bouton « annuler » de la
          feuille double déjà. L'annoncer n'ajouterait qu'un doublon avant le
          contenu utile, et `accessibilityViewIsModal` l'exclut de toute façon. */}
      <TouchableOpacity
        style={s.backdrop}
        activeOpacity={1}
        onPress={onClose}
        {...DECORATIVE_ELEMENT_PROPS}
      />
      {/* Le lecteur d'écran doit rester dans la feuille tant qu'elle est ouverte. */}
      <View
        style={[s.sheet, { backgroundColor: colors.bgLight }]}
        accessibilityViewIsModal
        accessibilityLabel={t("common.a11y.actionsFor", { item: title })}
      >
        <View style={[s.handle, { backgroundColor: colors.border }]} />

        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <Text
            style={[s.title, { color: colors.text }]}
            numberOfLines={2}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[s.subtitle, { color: colors.textLight }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={s.actions}>
          {canEdit && (
            <TouchableOpacity
              style={[s.row, { backgroundColor: colors.bgMid }]}
              onPress={onEdit}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("common.a11y.editItem", { item: title })}
              accessibilityState={{ disabled: false }}
            >
              <View style={[s.iconWrap, { backgroundColor: isDark ? "#1A2E35" : "#DCF0F5" }]}>
                <Ionicons name="pencil-outline" size={22} color="#5A8FAA" {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <Text style={[s.rowLabel, { flex: 1, color: colors.text }]}>
                {t("common.edit")}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
            </TouchableOpacity>
          )}

          {canDelete && (
            <TouchableOpacity
              style={[
                s.row,
                s.rowDanger,
                { backgroundColor: isDark ? "rgba(192,64,64,0.18)" : "#FDEAEA" },
              ]}
              onPress={onDelete}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("common.a11y.deleteItem", { item: title })}
              accessibilityState={{ disabled: false }}
            >
              <View style={[s.iconWrap, { backgroundColor: "rgba(192,64,64,0.12)" }]}>
                <Ionicons name="trash-outline" size={22} color="#C04040" {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <Text style={[s.rowLabel, { flex: 1, color: "#C04040" }]}>
                {t("common.delete")}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#C04040" {...DECORATIVE_ELEMENT_PROPS} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[s.cancelBtn, { backgroundColor: colors.bgMid }]}
          onPress={onClose}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
          accessibilityState={{ disabled: false }}
        >
          <Text style={[s.cancelText, { color: colors.textMid }]}>
            {t("common.cancel")}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(42,35,24,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    shadowColor: "#2A2318",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 20,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    paddingBottom: 18,
    borderBottomWidth: 1,
    marginBottom: 18,
  },
  title: {
    fontFamily: F.sans600,
    fontSize: 20,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: F.sans400,
    fontSize: 14,
    marginTop: 4,
  },
  actions: {
    gap: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowDanger: {
    borderWidth: 1,
    borderColor: "rgba(192,64,64,0.18)",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontFamily: F.sans600,
    fontSize: 17,
  },
  cancelBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelText: {
    fontFamily: F.sans600,
    fontSize: 16,
  },
});

export default ItemActionSheet;
