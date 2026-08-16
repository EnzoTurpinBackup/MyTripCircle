import "../../screens/__tests__/support/screenMocks";

import React from "react";

import AuthStack from "../stacks/AuthStack";
import MainStack from "../stacks/MainStack";
import { RootStack } from "../rootStack";

// Les deux piles sont appelées comme des fonctions ordinaires par
// `AppNavigator` (`user ? MainStack() : AuthStack()`), et non montées comme des
// composants : on inspecte donc directement la table de routage qu'elles
// produisent, sans rien monter. C'est le contrat sur lequel s'appuie chaque
// `navigation.navigate("…")` de l'application.

type ScreenElement = React.ReactElement<{
  name: string;
  component?: unknown;
  options?: { headerShown?: boolean };
}>;

type StackFactory = () => React.ReactElement<{ children: React.ReactNode }>;

const screensOf = (stack: StackFactory): ScreenElement[] =>
  React.Children.toArray(stack().props.children) as ScreenElement[];

const namesOf = (stack: StackFactory) =>
  screensOf(stack).map((screen) => screen.props.name);

describe("AuthStack", () => {
  const EXPECTED = [
    "Welcome",
    "Auth",
    "Invitation",
    "FriendInvitation",
    "Otp",
    "ForgotPassword",
  ];

  it("should declare the signed-out routes in the expected order", () => {
    // Arrange & Act
    const names = namesOf(AuthStack);

    // Assert — `Welcome` en tête : c'est l'écran d'accueil hors session.
    expect(names).toEqual(EXPECTED);
  });

  it("should attach a screen component to every route", () => {
    // Arrange & Act
    const screens = screensOf(AuthStack);

    // Assert
    screens.forEach((screen) => {
      expect(screen.props.component).toBeTruthy();
    });
  });

  it("should let the deep-linked routes render without a header", () => {
    // Arrange
    const screens = screensOf(AuthStack);

    // Act
    const headerless = screens
      .filter((screen) => screen.props.options?.headerShown === false)
      .map((screen) => screen.props.name);

    // Assert
    expect(headerless).toEqual([
      "Invitation",
      "FriendInvitation",
      "Otp",
      "ForgotPassword",
    ]);
  });
});

describe("MainStack", () => {
  const EXPECTED = [
    "Main",
    "TripDetails",
    "BookingDetails",
    "AddressDetails",
    "FullMap",
    "AddressForm",
    "InviteFriends",
    "CreateTrip",
    "EditTrip",
    "TripActions",
    "Subscription",
    "EditProfile",
    "Settings",
    "ChangePassword",
    "HelpSupport",
    "Invitation",
    "Friends",
    "FriendProfile",
    "AddFriend",
    "FriendRequestConfirmation",
    "TripPublicView",
    "TripMembers",
    "Notifications",
    "ForgotPassword",
    "FriendInvitation",
    "IdeaDetail",
    "ConsentManagement",
    "CalendarExport",
  ];

  it("should declare the signed-in routes in the expected order", () => {
    // Arrange & Act
    const names = namesOf(MainStack);

    // Assert — `Main` en tête : les onglets sont la route initiale en session.
    expect(names).toEqual(EXPECTED);
  });

  it("should not declare the same route twice", () => {
    // Arrange & Act
    const names = namesOf(MainStack);

    // Assert
    expect(new Set(names).size).toBe(names.length);
  });

  it("should attach a screen component to every route", () => {
    // Arrange & Act
    const screens = screensOf(MainStack);

    // Assert
    screens.forEach((screen) => {
      expect(screen.props.component).toBeTruthy();
    });
  });

  it("should hide the header on every route but the tab host", () => {
    // Arrange
    const screens = screensOf(MainStack);

    // Act
    const withHeader = screens
      .filter((screen) => screen.props.options?.headerShown !== false)
      .map((screen) => screen.props.name);

    // Assert
    expect(withHeader).toEqual(["Main"]);
  });

  it("should reuse the shared root stack navigator", () => {
    // Arrange & Act
    const screens = screensOf(MainStack);

    // Assert — les deux piles alimentent le même navigateur racine, sans quoi
    // React Navigation refuserait les écrans déclarés.
    screens.forEach((screen) => {
      expect(screen.type).toBe(RootStack.Screen);
    });
  });
});
