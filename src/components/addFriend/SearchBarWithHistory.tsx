import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface Props {
  input: string;
  onInputChange: (text: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  history: string[];
  onHistorySelect: (item: string) => void;
  onHistoryRemove: (item: string) => void;
  onHistoryClear: () => void;
}

const SearchBarWithHistory: React.FC<Props> = ({
  input,
  onInputChange,
  focused,
  onFocus,
  onBlur,
  history,
  onHistorySelect,
  onHistoryRemove,
  onHistoryClear,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.searchWrapper,
        { backgroundColor: colors.surface, borderColor: colors.border },
        (input.trim() || focused) && [styles.searchWrapperActive, { borderColor: colors.terra, shadowColor: colors.terra }],
      ]}
    >
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={input.trim() ? colors.terra : colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t("addFriend.searchPlaceholder")}
          placeholderTextColor={colors.textLight}
          value={input}
          onChangeText={onInputChange}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardType="default"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {input.length > 0 ? (
          <TouchableOpacity
            onPress={() => onInputChange("")}
            accessibilityRole="button"
            accessibilityLabel={t("common.a11y.clearSearch")}
          >
            <View style={[styles.clearBtn, { backgroundColor: colors.bgMid }]}>
              <Ionicons name="close" size={16} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        ) : null}
      </View>

      {focused && !input.trim() && history.length > 0 && (
        <>
          <View style={[styles.historySeparator, { backgroundColor: colors.bgMid }]} />
          {history.map((item, index) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.historyRow,
                { borderBottomColor: colors.bgMid },
                index === history.length - 1 && styles.historyRowLast,
              ]}
              onPress={() => onHistorySelect(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={15} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
              <Text style={[styles.historyItem, { color: colors.text }]} numberOfLines={1}>
                {item}
              </Text>
              <TouchableOpacity
                onPress={() => onHistoryRemove(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t("common.a11y.removeSearchHistoryItem", { query: item })}
              >
                <Ionicons name="close" size={13} color={colors.textLight} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.historyClearRow, { borderTopColor: colors.bgMid }]}
            onPress={onHistoryClear}
          >
            <Text style={[styles.historyClear, { color: colors.terra }]}>{t("addFriend.clearHistory")}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchWrapper: {
    marginHorizontal: 20,
    marginBottom: 20,
    zIndex: 10,
    borderWidth: 1.5,
    borderRadius: 32,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  searchWrapperActive: {
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: F.sans400,
    padding: 0,
    margin: 0,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  historySeparator: { height: 1 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  historyRowLast: { borderBottomWidth: 0 },
  historyItem: { flex: 1, fontSize: 15, fontFamily: F.sans400 },
  historyClearRow: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    alignItems: "center",
    borderTopWidth: 1,
  },
  historyClear: { fontSize: 12, fontFamily: F.sans500 },
});

export default SearchBarWithHistory;
