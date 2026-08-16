jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { countIcons } from "../../__tests__/voyagesTestUtils";
import InvitationCtaBar from "../InvitationCtaBar";

const renderBar = (props: Partial<React.ComponentProps<typeof InvitationCtaBar>> = {}) =>
  render(
    <InvitationCtaBar
      responding={false}
      onAccept={jest.fn()}
      onDecline={jest.fn()}
      insetBottom={24}
      {...props}
    />,
  );

describe("InvitationCtaBar — état au repos", () => {
  it("should explain that the user has been invited", () => {
    renderBar();

    expect(screen.getByText("You've been invited to join this trip")).toBeTruthy();
  });

  it("should offer both answers", () => {
    renderBar();

    expect(screen.getByText("Accept")).toBeTruthy();
    expect(screen.getByText("Decline")).toBeTruthy();
  });

  it("should accept the invitation when the accept button is pressed", () => {
    const onAccept = jest.fn();
    renderBar({ onAccept });

    fireEvent.press(screen.getByText("Accept"));

    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("should decline the invitation when the decline button is pressed", () => {
    const onDecline = jest.fn();
    renderBar({ onDecline });

    fireEvent.press(screen.getByText("Decline"));

    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});

describe("InvitationCtaBar — réponse en cours", () => {
  it("should replace the accept label with a spinner", () => {
    renderBar({ responding: true });

    expect(screen.queryByText("Accept")).toBeNull();
    expect(countIcons("checkmark")).toBe(0);
  });

  it("should ignore the decline button while responding", () => {
    const onDecline = jest.fn();
    renderBar({ responding: true, onDecline });

    fireEvent.press(screen.getByText("Decline"));

    expect(onDecline).not.toHaveBeenCalled();
  });
});
