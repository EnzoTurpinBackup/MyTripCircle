import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import RadioOptionCard, { RadioOption } from "../RadioOptionCard";
import { lightColors } from "../../../contexts/ThemeContext";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

type Visibility = "private" | "friends";

const OPTIONS: RadioOption<Visibility>[] = [
  {
    value: "private",
    label: "Privé",
    desc: "Vous seul voyez ce voyage",
    emoji: "🔒",
    selBg: "#F5E5DC",
    selColor: "#A35830",
    dotColor: "#C4714A",
  },
  {
    value: "friends",
    label: "Amis",
    desc: "Vos amis voient ce voyage",
    emoji: "👥",
    selBg: "#E2EDD9",
    selColor: "#4B6B3A",
    dotColor: "#6B8C5A",
  },
];

const renderCard = (
  overrides: Partial<React.ComponentProps<typeof RadioOptionCard<Visibility>>> = {}
) => {
  const onChange = jest.fn();
  render(
    <RadioOptionCard<Visibility>
      options={OPTIONS}
      selected="private"
      isDark={false}
      colors={lightColors}
      onChange={onChange}
      {...overrides}
    />
  );
  return { onChange };
};

// Le fond de la ligne sélectionnée ne porte ni texte ni testID : on lit le
// style de la zone tactile correspondante.
const rowStyle = (index: number) =>
  StyleSheet.flatten(screen.UNSAFE_getAllByType(TouchableOpacity)[index].props.style);

describe("RadioOptionCard", () => {
  it("should render every option with its label, description and emoji", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("Privé")).toBeTruthy();
    expect(screen.getByText("Vous seul voyez ce voyage")).toBeTruthy();
    expect(screen.getByText("🔒")).toBeTruthy();
    expect(screen.getByText("Amis")).toBeTruthy();
    expect(screen.getByText("👥")).toBeTruthy();
  });

  it("should highlight only the selected option", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("Privé")).toHaveStyle({ color: OPTIONS[0].selColor });
    expect(screen.getByText("Amis")).toHaveStyle({ color: lightColors.text });
    expect(rowStyle(0).backgroundColor).toBe(OPTIONS[0].selBg);
    expect(rowStyle(1).backgroundColor).toBeUndefined();
  });

  it("should dim the description of the selected option only", () => {
    // Arrange / Act
    renderCard();

    // Assert
    expect(screen.getByText("Vous seul voyez ce voyage")).toHaveStyle({
      color: OPTIONS[0].selColor,
      opacity: 0.8,
    });
    expect(screen.getByText("Vos amis voient ce voyage")).toHaveStyle({
      color: lightColors.textLight,
    });
  });

  it("should move the highlight when another option becomes selected", () => {
    // Arrange / Act
    renderCard({ selected: "friends" });

    // Assert
    expect(screen.getByText("Amis")).toHaveStyle({ color: OPTIONS[1].selColor });
    expect(screen.getByText("Privé")).toHaveStyle({ color: lightColors.text });
  });

  it("should report the option value when a row is pressed", () => {
    // Arrange
    const { onChange } = renderCard();

    // Act
    fireEvent.press(screen.getByText("Amis"));

    // Assert
    expect(onChange).toHaveBeenCalledWith("friends");
  });

  it("should use the translucent dot colour as background when dark mode is on", () => {
    // Arrange / Act
    renderCard({ isDark: true });

    // Assert — en thème sombre la teinte pleine `selBg` serait illisible
    expect(rowStyle(0).backgroundColor).toBe(`${OPTIONS[0].dotColor}22`);
    expect(screen.getByText("Privé")).toHaveStyle({ color: OPTIONS[0].selColor });
  });

  it("should render a single row without any separator", () => {
    // Arrange / Act
    renderCard({ options: [OPTIONS[0]] });

    // Assert — le séparateur n'apparaît qu'à partir de la deuxième option
    expect(screen.getByText("Privé")).toBeTruthy();
    expect(screen.queryByText("Amis")).toBeNull();
  });
});
