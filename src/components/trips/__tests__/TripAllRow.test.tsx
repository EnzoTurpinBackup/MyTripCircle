jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

import React from "react";
import { Image } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { makeTrip } from "../../__tests__/voyagesTestUtils";
import TripAllRow from "../TripAllRow";

describe("TripAllRow", () => {
  it("should show the trip title", () => {
    render(<TripAllRow trip={makeTrip()} photoUri="https://cdn/lima.jpg" onPress={jest.fn()} />);

    expect(screen.getByText("Pérou 2026")).toBeTruthy();
  });

  it("should show the destination and the short date range", () => {
    render(<TripAllRow trip={makeTrip()} photoUri="https://cdn/lima.jpg" onPress={jest.fn()} />);

    expect(screen.getByText("📍 Lima · 15 Mar–25 Mar")).toBeTruthy();
  });

  it("should format a one-day trip with the same start and end date", () => {
    render(
      <TripAllRow
        trip={makeTrip({
          startDate: new Date("2026-12-01T12:00:00.000Z"),
          endDate: new Date("2026-12-01T12:00:00.000Z"),
        })}
        photoUri="https://cdn/lima.jpg"
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("📍 Lima · 1 Dec–1 Dec")).toBeTruthy();
  });

  it("should hide the cover photo from assistive technologies", () => {
    render(<TripAllRow trip={makeTrip()} photoUri="https://cdn/lima.jpg" onPress={jest.fn()} />);

    // Le titre et la destination du voyage sont déjà lus dans la même ligne.
    expect(screen.UNSAFE_getByType(Image).props).toMatchObject({
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: "no",
    });
  });

  it("should open the trip when the row is pressed", () => {
    const onPress = jest.fn();
    render(<TripAllRow trip={makeTrip()} photoUri="https://cdn/lima.jpg" onPress={onPress} />);

    fireEvent.press(screen.getByText("Pérou 2026"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
