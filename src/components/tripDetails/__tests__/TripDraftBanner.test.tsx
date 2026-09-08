jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import "../../__tests__/voyagesTestUtils";
import TripDraftBanner from "../TripDraftBanner";

describe("TripDraftBanner", () => {
  it("should explain that the trip is still a draft", () => {
    render(<TripDraftBanner onValidate={jest.fn()} />);

    expect(screen.getByText("This trip is a draft. Validate it to make it active.")).toBeTruthy();
  });

  it("should validate the trip when the button is pressed", () => {
    const onValidate = jest.fn();
    render(<TripDraftBanner onValidate={onValidate} />);

    fireEvent.press(screen.getByText("Validate Trip"));

    expect(onValidate).toHaveBeenCalledTimes(1);
  });
});
