import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BackButton from "../components/ui/BackButton";
import { useIdeaDetail } from "../hooks/useIdeaDetail";
import IdeaHero from "../components/ideaDetail/IdeaHero";
import IdeaChips from "../components/ideaDetail/IdeaChips";
import IdeaItinerary from "../components/ideaDetail/IdeaItinerary";
import AddToTripModal from "../components/ideaDetail/AddToTripModal";
import { F } from "../theme/fonts";

const IdeaDetailScreen: React.FC = () => {
  const {
    navigation,
    idea,
    lang,
    colors,
    isDark,
    t,
    destinationName,
    destinationCountry,
    customDays,
    changeCustomDays,
    startDate,
    setStartDate,
    endDate,
    showDatePicker,
    setShowDatePicker,
    modalVisible,
    tripTitle,
    setTripTitle,
    creating,
    backdropOpacity,
    sheetTranslateY,
    openModal,
    closeModal,
    handleCreate,
    formatDate,
  } = useIdeaDetail();

  if (!idea) {
    return (
      <SafeAreaView style={[s.safeArea, { backgroundColor: colors.bg }]}>
        <BackButton onPress={() => navigation.goBack()} style={s.backBtn} />
        <View style={s.errorContainer}>
          <Text style={[s.errorText, { color: colors.textLight }]}>
            {t("ideas.detail.notFound")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        <IdeaHero
          ideaId={idea.id}
          name={destinationName}
          country={destinationCountry}
          onBack={() => navigation.goBack()}
        />

        <IdeaChips
          customDays={customDays}
          difficulty={idea.difficulty}
          colors={colors}
          onDecrement={() => changeCustomDays((d) => Math.max(1, d - 1))}
          onIncrement={() => changeCustomDays((d) => Math.min(30, d + 1))}
        />

        <IdeaItinerary
          idea={idea}
          lang={lang as "fr" | "en"}
          customDays={customDays}
          colors={colors}
        />
      </ScrollView>

      <View style={[s.ctaContainer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity style={s.ctaBtn} onPress={openModal} activeOpacity={0.88}>
          <LinearGradient
            colors={["#C4714A", "#A85A38"]}
            style={s.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={s.ctaBtnText}>{t("ideas.detail.addToTrips")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <AddToTripModal
        visible={modalVisible}
        destinationName={destinationName}
        customDays={customDays}
        tripTitle={tripTitle}
        startDate={startDate}
        endDate={endDate}
        showDatePicker={showDatePicker}
        creating={creating}
        backdropOpacity={backdropOpacity}
        sheetTranslateY={sheetTranslateY}
        colors={colors}
        isDark={isDark}
        onClose={closeModal}
        onChangeTripTitle={setTripTitle}
        onOpenDatePicker={() => setShowDatePicker(true)}
        onCloseDatePicker={() => setShowDatePicker(false)}
        onChangeDate={(date) => { if (date) setStartDate(date); }}
        onCreate={handleCreate}
        formatDate={formatDate}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ctaBtn: { borderRadius: 28, overflow: "hidden" },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 28,
  },
  ctaBtnText: { fontFamily: F.sans700, fontSize: 16, color: "#FFFFFF" },
  safeArea: { flex: 1 },
  backBtn: {
    marginTop: 10,
  },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: F.sans400, fontSize: 15 },
});

export default IdeaDetailScreen;
