export type Difficulty = "easy" | "moderate" | "adventurous";

export interface SuggestedBooking {
  type: "flight" | "hotel" | "activity" | "restaurant";
  titleFr: string;
  titleEn: string;
  estimatedPrice?: number;
  currency: string;
  /** Requête utilisée pour la recherche Google Places Text Search (en anglais) */
  placeSearchQuery: string;
}

export interface ItineraryDay {
  day: number;
  titleFr: string;
  titleEn: string;
  activitiesFr: string[];
  activitiesEn: string[];
}

export interface TripIdea {
  id: string; // corresponds to destination id in IdeasScreen
  duration: number;
  difficulty: Difficulty;
  /** Ville principale de la destination (en anglais, pour les adresses) */
  destinationCity: string;
  /** Pays de la destination (en anglais, pour les adresses) */
  destinationCountry: string;
  highlightsFr: string[];
  highlightsEn: string[];
  itinerary: ItineraryDay[];
  suggestedBookings: SuggestedBooking[];
}

/**
 * Extrait ville et pays depuis une adresse formatée Google Places.
 * "123 rue, Tulum, QROO 77780, Mexique" → { city: "Tulum", country: "Mexique" }
 */
export function parseCityCountry(
  formattedAddress: string,
  fallbackCity: string,
  fallbackCountry: string,
): { city: string; country: string } {
  const parts = formattedAddress.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const rawCountry = parts.at(-1);
    // Chercher une partie qui ressemble à une ville (ni code postal, ni état abrégé)
    const cityCandidate = parts.find(
      (p, i) => i > 0 && i < parts.length - 1 && !/^\d/.test(p) && p.length > 3,
    );
    return {
      city: cityCandidate || fallbackCity,
      country: rawCountry || fallbackCountry,
    };
  }
  return { city: fallbackCity, country: fallbackCountry };
}

import { tulum } from "./trips/tulum";
import { bali } from "./trips/bali";
import { santorini } from "./trips/santorini";
import { kyoto } from "./trips/kyoto";
import { patagonie } from "./trips/patagonie";
import { maldives } from "./trips/maldives";
import { newYork } from "./trips/new-york";
import { marrakech } from "./trips/marrakech";
import { islande } from "./trips/islande";
import { amalfi } from "./trips/amalfi";
import { paris } from "./trips/paris";
import { tokyo } from "./trips/tokyo";
import { dubai } from "./trips/dubai";
import { rome } from "./trips/rome";
import { barcelona } from "./trips/barcelona";
import { rio } from "./trips/rio";
import { sydney } from "./trips/sydney";
import { capeTown } from "./trips/cape-town";
import { bangkok } from "./trips/bangkok";
import { prague } from "./trips/prague";

export const TRIP_IDEAS: TripIdea[] = [
  tulum,
  bali,
  santorini,
  kyoto,
  patagonie,
  maldives,
  newYork,
  marrakech,
  islande,
  amalfi,
  paris,
  tokyo,
  dubai,
  rome,
  barcelona,
  rio,
  sydney,
  capeTown,
  bangkok,
  prague,
];

export function getTripIdeaById(id: string): TripIdea | undefined {
  return TRIP_IDEAS.find((idea) => idea.id === id);
}
