jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

jest.mock("../../../contexts/ThemeContext", () => {
  const actual = jest.requireActual("../../../contexts/ThemeContext");
  return {
    ...actual,
    useTheme: () => ({
      isDark: mockIsDark,
      colors: mockIsDark ? actual.darkColors : actual.lightColors,
      toggleTheme: jest.fn(),
      satelliteMap: false,
      toggleSatelliteMap: jest.fn(),
    }),
  };
});
let mockIsDark = false;

import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { countIcons, makeAddress } from "../../__tests__/voyagesTestUtils";
import AddressesTab from "../AddressesTab";

const hotel = makeAddress({ id: "a1", type: "hotel", name: "Hôtel Miraflores" });

beforeEach(() => {
  mockIsDark = false;
  jest.restoreAllMocks();
});

describe("AddressesTab — état vide", () => {
  it("should show the empty message when there is no address", () => {
    render(<AddressesTab addresses={[]} onEditAddress={jest.fn()} />);

    expect(screen.getByText("No addresses yet")).toBeTruthy();
  });

  it("should trigger the add handler from the empty state", () => {
    const onAddAddress = jest.fn();
    render(<AddressesTab addresses={[]} onEditAddress={jest.fn()} canAdd onAddAddress={onAddAddress} />);

    fireEvent.press(screen.getByText("Add Address"));

    expect(onAddAddress).toHaveBeenCalledTimes(1);
  });

  it("should hide the add button when the user cannot add", () => {
    render(<AddressesTab addresses={[]} onEditAddress={jest.fn()} canAdd={false} onAddAddress={jest.fn()} />);

    expect(screen.queryByText("Add Address")).toBeNull();
  });

  it("should hide the add button when no handler is provided", () => {
    render(<AddressesTab addresses={[]} onEditAddress={jest.fn()} canAdd />);

    expect(screen.queryByText("Add Address")).toBeNull();
  });
});

describe("AddressesTab — liste", () => {
  it("should list the address name and street", () => {
    render(<AddressesTab addresses={[hotel]} onEditAddress={jest.fn()} />);

    expect(screen.getByText("Hôtel Miraflores")).toBeTruthy();
    expect(screen.getByText("12 avenida Larco")).toBeTruthy();
  });

  it("should show the add button above the list when the user can add", () => {
    const onAddAddress = jest.fn();
    render(<AddressesTab addresses={[hotel]} onEditAddress={jest.fn()} canAdd onAddAddress={onAddAddress} />);

    fireEvent.press(screen.getByText("Add Address"));

    expect(onAddAddress).toHaveBeenCalledTimes(1);
  });

  it("should hide the add button above the list when the user cannot add", () => {
    render(<AddressesTab addresses={[hotel]} onEditAddress={jest.fn()} onAddAddress={jest.fn()} />);

    expect(screen.queryByText("Add Address")).toBeNull();
  });

  it.each([
    ["hotel", "bed"],
    ["restaurant", "restaurant"],
    ["activity", "star"],
    ["transport", "location"],
    ["other", "location"],
  ])("should pick the right icon for a %s address", (type, icon) => {
    render(<AddressesTab addresses={[makeAddress({ type: type as any })]} onEditAddress={jest.fn()} />);

    expect(countIcons(icon)).toBe(1);
  });

  it.each(["hotel", "restaurant", "activity", "transport"])(
    "should render a %s address in dark mode",
    (type) => {
      mockIsDark = true;
      render(
        <AddressesTab
          addresses={[makeAddress({ type: type as any, name: `Lieu ${type}` })]}
          onEditAddress={jest.fn()}
        />,
      );

      expect(screen.getByText(`Lieu ${type}`)).toBeTruthy();
    },
  );
});

describe("AddressesTab — feuille d'actions", () => {
  it("should open the action sheet when an address is tapped", () => {
    render(<AddressesTab addresses={[hotel]} onEditAddress={jest.fn()} canAdd onDeleteAddress={jest.fn()} />);

    fireEvent.press(screen.getByText("Hôtel Miraflores"));

    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("should show the city and country as the sheet subtitle", () => {
    render(<AddressesTab addresses={[hotel]} onEditAddress={jest.fn()} canAdd />);

    fireEvent.press(screen.getByText("Hôtel Miraflores"));

    expect(screen.getByText("Lima, Pérou")).toBeTruthy();
  });

  it("should omit the subtitle when the address has no city", () => {
    render(
      <AddressesTab addresses={[makeAddress({ city: "" })]} onEditAddress={jest.fn()} canAdd />,
    );

    fireEvent.press(screen.getByText("Hôtel Miraflores"));

    expect(screen.queryByText(", Pérou")).toBeNull();
  });

  it("should hide both actions when the user cannot edit", () => {
    render(<AddressesTab addresses={[hotel]} onEditAddress={jest.fn()} canAdd={false} onDeleteAddress={jest.fn()} />);

    fireEvent.press(screen.getByText("Hôtel Miraflores"));

    expect(screen.queryByText("Edit")).toBeNull();
    expect(screen.queryByText("Delete")).toBeNull();
  });

  it("should hide the delete action when no delete handler is provided", () => {
    render(<AddressesTab addresses={[hotel]} onEditAddress={jest.fn()} canAdd />);

    fireEvent.press(screen.getByText("Hôtel Miraflores"));

    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.queryByText("Delete")).toBeNull();
  });

  it("should close the action sheet when cancel is pressed", () => {
    render(<AddressesTab addresses={[hotel]} onEditAddress={jest.fn()} canAdd />);
    fireEvent.press(screen.getByText("Hôtel Miraflores"));

    fireEvent.press(screen.getByText("Cancel"));

    expect(screen.queryByText("Edit")).toBeNull();
  });
});

describe("AddressesTab — édition et suppression", () => {
  it("should forward the address to the edit handler and close the sheet", () => {
    const onEditAddress = jest.fn();
    render(<AddressesTab addresses={[hotel]} onEditAddress={onEditAddress} canAdd />);
    fireEvent.press(screen.getByText("Hôtel Miraflores"));

    fireEvent.press(screen.getByText("Edit"));

    expect(onEditAddress).toHaveBeenCalledWith(hotel);
    expect(screen.queryByText("Cancel")).toBeNull();
  });

  it("should ask for confirmation before deleting", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<AddressesTab addresses={[hotel]} onEditAddress={jest.fn()} canAdd onDeleteAddress={jest.fn()} />);
    fireEvent.press(screen.getByText("Hôtel Miraflores"));

    fireEvent.press(screen.getByText("Delete"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Delete address",
      "Are you sure you want to delete this address?",
      expect.any(Array),
    );
  });

  it("should delete the address when the confirmation is accepted", () => {
    const onDeleteAddress = jest.fn().mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<AddressesTab addresses={[hotel]} onEditAddress={jest.fn()} canAdd onDeleteAddress={onDeleteAddress} />);
    fireEvent.press(screen.getByText("Hôtel Miraflores"));
    fireEvent.press(screen.getByText("Delete"));

    const buttons = alertSpy.mock.calls[0][2] as any[];
    buttons[1].onPress();

    expect(onDeleteAddress).toHaveBeenCalledWith("a1");
  });

  it("should close the action sheet once deletion is confirmed", () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<AddressesTab addresses={[hotel]} onEditAddress={jest.fn()} canAdd onDeleteAddress={jest.fn()} />);
    fireEvent.press(screen.getByText("Hôtel Miraflores"));

    fireEvent.press(screen.getByText("Delete"));

    expect(screen.queryByText("Cancel")).toBeNull();
  });
});
