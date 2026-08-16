import {
  getTypeLabels,
  getTypeColors,
  STATUS_COLORS,
  STATUSES,
  statusLabel,
  getSafeDate,
} from "../bookingFormConstants";

const t = (key: string) => key;

describe("getTypeLabels", () => {
  it("should map every booking type to its translation key", () => {
    // Act
    const labels = getTypeLabels(t);

    // Assert
    expect(labels).toEqual({
      flight: "bookings.typeLabels.flight",
      hotel: "bookings.typeLabels.hotel",
      train: "bookings.typeLabels.train",
      restaurant: "bookings.typeLabels.restaurant",
      activity: "bookings.typeLabels.activity",
    });
  });
});

describe("getTypeColors", () => {
  it("should return the light backgrounds when dark mode is off", () => {
    // Act
    const colors = getTypeColors(false);

    // Assert
    expect(colors.flight.bg).toBe("#DCF0F5");
    expect(colors.hotel.bg).toBe("#E2EDD9");
    expect(colors.train.bg).toBe("#F5E5DC");
    expect(colors.restaurant.bg).toBe("#F5E5DC");
    expect(colors.activity.bg).toBe("#EDE8F5");
  });

  it("should return the dark backgrounds when dark mode is on", () => {
    // Act
    const colors = getTypeColors(true);

    // Assert
    expect(colors.flight.bg).toBe("#1A2E38");
    expect(colors.hotel.bg).toBe("#1E2E1A");
    expect(colors.train.bg).toBe("#3D2418");
    expect(colors.restaurant.bg).toBe("#3D2418");
    expect(colors.activity.bg).toBe("#2A1E3A");
  });

  it("should keep border and text colors identical in both modes", () => {
    // Act
    const light = getTypeColors(false);
    const dark = getTypeColors(true);

    // Assert
    for (const type of ["flight", "hotel", "train", "restaurant", "activity"]) {
      expect(dark[type].border).toBe(light[type].border);
      expect(dark[type].text).toBe(light[type].text);
    }
  });
});

describe("STATUS_COLORS / STATUSES", () => {
  it("should expose one colour per selectable status", () => {
    expect(STATUSES).toEqual(["confirmed", "pending", "cancelled"]);
    expect(STATUS_COLORS.confirmed).toBe("#6B8C5A");
    expect(STATUS_COLORS.pending).toBe("#FF9500");
    expect(STATUS_COLORS.cancelled).toBe("#C04040");
  });
});

describe("statusLabel", () => {
  it("should return the translated label when the key resolves", () => {
    expect(statusLabel(t, "confirmed")).toBe("bookings.status.confirmed");
  });

  it("should fall back to the raw status when the translation is empty", () => {
    // Arrange — i18next renvoie une chaîne vide lorsqu'une clé n'a pas de valeur
    const emptyT = () => "";

    // Act / Assert
    expect(statusLabel(emptyT, "cancelled")).toBe("cancelled");
  });
});

describe("getSafeDate", () => {
  const NOW = new Date("2026-03-15T10:00:00.000Z");

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("should return the same instance when the date is a valid Date", () => {
    // Arrange
    const date = new Date("2026-01-02T03:04:05.000Z");

    // Act / Assert
    expect(getSafeDate(date)).toBe(date);
  });

  it("should fall back to now when the date is an invalid Date", () => {
    expect(getSafeDate(new Date("not-a-date"))).toEqual(NOW);
  });

  it("should fall back to now when the value is not a Date at all", () => {
    expect(getSafeDate("2026-01-02")).toEqual(NOW);
    expect(getSafeDate(undefined)).toEqual(NOW);
    expect(getSafeDate(null)).toEqual(NOW);
  });
});
