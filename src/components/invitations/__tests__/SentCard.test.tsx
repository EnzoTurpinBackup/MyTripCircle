import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import SentCard from "../SentCard";
import i18n from "../../../utils/i18n";
import { findOrphanTextNodes } from "./renderTreeUtils";
import { freezeClockAt, restoreClock } from "./frozenClock";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// `formatRelative` compare la date de création à l'instant présent : sans
// horloge figée, le libellé « il y a X » changerait à chaque exécution.
const NOW = new Date("2026-06-15T12:00:00.000Z");

function makeInvitation(overrides: Record<string, any> = {}) {
  return {
    status: "pending",
    inviteeEmail: "marie@example.test",
    trip: { title: "Week-end à Rome" },
    createdAt: "2026-06-15T11:00:00.000Z",
    ...overrides,
  };
}

function renderSentCard(props: Partial<React.ComponentProps<typeof SentCard>> = {}) {
  const handlers = { onViewTrip: jest.fn(), onCancel: jest.fn() };
  const utils = render(<SentCard invitation={makeInvitation()} {...handlers} {...props} />);
  return { ...utils, ...handlers };
}

describe("SentCard", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    freezeClockAt(NOW);
  });

  afterEach(() => {
    restoreClock();
  });

  it("should render the trip title and the invitee email", () => {
    // Arrange / Act
    renderSentCard();

    // Assert
    expect(screen.getByText("Week-end à Rome")).toBeTruthy();
    expect(screen.getByText("marie@example.test")).toBeTruthy();
  });

  it("should show the awaiting-response badge when the invitation is pending", () => {
    // Arrange / Act
    renderSentCard();

    // Assert
    expect(screen.getByText("⏳ Awaiting response")).toBeTruthy();
  });

  it("should show the accepted badge when the invitation was accepted", () => {
    // Arrange / Act
    renderSentCard({ invitation: makeInvitation({ status: "accepted" }) });

    // Assert
    expect(screen.getByText("✓ Invitation accepted")).toBeTruthy();
  });

  it("should show the declined badge when the invitation was declined", () => {
    // Arrange / Act
    renderSentCard({ invitation: makeInvitation({ status: "declined" }) });

    // Assert
    expect(screen.getByText("✕ Invitation declined")).toBeTruthy();
  });

  it("should show the expired badge when the invitation has expired", () => {
    // Arrange / Act
    renderSentCard({ invitation: makeInvitation({ status: "expired" }) });

    // Assert
    expect(screen.getByText("⏰ Invitation expired")).toBeTruthy();
  });

  it("should fall back to the pending badge when the status is unknown", () => {
    // Arrange / Act
    renderSentCard({ invitation: makeInvitation({ status: "archived" }) });

    // Assert
    expect(screen.getByText("⏳ Awaiting response")).toBeTruthy();
  });

  it("should treat a missing status as pending", () => {
    // Arrange / Act
    renderSentCard({ invitation: { inviteeEmail: "marie@example.test", trip: { title: "Rome" } } });

    // Assert
    expect(screen.getByText("⏳ Awaiting response")).toBeTruthy();
    expect(screen.getByText("Cancel invitation")).toBeTruthy();
  });

  it("should call onCancel when the cancel button is pressed on a pending invitation", () => {
    // Arrange
    const { onCancel } = renderSentCard();

    // Act
    fireEvent.press(screen.getByText("Cancel invitation"));

    // Assert
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should not call onCancel when the card is disabled", () => {
    // Arrange
    const { onCancel } = renderSentCard({ disabled: true });

    // Act
    fireEvent.press(screen.getByText("Cancel invitation"));

    // Assert
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("should call onViewTrip when the view trip link is pressed on an accepted invitation", () => {
    // Arrange
    const { onViewTrip } = renderSentCard({
      invitation: makeInvitation({ status: "accepted" }),
    });

    // Act
    fireEvent.press(screen.getByText("View trip ›"));

    // Assert
    expect(onViewTrip).toHaveBeenCalledTimes(1);
  });

  it("should show the expired row instead of any action on an expired invitation", () => {
    // Arrange / Act
    renderSentCard({ invitation: makeInvitation({ status: "expired" }) });

    // Assert
    expect(screen.getByText("Invitation expired")).toBeTruthy();
    expect(screen.queryByText("Cancel invitation")).toBeNull();
    expect(screen.queryByText("View trip ›")).toBeNull();
  });

  it("should show no action at all on a declined invitation", () => {
    // Arrange / Act
    renderSentCard({ invitation: makeInvitation({ status: "declined" }) });

    // Assert
    expect(screen.queryByText("Cancel invitation")).toBeNull();
    expect(screen.queryByText("View trip ›")).toBeNull();
    expect(screen.queryByText("Invitation expired")).toBeNull();
  });

  it("should fall back to the invitee phone number when no email was provided", () => {
    // Arrange / Act
    renderSentCard({
      invitation: makeInvitation({ inviteeEmail: undefined, inviteePhone: "+33600000000" }),
    });

    // Assert
    expect(screen.getByText("+33600000000")).toBeTruthy();
  });

  it("should fall back to the unknown recipient label when neither email nor phone is set", () => {
    // Arrange / Act
    renderSentCard({
      invitation: makeInvitation({ inviteeEmail: undefined, inviteePhone: undefined }),
    });

    // Assert
    expect(screen.getByText("Unknown recipient")).toBeTruthy();
  });

  it("should fall back to the generic trip label when the trip has no title", () => {
    // Arrange / Act
    renderSentCard({ invitation: makeInvitation({ trip: undefined }) });

    // Assert
    expect(screen.getByText("Trip")).toBeTruthy();
  });

  it("should render the destination and the date range in the banner subtitle", () => {
    // Arrange / Act
    renderSentCard({
      invitation: makeInvitation({
        trip: {
          title: "Week-end à Rome",
          destination: "Rome",
          startDate: "2026-09-04T00:00:00.000Z",
          endDate: "2026-09-06T00:00:00.000Z",
        },
      }),
    });

    // Assert
    expect(screen.getByText("📍 Rome · Sep 4 – Sep 6, 2026")).toBeTruthy();
  });

  it("should render the destination without a date range when the trip has no dates", () => {
    // Arrange / Act
    renderSentCard({
      invitation: makeInvitation({ trip: { title: "Week-end à Rome", destination: "Rome" } }),
    });

    // Assert
    expect(screen.getByText("📍 Rome")).toBeTruthy();
  });

  it("should not render a destination subtitle when the destination is empty", () => {
    // Arrange / Act
    const { toJSON } = renderSentCard({
      invitation: makeInvitation({ trip: { title: "Week-end à Rome", destination: "" } }),
    });

    // Assert
    expect(screen.queryByText(/📍/)).toBeNull();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should show the duration chip when the trip has a start and an end date", () => {
    // Arrange / Act
    const { toJSON } = renderSentCard({
      invitation: makeInvitation({
        trip: {
          title: "Week-end à Rome",
          startDate: "2026-09-04T00:00:00.000Z",
          endDate: "2026-09-06T00:00:00.000Z",
        },
      }),
    });

    // Assert
    expect(screen.getByText("Duration")).toBeTruthy();
    expect(screen.getByText("2 days")).toBeTruthy();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should not show the duration chip when the trip has no dates", () => {
    // Arrange / Act
    const { toJSON } = renderSentCard();

    // Assert
    expect(screen.queryByText("Duration")).toBeNull();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should show the invited role with the relative creation time", () => {
    // Arrange / Act
    renderSentCard();

    // Assert
    expect(screen.getByText("Invited · 1h ago")).toBeTruthy();
  });

  it("should show the invited role with an empty time when the invitation has no creation date", () => {
    // Arrange / Act
    renderSentCard({ invitation: makeInvitation({ createdAt: undefined }) });

    // Assert
    expect(screen.getByText("Invited ·")).toBeTruthy();
  });
});
