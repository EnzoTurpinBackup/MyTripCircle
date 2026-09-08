import "./support/screenMocks";

import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import FriendInvitationScreen from "../FriendInvitationScreen";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join("|")}` : key,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { token: mockToken } }),
}));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: () => ({ colors: jest.requireActual("../../contexts/ThemeContext").lightColors }),
}));

jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("../../contexts/NetworkContext", () => ({
  useNetwork: () => ({ isConnected: mockIsConnected }),
}));

jest.mock("../../services/ApiService", () => ({
  ApiService: {
    getFriendInviteByToken: (...args: unknown[]) => mockGetFriendInviteByToken(...args),
    acceptFriendInviteLink: (...args: unknown[]) => mockAcceptFriendInviteLink(...args),
  },
}));

jest.mock("../../utils/i18n", () => ({
  parseApiError: (...args: unknown[]) => mockParseApiError(...args),
}));

jest.mock("../../components/SkeletonBox", () => {
  const { stubComponent } = require("./support/stubComponent");
  return { __esModule: true, default: stubComponent("skeleton") };
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetFriendInviteByToken = jest.fn();
const mockAcceptFriendInviteLink = jest.fn();
const mockParseApiError = jest.fn();

let mockToken = "tok-1";
let mockUser: Record<string, unknown> | null = null;
let mockIsConnected = true;

/** Monte l'écran et laisse la lecture du lien se résoudre. */
const renderScreen = async () => {
  render(<FriendInvitationScreen />);
  await act(async () => {});
};

const acceptInvite = async () => {
  await act(async () => {
    fireEvent.press(screen.getByText("friendInvitation.addAsFriend"));
  });
};

describe("FriendInvitationScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = "tok-1";
    mockUser = { id: "u1" };
    mockIsConnected = true;
    mockParseApiError.mockReturnValue("");
    mockGetFriendInviteByToken.mockResolvedValue({
      userId: "owner-1",
      name: "Ada Lovelace",
      avatar: null,
    });
    mockAcceptFriendInviteLink.mockResolvedValue(undefined);
  });

  describe("chargement du lien", () => {
    it("should show a skeleton placeholder while the link is being read", async () => {
      // Arrange
      let release: (value: unknown) => void = () => {};
      mockGetFriendInviteByToken.mockReturnValue(new Promise((r) => { release = r; }));

      // Act
      render(<FriendInvitationScreen />);

      // Assert
      expect(screen.getAllByTestId("skeleton")).toHaveLength(4);
      await act(async () => { release({ userId: "owner-1", name: "Ada", avatar: null }); });
    });

    it("should read the link with the token carried by the route", async () => {
      // Arrange
      mockToken = "tok-42";

      // Act
      await renderScreen();

      // Assert
      expect(mockGetFriendInviteByToken).toHaveBeenCalledWith("tok-42");
    });
  });

  describe("lien invalide", () => {
    it("should surface the parsed reason why the link cannot be used", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Lien expiré");
      mockGetFriendInviteByToken.mockRejectedValue(new Error("410"));

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("friendInvitation.errorTitle")).toBeTruthy();
      expect(screen.getByText("Lien expiré")).toBeTruthy();
    });

    it("should fall back to a generic reason when the failure cannot be parsed", async () => {
      // Arrange
      mockGetFriendInviteByToken.mockRejectedValue(new Error("boom"));

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("friendInvitation.errorFallback")).toBeTruthy();
    });

    it("should go back when the error screen is dismissed", async () => {
      // Arrange
      mockGetFriendInviteByToken.mockRejectedValue(new Error("boom"));
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("friendInvitation.back"));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("lien pointant sur soi-même", () => {
    it("should explain that the link belongs to the signed in user", async () => {
      // Arrange
      mockUser = { id: "owner-1" };

      // Act
      await renderScreen();

      // Assert
      expect(screen.getByText("friendInvitation.selfTitle")).toBeTruthy();
      expect(screen.getByText("friendInvitation.selfSubtitle")).toBeTruthy();
    });

    it("should go back when the self screen is dismissed", async () => {
      // Arrange
      mockUser = { id: "owner-1" };
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("friendInvitation.back"));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("lien valide", () => {
    it("should present the owner of the link and the invitation wording", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("friendInvitation.eyebrow")).toBeTruthy();
      expect(screen.getByText("Ada Lovelace")).toBeTruthy();
      expect(screen.getByText("friendInvitation.readySubtitle")).toBeTruthy();
    });

    it("should fall back to the owner initials when the profile has no picture", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("AL")).toBeTruthy();
    });

    it("should show the owner picture instead of the initials when there is one", async () => {
      // Arrange
      mockGetFriendInviteByToken.mockResolvedValue({
        userId: "owner-1",
        name: "Ada Lovelace",
        avatar: "https://cdn.example.com/ada.png",
      });

      // Act
      await renderScreen();

      // Assert
      expect(screen.queryByText("AL")).toBeNull();
    });

    it("should decline the invitation by simply leaving the screen", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("friendInvitation.decline"));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockAcceptFriendInviteLink).not.toHaveBeenCalled();
    });
  });

  describe("visiteur non connecté", () => {
    beforeEach(() => {
      mockUser = null;
    });

    it("should offer to sign in rather than to accept straight away", async () => {
      // Arrange & Act
      await renderScreen();

      // Assert
      expect(screen.getByText("friendInvitation.loginToAccept")).toBeTruthy();
      expect(screen.queryByText("friendInvitation.addAsFriend")).toBeNull();
    });

    it("should open the login form when the visitor chooses to sign in", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("friendInvitation.loginToAccept"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("Auth", { initialMode: "login" });
    });

    it("should open the registration form when the visitor chooses to sign up", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByText("friendInvitation.createAccount"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("Auth", { initialMode: "register" });
    });
  });

  describe("acceptation du lien", () => {
    it("should show a progress state while the acceptance is in flight", async () => {
      // Arrange
      let release: () => void = () => {};
      mockAcceptFriendInviteLink.mockReturnValue(new Promise<void>((r) => { release = r; }));
      await renderScreen();

      // Act
      await acceptInvite();

      // Assert
      expect(screen.getByText("friendInvitation.accepting")).toBeTruthy();
      await act(async () => { release(); });
      expect(screen.queryByText("friendInvitation.accepting")).toBeNull();
    });

    it("should celebrate the new friendship once the link is accepted", async () => {
      // Arrange
      await renderScreen();

      // Act
      await acceptInvite();

      // Assert
      expect(mockAcceptFriendInviteLink).toHaveBeenCalledWith("tok-1");
      expect(screen.getByText("friendInvitation.successTitle")).toBeTruthy();
      expect(screen.getByText("friendInvitation.successSubtitle:Ada Lovelace")).toBeTruthy();
    });

    it("should open the friends list from the success screen", async () => {
      // Arrange
      await renderScreen();
      await acceptInvite();

      // Act
      fireEvent.press(screen.getByText("friendInvitation.viewFriends"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("Friends");
    });

    it("should keep the accept button inert while the device is offline", async () => {
      // Arrange
      mockIsConnected = false;
      await renderScreen();

      // Act
      await acceptInvite();

      // Assert
      expect(mockAcceptFriendInviteLink).not.toHaveBeenCalled();
    });
  });

  describe("amitié déjà existante", () => {
    it.each([
      ["a French message", "Vous êtes déjà amis"],
      ["an English message", "Already friends"],
    ])("should recognise %s from the API", async (_label, message) => {
      // Arrange
      mockAcceptFriendInviteLink.mockRejectedValue(new Error(message));
      await renderScreen();

      // Act
      await acceptInvite();

      // Assert
      expect(screen.getByText("friendInvitation.alreadyFriendsTitle")).toBeTruthy();
      expect(screen.getByText("friendInvitation.alreadyFriendsSubtitle:Ada Lovelace")).toBeTruthy();
    });

    it("should open the friends list from the already friends screen", async () => {
      // Arrange
      mockAcceptFriendInviteLink.mockRejectedValue(new Error("Already friends"));
      await renderScreen();
      await acceptInvite();

      // Act
      fireEvent.press(screen.getByText("friendInvitation.viewFriends"));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("Friends");
    });
  });

  describe("échec de l'acceptation", () => {
    it("should surface the parsed reason why the acceptance failed", async () => {
      // Arrange
      mockParseApiError.mockReturnValue("Lien révoqué");
      mockAcceptFriendInviteLink.mockRejectedValue(new Error("410"));
      await renderScreen();

      // Act
      await acceptInvite();

      // Assert
      expect(screen.getByText("friendInvitation.errorTitle")).toBeTruthy();
      expect(screen.getByText("Lien révoqué")).toBeTruthy();
    });

    it("should fall back to a generic reason when the failure cannot be parsed", async () => {
      // Arrange
      mockAcceptFriendInviteLink.mockRejectedValue(new Error("boom"));
      await renderScreen();

      // Act
      await acceptInvite();

      // Assert
      expect(screen.getByText("friendInvitation.acceptErrorFallback")).toBeTruthy();
    });

    it("should treat a non Error rejection as a plain failure", async () => {
      // Arrange
      mockAcceptFriendInviteLink.mockRejectedValue("panne");
      await renderScreen();

      // Act
      await acceptInvite();

      // Assert
      expect(screen.getByText("friendInvitation.acceptErrorFallback")).toBeTruthy();
    });
  });

  describe("navigation", () => {
    it("should go back when the header back button is pressed", async () => {
      // Arrange
      await renderScreen();

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
