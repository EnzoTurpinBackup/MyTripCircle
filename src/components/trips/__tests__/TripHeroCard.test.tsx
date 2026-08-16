jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeTrip } from "../../__tests__/voyagesTestUtils";
import TripHeroCard from "../TripHeroCard";

const renderCard = (props: Partial<React.ComponentProps<typeof TripHeroCard>> = {}) =>
  render(
    <TripHeroCard
      trip={makeTrip()}
      photoUri="https://cdn/lima.jpg"
      daysUntil={12}
      onPress={jest.fn()}
      {...props}
    />,
  );

// Le libellé de statut dépend de « maintenant » : on fige l'horloge avant le
// départ du voyage de référence (15 mars 2026).
beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
  jest.setSystemTime(new Date("2026-03-03T09:00:00.000Z"));
});

afterAll(() => {
  jest.useRealTimers();
});

describe("TripHeroCard — contenu", () => {
  it("should show the trip title", () => {
    renderCard();

    expect(screen.getByText("Pérou 2026")).toBeTruthy();
  });

  it("should show the destination and the short date range", () => {
    renderCard();

    expect(screen.getByText("📍 Lima · 15 Mar–25 Mar")).toBeTruthy();
  });

  it("should show the number of days before departure", () => {
    renderCard({ daysUntil: 12 });

    expect(screen.getByText("12j")).toBeTruthy();
  });

  it("should open the trip when the card is pressed", () => {
    const onPress = jest.fn();
    renderCard({ onPress });

    fireEvent.press(screen.getByText("Pérou 2026"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("TripHeroCard — statut", () => {
  it("should show the draft status for a draft trip", () => {
    renderCard({ trip: makeTrip({ status: "draft" }) });

    expect(screen.getByText("● Draft")).toBeTruthy();
  });

  it("should show the upcoming status before the trip starts", () => {
    renderCard({ trip: makeTrip({ status: "validated" }) });

    expect(screen.getByText("● Upcoming")).toBeTruthy();
  });

  it("should show the active status once the trip has started", () => {
    jest.setSystemTime(new Date("2026-03-20T09:00:00.000Z"));

    renderCard({ trip: makeTrip({ status: "validated" }) });

    expect(screen.getByText("● Active")).toBeTruthy();
    jest.setSystemTime(new Date("2026-03-03T09:00:00.000Z"));
  });

  it("should prefer the draft status even after the start date", () => {
    jest.setSystemTime(new Date("2026-03-20T09:00:00.000Z"));

    renderCard({ trip: makeTrip({ status: "draft" }) });

    expect(screen.getByText("● Draft")).toBeTruthy();
    jest.setSystemTime(new Date("2026-03-03T09:00:00.000Z"));
  });
});

describe("TripHeroCard — pastilles de statistiques", () => {
  it("should show the booking count coming from the trip stats", () => {
    renderCard({ trip: makeTrip({ stats: { totalBookings: 5 } as any }) });

    expect(screen.getByText("5")).toBeTruthy();
  });

  it("should fall back to zero bookings when the trip has no stats", () => {
    renderCard({ trip: makeTrip({ stats: undefined as any }) });

    expect(screen.getByText("0")).toBeTruthy();
  });

  it("should count the owner on top of the collaborators", () => {
    renderCard({
      trip: makeTrip({
        collaborators: [{ userId: "u2" }, { userId: "u3" }] as any,
      }),
    });

    expect(screen.getByText("3")).toBeTruthy();
  });

  it("should count a lone traveler when the trip has no collaborators list", () => {
    renderCard({ trip: makeTrip({ collaborators: undefined as any }) });

    expect(screen.getByText("1")).toBeTruthy();
  });

  it("should label the three statistics", () => {
    renderCard();

    expect(screen.getByText("Bookings")).toBeTruthy();
    expect(screen.getByText("Co-travelers")).toBeTruthy();
    expect(screen.getByText("Before departure")).toBeTruthy();
  });
});
