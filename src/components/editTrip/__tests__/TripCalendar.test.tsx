import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import TripCalendar from "../TripCalendar";

// La police d'icônes charge ses glyphes de façon asynchrone, ce qui déclenche
// des mises à jour hors act() : on la remplace par un texte porteur du nom.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, `icon:${name}`),
  };
});

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const COLORS = {
  surface: "#FFFFFF",
  border: "#D8CCBA",
  bgMid: "#EDE5D8",
  text: "#2A2318",
  textMid: "#7A6A58",
  textLight: "#B0A090",
  terra: "#C4714A",
};

const RANGE_BG = "rgba(196,113,74,0.15)";

// Janvier 2026 commence un jeudi : la grille comporte 3 cellules vides avant le
// 1er et 1 après le 31, ce qui exerce les deux remplissages de `buildCalendarCells`.
const YEAR = 2026;
const MONTH = 0;

const renderCalendar = (
  overrides: Partial<React.ComponentProps<typeof TripCalendar>> = {}
) => {
  const onPrevMonth = jest.fn();
  const onNextMonth = jest.fn();
  const onDayPress = jest.fn();
  render(
    <TripCalendar
      year={YEAR}
      month={MONTH}
      startDate={new Date(YEAR, MONTH, 3)}
      endDate={new Date(YEAR, MONTH, 15)}
      months={MONTHS}
      days={DAYS}
      periodLabel="Début et fin"
      periodRangeLabel="Période"
      colors={COLORS}
      onPrevMonth={onPrevMonth}
      onNextMonth={onNextMonth}
      onDayPress={onDayPress}
      {...overrides}
    />
  );
  return { onPrevMonth, onNextMonth, onDayPress };
};

/** Style aplati de la cellule portant ce numéro de jour. */
const cellStyle = (day: number) => {
  const cell = screen
    .UNSAFE_getAllByType(TouchableOpacity)
    .find((node) => {
      const children = node.props.children;
      return children?.props?.children === day;
    });
  return StyleSheet.flatten(cell?.props.style);
};

