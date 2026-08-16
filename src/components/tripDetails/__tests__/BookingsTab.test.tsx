jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  return { Ionicons: (props: any) => <Text {...props} /> };
});

// Le vrai formulaire embarque le scanner de billets (caméra, ML Kit) : hors
// périmètre de cet onglet, on ne garde que son contrat visible/onSave/onClose.
jest.mock("../../BookingForm", () => {
  const { Text, TouchableOpacity, View } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible, onSave, onClose, initialBooking }: any) =>
      visible ? (
        <View>
          <Text>{`form-for:${initialBooking?.title ?? "none"}`}</Text>
          <TouchableOpacity onPress={() => onSave({ title: "Vol modifié" })}>
            <Text>form-save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Text>form-close</Text>
          </TouchableOpacity>
        </View>
      ) : null,
  };
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
import { countIcons, makeBooking } from "../../__tests__/voyagesTestUtils";
import BookingsTab from "../BookingsTab";

const flight = makeBooking({ id: "b1", type: "flight", title: "Paris → Lima", status: "confirmed" });

beforeEach(() => {
  mockIsDark = false;
  jest.restoreAllMocks();
});

describe("BookingsTab — état vide", () => {
  it("should show the empty message when there is no booking", () => {
    render(<BookingsTab bookings={[]} isOwner={false} />);

    expect(screen.getByText("No bookings yet")).toBeTruthy();
  });

  it("should offer the add button when the owner can add", () => {
    const onAddBooking = jest.fn();
    render(<BookingsTab bookings={[]} isOwner onAddBooking={onAddBooking} />);

    fireEvent.press(screen.getByText("Add Booking"));

    expect(onAddBooking).toHaveBeenCalledTimes(1);
  });

  it("should offer the add button to a non-owner editor", () => {
    render(<BookingsTab bookings={[]} isOwner={false} canEdit onAddBooking={jest.fn()} />);

    expect(screen.getByText("Add Booking")).toBeTruthy();
  });

  it("should hide the add button when the viewer cannot add", () => {
    render(<BookingsTab bookings={[]} isOwner={false} canEdit={false} onAddBooking={jest.fn()} />);

    expect(screen.queryByText("Add Booking")).toBeNull();
  });

  it("should hide the add button when no handler is provided", () => {
    render(<BookingsTab bookings={[]} isOwner />);

    expect(screen.queryByText("Add Booking")).toBeNull();
  });
});

describe("BookingsTab — liste", () => {
  it("should list the booking title and its formatted date", () => {
    render(<BookingsTab bookings={[flight]} isOwner />);

    expect(screen.getByText("Paris → Lima")).toBeTruthy();
    expect(screen.getByText("Mar 15, 2026")).toBeTruthy();
  });

  it("should append the time to the date when the booking has one", () => {
    render(<BookingsTab bookings={[makeBooking({ time: "14:30" })]} isOwner />);

    expect(screen.getByText("Mar 15, 2026 · 14:30")).toBeTruthy();
  });

  it("should show the confirmed status pill when the booking is confirmed", () => {
    render(<BookingsTab bookings={[flight]} isOwner />);

    expect(screen.getByText("Confirmed")).toBeTruthy();
  });

  it("should show the pending status pill for any other status", () => {
    render(<BookingsTab bookings={[makeBooking({ status: "cancelled" })]} isOwner />);

    expect(screen.getByText("Pending")).toBeTruthy();
  });

  it("should show no status pill when the booking has no status", () => {
    render(<BookingsTab bookings={[makeBooking({ status: undefined as any })]} isOwner />);

    expect(screen.queryByText("Confirmed")).toBeNull();
    expect(screen.queryByText("Pending")).toBeNull();
  });

  it("should show the add button above the list when the owner can add", () => {
    render(<BookingsTab bookings={[flight]} isOwner onAddBooking={jest.fn()} />);

    expect(screen.getByText("Add Booking")).toBeTruthy();
  });

  it("should hide the add button above the list for a viewer", () => {
    render(<BookingsTab bookings={[flight]} isOwner={false} onAddBooking={jest.fn()} />);

    expect(screen.queryByText("Add Booking")).toBeNull();
  });

  it.each([
    ["flight", "airplane"],
    ["hotel", "bed"],
    ["train", "train"],
    ["restaurant", "restaurant"],
    ["activity", "star"],
    ["car", "car"],
    ["unknown", "receipt"],
  ])("should pick the %s icon for a %s booking", (type, icon) => {
    render(<BookingsTab bookings={[makeBooking({ type: type as any })]} isOwner />);

    expect(countIcons(icon)).toBe(1);
  });

  it.each(["flight", "hotel", "train", "restaurant", "activity", "car"])(
    "should render a %s booking in dark mode",
    (type) => {
      mockIsDark = true;
      render(<BookingsTab bookings={[makeBooking({ type: type as any, title: `Trajet ${type}` })]} isOwner />);

      expect(screen.getByText(`Trajet ${type}`)).toBeTruthy();
    },
  );
});

