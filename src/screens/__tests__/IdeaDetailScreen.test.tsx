import { mockDatePicker, resetDatePicker } from "./support/uiMocks";
import {
  PICKED_DATE,
  START_DATE_LABEL,
  handlers,
  lastDaysUpdater,
  setupHook,
} from "./support/ideaDetailMocks";

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import IdeaDetailScreen from "../IdeaDetailScreen";

describe("IdeaDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDatePicker();
    setupHook();
  });

  describe("idée introuvable", () => {
    it("should report that the idea does not exist", () => {
      // Arrange
      setupHook({ idea: undefined });

      // Act
      render(<IdeaDetailScreen />);

      // Assert
      expect(screen.getByText("ideas.detail.notFound")).toBeTruthy();
    });

    it("should hide the add-to-trip call to action", () => {
      // Arrange
      setupHook({ idea: undefined });

      // Act
      render(<IdeaDetailScreen />);

      // Assert
      expect(screen.queryByText("ideas.detail.addToTrips")).toBeNull();
    });

    it("should go back from the error state", () => {
      // Arrange
      setupHook({ idea: undefined });
      render(<IdeaDetailScreen />);

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(handlers.goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("présentation de l'idée", () => {
    it("should display the destination name and country in the hero", () => {
      // Arrange & Act
      render(<IdeaDetailScreen />);

      // Assert
      expect(screen.getByText("Tulum")).toBeTruthy();
      expect(screen.getByText("Mexique")).toBeTruthy();
    });

    it("should display the french itinerary when the language is french", () => {
      // Arrange & Act
      render(<IdeaDetailScreen />);

      // Assert
      expect(screen.getByText("Cénotes")).toBeTruthy();
      expect(screen.queryByText("Cenotes")).toBeNull();
    });

    it("should display the english itinerary when the language is english", () => {
      // Arrange
      setupHook({ lang: "en" });

      // Act
      render(<IdeaDetailScreen />);

      // Assert
      expect(screen.getByText("Cenotes")).toBeTruthy();
    });

    it("should limit the itinerary to the requested number of days", () => {
      // Arrange
      setupHook({ customDays: 2 });

      // Act
      render(<IdeaDetailScreen />);

      // Assert
      expect(screen.queryByText("Départ")).toBeNull();
    });

    it("should go back from the hero back button", () => {
      // Arrange
      render(<IdeaDetailScreen />);

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(handlers.goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("réglage de la durée", () => {
    it("should decrement the duration by one day", () => {
      // Arrange
      render(<IdeaDetailScreen />);

      // Act
      fireEvent.press(screen.getByText("icon:remove"));

      // Assert
      expect(lastDaysUpdater()(5)).toBe(4);
    });

    it("should never decrement below a single day", () => {
      // Arrange
      render(<IdeaDetailScreen />);

      // Act
      fireEvent.press(screen.getByText("icon:remove"));

      // Assert
      expect(lastDaysUpdater()(1)).toBe(1);
    });

    it("should increment the duration by one day", () => {
      // Arrange
      render(<IdeaDetailScreen />);

      // Act
      fireEvent.press(screen.getByText("icon:add"));

      // Assert
      expect(lastDaysUpdater()(5)).toBe(6);
    });

    it("should never increment above thirty days", () => {
      // Arrange
      render(<IdeaDetailScreen />);

      // Act
      fireEvent.press(screen.getByText("icon:add"));

      // Assert
      expect(lastDaysUpdater()(30)).toBe(30);
    });
  });

  describe("ajout au voyage", () => {
    it("should open the modal when the call to action is pressed", () => {
      // Arrange
      render(<IdeaDetailScreen />);

      // Act
      fireEvent.press(screen.getByText("ideas.detail.addToTrips"));

      // Assert
      expect(handlers.openModal).toHaveBeenCalledTimes(1);
    });

    it("should show the trip title carried by the hook once the modal is open", () => {
      // Arrange
      setupHook({ modalVisible: true });

      // Act
      render(<IdeaDetailScreen />);

      // Assert
      expect(screen.getByDisplayValue("Tulum – Mexique")).toBeTruthy();
    });

    it("should forward the edited trip title to the hook", () => {
      // Arrange
      setupHook({ modalVisible: true });
      render(<IdeaDetailScreen />);

      // Act
      fireEvent.changeText(screen.getByDisplayValue("Tulum – Mexique"), "Escapade");

      // Assert
      expect(handlers.setTripTitle).toHaveBeenCalledWith("Escapade");
    });

    it("should open the date picker when the start date row is pressed", () => {
      // Arrange
      setupHook({ modalVisible: true });
      render(<IdeaDetailScreen />);

      // Act
      fireEvent.press(screen.getByText(START_DATE_LABEL));

      // Assert
      expect(handlers.setShowDatePicker).toHaveBeenCalledWith(true);
    });

    it("should close the date picker when the sheet body is pressed", () => {
      // Arrange
      setupHook({ modalVisible: true, showDatePicker: true });
      render(<IdeaDetailScreen />);

      // Act
      fireEvent.press(screen.getByText("ideas.addModal.title"));

      // Assert
      expect(handlers.setShowDatePicker).toHaveBeenCalledWith(false);
    });

    it("should store the date chosen in the picker", () => {
      // Arrange
      setupHook({ modalVisible: true, showDatePicker: true });
      render(<IdeaDetailScreen />);

      // Act
      mockDatePicker.onChange?.({}, PICKED_DATE);

      // Assert
      expect(handlers.setStartDate).toHaveBeenCalledWith(PICKED_DATE);
    });

    it("should keep the current date when the picker is dismissed without a choice", () => {
      // Arrange
      setupHook({ modalVisible: true, showDatePicker: true });
      render(<IdeaDetailScreen />);

      // Act
      mockDatePicker.onChange?.({}, undefined);

      // Assert
      expect(handlers.setStartDate).not.toHaveBeenCalled();
    });

    it("should ask the hook to create the trip", () => {
      // Arrange
      setupHook({ modalVisible: true });
      render(<IdeaDetailScreen />);

      // Act
      fireEvent.press(screen.getByText("ideas.addModal.create"));

      // Assert
      expect(handlers.handleCreate).toHaveBeenCalledTimes(1);
    });
  });
});
