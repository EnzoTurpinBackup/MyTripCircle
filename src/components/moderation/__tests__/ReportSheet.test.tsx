import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import ReportSheet from "../ReportSheet";
import i18n from "../../../utils/i18n";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

function renderSheet(props: Partial<React.ComponentProps<typeof ReportSheet>> = {}) {
  const handlers = { onClose: jest.fn(), onSubmit: jest.fn() };
  const utils = render(<ReportSheet visible targetType="user" {...handlers} {...props} />);
  return { ...utils, ...handlers };
}

describe("ReportSheet", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("should show the user title when reporting a user", () => {
    // Arrange / Act
    renderSheet({ targetType: "user" });

    // Assert
    expect(screen.getByText("Report this user")).toBeTruthy();
  });

  it("should show the trip title when reporting a trip", () => {
    // Arrange / Act
    renderSheet({ targetType: "trip" });

    // Assert
    expect(screen.getByText("Report this trip")).toBeTruthy();
  });

  it("should explain what the report is used for", () => {
    // Arrange / Act
    renderSheet();

    // Assert
    expect(
      screen.getByText("Select the reason for your report. Our team will review your request.")
    ).toBeTruthy();
  });

  it("should list every report reason", () => {
    // Arrange / Act
    renderSheet();

    // Assert
    expect(screen.getByText("Inappropriate content")).toBeTruthy();
    expect(screen.getByText("Spam or advertising")).toBeTruthy();
    expect(screen.getByText("Harassment or threats")).toBeTruthy();
    expect(screen.getByText("Fake profile or misleading content")).toBeTruthy();
    expect(screen.getByText("Other reason")).toBeTruthy();
  });

  it("should submit the inappropriate reason when its row is pressed", () => {
    // Arrange
    const { onSubmit } = renderSheet();

    // Act
    fireEvent.press(screen.getByText("Inappropriate content"));

    // Assert
    expect(onSubmit).toHaveBeenCalledWith("inappropriate");
  });

  it("should submit the spam reason when its row is pressed", () => {
    // Arrange
    const { onSubmit } = renderSheet();

    // Act
    fireEvent.press(screen.getByText("Spam or advertising"));

    // Assert
    expect(onSubmit).toHaveBeenCalledWith("spam");
  });

  it("should submit the harassment reason when its row is pressed", () => {
    // Arrange
    const { onSubmit } = renderSheet();

    // Act
    fireEvent.press(screen.getByText("Harassment or threats"));

    // Assert
    expect(onSubmit).toHaveBeenCalledWith("harassment");
  });

  it("should submit the fake profile reason when its row is pressed", () => {
    // Arrange
    const { onSubmit } = renderSheet();

    // Act
    fireEvent.press(screen.getByText("Fake profile or misleading content"));

    // Assert
    expect(onSubmit).toHaveBeenCalledWith("fake");
  });

  it("should submit the other reason when its row is pressed", () => {
    // Arrange
    const { onSubmit } = renderSheet();

    // Act
    fireEvent.press(screen.getByText("Other reason"));

    // Assert
    expect(onSubmit).toHaveBeenCalledWith("other");
  });

  it("should call onClose when the cancel button is pressed", () => {
    // Arrange
    const { onClose } = renderSheet();

    // Act
    fireEvent.press(screen.getByText("Cancel"));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should render nothing while the sheet is hidden", () => {
    // Arrange / Act
    renderSheet({ visible: false });

    // Assert
    expect(screen.queryByText("Report this user")).toBeNull();
  });

  it("should run the closing animation when the sheet goes from visible to hidden", () => {
    // Arrange
    const { rerender, onClose } = renderSheet({ visible: true });

    // Act
    rerender(
      <ReportSheet visible={false} targetType="user" onClose={onClose} onSubmit={jest.fn()} />
    );

    // Assert
    expect(screen.queryByText("Report this user")).toBeNull();
  });
});
