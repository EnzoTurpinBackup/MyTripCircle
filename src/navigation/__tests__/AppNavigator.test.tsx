import "../../screens/__tests__/support/screenMocks";

import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import AppNavigator from "../AppNavigator";
import { CONSENT_KEY } from "../../screens/ConsentScreen";
import { useAuth } from "../../contexts/AuthContext";

jest.mock("react-i18next", () => ({
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../../contexts/AuthContext", () => ({ useAuth: jest.fn() }));

// Le conteneur de navigation est remplacé par une sonde : il rend ses enfants
// et expose la configuration de liens profonds qu'il a reçue.
let containerProps: { linking?: DeepLinkConfig } = {};

interface DeepLinkConfig {
  prefixes: string[];
  config: { screens: Record<string, unknown> };
}

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    NavigationContainer: (props: { children: React.ReactNode; linking: DeepLinkConfig }) => {
      containerPropsRef.current = props;
      return React.createElement(React.Fragment, null, props.children);
    },
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ params: {} }),
  };
});

// Référence partagée avec le mock ci-dessus, qui ne peut pas capturer de
// variable déclarée après lui.
const containerPropsRef: { current: { linking?: DeepLinkConfig } } = { current: {} };

// Chaque route est réduite à un marqueur textuel : on veut savoir *quelles*
// routes la pile racine déclare, pas rendre les écrans correspondants.
jest.mock("../rootStack", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    RootStack: {
      Navigator: ({ children }: { children: React.ReactNode }) =>
        React.createElement(React.Fragment, null, children),
      Screen: ({ name, children }: { name: string; children?: () => React.ReactNode }) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Text, null, `route:${name}`),
          typeof children === "function" ? children() : null,
        ),
    },
  };
});

jest.mock("../stacks/AuthStack", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { __esModule: true, default: () => React.createElement(Text, null, "pile:auth") };
});

jest.mock("../stacks/MainStack", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { __esModule: true, default: () => React.createElement(Text, null, "pile:main") };
});

// Frontières natives sollicitées par `ConsentScreen`, le seul écran réellement
// monté par cette suite.
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
}));

jest.mock("../../hooks/usePushNotifications", () => ({
  requestPermissionAndRegisterToken: jest.fn().mockResolvedValue(undefined),
}));

const setAuth = (overrides: Record<string, unknown> = {}) => {
  (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false, ...overrides });
};

/** Monte le navigateur et laisse la lecture du consentement se résoudre. */
const renderNavigator = async () => {
  render(<AppNavigator />);
  await act(async () => {});
  containerProps = containerPropsRef.current;
};

const storeConsent = () =>
  AsyncStorage.setItem(
    CONSENT_KEY,
    JSON.stringify({ data: true, location: false, notifications: false, acceptedAt: "" }),
  );

/** Routes légales et d'état, toujours accessibles quel que soit l'état. */
const ALWAYS_AVAILABLE = ["Terms", "Privacy", "LegalNotice", "NotFound", "Error"];

describe("AppNavigator", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    containerPropsRef.current = {};
    setAuth();
  });

  describe("attente", () => {
    it("should render nothing while the session is still loading", async () => {
      // Arrange
      setAuth({ loading: true });

      // Act
      await renderNavigator();

      // Assert
      expect(screen.queryByText("route:Terms")).toBeNull();
      expect(screen.queryByText("pile:auth")).toBeNull();
    });

    it("should render nothing before the stored consent has been read", async () => {
      // Arrange & Act — pas d'attente : la lecture du stockage est en vol.
      render(<AppNavigator />);

      // Assert
      expect(screen.queryByText("route:Terms")).toBeNull();
      // La lecture est laissée se résoudre avant le démontage.
      await act(async () => {});
    });
  });

  describe("consentement déjà donné", () => {
    it("should show the signed-out stack when nobody is signed in", async () => {
      // Arrange
      await storeConsent();

      // Act
      await renderNavigator();

      // Assert
      expect(screen.getByText("pile:auth")).toBeTruthy();
      expect(screen.queryByText("pile:main")).toBeNull();
    });

    it("should show the signed-in stack when a user is signed in", async () => {
      // Arrange
      await storeConsent();
      setAuth({ user: { id: "u1" } });

      // Act
      await renderNavigator();

      // Assert
      expect(screen.getByText("pile:main")).toBeTruthy();
      expect(screen.queryByText("pile:auth")).toBeNull();
    });

    it("should not offer the consent route any more", async () => {
      // Arrange
      await storeConsent();

      // Act
      await renderNavigator();

      // Assert
      expect(screen.queryByText("route:Consent")).toBeNull();
    });
  });

  describe("consentement à recueillir", () => {
    it("should show the consent route instead of any stack", async () => {
      // Arrange & Act
      await renderNavigator();

      // Assert
      expect(screen.getByText("route:Consent")).toBeTruthy();
      expect(screen.queryByText("pile:auth")).toBeNull();
      expect(screen.queryByText("pile:main")).toBeNull();
    });

    it("should hand over to the signed-out stack once the consent is given", async () => {
      // Arrange
      await renderNavigator();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("consent.acceptRequired"));
      });

      // Assert
      expect(screen.getByText("pile:auth")).toBeTruthy();
      expect(screen.queryByText("route:Consent")).toBeNull();
    });

    it("should hand over to the signed-in stack when a user is already signed in", async () => {
      // Arrange
      setAuth({ user: { id: "u1" } });
      await renderNavigator();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("consent.acceptRequired"));
      });

      // Assert
      expect(screen.getByText("pile:main")).toBeTruthy();
    });
  });

  describe("routes toujours disponibles", () => {
    it.each(ALWAYS_AVAILABLE)(
      "should keep the %s route reachable before any consent",
      async (route) => {
        // Arrange & Act
        await renderNavigator();

        // Assert
        expect(screen.getByText(`route:${route}`)).toBeTruthy();
      },
    );

    it("should keep the legal routes reachable once signed in", async () => {
      // Arrange
      await storeConsent();
      setAuth({ user: { id: "u1" } });

      // Act
      await renderNavigator();

      // Assert
      ALWAYS_AVAILABLE.forEach((route) => {
        expect(screen.getByText(`route:${route}`)).toBeTruthy();
      });
    });
  });

  describe("liens profonds", () => {
    it("should claim the mytripcircle scheme", async () => {
      // Arrange & Act
      await renderNavigator();

      // Assert
      expect(containerProps.linking?.prefixes).toEqual(["mytripcircle://"]);
    });

    it("should map the invitation links to their screens", async () => {
      // Arrange & Act
      await renderNavigator();

      // Assert
      expect(containerProps.linking?.config.screens).toMatchObject({
        Invitation: "invitation/:token",
        FriendInvitation: "friend-invite/:token",
      });
    });

    it("should parse the password reset code carried by its link", async () => {
      // Arrange
      await renderNavigator();
      const forgotPassword = containerProps.linking?.config.screens.ForgotPassword as {
        path: string;
        parse: { code: (code: string) => string };
      };

      // Act
      const parsed = forgotPassword.parse.code("ABC123");

      // Assert
      expect(forgotPassword.path).toBe("reset-password");
      expect(parsed).toBe("ABC123");
    });
  });
});
