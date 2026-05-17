import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { SwipeToNavigate } from "../hooks/useSwipeToNavigate";
import { useIdeas } from "../hooks/useIdeas";
import IdeaCard from "../components/ideas/IdeaCard";
import ItineraryModal from "../components/ideas/ItineraryModal";
import { useTranslation } from "react-i18next";
import { F } from "../theme/fonts";

const IdeasScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = 100 + Math.max(insets.bottom, 12);
  const {
    search,
    setSearch,
    activeCategory,
    setActiveCategory,
    modalVisible,
    openModal,
    closeModal,
    cityInput,
    setCityInput,
    daysInput,
    setDaysInput,
    loading,
    itinerary,
    showCreateStep,
    setShowCreateStep,
    startDate,
    setStartDate,
    showDatePicker,
    setShowDatePicker,
    creating,
    CATEGORIES,
    filtered,
    generateItinerary,
    handleCreateTrip,
    resetItinerary,
  } = useIdeas();

  return (
    <SwipeToNavigate currentIndex={2} totalTabs={5}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

        <View style={styles.header}>
          <View>
            <Text style={[styles.headerEyebrow, { color: colors.textLight }]}>{t("ideas.subtitle")}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t("ideas.title")}</Text>
          </View>
          <TouchableOpacity
            style={[styles.sparkleBtn, { backgroundColor: colors.terraLight }]}
            onPress={openModal}
            activeOpacity={0.8}
          >
            <Text style={[styles.sparkleBtnText, { color: colors.terra }]}>✦</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textLight} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t("ideas.searchPlaceholder")}
            placeholderTextColor={colors.textLight}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catChip,
                { backgroundColor: colors.bgMid },
                activeCategory === cat.id && { backgroundColor: colors.terra },
              ]}
              onPress={() => setActiveCategory(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.catChipText,
                { color: colors.textMid },
                activeCategory === cat.id && { color: "#FFFFFF", fontFamily: F.sans600 },
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          style={{ flex: 1 }}
          renderItem={({ item, index }) => <IdeaCard item={item} index={index} />}
          contentContainerStyle={[styles.grid, { paddingBottom: scrollPaddingBottom }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>{t("ideas.noResults")}</Text>
            </View>
          }
        />

        <ItineraryModal
          visible={modalVisible}
          onClose={closeModal}
          cityInput={cityInput}
          onCityChange={setCityInput}
          daysInput={daysInput}
          onDaysChange={setDaysInput}
          loading={loading}
          itinerary={itinerary}
          showCreateStep={showCreateStep}
          onShowCreateStep={() => { setStartDate(new Date()); setShowCreateStep(true); }}
          onBackFromCreate={() => setShowCreateStep(false)}
          startDate={startDate}
          onStartDateChange={setStartDate}
          showDatePicker={showDatePicker}
          onToggleDatePicker={setShowDatePicker}
          creating={creating}
          onGenerate={generateItinerary}
          onCreateTrip={handleCreateTrip}
          onNewSearch={resetItinerary}
        />
      </SafeAreaView>
    </SwipeToNavigate>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerEyebrow: {
    fontFamily: F.sans400,
    fontSize: 14,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: F.sans700,
    fontSize: 28,
  },
  sparkleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkleBtnText: {
    fontSize: 20,
    fontFamily: F.sans400,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 28,
    borderWidth: 1,
    marginHorizontal: 24,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#2A2318",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: F.sans400,
    padding: 0,
    margin: 0,
  },
  categoryScroll: {
    height: 50,
    marginBottom: 14,
    flexGrow: 0,
  },
  categoryContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  catChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: F.sans500,
  },
  grid: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: F.sans400,
  },
});

export default IdeasScreen;
