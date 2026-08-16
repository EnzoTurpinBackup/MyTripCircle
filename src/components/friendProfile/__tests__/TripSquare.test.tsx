import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import TripSquare from "../TripSquare";
import i18n from "../../../utils/i18n";
import { collectImageUris } from "../../invitations/__tests__/renderTreeUtils";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

describe("TripSquare", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should show the trip destination when there is one", () => {
    // Arrange / Act
    render(<TripSquare trip={{ destination: "Kyoto", title: "Japon" }} onPress={jest.fn()} />);

    // Assert
    expect(screen.getByText("Kyoto")).toBeTruthy();
  });

  it("should fall back to the trip title when there is no destination", () => {
    // Arrange / Act
    render(<TripSquare trip={{ title: "Japon" }} onPress={jest.fn()} />);

    // Assert
    expect(screen.getByText("Japon")).toBeTruthy();
  });

  it("should call onPress when the square is pressed", () => {
    // Arrange
    const onPress = jest.fn();
    render(<TripSquare trip={{ title: "Japon" }} onPress={onPress} />);

    // Act
    fireEvent.press(screen.getByText("Japon"));

    // Assert
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("should display the trip cover image when the trip has one", () => {
    // Arrange / Act
    const { toJSON } = render(
      <TripSquare
        trip={{ title: "Japon", coverImage: "https://example.test/kyoto.jpg" }}
        onPress={jest.fn()}
      />
    );

    // Assert
    expect(collectImageUris(toJSON())).toEqual(["https://example.test/kyoto.jpg"]);
  });

  it("should display no image when the trip has no cover", () => {
    // Arrange / Act
    const { toJSON } = render(<TripSquare trip={{ title: "Japon" }} onPress={jest.fn()} />);

    // Assert
    expect(collectImageUris(toJSON())).toEqual([]);
  });
});
