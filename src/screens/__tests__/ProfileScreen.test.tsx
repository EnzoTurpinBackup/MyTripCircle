import "./support/screenMocks";

import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import ProfileScreen from "../ProfileScreen";
import { lightColors, useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useTrips } from "../../contexts/TripsContext";
import { useFriends } from "../../contexts/FriendsContext";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { useNavigation } from "@react-navigation/native";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({ useNavigation: jest.fn() }));

jest.mock("../../contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../contexts/NotificationContext", () => ({ useNotifications: jest.fn() }));
jest.mock("../../contexts/TripsContext", () => ({ useTrips: jest.fn() }));
jest.mock("../../contexts/FriendsContext", () => ({ useFriends: jest.fn() }));
jest.mock("../../contexts/SubscriptionContext", () => ({ useSubscription: jest.fn() }));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

// Le geste de navigation entre onglets a sa propre suite : ici il n'est qu'un
// conteneur, on le neutralise pour ne pas embarquer Gesture Handler.
jest.mock("../../hooks/useSwipeToNavigate", () => ({
  SwipeToNavigate: ({ children }: { children: React.ReactNode }) => children,
}));

type AlertButton = { text?: string; onPress?: () => void };

const navigate = jest.fn();
const logout = jest.fn();
const isPremium = jest.fn();

const USER = {
  id: "u1",
  name: "Ada Lovelace",
  email: "ada@exemple.test",
  avatar: "",
  isPublicProfile: false,
};

const PUBLIC_TRIP = { id: "t1", title: "Islande", destination: "Reykjavik", visibility: "public" };
const LEGACY_PUBLIC_TRIP = { _id: "t2", title: "Norvège", isPublic: true };
const PRIVATE_TRIP = { id: "t3", title: "Bretagne", visibility: "private" };

const setAuth = (overrides: Record<string, unknown> = {}) => {
  (useAuth as jest.Mock).mockReturnValue({ user: USER, logout, ...overrides });
};

const setTrips = (overrides: Record<string, unknown> = {}) => {
  (useTrips as jest.Mock).mockReturnValue({
    trips: [PRIVATE_TRIP],
    bookings: [{ id: "b1" }, { id: "b2" }],
    addresses: [{ id: "a1" }],
    loading: false,
    ...overrides,
  });
};

const setFriends = (overrides: Record<string, unknown> = {}) => {
  (useFriends as jest.Mock).mockReturnValue({
    friends: [{ id: "f1" }, { id: "f2" }, { id: "f3" }],
    loading: false,
    ...overrides,
  });
};

const lastAlertButtons = (alert: jest.SpyInstance): AlertButton[] =>
  (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];

