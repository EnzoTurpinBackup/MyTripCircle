import "../../__tests__/support/nativeMocks";

import React from "react";
import { Image } from "react-native";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import BookingHeroCover from "../BookingHeroCover";
import type { Booking } from "../../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// `utils/i18n` initialise i18next et le client API au chargement : on ne garde
// que le formateur de statut utilisé par la couverture.
jest.mock("../../../utils/i18n", () => ({
  getBookingStatusTranslation: (status: string) => `statut(${status})`,
}));

const mockGetSyncCachedPhoto = jest.fn();
const mockGetCachedDestinationPhoto = jest.fn();
jest.mock("../../../utils/destinationPhoto", () => ({
  getSyncCachedPhoto: (...args: unknown[]) => mockGetSyncCachedPhoto(...args),
  getCachedDestinationPhoto: (...args: unknown[]) =>
    mockGetCachedDestinationPhoto(...args),
}));

const FIRST_FALLBACK =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80&fit=crop";

const makeBooking = (overrides: Partial<Booking> = {}): Booking =>
  ({
    // "d" (100) % 4 = 0 → première photo de repli
    id: "d1",
    tripId: "t1",
    type: "flight",
    title: "Vol Paris — Tokyo",
    date: new Date("2026-03-12T00:00:00Z"),
    status: "confirmed",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  }) as Booking;

const renderCover = (
  booking: Booking,
  { onBack = jest.fn() }: { onBack?: jest.Mock } = {},
) =>
  render(
    <BookingHeroCover
      booking={booking}
      gradient={["#000", "#111"]}
      insetTop={40}
      onBack={onBack}
    />,
  );

const coverUri = () => screen.UNSAFE_getByType(Image).props.source.uri as string;

describe("BookingHeroCover", () => {
  beforeEach(() => {
    mockGetSyncCachedPhoto.mockReset().mockReturnValue(null);
    mockGetCachedDestinationPhoto.mockReset().mockResolvedValue(null);
  });

  it("should render the booking title as the hero title", async () => {
    renderCover(makeBooking());

    await waitFor(() => expect(screen.getByText("Vol Paris — Tokyo")).toBeTruthy());
  });

  it("should render the translated booking type badge", async () => {
    renderCover(makeBooking());

    await waitFor(() => expect(screen.getByText("bookings.filters.flight")).toBeTruthy());
  });

  it("should render the translated status badge", async () => {
    renderCover(makeBooking());

    await waitFor(() => expect(screen.getByText("statut(confirmed)")).toBeTruthy());
  });

  it("should fall back to an unknown label when the status is missing", async () => {
    renderCover(
      makeBooking({ status: undefined as unknown as Booking["status"] }),
    );

    await waitFor(() => expect(screen.getByText("common.unknown")).toBeTruthy());
  });

  it("should call onBack when the back button is pressed", async () => {
    const onBack = jest.fn();
    renderCover(makeBooking(), { onBack });
    await waitFor(() => expect(screen.getByLabelText("common.a11y.back")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("common.a11y.back"));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("should use the synchronously cached photo when one is available", async () => {
    mockGetSyncCachedPhoto.mockReturnValue("https://example.test/cached.jpg");
    renderCover(makeBooking());

    await waitFor(() => expect(coverUri()).toBe("https://example.test/cached.jpg"));
  });

  it("should derive the photo query from the booking address when there is one", async () => {
    renderCover(makeBooking({ address: "Roissy CDG" }));

    await waitFor(() =>
      expect(mockGetCachedDestinationPhoto).toHaveBeenCalledWith("Roissy CDG"),
    );
  });

  it("should fall back to the booking title when there is no address", async () => {
    renderCover(makeBooking());

    await waitFor(() =>
      expect(mockGetCachedDestinationPhoto).toHaveBeenCalledWith("Vol Paris — Tokyo"),
    );
  });

  it("should pick the stock photo matching the booking id code point", async () => {
    // "a" (97) % 4 = 1 → deuxième photo de repli
    renderCover(makeBooking({ id: "a1" }));

    await waitFor(() => expect(coverUri()).toContain("photo-1476514525535"));
  });

  it("should pick the first stock photo when the id is empty", async () => {
    renderCover(makeBooking({ id: "" }));

    await waitFor(() => expect(coverUri()).toBe(FIRST_FALLBACK));
  });

  it("should swap in the resolved remote photo once it arrives", async () => {
    mockGetCachedDestinationPhoto.mockResolvedValue("https://example.test/remote.jpg");
    renderCover(makeBooking());

    await waitFor(() => expect(coverUri()).toBe("https://example.test/remote.jpg"));
  });

  it("should revert to the stock photo when the lookup resolves to nothing", async () => {
    mockGetSyncCachedPhoto.mockReturnValue("https://example.test/cached.jpg");
    renderCover(makeBooking());

    await waitFor(() => expect(coverUri()).toBe(FIRST_FALLBACK));
  });

  it("should revert to the stock photo when the image fails to load", async () => {
    mockGetSyncCachedPhoto.mockReturnValue("https://example.test/broken.jpg");
    mockGetCachedDestinationPhoto.mockResolvedValue("https://example.test/broken.jpg");
    renderCover(makeBooking());
    await waitFor(() => expect(coverUri()).toBe("https://example.test/broken.jpg"));

    act(() => {
      screen.UNSAFE_getByType(Image).props.onError();
    });

    expect(coverUri()).toBe(FIRST_FALLBACK);
  });
});
