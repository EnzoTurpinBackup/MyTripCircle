import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Difficulty } from "../../data/tripIdeas";
import { F } from "../../theme/fonts";

interface ThemeColors {
  surface: string;
  border: string;
  text: string;
  textMid: string;
  terra: string;
}

const DIFFICULTY_CONFIG: Record<Difficulty, { icon: string; colorKey: string }> = {
  easy: { icon: "🟢", colorKey: "#4CAF50" },
  moderate: { icon: "🟡", colorKey: "#FF9800" },
  adventurous: { icon: "🔴", colorKey: "#F44336" },
};

interface Props {
  customDays: number;
  difficulty: Difficulty;
  colors: ThemeColors;
  onDecrement: () => void;
  onIncrement: () => void;
}

const IdeaChips: React.FC<Props> = ({
  customDays,
  difficulty,
  colors,
  onDecrement,
  onIncrement,
}) => {
  const { t } = useTranslation();
  const diffConfig = DIFFICULTY_CONFIG[difficulty];

  return (
    <View style={[s.chipsRow]}>
      <View
        style={[
          s.chip,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingVertical: 4,
            gap: 0,
          },
        ]}
      >
        <Ionicons name="calendar-outline" size={14} color={colors.terra} />
        <TouchableOpacity onPress={onDecrement} activeOpacity={0.7} style={s.stepperBtn}>
          <Ionicons name="remove" size={14} color={colors.textMid} />
        </TouchableOpacity>
        <Text
          style={[s.chipText, { color: colors.text, minWidth: 52, textAlign: "center" }]}
        >
          {customDays} {t("ideas.addModal.days")}
        </Text>
        <TouchableOpacity onPress={onIncrement} activeOpacity={0.7} style={s.stepperBtn}>
          <Ionicons name="add" size={14} color={colors.textMid} />
        </TouchableOpacity>
      </View>

      <View style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={s.difficultyIcon}>{diffConfig.icon}</Text>
        <Text style={[s.chipText, { color: colors.text }]}>
          {t(`ideas.detail.difficulty.${difficulty}`)}
        </Text>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
  },
  chipText: { fontFamily: F.sans500, fontSize: 15 },
  difficultyIcon: { fontSize: 14 },
  stepperBtn: { paddingHorizontal: 8, paddingVertical: 4 },
});

export default IdeaChips;
