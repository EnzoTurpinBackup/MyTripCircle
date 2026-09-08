jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import React from "react";
import { render, screen } from "@testing-library/react-native";
import "../../__tests__/voyagesTestUtils";
import TripProgressBar from "../TripProgressBar";

describe("TripProgressBar", () => {
  it("should show the progress label and the day counter", () => {
    render(<TripProgressBar progressPercent={40} daysPassed={4} durationDays={10} />);

    expect(screen.getByText("Progress")).toBeTruthy();
    expect(screen.getByText("4/10 days")).toBeTruthy();
  });

  it("should render an empty bar before departure", () => {
    render(<TripProgressBar progressPercent={0} daysPassed={0} durationDays={7} />);

    expect(screen.getByText("0/7 days")).toBeTruthy();
  });

  it("should render a full bar once the trip is over", () => {
    render(<TripProgressBar progressPercent={100} daysPassed={7} durationDays={7} />);

    expect(screen.getByText("7/7 days")).toBeTruthy();
  });
});
