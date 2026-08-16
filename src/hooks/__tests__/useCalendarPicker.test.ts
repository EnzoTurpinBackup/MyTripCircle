import { renderHook, act } from "@testing-library/react-native";
import { Keyboard } from "react-native";
import useCalendarPicker from "../useCalendarPicker";

// Le hook initialise le mois affiché à partir de la date du jour : on fige
// l'horloge pour que les assertions restent déterministes.
const NOW = new Date(2026, 4, 20); // 20 mai 2026

const START_DATE = new Date(2026, 2, 10); // 10 mars 2026
const END_DATE = new Date(2026, 6, 15); // 15 juillet 2026

const setup = (
  overrides: { startDate?: Date; endDate?: Date } = {}
) => {
  const onDatesChange = jest.fn();
  const rendered = renderHook(() =>
    useCalendarPicker({
      startDate: overrides.startDate ?? START_DATE,
      endDate: overrides.endDate ?? END_DATE,
      onDatesChange,
    })
  );
  return { ...rendered, onDatesChange };
};

describe("useCalendarPicker", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.spyOn(Keyboard, "dismiss").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("should start closed on the current month when mounted", () => {
    // Arrange & Act
    const { result } = setup();

    // Assert
    expect(result.current.showCalendar).toBe(false);
    expect(result.current.calendarPickingFor).toBe("start");
    expect(result.current.calendarYear).toBe(2026);
    expect(result.current.calendarMonth).toBe(4);
  });

  it("should open on the start date month when opening the start picker", () => {
    // Arrange
    const { result } = setup();

    // Act
    act(() => result.current.openCalendar("start"));

    // Assert
    expect(result.current.showCalendar).toBe(true);
    expect(result.current.calendarPickingFor).toBe("start");
    expect(result.current.calendarYear).toBe(2026);
    expect(result.current.calendarMonth).toBe(2);
  });

  it("should open on the end date month when opening the end picker", () => {
    // Arrange
    const { result } = setup();

    // Act
    act(() => result.current.openCalendar("end"));

    // Assert
    expect(result.current.calendarPickingFor).toBe("end");
    expect(result.current.calendarMonth).toBe(6);
  });

  it("should dismiss the keyboard when opening the calendar", () => {
    // Arrange
    const { result } = setup();

    // Act
    act(() => result.current.openCalendar("start"));

    // Assert
    expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
  });

  it("should close the calendar when reopening the picker already displayed", () => {
    // Arrange
    const { result } = setup();
    act(() => result.current.openCalendar("start"));

    // Act
    act(() => result.current.openCalendar("start"));

    // Assert
    expect(result.current.showCalendar).toBe(false);
  });

  it("should stay open and switch target when opening the other picker", () => {
    // Arrange
    const { result } = setup();
    act(() => result.current.openCalendar("start"));

    // Act
    act(() => result.current.openCalendar("end"));

    // Assert
    expect(result.current.showCalendar).toBe(true);
    expect(result.current.calendarPickingFor).toBe("end");
  });

  it("should hide the calendar when closeCalendar is called", () => {
    // Arrange
    const { result } = setup();
    act(() => result.current.openCalendar("start"));

    // Act
    act(() => result.current.closeCalendar());

    // Assert
    expect(result.current.showCalendar).toBe(false);
  });

  it("should keep the existing end date when picking a start date before it", () => {
    // Arrange
    const { result, onDatesChange } = setup();
    act(() => result.current.openCalendar("start")); // mars 2026

    // Act
    act(() => result.current.handleCalendarDayPress(5));

    // Assert
    expect(onDatesChange).toHaveBeenCalledWith(new Date(2026, 2, 5), END_DATE);
  });

  it("should push the end date onto the start date when picking a start date after it", () => {
    // Arrange — la période se termine avant le mois affiché par le sélecteur
    const { result, onDatesChange } = setup({
      startDate: new Date(2026, 2, 10),
      endDate: new Date(2026, 2, 12),
    });
    act(() => result.current.openCalendar("start")); // mars 2026

    // Act — 25 mars 2026, postérieur au 12 mars
    act(() => result.current.handleCalendarDayPress(25));

    // Assert
    const selected = new Date(2026, 2, 25);
    expect(onDatesChange).toHaveBeenCalledWith(selected, selected);
  });

  it("should switch to the end picker on the end date month after picking a start date", () => {
    // Arrange
    const { result } = setup();
    act(() => result.current.openCalendar("start"));

    // Act
    act(() => result.current.handleCalendarDayPress(5));

    // Assert
    expect(result.current.calendarPickingFor).toBe("end");
    expect(result.current.calendarYear).toBe(2026);
    expect(result.current.calendarMonth).toBe(6);
  });

  it("should keep the calendar open after picking a start date", () => {
    // Arrange
    const { result } = setup();
    act(() => result.current.openCalendar("start"));

    // Act
    act(() => result.current.handleCalendarDayPress(5));

    // Assert
    expect(result.current.showCalendar).toBe(true);
  });

  it("should set the end date when picking a day after the start date", () => {
    // Arrange
    const { result, onDatesChange } = setup();
    act(() => result.current.openCalendar("end")); // juillet 2026

    // Act
    act(() => result.current.handleCalendarDayPress(28));

    // Assert
    expect(onDatesChange).toHaveBeenCalledWith(START_DATE, new Date(2026, 6, 28));
  });

  it("should swap the dates when picking an end day before the start date", () => {
    // Arrange — la période commence après le mois affiché par le sélecteur
    const start = new Date(2026, 6, 20);
    const { result, onDatesChange } = setup({
      startDate: start,
      endDate: new Date(2026, 6, 25),
    });
    act(() => result.current.openCalendar("end")); // juillet 2026

    // Act — 3 juillet 2026, antérieur au 20 juillet
    act(() => result.current.handleCalendarDayPress(3));

    // Assert
    expect(onDatesChange).toHaveBeenCalledWith(new Date(2026, 6, 3), start);
  });

  it("should close the calendar after picking an end date", () => {
    // Arrange
    const { result } = setup();
    act(() => result.current.openCalendar("end"));

    // Act
    act(() => result.current.handleCalendarDayPress(28));

    // Assert
    expect(result.current.showCalendar).toBe(false);
  });

  it("should step back one month when going to the previous month", () => {
    // Arrange
    const { result } = setup();
    act(() => result.current.openCalendar("start")); // mars 2026

    // Act
    act(() => result.current.goToPrevMonth());

    // Assert
    expect(result.current.calendarMonth).toBe(1);
    expect(result.current.calendarYear).toBe(2026);
  });

  it("should roll back to December of the previous year when leaving January", () => {
    // Arrange
    const { result } = setup({ startDate: new Date(2026, 0, 5) });
    act(() => result.current.openCalendar("start")); // janvier 2026

    // Act
    act(() => result.current.goToPrevMonth());

    // Assert
    expect(result.current.calendarMonth).toBe(11);
    expect(result.current.calendarYear).toBe(2025);
  });

  it("should step forward one month when going to the next month", () => {
    // Arrange
    const { result } = setup();
    act(() => result.current.openCalendar("start")); // mars 2026

    // Act
    act(() => result.current.goToNextMonth());

    // Assert
    expect(result.current.calendarMonth).toBe(3);
    expect(result.current.calendarYear).toBe(2026);
  });

  it("should roll forward to January of the next year when leaving December", () => {
    // Arrange
    const { result } = setup({ endDate: new Date(2026, 11, 8) });
    act(() => result.current.openCalendar("end")); // décembre 2026

    // Act
    act(() => result.current.goToNextMonth());

    // Assert
    expect(result.current.calendarMonth).toBe(0);
    expect(result.current.calendarYear).toBe(2027);
  });
});
