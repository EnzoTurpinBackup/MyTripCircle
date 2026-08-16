import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import InvitationCard from "../InvitationCard";
import i18n from "../../../utils/i18n";
import { collectImageUris, findOrphanTextNodes } from "./renderTreeUtils";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// `isExpired` et `formatRelative` comparent la date d'expiration à l'instant
// présent : sans horloge figée, les scénarios "expirée / encore valide"
// basculeraient au fil du temps.
const NOW = new Date("2026-06-15T12:00:00.000Z");

const PAST = "2026-06-01T12:00:00.000Z";
const FUTURE = "2026-07-01T12:00:00.000Z";

function makeInvitation(overrides: Record<string, any> = {}) {
  return {
    status: "pending",
    read: true,
    inviter: { name: "Ana Lopez" },
    trip: { title: "Route des vins" },
    createdAt: "2026-06-15T11:00:00.000Z",
    ...overrides,
  };
}

function renderCard(props: Partial<React.ComponentProps<typeof InvitationCard>> = {}) {
  const handlers = {
    onAccept: jest.fn(),
    onDecline: jest.fn(),
    onDetail: jest.fn(),
    onViewTrip: jest.fn(),
  };
  const utils = render(
    <InvitationCard
      invitation={makeInvitation()}
      expanded={false}
      accepting={false}
      {...handlers}
      {...props}
    />
  );
  return { ...utils, ...handlers };
}

