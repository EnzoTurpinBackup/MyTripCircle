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
import { fireEvent, render, screen } from "@testing-library/react-native";
import { countIcons, listColors, makeAddress, pressIcon } from "../../__tests__/voyagesTestUtils";
import AddressesList from "../AddressesList";

const renderList = (props: Partial<React.ComponentProps<typeof AddressesList>> = {}) =>
  render(
    <AddressesList
      addresses={[]}
      colors={listColors}
      onAdd={jest.fn()}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
      {...props}
    />,
  );

beforeEach(() => {
  mockIsDark = false;
});

describe("AddressesList — en-tête", () => {
  it("should show the section header", () => {
    renderList();

    expect(screen.getByText("Addresses")).toBeTruthy();
  });

  it("should trigger the add handler", () => {
    const onAdd = jest.fn();
    renderList({ onAdd });

    fireEvent.press(screen.getByText("Add Address"));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

describe("AddressesList — état vide", () => {
  it("should invite the user to add a first address", () => {
    renderList();

    expect(screen.getByText("Add your first address to get started")).toBeTruthy();
  });
});

describe("AddressesList — liste", () => {
  it("should show the address name and its location", () => {
    renderList({ addresses: [makeAddress()] });

    expect(screen.getByText("Hôtel Miraflores")).toBeTruthy();
    expect(screen.getByText("Lima, Pérou")).toBeTruthy();
  });

  it("should fall back to the street when the address has no name", () => {
    renderList({ addresses: [makeAddress({ name: "" })] });

    expect(screen.getByText("12 avenida Larco")).toBeTruthy();
  });

  it("should show the city alone when the address has no country", () => {
    renderList({ addresses: [makeAddress({ country: "" })] });

    expect(screen.getByText("Lima")).toBeTruthy();
  });

  it("should render an address that has no id", () => {
    renderList({ addresses: [makeAddress({ id: "" })] });

    expect(screen.getByText("Hôtel Miraflores")).toBeTruthy();
  });

  it("should hide the empty message once there is an address", () => {
    renderList({ addresses: [makeAddress()] });

    expect(screen.queryByText("Add your first address to get started")).toBeNull();
  });

  it.each([
    ["hotel", "bed"],
    ["restaurant", "restaurant"],
    ["activity", "ticket"],
    ["transport", "car"],
    ["other", "location"],
  ])("should pick the right icon for a %s address", (type, icon) => {
    renderList({ addresses: [makeAddress({ type: type as any })] });

    expect(countIcons(icon)).toBe(1);
  });

  it("should fall back to the location icon for an unknown type", () => {
    renderList({ addresses: [makeAddress({ type: "spaceport" as any })] });

    expect(countIcons("location")).toBe(1);
  });

  it.each(["hotel", "restaurant", "activity", "transport", "other"])(
    "should render a %s address in dark mode",
    (type) => {
      mockIsDark = true;
      renderList({ addresses: [makeAddress({ type: type as any, name: `Lieu ${type}` })] });

      expect(screen.getByText(`Lieu ${type}`)).toBeTruthy();
    },
  );

  it("should render an unknown type in dark mode too", () => {
    mockIsDark = true;
    renderList({ addresses: [makeAddress({ type: "spaceport" as any })] });

    expect(countIcons("location")).toBe(1);
  });
});

describe("AddressesList — actions par ligne", () => {
  it("should edit the address at the pressed index", () => {
    const onEdit = jest.fn();
    renderList({
      addresses: [makeAddress({ id: "a1" }), makeAddress({ id: "a2", name: "Resto" })],
      onEdit,
    });

    pressIcon("pencil", 1);

    expect(onEdit).toHaveBeenCalledWith(1);
  });

  it("should delete the address at the pressed index", () => {
    const onDelete = jest.fn();
    renderList({
      addresses: [makeAddress({ id: "a1" }), makeAddress({ id: "a2", name: "Resto" })],
      onDelete,
    });

    pressIcon("trash", 0);

    expect(onDelete).toHaveBeenCalledWith(0);
  });
});
