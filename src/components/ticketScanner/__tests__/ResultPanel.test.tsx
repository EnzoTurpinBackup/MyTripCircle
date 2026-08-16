import "../../__tests__/support/nativeMocks";

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import ResultPanel from "../ResultPanel";
import { lightColors } from "../../../contexts/ThemeContext";
import type { ScannedBookingData } from "../../../hooks/useTicketScanner";

const t = (key: string) => key;

const renderPanel = (
  parsedData: ScannedBookingData,
  overrides: { rawData?: string; onFill?: () => void; onRescan?: () => void } = {},
) =>
  render(
    <ResultPanel
      parsedData={parsedData}
      rawData={overrides.rawData ?? "RAW-PAYLOAD"}
      colors={lightColors}
      t={t}
      onFill={overrides.onFill ?? jest.fn()}
      onRescan={overrides.onRescan ?? jest.fn()}
    />,
  );

describe("ResultPanel", () => {
  it("should render the success heading", () => {
    renderPanel({ title: "Vol AF123" });

    expect(screen.getByText("bookings.scanFoundTitle")).toBeTruthy();
    expect(screen.getByText("bookings.scanFoundSubtitle")).toBeTruthy();
  });

  it("should render the booking type when it was parsed", () => {
    renderPanel({ type: "flight" });

    expect(screen.getByText("bookings.typeLabels.flight")).toBeTruthy();
  });

  it("should render the title when it was parsed", () => {
    renderPanel({ title: "Vol AF123" });

    expect(screen.getByText("Vol AF123")).toBeTruthy();
  });

  it("should render the date in French format when it was parsed", () => {
    renderPanel({ date: new Date(2026, 2, 12) });

    expect(screen.getByText("12/03/2026")).toBeTruthy();
  });

  it("should render the time when it was parsed", () => {
    renderPanel({ title: "Vol", time: "14:30" });

    expect(screen.getByText("14:30")).toBeTruthy();
  });

  it("should render the confirmation number when it was parsed", () => {
    renderPanel({ confirmationNumber: "ABC123" });

    expect(screen.getByText("ABC123")).toBeTruthy();
  });

  it("should render the address when it was parsed", () => {
    renderPanel({ title: "Hôtel", address: "3 rue de Rivoli, Paris" });

    expect(screen.getByText("3 rue de Rivoli, Paris")).toBeTruthy();
  });

  it("should fall back to the raw payload when no meaningful field was parsed", () => {
    renderPanel({}, { rawData: "RAW-PAYLOAD" });

    expect(screen.getByText("RAW-PAYLOAD")).toBeTruthy();
  });

  it("should not show the raw payload once a title was parsed", () => {
    renderPanel({ title: "Vol AF123" }, { rawData: "RAW-PAYLOAD" });

    expect(screen.queryByText("RAW-PAYLOAD")).toBeNull();
  });

  it("should not show the raw payload once a date was parsed", () => {
    renderPanel({ date: new Date(2026, 2, 12) }, { rawData: "RAW-PAYLOAD" });

    expect(screen.queryByText("RAW-PAYLOAD")).toBeNull();
  });

  it("should not show the raw payload once a confirmation number was parsed", () => {
    renderPanel({ confirmationNumber: "ABC123" }, { rawData: "RAW-PAYLOAD" });

    expect(screen.queryByText("RAW-PAYLOAD")).toBeNull();
  });

  it("should call onFill when the fill button is pressed", () => {
    const onFill = jest.fn();
    renderPanel({ title: "Vol AF123" }, { onFill });

    fireEvent.press(screen.getByText("bookings.scanFillButton"));

    expect(onFill).toHaveBeenCalledTimes(1);
  });

  it("should call onRescan when the rescan button is pressed", () => {
    const onRescan = jest.fn();
    renderPanel({ title: "Vol AF123" }, { onRescan });

    fireEvent.press(screen.getByText("bookings.scanRescan"));

    expect(onRescan).toHaveBeenCalledTimes(1);
  });
});
