import "../../__tests__/support/nativeMocks";

import React from "react";
import { Image } from "react-native";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import AddressHeroCover from "../AddressHeroCover";
import type { Address } from "../../../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

const makeAddress = (overrides: Partial<Address> = {}): Address =>
  ({
    // "a" (0x61 = 97) → 97 % 4 = 1 → deuxième photo de repli
    id: "addr-1",
    name: "Hôtel Sakura",
    city: "Kyoto",
    country: "Japon",
    type: "hotel",
    ...overrides,
  }) as Address;

const renderCover = (
  address: Address,
  { onBack = jest.fn() }: { onBack?: jest.Mock } = {},
) =>
  render(
    <AddressHeroCover
      address={address}
      gradient={["#000", "#111", "#222"]}
      badge={{ label: "Hôtel", emoji: "🏨" }}
      insetTop={40}
      onBack={onBack}
    />,
  );

const coverUri = () => screen.UNSAFE_getByType(Image).props.source.uri as string;

describe("AddressHeroCover", () => {
  beforeEach(() => {
    mockGetSyncCachedPhoto.mockReset().mockReturnValue(null);
    mockGetCachedDestinationPhoto.mockReset().mockResolvedValue(null);
  });

  it("should render the address name as the hero title", async () => {
    renderCover(makeAddress());

    await waitFor(() => expect(screen.getByText("Hôtel Sakura")).toBeTruthy());
  });

  it("should render the badge emoji and label", async () => {
    renderCover(makeAddress());

    await waitFor(() => expect(screen.getByText("🏨 Hôtel")).toBeTruthy());
  });

  it("should call onBack when the back button is pressed", async () => {
    const onBack = jest.fn();
    renderCover(makeAddress(), { onBack });
    await waitFor(() => expect(screen.getByLabelText("common.a11y.back")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("common.a11y.back"));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("should prefer the address own photo over any cached or fallback photo", async () => {
    renderCover(makeAddress({ photoUrl: "https://example.test/own.jpg" }));

    await waitFor(() => expect(coverUri()).toBe("https://example.test/own.jpg"));
    expect(mockGetCachedDestinationPhoto).not.toHaveBeenCalled();
  });

  it("should use the synchronously cached photo when the address has none", async () => {
    mockGetSyncCachedPhoto.mockReturnValue("https://example.test/cached.jpg");
    renderCover(makeAddress());

    await waitFor(() => expect(coverUri()).toBe("https://example.test/cached.jpg"));
  });

  it("should derive the cache key from the address name", async () => {
    renderCover(makeAddress());

    await waitFor(() =>
      expect(mockGetCachedDestinationPhoto).toHaveBeenCalledWith("Hôtel Sakura"),
    );
  });

  it("should fall back to the city and country when the address has no name", async () => {
    renderCover(makeAddress({ name: "" }));

    await waitFor(() =>
      expect(mockGetCachedDestinationPhoto).toHaveBeenCalledWith("Kyoto Japon"),
    );
  });

  it("should fall back to a deterministic stock photo when nothing is cached", async () => {
    // "a" (97) % 4 photos = index 1
    renderCover(makeAddress({ id: "addr-1" }));

    await waitFor(() => expect(coverUri()).toContain("photo-1476514525535"));
  });

  it("should pick the first stock photo when the id starts with a code point divisible by four", async () => {
    // "d" (100) % 4 = 0
    renderCover(makeAddress({ id: "d1" }));

    await waitFor(() => expect(coverUri()).toBe(FIRST_FALLBACK));
  });

  it("should pick the first stock photo when the id is empty", async () => {
    renderCover(makeAddress({ id: "" }));

    await waitFor(() => expect(coverUri()).toBe(FIRST_FALLBACK));
  });

  it("should swap in the resolved remote photo once it arrives", async () => {
    mockGetCachedDestinationPhoto.mockResolvedValue("https://example.test/remote.jpg");
    renderCover(makeAddress());

    await waitFor(() => expect(coverUri()).toBe("https://example.test/remote.jpg"));
  });

  it("should keep the fallback photo when the lookup resolves to nothing", async () => {
    renderCover(makeAddress({ id: "d1" }));

    await waitFor(() => expect(mockGetCachedDestinationPhoto).toHaveBeenCalled());
    expect(coverUri()).toBe(FIRST_FALLBACK);
  });

  it("should revert to the fallback photo when the image fails to load", async () => {
    mockGetSyncCachedPhoto.mockReturnValue("https://example.test/broken.jpg");
    renderCover(makeAddress({ id: "d1" }));
    await waitFor(() => expect(coverUri()).toBe("https://example.test/broken.jpg"));

    act(() => {
      screen.UNSAFE_getByType(Image).props.onError();
    });

    expect(coverUri()).toBe(FIRST_FALLBACK);
  });
});
