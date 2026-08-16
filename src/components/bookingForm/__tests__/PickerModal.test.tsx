import React from "react";
import { Text } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import PickerModal from "../PickerModal";
import { lightColors } from "../../../contexts/ThemeContext";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const t = (key: string) => key;

const renderModal = (overrides: Partial<React.ComponentProps<typeof PickerModal>> = {}) => {
  const onClose = jest.fn();
  render(
    <PickerModal
      visible
      title="Date de départ"
      onClose={onClose}
      colors={lightColors}
      t={t}
      {...overrides}
    >
      <Text>contenu du sélecteur</Text>
    </PickerModal>
  );
  return { onClose };
};

describe("PickerModal", () => {
  it("should render its title, its children and both action labels when visible", () => {
    // Arrange / Act
    renderModal();

    // Assert
    expect(screen.getByText("Date de départ")).toBeTruthy();
    expect(screen.getByText("contenu du sélecteur")).toBeTruthy();
    expect(screen.getByText("common.cancel")).toBeTruthy();
    expect(screen.getByText("common.confirm")).toBeTruthy();
  });

  it("should render nothing when it is not visible", () => {
    // Arrange / Act
    renderModal({ visible: false });

    // Assert
    expect(screen.queryByText("Date de départ")).toBeNull();
    expect(screen.queryByText("contenu du sélecteur")).toBeNull();
  });

  it("should close when the cancel button is pressed", () => {
    // Arrange
    const { onClose } = renderModal();

    // Act
    fireEvent.press(screen.getByText("common.cancel"));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should close when the confirm button is pressed", () => {
    // Arrange
    const { onClose } = renderModal();

    // Act
    fireEvent.press(screen.getByText("common.confirm"));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should stop the press from reaching the backdrop when the sheet itself is pressed", () => {
    // Arrange
    const { onClose } = renderModal();
    const stopPropagation = jest.fn();

    // Act — le titre remonte jusqu'au conteneur, qui doit absorber l'événement
    fireEvent.press(screen.getByText("Date de départ"), { stopPropagation });

    // Assert
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