describe("TripCalendar", () => {
  it("should render the month title and every day of the month", () => {
    // Arrange / Act
    renderCalendar();

    // Assert
    expect(screen.getByText("Janvier 2026")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("31")).toBeTruthy();
    expect(screen.queryByText("32")).toBeNull();
  });

  it("should render the seven weekday headers and both legend entries", () => {
    // Arrange / Act
    renderCalendar();

    // Assert
    for (const day of DAYS) expect(screen.getByText(day)).toBeTruthy();
    expect(screen.getByText("Début et fin")).toBeTruthy();
    expect(screen.getByText("Période")).toBeTruthy();
  });

  it("should mute the weekend headers compared to the weekday ones", () => {
    // Arrange / Act
    renderCalendar();

    // Assert
    expect(screen.getByText("Ven")).toHaveStyle({ color: COLORS.textLight });
    expect(screen.getByText("Sam")).toHaveStyle({ color: COLORS.border });
    expect(screen.getByText("Dim")).toHaveStyle({ color: COLORS.border });
  });

  it("should paint the first and last day of the trip with the accent colour", () => {
    // Arrange / Act
    renderCalendar();

    // Assert
    expect(cellStyle(3).backgroundColor).toBe(COLORS.terra);
    expect(cellStyle(15).backgroundColor).toBe(COLORS.terra);
    expect(screen.getByText("3")).toHaveStyle({ color: "#FFFFFF" });
    expect(screen.getByText("15")).toHaveStyle({ color: "#FFFFFF" });
  });

  it("should paint the days between both bounds with the range colour", () => {
    // Arrange / Act
    renderCalendar();

    // Assert
    expect(cellStyle(8).backgroundColor).toBe(RANGE_BG);
    expect(screen.getByText("8")).toHaveStyle({ color: COLORS.terra });
  });

  it("should leave the days outside the trip without any highlight", () => {
    // Arrange / Act
    renderCalendar();

    // Assert
    expect(cellStyle(1).backgroundColor).toBeUndefined();
    expect(cellStyle(20).backgroundColor).toBeUndefined();
    expect(screen.getByText("20")).toHaveStyle({ color: COLORS.text });
  });

  it("should round both sides of a range day that ends a calendar week", () => {
    // Arrange / Act — le 4 janvier 2026 est un dimanche, dernier jour de la ligne
    renderCalendar();

    // Assert
    expect(cellStyle(4).borderTopRightRadius).toBe(8);
    expect(cellStyle(4).borderTopLeftRadius).toBe(0);
  });

  it("should round the left side of a range day that opens a calendar week", () => {
    // Arrange / Act — le 5 janvier 2026 est un lundi, premier jour de la ligne
    renderCalendar();

    // Assert
    expect(cellStyle(5).borderTopLeftRadius).toBe(8);
    expect(cellStyle(5).borderTopRightRadius).toBe(0);
  });

  it("should round every corner when the trip lasts a single day", () => {
    // Arrange / Act
    renderCalendar({
      startDate: new Date(YEAR, MONTH, 10),
      endDate: new Date(YEAR, MONTH, 10),
    });

    // Assert
    expect(cellStyle(10)).toMatchObject({
      backgroundColor: COLORS.terra,
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
    });
  });

  it("should not highlight anything when the trip belongs to another month", () => {
    // Arrange / Act
    renderCalendar({
      startDate: new Date(YEAR, MONTH + 1, 3),
      endDate: new Date(YEAR, MONTH + 1, 15),
    });

    // Assert
    expect(cellStyle(3).backgroundColor).toBeUndefined();
    expect(cellStyle(15).backgroundColor).toBeUndefined();
  });

  it("should not highlight anything when the trip belongs to another year", () => {
    // Arrange / Act
    renderCalendar({
      startDate: new Date(YEAR + 1, MONTH, 3),
      endDate: new Date(YEAR + 1, MONTH, 15),
    });

    // Assert
    expect(cellStyle(3).backgroundColor).toBeUndefined();
  });

  it("should report the day number when a cell is pressed", () => {
    // Arrange
    const { onDayPress } = renderCalendar();

    // Act
    fireEvent.press(screen.getByText("22"));

    // Assert
    expect(onDayPress).toHaveBeenCalledWith(22);
  });

  it("should ask for the previous month when the back chevron is pressed", () => {
    // Arrange
    const { onPrevMonth, onNextMonth } = renderCalendar();

    // Act
    fireEvent.press(screen.getByText("icon:chevron-back"));

    // Assert
    expect(onPrevMonth).toHaveBeenCalledTimes(1);
    expect(onNextMonth).not.toHaveBeenCalled();
  });

  it("should ask for the next month when the forward chevron is pressed", () => {
    // Arrange
    const { onPrevMonth, onNextMonth } = renderCalendar();

    // Act
    fireEvent.press(screen.getByText("icon:chevron-forward"));

    // Assert
    expect(onNextMonth).toHaveBeenCalledTimes(1);
    expect(onPrevMonth).not.toHaveBeenCalled();
  });

  it("should build a grid whose length is a whole number of weeks", () => {
    // Arrange / Act — février 2026 commence un dimanche et compte 28 jours,
    // ce qui produit une grille déjà alignée sur 7 colonnes.
    renderCalendar({ month: 1 });

    // Assert
    expect(screen.getByText("Février 2026")).toBeTruthy();
    expect(screen.getByText("28")).toBeTruthy();
    expect(screen.queryByText("29")).toBeNull();
  });

  it("should claim the touch so the surrounding scroll view does not steal it", () => {
    // Arrange / Act
    renderCalendar();

    // Assert
    expect(screen.root.props.onStartShouldSetResponder()).toBe(true);
  });
});