describe("BookingsTab — feuille d'actions", () => {
  it("should open the action sheet when a booking is tapped", () => {
    render(<BookingsTab bookings={[flight]} isOwner onUpdateBooking={jest.fn()} onDeleteBooking={jest.fn()} />);

    fireEvent.press(screen.getByText("Paris → Lima"));

    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("should close the action sheet when cancel is pressed", () => {
    render(<BookingsTab bookings={[flight]} isOwner onUpdateBooking={jest.fn()} />);
    fireEvent.press(screen.getByText("Paris → Lima"));

    fireEvent.press(screen.getByText("Cancel"));

    expect(screen.queryByText("Edit")).toBeNull();
  });

  it("should hide the edit action when no update handler is provided", () => {
    render(<BookingsTab bookings={[flight]} isOwner onDeleteBooking={jest.fn()} />);

    fireEvent.press(screen.getByText("Paris → Lima"));

    expect(screen.queryByText("Edit")).toBeNull();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("should hide the delete action for a non-owner editor", () => {
    render(
      <BookingsTab
        bookings={[flight]}
        isOwner={false}
        canEdit
        onUpdateBooking={jest.fn()}
        onDeleteBooking={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText("Paris → Lima"));

    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.queryByText("Delete")).toBeNull();
  });
});

describe("BookingsTab — suppression", () => {
  it("should ask for confirmation before deleting", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<BookingsTab bookings={[flight]} isOwner onDeleteBooking={jest.fn()} />);
    fireEvent.press(screen.getByText("Paris → Lima"));

    fireEvent.press(screen.getByText("Delete"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Delete",
      "Are you sure you want to delete this booking?",
      expect.any(Array),
    );
  });

  it("should delete the booking when the confirmation is accepted", () => {
    const onDeleteBooking = jest.fn().mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<BookingsTab bookings={[flight]} isOwner onDeleteBooking={onDeleteBooking} />);
    fireEvent.press(screen.getByText("Paris → Lima"));
    fireEvent.press(screen.getByText("Delete"));

    const buttons = alertSpy.mock.calls[0][2] as any[];
    buttons[1].onPress();

    expect(onDeleteBooking).toHaveBeenCalledWith("b1");
  });

  it("should keep the booking when the confirmation is cancelled", () => {
    const onDeleteBooking = jest.fn();
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<BookingsTab bookings={[flight]} isOwner onDeleteBooking={onDeleteBooking} />);
    fireEvent.press(screen.getByText("Paris → Lima"));
    fireEvent.press(screen.getByText("Delete"));

    const buttons = alertSpy.mock.calls[0][2] as any[];

    expect(buttons[0].onPress).toBeUndefined();
    expect(onDeleteBooking).not.toHaveBeenCalled();
  });

  it("should close the action sheet once deletion is confirmed", () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<BookingsTab bookings={[flight]} isOwner onDeleteBooking={jest.fn()} />);
    fireEvent.press(screen.getByText("Paris → Lima"));

    fireEvent.press(screen.getByText("Delete"));

    expect(screen.queryByText("Cancel")).toBeNull();
  });
});

describe("BookingsTab — édition", () => {
  it("should open the form on the selected booking when edit is pressed", () => {
    render(<BookingsTab bookings={[flight]} isOwner onUpdateBooking={jest.fn()} />);
    fireEvent.press(screen.getByText("Paris → Lima"));

    fireEvent.press(screen.getByText("Edit"));

    expect(screen.getByText("form-for:Paris → Lima")).toBeTruthy();
  });

  it("should forward the update and close the form on save", async () => {
    const onUpdateBooking = jest.fn().mockResolvedValue(undefined);
    render(<BookingsTab bookings={[flight]} isOwner onUpdateBooking={onUpdateBooking} />);
    fireEvent.press(screen.getByText("Paris → Lima"));
    fireEvent.press(screen.getByText("Edit"));

    fireEvent.press(screen.getByText("form-save"));

    expect(onUpdateBooking).toHaveBeenCalledWith("b1", { title: "Vol modifié" });
    await screen.findByText("Paris → Lima");
    expect(screen.queryByText("form-save")).toBeNull();
  });

  it("should discard the edition when the form is closed", () => {
    render(<BookingsTab bookings={[flight]} isOwner onUpdateBooking={jest.fn()} />);
    fireEvent.press(screen.getByText("Paris → Lima"));
    fireEvent.press(screen.getByText("Edit"));

    fireEvent.press(screen.getByText("form-close"));

    expect(screen.queryByText("form-save")).toBeNull();
    expect(screen.queryByText("Edit")).toBeNull();
  });
});
