import "../../__tests__/support/nativeMocks";

import React from "react";
import { render, screen } from "@testing-library/react-native";
import IdeaItinerary from "../IdeaItinerary";
import { lightColors } from "../../../contexts/ThemeContext";
import type { TripIdea } from "../../../data/tripIdeas";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const makeIdea = (overrides: Partial<TripIdea> = {}): TripIdea => ({
  id: "1",
  duration: 3,
  difficulty: "easy",
  destinationCity: "Kyoto",
  destinationCountry: "Japan",
  highlightsFr: ["Temples dorés", "Marché Nishiki"],
  highlightsEn: ["Golden temples", "Nishiki market"],
  itinerary: [
    {
      day: 1,
      titleFr: "Arrivée",
      titleEn: "Arrival",
      activitiesFr: ["Balade à Gion"],
      activitiesEn: ["Walk in Gion"],
    },
    {
      day: 2,
      titleFr: "Bambouseraie",
      titleEn: "Bamboo grove",
      activitiesFr: ["Arashiyama"],
      activitiesEn: ["Arashiyama"],
    },
  ],
  suggestedBookings: [
    {
      type: "flight",
      titleFr: "Vol Paris — Osaka",
      titleEn: "Flight Paris — Osaka",
      estimatedPrice: 750,
      currency: "EUR",
      placeSearchQuery: "flight osaka",
    },
    {
      type: "hotel",
      titleFr: "Ryokan traditionnel",
      titleEn: "Traditional ryokan",
      currency: "EUR",
      placeSearchQuery: "ryokan kyoto",
    },
  ],
  ...overrides,
});

const renderItinerary = (
  props: Partial<React.ComponentProps<typeof IdeaItinerary>> = {},
) =>
  render(
    <IdeaItinerary
      idea={makeIdea()}
      lang="fr"
      customDays={2}
      colors={lightColors}
      {...props}
    />,
  );

describe("IdeaItinerary", () => {
  it("should render the French highlights when the language is French", () => {
    renderItinerary({ lang: "fr" });

    expect(screen.getByText("Temples dorés")).toBeTruthy();
    expect(screen.queryByText("Golden temples")).toBeNull();
  });

  it("should render the English highlights when the language is English", () => {
    renderItinerary({ lang: "en" });

    expect(screen.getByText("Golden temples")).toBeTruthy();
    expect(screen.queryByText("Temples dorés")).toBeNull();
  });

  it("should render the French day titles and activities when the language is French", () => {
    renderItinerary({ lang: "fr" });

    expect(screen.getByText("Arrivée")).toBeTruthy();
    expect(screen.getByText("Balade à Gion")).toBeTruthy();
  });

  it("should render the English day titles and activities when the language is English", () => {
    renderItinerary({ lang: "en" });

    expect(screen.getByText("Arrival")).toBeTruthy();
    expect(screen.getByText("Walk in Gion")).toBeTruthy();
  });

  it("should limit the itinerary to the requested number of days", () => {
    renderItinerary({ customDays: 1 });

    expect(screen.getByText("Arrivée")).toBeTruthy();
    expect(screen.queryByText("Bambouseraie")).toBeNull();
  });

  it("should number each rendered day", () => {
    renderItinerary({ customDays: 2 });

    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("should render the French suggested booking titles when the language is French", () => {
    renderItinerary({ lang: "fr" });

    expect(screen.getByText("Vol Paris — Osaka")).toBeTruthy();
    expect(screen.getByText("Ryokan traditionnel")).toBeTruthy();
  });

  it("should render the English suggested booking titles when the language is English", () => {
    renderItinerary({ lang: "en" });

    expect(screen.getByText("Flight Paris — Osaka")).toBeTruthy();
    expect(screen.getByText("Traditional ryokan")).toBeTruthy();
  });

  it("should render the estimated price when the booking has one", () => {
    renderItinerary();

    expect(screen.getByText("~750 EUR")).toBeTruthy();
  });

  it("should omit the price line when the booking has no estimate", () => {
    renderItinerary();

    expect(screen.queryByText("~undefined EUR")).toBeNull();
  });

  it("should map each suggested booking type to its icon", () => {
    renderItinerary();

    expect(screen.UNSAFE_getByProps({ name: "airplane" })).toBeTruthy();
    expect(screen.UNSAFE_getByProps({ name: "bed" })).toBeTruthy();
  });

  it("should render the three section headings", () => {
    renderItinerary();

    expect(screen.getByText("ideas.detail.highlights")).toBeTruthy();
    expect(screen.getByText("ideas.detail.itinerary")).toBeTruthy();
    expect(screen.getByText("ideas.detail.suggestedBookings")).toBeTruthy();
  });
});
