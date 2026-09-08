import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import DeclineModal from "../DeclineModal";
import i18n from "../../../utils/i18n";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function renderModal(props: Partial<React.ComponentProps<typeof DeclineModal>> = {}) {
  const handlers = {
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    onChangeReason: jest.fn(),
  };
  const utils = render(
    <DeclineModal
      visible
      declineTarget={{ tripName: "Trek au Népal", inviterName: "Louise" }}
      declineReason=""
      declining={false}
      {...handlers}
      {...props}
    />
  );
  return { ...utils, ...handlers };
}

describe("DeclineModal", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should render the trip and organizer names taken from the flat fields", () => {
    // Arrange / Act
    renderModal();

    // Assert
    expect(
      screen.getByText("You won't join Trek au Népal.\nLouise will be notified.")
    ).toBeTruthy();
  });

  it("should fall back to the nested trip and inviter objects when the flat fields are absent", () => {
    // Arrange / Act
    renderModal({
      declineTarget: { trip: { title: "Safari" }, inviter: { name: "Karim" } },
    });

    // Assert
    expect(screen.getByText("You won't join Safari.\nKarim will be notified.")).toBeTruthy();
  });

  it("should fall back to the generic labels when the target has no names at all", () => {
    // Arrange / Act
    renderModal({ declineTarget: null });

    // Assert
    expect(
      screen.getByText("You won't join this trip.\nThe organizer will be notified.")
    ).toBeTruthy();
  });

  it("should render nothing when the modal is not visible", () => {
    // Arrange / Act
    renderModal({ visible: false });

    // Assert
    expect(screen.queryByText("Decline Invitation")).toBeNull();
  });

  it("should call onChangeReason when the reason input changes", () => {
    // Arrange
    const { onChangeReason } = renderModal();

    // Act
    fireEvent.changeText(
      screen.getByPlaceholderText("I'm not available at these dates…"),
      "Déjà pris"
    );

    // Assert
    expect(onChangeReason).toHaveBeenCalledWith("Déjà pris");
  });

  it("should call onConfirm when the confirm button is pressed", () => {
    // Arrange
    const { onConfirm } = renderModal();

    // Act
    fireEvent.press(screen.getByText("Confirm decline"));

    // Assert
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("should call onCancel when the cancel button is pressed", () => {
    // Arrange
    const { onCancel } = renderModal();

    // Act
    fireEvent.press(screen.getByText("Cancel"));

    // Assert
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("should replace the confirm label by a spinner while declining", () => {
    // Arrange / Act
    renderModal({ declining: true });

    // Assert
    expect(screen.queryByText("Confirm decline")).toBeNull();
  });

  it("should display the current reason in the input", () => {
    // Arrange / Act
    renderModal({ declineReason: "Trop cher" });

    // Assert
    expect(screen.getByDisplayValue("Trop cher")).toBeTruthy();
  });
});
