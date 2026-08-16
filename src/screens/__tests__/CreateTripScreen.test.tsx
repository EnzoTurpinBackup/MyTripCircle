import "./support/tripScreenMocks";

import React from "react";
import { TextInput } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import CreateTripScreen from "../CreateTripScreen";
import { useCreateTrip } from "../../hooks/useCreateTrip";

// On renvoie la clé de traduction plutôt que le libellé : les assertions restent
// lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// La locale du sélecteur natif est lue sur l'instance i18next, qui n'est pas
// initialisée en test.
jest.mock("i18next", () => ({ __esModule: true, default: { language: "fr" } }));

jest.mock("../../contexts/NetworkContext", () => ({ useNetwork: () => mockUseNetwork() }));
jest.mock("../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../contexts/ThemeContext");
  return { ...actual, useTheme: () => ({ colors: actual.lightColors, isDark: false }) };
});

// La logique du formulaire est couverte par `useCreateTrip.test.ts` : ici on
// pilote ses états pour affirmer ce que l'écran en fait.
jest.mock("../../hooks/useCreateTrip", () => ({ useCreateTrip: jest.fn() }));

// `formatDate` délègue à `Intl` via la locale i18next : on le fige pour que les
// libellés de date ne dépendent ni de la langue ni du fuseau de la machine.
jest.mock("../../utils/i18n", () => ({
  formatDate: (date: Date) => date.toISOString().slice(0, 10),
}));

const mockUseNetwork = jest.fn();

const handleInputChange = jest.fn();
const handleDateChange = jest.fn();
const handleVisibilityChange = jest.fn();
const handleCreate = jest.fn();
const handleCancel = jest.fn();
const setShowStartDatePicker = jest.fn();
const setShowEndDatePicker = jest.fn();
const setShowVisibilityPicker = jest.fn();

const START_DATE = new Date("2026-03-15T12:00:00.000Z");
const END_DATE = new Date("2026-03-25T12:00:00.000Z");

type HookState = ReturnType<typeof buildHookState>;

const buildHookState = (overrides: Record<string, unknown> = {}) => ({
  formData: {
    title: "Pérou 2026",
    description: "Trek dans la vallée sacrée",
    destination: "Lima",
    startDate: START_DATE,
    endDate: END_DATE,
    isPublic: false,
    visibility: "private" as const,
  },
  showStartDatePicker: false,
  showEndDatePicker: false,
  showVisibilityPicker: false,
  loading: false,
  dateError: null as string | null,
  handleInputChange,
  handleDateChange,
  handleVisibilityChange,
  handleCreate,
  handleCancel,
  setShowStartDatePicker,
  setShowEndDatePicker,
  setShowVisibilityPicker,
  ...overrides,
});

const setup = (overrides: Record<string, unknown> = {}) => {
  const state = buildHookState(overrides) as HookState;
  (useCreateTrip as jest.Mock).mockReturnValue(state);
  return state;
};

