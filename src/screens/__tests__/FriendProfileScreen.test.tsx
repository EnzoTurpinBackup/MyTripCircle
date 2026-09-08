import "./support/screenMocks";

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import FriendProfileScreen from "../FriendProfileScreen";
import { freezeClockAt, restoreClock } from "../../components/invitations/__tests__/frozenClock";

// Les libellés de sections datent des voyages : l'horloge doit être figée pour
// que « voyage passé » ait un sens stable.
const NOW = new Date("2026-06-15T12:00:00.000Z");

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join("|")}` : key,
    i18n: { language: mockLanguage },
  }),
}));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: () => ({ colors: jest.requireActual("../../contexts/ThemeContext").lightColors }),
}));

jest.mock("../../hooks/useFriendProfileActions", () => ({
  useFriendProfileActions: () => mockActions,
}));

// Le dégradé du bandeau n'expose rien d'interrogeable.
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { LinearGradient: (props: Record<string, any>) => React.createElement(View, props) };
});

jest.mock("../../components/friendProfile/ProfileSkeleton", () => {
  const { stubComponent } = require("./support/stubComponent");
  return { __esModule: true, default: stubComponent("profile-skeleton") };
});

jest.mock("../../components/friendProfile/ProfileActions", () => {
  const { stubComponent } = require("./support/stubComponent");
  return {
    __esModule: true,
    default: stubComponent("profile-actions", {
      fields: ["isFriend", "sending"],
      callbacks: ["onInvite", "onRemove", "onAddFriend", "onReport", "onBlock"],
    }),
  };
});

jest.mock("../../components/friendProfile/TripSection", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const TripSection = ({ title, trips, emptyText, onPress }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: `trip-section:${title}` },
      React.createElement(
        Text,
        { testID: `trip-section:${title}:trips` },
        trips.map((trip: any) => trip.id).join(",") || "none",
      ),
      React.createElement(Text, { testID: `trip-section:${title}:empty` }, emptyText),
      React.createElement(
        TouchableOpacity,
        { testID: `trip-section:${title}:press`, onPress: () => onPress("trip-pressed") },
        React.createElement(Text, null, "open"),
      ),
    );
  return { __esModule: true, default: TripSection };
});

jest.mock("../../components/moderation/ReportSheet", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  const ReportSheet = ({ visible, targetType, onClose, onSubmit }: Record<string, any>) =>
    React.createElement(
      View,
      { testID: "report-sheet" },
      React.createElement(Text, { testID: "report-sheet:state" }, `${String(visible)}/${targetType}`),
      React.createElement(
        TouchableOpacity,
        { testID: "report-sheet:close", onPress: onClose },
        React.createElement(Text, null, "close"),
      ),
      React.createElement(
        TouchableOpacity,
        { testID: "report-sheet:submit", onPress: () => onSubmit("spam") },
        React.createElement(Text, null, "submit"),
      ),
    );
  return { __esModule: true, default: ReportSheet };
});

const handleRemove = jest.fn();
const handleAddFriend = jest.fn();
const handleReport = jest.fn();
const handleBlock = jest.fn();
const goToTrip = jest.fn();
const navigateInvite = jest.fn();
const goBack = jest.fn();

let mockLanguage = "fr";
let mockActions: Record<string, unknown>;

const setActions = (overrides: Record<string, unknown> = {}) => {
  mockActions = {
    profile: null,
    loading: false,
    sending: false,
    name: "Ada Lovelace",
    initials: "AL",
    avatarColor: "#C4714A",
    isFriend: false,
    friendName: "Ada Lovelace",
    handleRemove,
    handleAddFriend,
    handleReport,
    handleBlock,
    goToTrip,
    navigateInvite,
    goBack,
    ...overrides,
  };
};

const renderScreen = (overrides: Record<string, unknown> = {}) => {
  setActions(overrides);
  render(<FriendProfileScreen />);
};

const sectionTrips = (title: string) =>
  screen.getByTestId(`trip-section:${title}:trips`).props.children;

/**
 * L'icône du badge double le texte qui l'accompagne : elle porte
 * `DECORATIVE_ELEMENT_PROPS` et sort du parcours des technologies d'assistance,
 * que les requêtes ignorent par défaut. Le badge lui-même reste vérifié par son
 * texte ; cette requête n'observe que la présence visuelle de l'icône.
 */
const decorativeIcon = (name: string) =>
  screen.queryByText(name, { includeHiddenElements: true });

describe("FriendProfileScreen", () => {
  beforeEach(() => {
    freezeClockAt(NOW);
    jest.clearAllMocks();
    mockLanguage = "fr";
    handleReport.mockResolvedValue(undefined);
    setActions();
  });

  afterEach(() => {
    restoreClock();
  });

  describe("bandeau d'identité", () => {
    it("should show a skeleton and hide the relationship badge while the profile loads", () => {
      // Arrange & Act
      renderScreen({ loading: true });

      // Assert
      expect(screen.getByTestId("profile-skeleton")).toBeTruthy();
      expect(screen.queryByText("friendProfile.badgeFriend")).toBeNull();
      expect(screen.queryByText("friendProfile.badgePublic")).toBeNull();
    });

    it("should badge the profile as a friend when the friendship exists", () => {
      // Arrange & Act
      renderScreen({ isFriend: true, profile: {} });

      // Assert
      expect(screen.getByText("friendProfile.badgeFriend")).toBeTruthy();
      expect(decorativeIcon("icon:checkmark")).toBeTruthy();
    });

    it("should badge the profile as public when there is no friendship", () => {
      // Arrange & Act
      renderScreen({ isFriend: false, profile: {} });

      // Assert
      expect(screen.getByText("friendProfile.badgePublic")).toBeTruthy();
      expect(decorativeIcon("icon:earth-outline")).toBeTruthy();
    });

    it("should show the initials when the profile has no picture", () => {
      // Arrange & Act
      renderScreen({ profile: {} });

      // Assert
      expect(screen.getByText("AL")).toBeTruthy();
    });

    it("should show the picture instead of the initials when the profile has one", () => {
      // Arrange & Act
      renderScreen({ profile: { avatar: "https://cdn.example.com/ada.png" } });

      // Assert
      expect(screen.queryByText("AL")).toBeNull();
    });

    it("should date the friendship in French when the app runs in French", () => {
      // Arrange & Act
      renderScreen({ isFriend: true, profile: { friendSince: "2025-01-20T00:00:00.000Z" } });

      // Assert
      expect(screen.getByText("friendProfile.friendSince:janv. 2025")).toBeTruthy();
    });

    it("should date the friendship in English when the app runs in English", () => {
      // Arrange
      mockLanguage = "en";

      // Act
      renderScreen({ isFriend: true, profile: { friendSince: "2025-01-20T00:00:00.000Z" } });

      // Assert
      expect(screen.getByText("friendProfile.friendSince:Jan 2025")).toBeTruthy();
    });

    it("should hide the friendship date when the profile does not carry one", () => {
      // Arrange & Act
      renderScreen({ isFriend: true, profile: {} });

      // Assert
      expect(screen.queryByText(/friendProfile\.friendSince/)).toBeNull();
    });

    it("should hide the friendship date for a profile that is not a friend", () => {
      // Arrange & Act
      renderScreen({ isFriend: false, profile: { friendSince: "2025-01-20T00:00:00.000Z" } });

      // Assert
      expect(screen.queryByText(/friendProfile\.friendSince/)).toBeNull();
    });
  });

  describe("profil privé", () => {
    it("should explain that the profile is private and name its owner", () => {
      // Arrange & Act
      renderScreen({ profile: { isPublicProfile: false, name: "Ada Lovelace" } });

      // Assert
      expect(screen.getByText("friendProfile.privateTitle")).toBeTruthy();
      expect(screen.getByText("friendProfile.privateSubtitle:Ada")).toBeTruthy();
      expect(screen.queryByTestId("trip-section:friendProfile.sectionRecentTrips")).toBeNull();
    });

    it("should still offer the profile actions on a private profile", () => {
      // Arrange & Act
      renderScreen({ profile: { isPublicProfile: false }, isFriend: true, sending: true });

      // Assert
      expect(screen.getByTestId("profile-actions:isFriend")).toHaveTextContent("true");
      expect(screen.getByTestId("profile-actions:sending")).toHaveTextContent("true");
    });

    it("should open the report sheet from a private profile too", () => {
      // Arrange
      renderScreen({ profile: { isPublicProfile: false } });

      // Act
      fireEvent.press(screen.getByTestId("profile-actions:onReport"));

      // Assert
      expect(screen.getByTestId("report-sheet:state")).toHaveTextContent("true/user");
    });

    it("should fall back to the route name when the private profile carries none", () => {
      // Arrange & Act
      renderScreen({ profile: { isPublicProfile: false }, friendName: "Grace Hopper" });

      // Assert
      expect(screen.getByText("friendProfile.privateSubtitle:Grace")).toBeTruthy();
    });

    it("should show the public profile when the visibility flag is not set", () => {
      // Arrange & Act — `undefined` signifie « profil non chargé », pas « privé ».
      renderScreen({ profile: { name: "Ada Lovelace" } });

      // Assert
      expect(screen.queryByText("friendProfile.privateTitle")).toBeNull();
      expect(screen.getByTestId("trip-section:friendProfile.sectionRecentTrips")).toBeTruthy();
    });
  });

  describe("statistiques", () => {
    it("should display the statistics carried by the profile", () => {
      // Arrange & Act
      renderScreen({
        profile: {
          isPublicProfile: true,
          stats: { totalTrips: 12, countries: 7, commonFriends: 3, totalBookings: 21 },
        },
      });

      // Assert
      expect(screen.getByText("12")).toBeTruthy();
      expect(screen.getByText("7")).toBeTruthy();
      expect(screen.getByText("3")).toBeTruthy();
      expect(screen.getByText("21")).toBeTruthy();
    });

    it("should display zeros when the profile carries no statistics", () => {
      // Arrange & Act
      renderScreen({ profile: { isPublicProfile: true } });

      // Assert
      expect(screen.getAllByText("0")).toHaveLength(4);
    });
  });

  describe("sections de voyages", () => {
    const PROFILE = {
      isPublicProfile: true,
      commonTrips: [{ id: "common-1" }],
      sharedTrips: [
        { id: "past-1", endDate: "2026-01-01T00:00:00.000Z", visibility: "friends" },
        { id: "future-1", endDate: "2026-12-31T00:00:00.000Z", visibility: "public" },
      ],
    };

    it("should hide the friendship only sections for a profile that is not a friend", () => {
      // Arrange & Act
      renderScreen({ profile: PROFILE, isFriend: false });

      // Assert
      expect(screen.queryByTestId("trip-section:friendProfile.sectionCommonTrips")).toBeNull();
      expect(screen.queryByTestId("trip-section:friendProfile.sectionFriendsTrips")).toBeNull();
      expect(screen.getByTestId("trip-section:friendProfile.sectionRecentTrips")).toBeTruthy();
      expect(screen.getByTestId("trip-section:friendProfile.sectionPublicTrips")).toBeTruthy();
    });

    it("should show the friendship only sections for a friend", () => {
      // Arrange & Act
      renderScreen({ profile: PROFILE, isFriend: true });

      // Assert
      expect(sectionTrips("friendProfile.sectionCommonTrips")).toBe("common-1");
      expect(sectionTrips("friendProfile.sectionFriendsTrips")).toBe("past-1");
    });

    it("should keep only the finished trips in the recent section", () => {
      // Arrange & Act
      renderScreen({ profile: PROFILE });

      // Assert
      expect(sectionTrips("friendProfile.sectionRecentTrips")).toBe("past-1");
    });

    it("should cap the recent section at eight trips", () => {
      // Arrange
      const sharedTrips = Array.from({ length: 10 }, (_, index) => ({
        id: `past-${index}`,
        endDate: "2026-01-01T00:00:00.000Z",
        visibility: "public",
      }));

      // Act
      renderScreen({ profile: { isPublicProfile: true, sharedTrips } });

      // Assert
      expect(sectionTrips("friendProfile.sectionRecentTrips").split(",")).toHaveLength(8);
    });

    it("should keep only the public trips in the public section", () => {
      // Arrange & Act
      renderScreen({ profile: PROFILE });

      // Assert
      expect(sectionTrips("friendProfile.sectionPublicTrips")).toBe("future-1");
    });

    it("should show empty sections when the profile shares nothing", () => {
      // Arrange & Act
      renderScreen({ profile: { isPublicProfile: true }, isFriend: true });

      // Assert
      expect(sectionTrips("friendProfile.sectionCommonTrips")).toBe("none");
      expect(sectionTrips("friendProfile.sectionRecentTrips")).toBe("none");
      expect(sectionTrips("friendProfile.sectionFriendsTrips")).toBe("none");
      expect(sectionTrips("friendProfile.sectionPublicTrips")).toBe("none");
    });

    it("should name the owner in the empty messages of the open sections", () => {
      // Arrange & Act
      renderScreen({ profile: { isPublicProfile: true, name: "Ada Lovelace" } });

      // Assert
      expect(screen.getByTestId("trip-section:friendProfile.sectionRecentTrips:empty")).toHaveTextContent(
        "friendProfile.emptyRecentTrips:Ada",
      );
      expect(screen.getByTestId("trip-section:friendProfile.sectionPublicTrips:empty")).toHaveTextContent(
        "friendProfile.emptyPublicTrips:Ada",
      );
    });

    it("should open the public view of the trip that was tapped", () => {
      // Arrange
      renderScreen({ profile: PROFILE });

      // Act
      fireEvent.press(screen.getByTestId("trip-section:friendProfile.sectionRecentTrips:press"));

      // Assert
      expect(goToTrip).toHaveBeenCalledWith("trip-pressed");
    });
  });

  describe("actions sur le profil", () => {
    beforeEach(() => {
      setActions({ profile: { isPublicProfile: true } });
      render(<FriendProfileScreen />);
    });

    it.each([
      ["onInvite", navigateInvite],
      ["onRemove", handleRemove],
      ["onAddFriend", handleAddFriend],
      ["onBlock", handleBlock],
    ])("should delegate %s to the actions hook", (callback, handler) => {
      // Arrange & Act
      fireEvent.press(screen.getByTestId(`profile-actions:${callback}`));

      // Assert
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should keep the report sheet closed until the report action is used", () => {
      // Assert
      expect(screen.getByTestId("report-sheet:state")).toHaveTextContent("false/user");
    });

    it("should open the report sheet when the report action is used", () => {
      // Arrange & Act
      fireEvent.press(screen.getByTestId("profile-actions:onReport"));

      // Assert
      expect(screen.getByTestId("report-sheet:state")).toHaveTextContent("true/user");
    });

    it("should close the report sheet when it is dismissed", () => {
      // Arrange
      fireEvent.press(screen.getByTestId("profile-actions:onReport"));

      // Act
      fireEvent.press(screen.getByTestId("report-sheet:close"));

      // Assert
      expect(screen.getByTestId("report-sheet:state")).toHaveTextContent("false/user");
    });

    it("should close the sheet and forward the reason when a report is submitted", async () => {
      // Arrange
      fireEvent.press(screen.getByTestId("profile-actions:onReport"));

      // Act
      await fireEvent.press(screen.getByTestId("report-sheet:submit"));

      // Assert
      expect(handleReport).toHaveBeenCalledWith("spam");
      expect(screen.getByTestId("report-sheet:state")).toHaveTextContent("false/user");
    });
  });

  describe("navigation", () => {
    it("should go back when the back button is pressed", () => {
      // Arrange
      renderScreen();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });
});