describe("ProfileScreen", () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (useNavigation as jest.Mock).mockReturnValue({ navigate });
    (useTheme as jest.Mock).mockReturnValue({ colors: lightColors });
    (useNotifications as jest.Mock).mockReturnValue({ unreadCount: 0 });
    (useSubscription as jest.Mock).mockReturnValue({ isPremium });
    isPremium.mockReturnValue(false);
    setAuth();
    setTrips();
    setFriends();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("chargement", () => {
    it("should show placeholders instead of the profile while both sources load", () => {
      // Arrange
      setTrips({ loading: true });
      setFriends({ loading: true });

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.queryByText("profile.logout")).toBeNull();
      expect(screen.queryByText(USER.name)).toBeNull();
    });

    it("should show the profile with placeholder counters when only the trips load", () => {
      // Arrange
      setTrips({ loading: true });

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getByText("profile.logout")).toBeTruthy();
      expect(screen.getAllByText("…")).toHaveLength(3);
      expect(screen.getAllByText("3")).toHaveLength(2);
    });

    it("should show a placeholder for the friends counter alone when only they load", () => {
      // Arrange
      setFriends({ loading: true });

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getAllByText("…")).toHaveLength(1);
    });
  });

  describe("identité affichée", () => {
    it("should show the name and the address of the signed in user", () => {
      // Arrange & Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getByText(USER.name)).toBeTruthy();
      expect(screen.getByText(USER.email)).toBeTruthy();
    });

    it("should show the initials when the account carries no photo", () => {
      // Arrange & Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getByText("AL")).toBeTruthy();
    });

    it("should show the photo instead of the initials when the account has one", () => {
      // Arrange
      setAuth({ user: { ...USER, avatar: "https://cdn.exemple.test/ada.png" } });

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.queryByText("AL")).toBeNull();
    });

    it("should fall back to empty initials when no user is signed in", () => {
      // Arrange
      setAuth({ user: null });

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getByText("profile.privateLabel")).toBeTruthy();
    });

    it("should flag a profile that is not visible to other members", () => {
      // Arrange & Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getByText("profile.privateLabel")).toBeTruthy();
    });

    it("should drop the private flag when the profile is public", () => {
      // Arrange
      setAuth({ user: { ...USER, isPublicProfile: true } });

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.queryByText("profile.privateLabel")).toBeNull();
    });
  });

  describe("compteurs", () => {
    it("should count the trips, bookings, friends and addresses of the user", () => {
      // Arrange & Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getByText("profile.stats.trips")).toBeTruthy();
      expect(screen.getAllByText("1")).toHaveLength(2);
      expect(screen.getByText("2")).toBeTruthy();
    });

    it("should badge the friends row with the number of friends", () => {
      // Arrange & Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getAllByText("3")).toHaveLength(2);
    });

    it("should drop the friends badge when the user has none", () => {
      // Arrange
      setFriends({ friends: [] });

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getAllByText("0")).toHaveLength(1);
    });

    it("should badge the invitations row when notifications are unread", () => {
      // Arrange
      (useNotifications as jest.Mock).mockReturnValue({ unreadCount: 7 });

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getByText("7")).toBeTruthy();
    });
  });

  describe("abonnement", () => {
    it("should invite a free member to subscribe and hide the calendar export", () => {
      // Arrange & Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getByText("profile.subscribe")).toBeTruthy();
      expect(screen.queryByText("calendar.title")).toBeNull();
    });

    it("should offer the calendar export and the management entry to a premium member", () => {
      // Arrange
      isPremium.mockReturnValue(true);

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getByText("calendar.title")).toBeTruthy();
      expect(screen.getByText("subscription.manageButton")).toBeTruthy();
    });
  });

  describe("voyages publics", () => {
    it("should hide the public trips section when the profile is private", () => {
      // Arrange
      setTrips({ trips: [PUBLIC_TRIP] });

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.queryByText("profile.sections.publicTrips")).toBeNull();
    });

    it("should hide the section when a public profile has no public trip", () => {
      // Arrange
      setAuth({ user: { ...USER, isPublicProfile: true } });

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.queryByText("profile.sections.publicTrips")).toBeNull();
    });

    it("should list the public trips of a public profile with their destination", () => {
      // Arrange
      setAuth({ user: { ...USER, isPublicProfile: true } });
      setTrips({ trips: [PUBLIC_TRIP, PRIVATE_TRIP] });

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getByText("profile.sections.publicTrips")).toBeTruthy();
      expect(screen.getByText(PUBLIC_TRIP.title)).toBeTruthy();
      expect(screen.getByText(PUBLIC_TRIP.destination)).toBeTruthy();
      expect(screen.queryByText(PRIVATE_TRIP.title)).toBeNull();
    });

    it("should still list a trip flagged public before visibility existed", () => {
      // Arrange
      setAuth({ user: { ...USER, isPublicProfile: true } });
      setTrips({ trips: [LEGACY_PUBLIC_TRIP] });

      // Act
      render(<ProfileScreen />);

      // Assert
      expect(screen.getByText(LEGACY_PUBLIC_TRIP.title)).toBeTruthy();
      expect(screen.getByText("createTrip.public")).toBeTruthy();
    });
  });

  describe("navigation", () => {
    it.each([
      ["profile.edit", "EditProfile"],
      ["profile.personalInfo", "EditProfile"],
      ["profile.myFriends", "Friends"],
      ["profile.invitations", "Invitation"],
      ["profile.notifications", "Notifications"],
      ["common.settings", "Settings"],
      ["common.helpSupport", "HelpSupport"],
      ["profile.subscribe", "Subscription"],
    ])("should open %s when the row is pressed", (label, target) => {
      // Arrange
      render(<ProfileScreen />);

      // Act
      fireEvent.press(screen.getByText(label));

      // Assert
      expect(navigate).toHaveBeenCalledWith(target);
    });

    it("should open the calendar export from the premium row", () => {
      // Arrange
      isPremium.mockReturnValue(true);
      render(<ProfileScreen />);

      // Act
      fireEvent.press(screen.getByText("calendar.title"));

      // Assert
      expect(navigate).toHaveBeenCalledWith("CalendarExport");
    });
  });

  describe("déconnexion", () => {
    it("should ask for confirmation before signing the user out", () => {
      // Arrange
      render(<ProfileScreen />);

      // Act
      fireEvent.press(screen.getByText("profile.logout"));

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "profile.logoutTitle",
        "profile.logoutMessage",
        expect.any(Array),
      );
      expect(logout).not.toHaveBeenCalled();
    });

    it("should sign the user out once the confirmation is accepted", () => {
      // Arrange
      render(<ProfileScreen />);
      fireEvent.press(screen.getByText("profile.logout"));

      // Act
      lastAlertButtons(alert)[1].onPress?.();

      // Assert
      expect(logout).toHaveBeenCalledTimes(1);
    });

    it("should offer a cancel option that keeps the session open", () => {
      // Arrange
      render(<ProfileScreen />);

      // Act
      fireEvent.press(screen.getByText("profile.logout"));

      // Assert
      expect(lastAlertButtons(alert)[0]).toMatchObject({ text: "common.cancel", style: "cancel" });
      expect(logout).not.toHaveBeenCalled();
    });
  });
});