describe("InvitationCard", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render the trip title and inviter name when the invitation is pending", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("Route des vins")).toBeTruthy();
    expect(screen.getByText("Ana Lopez")).toBeTruthy();
  });

  it("should show the accept and decline buttons when the invitation can still be answered", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("Accept")).toBeTruthy();
    expect(screen.getByText("Decline")).toBeTruthy();
  });

  it("should call onAccept when the accept button is pressed", () => {
    // Arrange
    const { onAccept } = renderCard();

    // Act
    fireEvent.press(screen.getByText("Accept"));

    // Assert
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("should call onDecline when the decline button is pressed", () => {
    // Arrange
    const { onDecline } = renderCard();

    // Act
    fireEvent.press(screen.getByText("Decline"));

    // Assert
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("should call onDetail when the card body is pressed", () => {
    // Arrange
    const { onDetail } = renderCard();

    // Act
    fireEvent.press(screen.getByText("Route des vins"));

    // Assert
    expect(onDetail).toHaveBeenCalledTimes(1);
  });

  it("should call onDetail when the collapsed more button is pressed", () => {
    // Arrange
    const { onDetail } = renderCard({ expanded: false });

    // Act
    fireEvent.press(screen.getByText("›"));

    // Assert
    expect(onDetail).toHaveBeenCalledTimes(1);
  });

  it("should hide the more button when the card is expanded", () => {
    // Arrange / Act
    renderCard({ expanded: true });

    // Assert
    expect(screen.queryByText("›")).toBeNull();
  });

  it("should show a spinner instead of the accept label when accepting", () => {
    // Arrange / Act
    renderCard({ accepting: true });

    // Assert
    expect(screen.queryByText("Accept")).toBeNull();
    expect(screen.getByText("Decline")).toBeTruthy();
  });

  it("should not call onAccept when the card is disabled", () => {
    // Arrange
    const { onAccept } = renderCard({ disabled: true });

    // Act
    fireEvent.press(screen.getByText("Accept"));

    // Assert
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("should show the pending badge when the card is expanded", () => {
    // Arrange / Act
    renderCard({ expanded: true });

    // Assert
    expect(screen.getByText("✉️ Awaiting your response")).toBeTruthy();
  });

  it("should show the new badge when the invitation is unread and collapsed", () => {
    // Arrange / Act
    renderCard({ invitation: makeInvitation({ read: false }) });

    // Assert
    expect(screen.getByText("✉️ New")).toBeTruthy();
  });

  it("should show no badge when the invitation is read and collapsed", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.queryByText("✉️ New")).toBeNull();
    expect(screen.queryByText("✉️ Awaiting your response")).toBeNull();
  });

  it("should show the view trip link when the invitation is already accepted", () => {
    // Arrange
    const { onViewTrip } = renderCard({
      invitation: makeInvitation({ status: "accepted" }),
    });

    // Act
    fireEvent.press(screen.getByText("View trip ›"));

    // Assert
    expect(onViewTrip).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Accept")).toBeNull();
  });

  it("should show the expired label when the expiry date is in the past", () => {
    // Arrange / Act
    renderCard({ invitation: makeInvitation({ expiresAt: PAST }) });

    // Assert
    expect(screen.getByText("Invitation expired")).toBeTruthy();
    expect(screen.queryByText("Accept")).toBeNull();
  });

  it("should keep the actions when the expiry date is still ahead", () => {
    // Arrange / Act
    renderCard({ invitation: makeInvitation({ expiresAt: FUTURE }) });

    // Assert
    expect(screen.getByText("Accept")).toBeTruthy();
    expect(screen.queryByText("Invitation expired")).toBeNull();
  });

  it("should show neither actions nor footer when the invitation was declined", () => {
    // Arrange / Act
    renderCard({ invitation: makeInvitation({ status: "declined" }) });

    // Assert
    expect(screen.queryByText("Accept")).toBeNull();
    expect(screen.queryByText("View trip ›")).toBeNull();
    expect(screen.queryByText("Invitation expired")).toBeNull();
  });

  it("should fall back to the generic trip and inviter labels when both are missing", () => {
    // Arrange / Act
    renderCard({ invitation: { status: "pending" } });

    // Assert
    expect(screen.getByText("this trip")).toBeTruthy();
    expect(screen.getByText("Someone")).toBeTruthy();
  });

  it("should prefer the flat tripName and inviterName fields over the nested trip object", () => {
    // Arrange / Act
    renderCard({
      invitation: makeInvitation({ tripName: "Escapade à Rome", inviterName: "Bruno" }),
    });

    // Assert
    expect(screen.getByText("Escapade à Rome")).toBeTruthy();
    expect(screen.getByText("Bruno")).toBeTruthy();
  });

  it("should treat a missing status as pending", () => {
    // Arrange / Act
    renderCard({ invitation: { trip: { title: "Sans statut" } } });

    // Assert
    expect(screen.getByText("Accept")).toBeTruthy();
  });

  it("should render the destination and the date range in the banner subtitle", () => {
    // Arrange / Act
    renderCard({
      invitation: makeInvitation({
        trip: {
          title: "Route des vins",
          destination: "Bordeaux",
          startDate: "2026-08-01T00:00:00.000Z",
          endDate: "2026-08-08T00:00:00.000Z",
        },
      }),
    });

    // Assert
    expect(screen.getByText("📍 Bordeaux · Aug 1 – Aug 8, 2026")).toBeTruthy();
  });

  it("should not render a destination subtitle when the destination is empty", () => {
    // Arrange / Act
    const { toJSON } = renderCard({
      invitation: makeInvitation({ trip: { title: "Route des vins", destination: "" } }),
    });

    // Assert
    expect(screen.queryByText(/📍/)).toBeNull();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should render the destination without a date range when the trip has no dates", () => {
    // Arrange / Act
    const { toJSON } = renderCard({
      invitation: makeInvitation({ trip: { title: "Route des vins", destination: "Lyon" } }),
    });

    // Assert
    expect(screen.getByText("📍 Lyon")).toBeTruthy();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should show the invited-by line with the relative time when the card is collapsed", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("Invited by Ana Lopez")).toBeTruthy();
    expect(screen.getByText(" · 1h ago")).toBeTruthy();
  });

  it("should show an empty subtitle when the invitation has neither dates nor creation date", () => {
    // Arrange / Act
    const { toJSON } = renderCard({
      invitation: { status: "pending", trip: { title: "Sans dates" }, inviter: { name: "Ana" } },
    });

    // Assert
    expect(screen.getByText("Invited by Ana")).toBeTruthy();
    expect(screen.queryByText(/·/)).toBeNull();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should show the organizer role instead of the invited-by line when expanded", () => {
    // Arrange / Act
    renderCard({ expanded: true });

    // Assert
    expect(screen.getByText("Organizer · 1h ago")).toBeTruthy();
    expect(screen.queryByText("Invited by Ana Lopez")).toBeNull();
  });

  it("should show the personal message only when the card is expanded", () => {
    // Arrange
    const invitation = makeInvitation({ message: "Viens avec nous !" });

    // Act
    const collapsed = render(
      <InvitationCard
        invitation={invitation}
        expanded={false}
        accepting={false}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onDetail={jest.fn()}
        onViewTrip={jest.fn()}
      />
    );

    // Assert
    expect(collapsed.queryByText('"Viens avec nous !"')).toBeNull();

    collapsed.rerender(
      <InvitationCard
        invitation={invitation}
        expanded
        accepting={false}
        onAccept={jest.fn()}
        onDecline={jest.fn()}
        onDetail={jest.fn()}
        onViewTrip={jest.fn()}
      />
    );
    expect(collapsed.getByText('"Viens avec nous !"')).toBeTruthy();
  });

  it("should show the duration chip only when the card is expanded and the trip has dates", () => {
    // Arrange / Act
    const { toJSON } = renderCard({
      expanded: true,
      invitation: makeInvitation({
        trip: {
          title: "Route des vins",
          startDate: "2026-08-01T00:00:00.000Z",
          endDate: "2026-08-08T00:00:00.000Z",
        },
      }),
    });

    // Assert
    expect(screen.getByText("Duration")).toBeTruthy();
    expect(screen.getByText("7 days")).toBeTruthy();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should not show the duration chip when the expanded trip has no dates", () => {
    // Arrange / Act
    const { toJSON } = renderCard({ expanded: true });

    // Assert
    expect(screen.queryByText("Duration")).toBeNull();
    expect(findOrphanTextNodes(toJSON())).toEqual([]);
  });

  it("should display the trip cover image when the trip has one", () => {
    // Arrange / Act
    const { toJSON } = renderCard({
      invitation: makeInvitation({
        trip: { title: "Route des vins", coverImage: "https://example.test/cover.jpg" },
      }),
    });

    // Assert
    expect(collectImageUris(toJSON())).toEqual(["https://example.test/cover.jpg"]);
  });

  it("should display no image when the trip has no cover", () => {
    // Arrange / Act
    const { toJSON } = renderCard();

    // Assert
    expect(collectImageUris(toJSON())).toEqual([]);
  });
});
