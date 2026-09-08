import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { TripIdea, SuggestedBooking } from "../../data/tripIdeas";
import { Ionicons } from "@expo/vector-icons";
import { F } from "../../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface ThemeColors {
  text: string;
  textMid: string;
  textLight: string;
  surface: string;
  border: string;
  terraLight: string;
  terra: string;
}

const BOOKING_ICONS: Record<string, string> = {
  flight: "airplane",
  hotel: "bed",
  activity: "bicycle",
  restaurant: "restaurant",
};

interface Props {
  idea: TripIdea;
  lang: "fr" | "en";
  customDays: number;
  colors: ThemeColors;
}

const IdeaItinerary: React.FC<Props> = ({ idea, lang, customDays, colors }) => {
  const { t } = useTranslation();
  const highlights = lang === "fr" ? idea.highlightsFr : idea.highlightsEn;

  return (
    <>
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>
          {t("ideas.detail.highlights")}
        </Text>
        {highlights.map((h) => (
          <View key={h} style={s.highlightRow}>
            <View style={[s.highlightDot, { backgroundColor: colors.terra }]} />
            <Text style={[s.highlightText, { color: colors.textMid }]}>{h}</Text>
          </View>
        ))}
      </View>

      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>
          {t("ideas.detail.itinerary", { count: customDays })}
        </Text>
        {idea.itinerary.slice(0, customDays).map((day) => {
          const dayTitle = lang === "fr" ? day.titleFr : day.titleEn;
          const activities = lang === "fr" ? day.activitiesFr : day.activitiesEn;
          return (
            <View
              key={day.day}
              style={[s.dayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={s.dayHeader}>
                <View style={[s.dayBadge, { backgroundColor: colors.terra }]}>
                  <Text style={s.dayBadgeText}>{day.day}</Text>
                </View>
                <Text style={[s.dayTitle, { color: colors.text }]}>{dayTitle}</Text>
              </View>
              <View style={s.activitiesList}>
                {activities.map((act) => (
                  <View key={act} style={s.activityRow}>
                    <View style={[s.activityBullet, { backgroundColor: colors.terra }]} />
                    <Text style={[s.activityText, { color: colors.textMid }]}>{act}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      <View style={[s.section, s.lastSection]}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>
          {t("ideas.detail.suggestedBookings")}
        </Text>
        <Text style={[s.suggestedNote, { color: colors.textLight }]}>
          {t("ideas.detail.suggestedNote")}
        </Text>
        {idea.suggestedBookings.map((b: SuggestedBooking) => {
          const title = lang === "fr" ? b.titleFr : b.titleEn;
          return (
            <View
              key={title}
              style={[s.bookingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[s.bookingIconBg, { backgroundColor: colors.terraLight }]}>
                <Ionicons name={BOOKING_ICONS[b.type] as keyof typeof Ionicons.glyphMap} size={16} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <Text style={[s.bookingTitle, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
              {b.estimatedPrice != null && (
                <Text style={[s.bookingPrice, { color: colors.textLight }]}>
                  ~{b.estimatedPrice} {b.currency}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </>
  );
};

const s = StyleSheet.create({
  section: { paddingHorizontal: 24, paddingTop: 28 },
  lastSection: { paddingBottom: 16 },
  sectionTitle: { fontFamily: F.sans700, fontSize: 22, marginBottom: 16 },
  highlightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 12,
  },
  highlightDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 7,
    flexShrink: 0,
  },
  highlightText: { fontFamily: F.sans400, fontSize: 16, lineHeight: 24, flex: 1 },
  dayCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 14 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  dayBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dayBadgeText: { fontFamily: F.sans700, fontSize: 15, color: "#FFFFFF" },
  dayTitle: { fontFamily: F.sans600, fontSize: 17, flex: 1 },
  activitiesList: { paddingLeft: 52, gap: 8 },
  activityRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  activityBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 9,
    opacity: 0.6,
    flexShrink: 0,
  },
  activityText: { fontFamily: F.sans400, fontSize: 15, lineHeight: 23, flex: 1 },
  suggestedNote: {
    fontFamily: F.sans400,
    fontSize: 15,
    marginTop: -8,
    marginBottom: 14,
    lineHeight: 22,
  },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
  },
  bookingIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bookingTitle: { fontFamily: F.sans500, fontSize: 16, flex: 1 },
  bookingPrice: { fontFamily: F.sans400, fontSize: 15, flexShrink: 0 },
});

export default IdeaItinerary;
