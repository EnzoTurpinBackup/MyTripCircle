import "../../__tests__/support/nativeMocks";

import React from "react";
import { Animated, Platform } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import AddToTripModal from "../AddToTripModal";
import { lightColors } from "../../../contexts/ThemeContext";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Le sélecteur de date natif est remplacé par un bouton pilotable, afin de
// déclencher `onChange` sans dépendre du module natif.
const mockPickerProps: Record<string, unknown>[] = [];
jest.mock("@react-native-community/datetimepicker", () => {
  const { Text, TouchableOpacity } = require("react-native");
  return {
    __esModule: true,
    default: (props: { onChange: Function; value: Date }) => {
      mockPickerProps.push(props);
      return (
        <TouchableOpacity
          testID="date-picker"
          onPress={() =>
            props.onChange({ type: "set" }, new Date("2026-07-04T00:00:00Z"))
          }
        >
          <Text>{`picker:${props.value.toISOString().slice(0, 10)}`}</Text>
        </TouchableOpacity>
      );
    },
  };
});

const lastPickerProps = () => mockPickerProps[mockPickerProps.length - 1];

const START_DATE = new Date("2026-06-01T00:00:00Z");
const END_DATE = new Date("2026-06-05T00:00:00Z");

const baseProps = () => ({
  visible: true,
  destinationName: "Kyoto",
  customDays: 5,
  tripTitle: "Escapade à Kyoto",
  startDate: START_DATE,
  endDate: END_DATE,
  showDatePicker: false,
  creating: false,
  backdropOpacity: new Animated.Value(1),
  sheetTranslateY: new Animated.Value(0),
  colors: lightColors,
  isDark: false,
  onClose: jest.fn(),
  onChangeTripTitle: jest.fn(),
  onOpenDatePicker: jest.fn(),
  onCloseDatePicker: jest.fn(),
  onChangeDate: jest.fn(),
  onCreate: jest.fn(),
  formatDate: (d: Date) => `date(${d.toISOString().slice(0, 10)})`,
});

const renderModal = (
  overrides: Partial<React.ComponentProps<typeof AddToTripModal>> = {},
) => {
  const props = { ...baseProps(), ...overrides };
  render(<AddToTripModal {...props} />);
  return props;
};

const withPlatform = (os: "ios" | "android", run: () => void) => {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
  try {
    run();
  } finally {
    Object.defineProperty(Platform, "OS", { value: original, configurable: true });
  }
};

describe("AddToTripModal", () => {
  it("should render the modal title when visible", () => {
    renderModal();

    expect(screen.getByText("ideas.addModal.title")).toBeTruthy();
  });

  it("should not render its content when not visible", () => {
    renderModal({ visible: false });

    expect(screen.queryByText("ideas.addModal.title")).toBeNull();
  });

  it("should summarise the destination and the number of days", () => {
    renderModal();

    expect(screen.getByText("Kyoto · 5 ideas.addModal.days")).toBeTruthy();
  });

  it("should render the current trip title in the text field", () => {
    renderModal();

    expect(screen.getByDisplayValue("Escapade à Kyoto")).toBeTruthy();
  });

  it("should report trip title edits to the caller", () => {
    const props = renderModal();

    fireEvent.changeText(screen.getByDisplayValue("Escapade à Kyoto"), "Kyoto en famille");

    expect(props.onChangeTripTitle).toHaveBeenCalledWith("Kyoto en famille");
  });

  it("should render the formatted start and end dates", () => {
    renderModal();

    expect(screen.getByText("date(2026-06-01)")).toBeTruthy();
    expect(screen.getByText("ideas.addModal.endDate : date(2026-06-05)")).toBeTruthy();
  });

  it("should ask the caller to open the date picker when the date row is pressed", () => {
    const props = renderModal();

    fireEvent.press(screen.getByText("date(2026-06-01)"));

    expect(props.onOpenDatePicker).toHaveBeenCalledTimes(1);
  });

  it("should hide the date picker when showDatePicker is false", () => {
    renderModal();

    expect(screen.queryByTestId("date-picker")).toBeNull();
  });

  it("should show the date picker when showDatePicker is true", () => {
    renderModal({ showDatePicker: true });

    expect(screen.getByTestId("date-picker")).toBeTruthy();
  });

  it("should dress the date picker in the light variant in light theme", () => {
    renderModal({ showDatePicker: true, isDark: false });

    expect(lastPickerProps().themeVariant).toBe("light");
  });

  it("should dress the date picker in the dark variant in dark theme", () => {
    renderModal({ showDatePicker: true, isDark: true });

    expect(lastPickerProps().themeVariant).toBe("dark");
  });

  it("should report the chosen date without closing the picker on iOS", () => {
    withPlatform("ios", () => {
      const props = renderModal({ showDatePicker: true });

      fireEvent.press(screen.getByTestId("date-picker"));

      expect(props.onChangeDate).toHaveBeenCalledWith(new Date("2026-07-04T00:00:00Z"));
      expect(props.onCloseDatePicker).not.toHaveBeenCalled();
    });
  });

  it("should close the picker before reporting the chosen date on Android", () => {
    withPlatform("android", () => {
      const props = renderModal({ showDatePicker: true });

      fireEvent.press(screen.getByTestId("date-picker"));

      expect(props.onCloseDatePicker).toHaveBeenCalledTimes(1);
      expect(props.onChangeDate).toHaveBeenCalledWith(new Date("2026-07-04T00:00:00Z"));
    });
  });

  it("should call onCreate when the create button is pressed", () => {
    const props = renderModal();

    fireEvent.press(screen.getByText("ideas.addModal.create"));

    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it("should replace the create label with a spinner while creating", () => {
    renderModal({ creating: true });

    expect(screen.queryByText("ideas.addModal.create")).toBeNull();
    expect(
      screen.UNSAFE_getByType(require("react-native").ActivityIndicator),
    ).toBeTruthy();
  });

  it("should call onClose when the backdrop is pressed", () => {
    const props = renderModal();

    fireEvent.press(screen.UNSAFE_getAllByType(require("react-native").TouchableOpacity)[0]);

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
