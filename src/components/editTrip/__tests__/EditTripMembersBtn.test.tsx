jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import "../../__tests__/voyagesTestUtils";
import EditTripMembersBtn from "../EditTripMembersBtn";

describe("EditTripMembersBtn", () => {
  const renderBtn = (onPress = jest.fn()) => {
    render(
      <EditTripMembersBtn
        surface="#FFFFFF"
        border="#D8CCBA"
        text="#2A2318"
        textLight="#B0A090"
        iconBg="#EDE5D8"
        onPress={onPress}
      />,
    );
    return onPress;
  };

  it("should show the members label and its description", () => {
    renderBtn();

    expect(screen.getByText("Manage members")).toBeTruthy();
    expect(screen.getByText("Invite, remove or transfer management")).toBeTruthy();
  });

  it("should open the members screen when pressed", () => {
    const onPress = renderBtn();

    fireEvent.press(screen.getByText("Manage members"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