describe("CreateTripScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetwork.mockReturnValue({ isConnected: true });
    setup();
  });

  describe("formulaire", () => {
    it("should prefill every field with the current form data", () => {
      // Arrange & Act
      render(<CreateTripScreen />);

      // Assert
      expect(screen.getByPlaceholderText("createTrip.tripNamePlaceholder").props.value).toBe("Pérou 2026");
      expect(screen.getByPlaceholderText("createTrip.destinationPlaceholder").props.value).toBe("Lima");
      expect(screen.getByPlaceholderText("createTrip.descriptionPlaceholder").props.value).toBe(
        "Trek dans la vallée sacrée",
      );
    });

    it("should report the new title to the form hook when it is typed", () => {
      // Arrange
      render(<CreateTripScreen />);

      // Act
      fireEvent.changeText(screen.getByPlaceholderText("createTrip.tripNamePlaceholder"), "Islande");

      // Assert
      expect(handleInputChange).toHaveBeenCalledWith("title", "Islande");
    });

    it("should report the new destination to the form hook when it is typed", () => {
      // Arrange
      render(<CreateTripScreen />);

      // Act
      fireEvent.changeText(screen.getByPlaceholderText("createTrip.destinationPlaceholder"), "Reykjavik");

      // Assert
      expect(handleInputChange).toHaveBeenCalledWith("destination", "Reykjavik");
    });

    it("should report the new description to the form hook when it is typed", () => {
      // Arrange
      render(<CreateTripScreen />);

      // Act
      fireEvent.changeText(screen.getByPlaceholderText("createTrip.descriptionPlaceholder"), "Road trip");

      // Assert
      expect(handleInputChange).toHaveBeenCalledWith("description", "Road trip");
    });

    // Chaque fiche est cliquable dans son ensemble pour élargir la cible de
    // saisie : la presser donne le focus à son champ. Le focus natif n'est pas
    // observable depuis l'arbre rendu (aucun état n'en garde trace sous Jest) :
    // on espionne donc la méthode `focus` de l'instance du champ visé.
    it.each([
      ["createTrip.tripNameLabel", "createTrip.tripNamePlaceholder"],
      ["createTrip.mainDestination", "createTrip.destinationPlaceholder"],
      ["createTrip.descriptionLabel", "createTrip.descriptionPlaceholder"],
    ])("should focus the input of the %s card when the card is pressed", (label, placeholder) => {
      // Arrange
      render(<CreateTripScreen />);
      const field = screen
        .UNSAFE_getAllByType(TextInput)
        .find((node) => node.props.placeholder === placeholder)!;
      const focus = jest.spyOn(field.instance as TextInput, "focus");

      // Act
      fireEvent.press(screen.getByText(label));

      // Assert
      expect(focus).toHaveBeenCalledTimes(1);
    });

    it("should go back through the hook when the back button is pressed", () => {
      // Arrange
      render(<CreateTripScreen />);

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("dates", () => {
    it("should show both dates formatted", () => {
      // Arrange & Act
      render(<CreateTripScreen />);

      // Assert
      expect(screen.getByText("2026-03-15")).toBeTruthy();
      expect(screen.getByText("2026-03-25")).toBeTruthy();
    });

    it("should open the departure picker when the departure card is pressed", () => {
      // Arrange
      render(<CreateTripScreen />);

      // Act
      fireEvent.press(screen.getByText("createTrip.departureDateLabel"));

      // Assert
      expect(setShowStartDatePicker).toHaveBeenCalledWith(true);
    });

    it("should open the return picker when the return card is pressed", () => {
      // Arrange
      render(<CreateTripScreen />);

      // Act
      fireEvent.press(screen.getByText("createTrip.returnDateLabel"));

      // Assert
      expect(setShowEndDatePicker).toHaveBeenCalledWith(true);
    });

    it("should hide the date error while the range is valid", () => {
      // Arrange & Act
      render(<CreateTripScreen />);

      // Assert
      expect(screen.queryByText("createTrip.endBeforeStart")).toBeNull();
    });

    it("should display the date error reported by the hook", () => {
      // Arrange
      setup({ dateError: "createTrip.endBeforeStart" });

      // Act
      render(<CreateTripScreen />);

      // Assert
      expect(screen.getByText("createTrip.endBeforeStart")).toBeTruthy();
    });

    it("should forward the departure date chosen in the iOS modal", () => {
      // Arrange
      setup({ showStartDatePicker: true });
      render(<CreateTripScreen />);
      const picker = screen.getAllByTestId("date-picker")[0];

      // Act
      picker.props.onChange({ type: "set" }, START_DATE);

      // Assert
      expect(handleDateChange).toHaveBeenCalledWith({ type: "set" }, START_DATE, "start");
    });

    it("should forward the return date chosen in the iOS modal", () => {
      // Arrange
      setup({ showEndDatePicker: true });
      render(<CreateTripScreen />);
      const pickers = screen.getAllByTestId("date-picker");

      // Act
      pickers[pickers.length - 1].props.onChange({ type: "set" }, END_DATE);

      // Assert
      expect(handleDateChange).toHaveBeenCalledWith({ type: "set" }, END_DATE, "end");
    });

    it("should close the departure modal when it is dismissed", () => {
      // Arrange
      setup({ showStartDatePicker: true });
      render(<CreateTripScreen />);

      // Act
      fireEvent.press(screen.getAllByText("common.cancel")[0]);

      // Assert
      expect(setShowStartDatePicker).toHaveBeenCalledWith(false);
    });

    it("should close the departure modal when the choice is confirmed", () => {
      // Arrange
      setup({ showStartDatePicker: true });
      render(<CreateTripScreen />);

      // Act
      fireEvent.press(screen.getAllByText("common.confirm")[0]);

      // Assert
      expect(setShowStartDatePicker).toHaveBeenCalledWith(false);
    });

    it("should close the return modal when it is dismissed", () => {
      // Arrange
      setup({ showEndDatePicker: true });
      render(<CreateTripScreen />);
      const cancels = screen.getAllByText("common.cancel");

      // Act
      fireEvent.press(cancels[cancels.length - 1]);

      // Assert
      expect(setShowEndDatePicker).toHaveBeenCalledWith(false);
    });

    it("should close the return modal when the choice is confirmed", () => {
      // Arrange
      setup({ showEndDatePicker: true });
      render(<CreateTripScreen />);
      const confirms = screen.getAllByText("common.confirm");

      // Act
      fireEvent.press(confirms[confirms.length - 1]);

      // Assert
      expect(setShowEndDatePicker).toHaveBeenCalledWith(false);
    });
  });

  describe("visibilité", () => {
    it.each([
      ["private", "createTrip.visibilityPrivate"],
      ["friends", "createTrip.visibilityFriends"],
      ["public", "createTrip.visibilityPublic"],
    ])("should label the %s visibility on the summary row", (visibility, label) => {
      // Arrange
      const state = buildHookState();
      setup({ formData: { ...state.formData, visibility } });

      // Act
      render(<CreateTripScreen />);

      // Assert
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });

    it("should open the visibility picker when the summary row is pressed", () => {
      // Arrange
      render(<CreateTripScreen />);

      // Act
      fireEvent.press(screen.getByText("createTrip.visibilityPrivate"));

      // Assert
      expect(setShowVisibilityPicker).toHaveBeenCalledWith(true);
    });

    it("should forward the chosen visibility to the hook", () => {
      // Arrange
      setup({ showVisibilityPicker: true });
      render(<CreateTripScreen />);

      // Act
      fireEvent.press(screen.getByText("createTrip.visibilityPublic"));

      // Assert
      expect(handleVisibilityChange).toHaveBeenCalledWith("public");
    });

    it("should close the visibility picker when its backdrop is pressed", () => {
      // Arrange
      setup({ showVisibilityPicker: true });
      render(<CreateTripScreen />);

      // Act
      // Le titre de la modale partage la clé du libellé de la fiche : c'est le
      // second, celui rendu dans la modale, qui remonte jusqu'au voile.
      const [, modalTitle] = screen.getAllByText("createTrip.visibilityLabel");
      fireEvent.press(modalTitle);

      // Assert
      expect(setShowVisibilityPicker).toHaveBeenCalledWith(false);
    });
  });

  describe("bouton de création", () => {
    it("should submit the form when the button is pressed", () => {
      // Arrange
      render(<CreateTripScreen />);

      // Act
      fireEvent.press(screen.getByText("createTrip.createButton"));

      // Assert
      expect(handleCreate).toHaveBeenCalledTimes(1);
    });

    it("should show a pending label and refuse a second submission while creating", () => {
      // Arrange
      setup({ loading: true });
      render(<CreateTripScreen />);

      // Act
      fireEvent.press(screen.getByText("createTrip.creating"));

      // Assert
      expect(handleCreate).not.toHaveBeenCalled();
    });

    it("should refuse the submission when the device is offline", () => {
      // Arrange
      mockUseNetwork.mockReturnValue({ isConnected: false });
      render(<CreateTripScreen />);

      // Act
      fireEvent.press(screen.getByText("createTrip.createButton"));

      // Assert
      expect(handleCreate).not.toHaveBeenCalled();
    });
  });
});
