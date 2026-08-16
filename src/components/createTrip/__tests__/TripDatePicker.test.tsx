import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { TripDatePickerModal, AndroidDatePicker } from "../TripDatePicker";
import { lightColors } from "../../../contexts/ThemeContext";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// i18next n'est pas initialisé en test : on renvoie la clé pour garder des
// libellés déterministes.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// La langue courante pilote la locale du sélecteur natif : on la contrôle
// depuis le test plutôt que de dépendre de l'initialisation d'i18next.
const i18nMock = { language: "en" };
jest.mock("i18next", () => ({
  __esModule: true,
  default: i18nMock,
}));

// Le sélecteur de date est un module natif : on le remplace par une vue
// inspectable, seul moyen d'affirmer la locale et la valeur transmises.
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: "date-time-picker", ...props }),
  };
});

const VALUE = new Date(2026, 2, 12);

const renderModal = (
  overrides: Partial<React.ComponentProps<typeof TripDatePickerModal>> = {}
) => {
  const onChange = jest.fn();
  const onClose = jest.fn();
  const onConfirm = jest.fn();
  render(
    <TripDatePickerModal
      type="start"
      value={VALUE}
      visible
      colors={lightColors}
      onChange={onChange}
      onClose={onClose}
      onConfirm={onConfirm}
      {...overrides}
    />
  );
  return { onChange, onClose, onConfirm };
};

describe("TripDatePickerModal", () => {
  beforeEach(() => {
    i18nMock.language = "en";
  });

  it("should title the modal with the start date label when it edits the start", () => {
    // Arrange / Act
    renderModal();

    // Assert
    expect(screen.getByText("createTrip.startDate")).toBeTruthy();
    expect(screen.queryByText("createTrip.endDate")).toBeNull();
  });

  it("should title the modal with the end date label when it edits the end", () => {
    // Arrange / Act
    renderModal({ type: "end" });

    // Assert
    expect(screen.getByText("createTrip.endDate")).toBeTruthy();
    expect(screen.queryByText("createTrip.startDate")).toBeNull();
  });

  it("should render nothing when it is not visible", () => {
    // Arrange / Act
    renderModal({ visible: false });

    // Assert
    expect(screen.queryByText("createTrip.startDate")).toBeNull();
    expect(screen.queryByTestId("date-time-picker")).toBeNull();
  });

  it("should hand the current date and the English locale to the native picker", () => {
    // Arrange / Act
    renderModal();

    // Assert
    const picker = screen.getByTestId("date-time-picker");
    expect(picker.props.value).toBe(VALUE);
    expect(picker.props.locale).toBe("en_US");
    expect(picker.props.display).toBe("spinner");
  });

  it("should hand the French locale to the native picker when the app runs in French", () => {
    // Arrange
    i18nMock.language = "fr";

    // Act
    renderModal();

    // Assert
    expect(screen.getByTestId("date-time-picker").props.locale).toBe("fr_FR");
  });

  it("should forward the picked date to the parent", () => {
    // Arrange
    const { onChange } = renderModal();
    const picked = new Date(2026, 5, 1);

    // Act
    screen.getByTestId("date-time-picker").props.onChange({ type: "set" }, picked);

    // Assert
    expect(onChange).toHaveBeenCalledWith({ type: "set" }, picked);
  });

  it("should discard the selection when the cancel button is pressed", () => {
    // Arrange
    const { onClose, onConfirm } = renderModal();

    // Act
    fireEvent.press(screen.getByText("common.cancel"));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should keep the selection when the confirm button is pressed", () => {
    // Arrange
    const { onClose, onConfirm } = renderModal();

    // Act
    fireEvent.press(screen.getByText("common.confirm"));

    // Assert
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("AndroidDatePicker", () => {
  it("should render the native picker inline with the default display", () => {
    // Arrange
    const onChange = jest.fn();

    // Act
    render(<AndroidDatePicker value={VALUE} onChange={onChange} />);

    // Assert
    const picker = screen.getByTestId("date-time-picker");
    expect(picker.props.value).toBe(VALUE);
    expect(picker.props.display).toBe("default");
    expect(picker.props.mode).toBe("date");
  });

  it("should forward the picked date to the parent", () => {
    // Arrange
    const onChange = jest.fn();
    render(<AndroidDatePicker value={VALUE} onChange={onChange} />);
    const picked = new Date(2026, 5, 1);

    // Act
    screen.getByTestId("date-time-picker").props.onChange({ type: "set" }, picked);

    // Assert
    expect(onChange).toHaveBeenCalledWith({ type: "set" }, picked);
  });
});
