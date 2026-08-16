// Suite dédiée à la variante Android du choix des dates : Android affiche les
// sélecteurs en ligne là où iOS les présente dans une modale. La plateforme est
// lue au rendu, mais `jest-expo` s'exécute sur iOS par défaut : seule une suite
// distincte peut couvrir cette branche.

jest.mock("react-native/Libraries/Utilities/Platform", () => {
  const actual = jest.requireActual("react-native/Libraries/Utilities/Platform");
  const base = actual.default ?? actual;
  const android = {
    ...base,
    OS: "android",
    select: (options: Record<string, unknown>) =>
      "android" in options ? options.android : options.default,
  };
  return { __esModule: true, default: android, ...android };
});

import "./support/tripScreenMocks";

import React from "react";
import { render, screen } from "@testing-library/react-native";

import CreateTripScreen from "../CreateTripScreen";
import { useCreateTrip } from "../../hooks/useCreateTrip";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("i18next", () => ({ __esModule: true, default: { language: "fr" } }));

jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: () => ({ isConnected: true }) }));
jest.mock("../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../contexts/ThemeContext");
  return { ...actual, useTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});

jest.mock("../../hooks/useCreateTrip", () => ({ useCreateTrip: jest.fn() }));

jest.mock("../../utils/i18n", () => ({
  formatDate: (date: Date) => date.toISOString().slice(0, 10),
}));

const handleDateChange = jest.fn();
const START_DATE = new Date("2026-03-15T12:00:00.000Z");
const END_DATE = new Date("2026-03-25T12:00:00.000Z");

const setup = (overrides: Record<string, unknown> = {}) => {
  (useCreateTrip as jest.Mock).mockReturnValue({
    formData: {
      title: "Pérou 2026",
      description: "",
      destination: "Lima",
      startDate: START_DATE,
      endDate: END_DATE,
      isPublic: false,
      visibility: "private",
    },
    showStartDatePicker: false,
    showEndDatePicker: false,
    showVisibilityPicker: false,
    loading: false,
    dateError: null,
    handleInputChange: jest.fn(),
    handleDateChange,
    handleVisibilityChange: jest.fn(),
    handleCreate: jest.fn(),
    handleCancel: jest.fn(),
    setShowStartDatePicker: jest.fn(),
    setShowEndDatePicker: jest.fn(),
    setShowVisibilityPicker: jest.fn(),
    ...overrides,
  });
};

describe("CreateTripScreen sur Android", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it("should show no inline picker while no date is being edited", () => {
    // Arrange & Act
    render(<CreateTripScreen />);

    // Assert
    expect(screen.queryAllByTestId("date-picker")).toHaveLength(0);
  });

  it("should show the departure picker inline instead of a modal", () => {
    // Arrange
    setup({ showStartDatePicker: true });

    // Act
    render(<CreateTripScreen />);

    // Assert
    const picker = screen.getByTestId("date-picker");
    expect(picker.props.value).toBe(START_DATE);
    expect(screen.queryByText("common.confirm")).toBeNull();
  });

  it("should forward the departure date chosen in the inline picker", () => {
    // Arrange
    setup({ showStartDatePicker: true });
    render(<CreateTripScreen />);

    // Act
    screen.getByTestId("date-picker").props.onChange({ type: "set" }, START_DATE);

    // Assert
    expect(handleDateChange).toHaveBeenCalledWith({ type: "set" }, START_DATE, "start");
  });

  it("should show the return picker inline instead of a modal", () => {
    // Arrange
    setup({ showEndDatePicker: true });

    // Act
    render(<CreateTripScreen />);

    // Assert
    expect(screen.getByTestId("date-picker").props.value).toBe(END_DATE);
  });

  it("should forward the return date chosen in the inline picker", () => {
    // Arrange
    setup({ showEndDatePicker: true });
    render(<CreateTripScreen />);

    // Act
    screen.getByTestId("date-picker").props.onChange({ type: "set" }, END_DATE);

    // Assert
    expect(handleDateChange).toHaveBeenCalledWith({ type: "set" }, END_DATE, "end");
  });
});
