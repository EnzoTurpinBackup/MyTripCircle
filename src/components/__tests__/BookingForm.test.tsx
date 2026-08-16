import React from "react";
import { Alert, Animated, Platform } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import i18next from "i18next";
import BookingForm from "../BookingForm";
import type { AddressSuggestion } from "../../services/PlacesService";

// ─── Frontières mockées ───────────────────────────────────────────────────────

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// useSafeAreaInsets a besoin d'un SafeAreaProvider ayant reçu ses métriques
// via un événement natif, ce qui n'arrive jamais en environnement de test.
jest.mock("react-native-safe-area-context", () => {
  const mock = require("react-native-safe-area-context/jest/mock");
  return mock.default ?? mock;
});

// On renvoie la clé de traduction plutôt que le libellé : les assertions
// restent lisibles et insensibles aux retouches de wording.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// La langue courante pilote la locale des sélecteurs natifs : on la contrôle
// depuis le test plutôt que de dépendre de la locale de l'appareil.
jest.mock("i18next", () => ({
  __esModule: true,
  default: {
    language: "en",
    t: (key: string) => key,
    use() {
      return this;
    },
    init() {},
    changeLanguage() {},
  },
}));

// La police d'icônes charge ses glyphes de façon asynchrone : on la remplace
// par un texte porteur du nom de l'icône.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, `icon:${name}`),
  };
});

// Le sélecteur de date est un module natif : on le remplace par une vue
// inspectable, seul moyen d'affirmer la locale et le mode transmis.
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: "date-time-picker", ...props }),
  };
});

// Le scanner embarque la caméra et le lecteur de codes-barres natifs :
// hors périmètre de ce formulaire, on le réduit à un marqueur.
jest.mock("../TicketScannerModal", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ visible, onClose, onFill }: Record<string, never>) =>
      visible
        ? React.createElement(Text, { onPress: onClose, onFill }, "scanner-ouvert")
        : null,
  };
});

const mockAttachmentManager = {
  attachments: [] as Array<{ uri: string; name: string; type: "image" | "pdf" }>,
  setAttachments: jest.fn(),
  renamingIndex: null as number | null,
  setRenamingIndex: jest.fn(),
  renameValue: "",
  setRenameValue: jest.fn(),
  handlePickImage: jest.fn(),
  handlePickDocument: jest.fn(),
  handleOpenRename: jest.fn(),
  handleConfirmRename: jest.fn(),
  handleRemoveAttachment: jest.fn(),
};

// Les hooks d'autocomplétion sont des frontières réseau. Leurs doublures
// répercutent la saisie dans le formulaire, comme le font les vrais hooks,
// afin que la construction du titre de vol reste observable.
const echoText = (text: string, onTextChange: (v: string) => void) => onTextChange(text);
const echoChoice = (s: AddressSuggestion, onSelect: (d: string) => void) =>
  onSelect(s.description);

const mockAddressAutocomplete = {
  addressSuggestions: [] as AddressSuggestion[],
  showAddressSuggestions: false,
  handleAddressChange: jest.fn(echoText),
  handleSelectAddress: jest.fn(echoChoice),
};

const mockTransportAutocomplete = {
  originSuggestions: [] as AddressSuggestion[],
  showOriginSuggestions: false,
  destinationSuggestions: [] as AddressSuggestion[],
  showDestinationSuggestions: false,
  handleOriginChange: jest.fn(echoText),
  handleDestinationChange: jest.fn(echoText),
  handleSelectOrigin: jest.fn(echoChoice),
  handleSelectDestination: jest.fn(echoChoice),
};

jest.mock("../../hooks/useAttachmentManager", () => ({
  __esModule: true,
  default: () => mockAttachmentManager,
}));

jest.mock("../../hooks/useAddressAutocomplete", () => ({
  __esModule: true,
  default: () => mockAddressAutocomplete,
}));

jest.mock("../../hooks/useTransportAutocomplete", () => ({
  __esModule: true,
  default: () => mockTransportAutocomplete,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Date de début du voyage : fige la date affichée par le formulaire. */
const TRIP_START = new Date(2026, 2, 12);

const suggestion = (placeId: string, description: string) =>
  ({ placeId, description }) as AddressSuggestion;

const renderForm = (props: Partial<React.ComponentProps<typeof BookingForm>> = {}) => {
  const onClose = jest.fn();
  const onSave = jest.fn();
  render(
    <BookingForm
      visible
      onClose={onClose}
      onSave={onSave}
      tripStartDate={TRIP_START}
      {...props}
    />
  );
  return { onClose, onSave };
};

/** Bascule le formulaire sur un type non transport et vide les erreurs. */
const selectType = (type: "restaurant" | "activity" | "hotel" | "train" | "flight") =>
  fireEvent.press(screen.getByText(`bookings.typeLabels.${type}`));

beforeEach(() => {
  mockAttachmentManager.attachments = [];
  mockAttachmentManager.renamingIndex = null;
  mockAttachmentManager.renameValue = "";
  mockAddressAutocomplete.addressSuggestions = [];
  mockAddressAutocomplete.showAddressSuggestions = false;
  mockTransportAutocomplete.originSuggestions = [];
  mockTransportAutocomplete.showOriginSuggestions = false;
  mockTransportAutocomplete.destinationSuggestions = [];
  mockTransportAutocomplete.showDestinationSuggestions = false;
  i18next.language = "en";
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  // L'animation d'ouverture/fermeture est neutralisée : sa callback de fin est
  // invoquée immédiatement pour rendre la fermeture observable sans minuterie.
  jest.spyOn(Animated, "spring").mockImplementation(
    () =>
      ({
        start: (cb?: (r: { finished: boolean }) => void) => cb?.({ finished: true }),
        stop: jest.fn(),
        reset: jest.fn(),
      }) as never
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Visibilité ───────────────────────────────────────────────────────────────

describe("BookingForm — visibilité", () => {
  it("should render nothing while the form has never been opened", () => {
    // Arrange / Act
    renderForm({ visible: false });

    // Assert
    expect(screen.queryByText("bookings.newBooking")).toBeNull();
  });

  it("should slide the form in when it becomes visible", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.getByText("bookings.scanTicketButton")).toBeTruthy();
    expect(screen.getByText("bookings.statusLabel")).toBeTruthy();
  });

  it("should remove the form from the tree once the closing animation ends", () => {
    // Arrange
    const onClose = jest.fn();
    const onSave = jest.fn();
    const { rerender } = render(
      <BookingForm visible onClose={onClose} onSave={onSave} tripStartDate={TRIP_START} />
    );

    // Act
    rerender(
      <BookingForm
        visible={false}
        onClose={onClose}
        onSave={onSave}
        tripStartDate={TRIP_START}
      />
    );

    // Assert
    expect(screen.queryByText("bookings.newBooking")).toBeNull();
  });

  it("should close the form when the back button is pressed", () => {
    // Arrange
    const { onClose } = renderForm();

    // Act
    fireEvent.press(screen.getByLabelText("common.a11y.back"));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── En-tête et type ──────────────────────────────────────────────────────────

describe("BookingForm — en-tête et type", () => {
  it("should announce a creation and label the button accordingly when no booking is given", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.getAllByText("bookings.newBooking")).toHaveLength(2);
    expect(screen.queryByText("common.save")).toBeNull();
  });

  it("should announce an edition and label the button accordingly when a booking is given", () => {
    // Arrange / Act
    renderForm({ initialBooking: { type: "restaurant", title: "Chez Ana" } });

    // Assert
    expect(screen.getByText("bookings.editBooking")).toBeTruthy();
    expect(screen.getByText("common.save")).toBeTruthy();
  });

  it("should default to a flight and offer the transport fields", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.getByPlaceholderText("bookings.originPlaceholder")).toBeTruthy();
    expect(screen.getByPlaceholderText("bookings.destinationPlaceholder")).toBeTruthy();
    expect(screen.getByText("bookings.direction")).toBeTruthy();
  });

  it("should hide the transport fields once a non-transport type is chosen", () => {
    // Arrange
    renderForm();

    // Act
    selectType("restaurant");

    // Assert
    expect(screen.queryByPlaceholderText("bookings.originPlaceholder")).toBeNull();
    expect(screen.queryByText("bookings.direction")).toBeNull();
  });

  it("should offer the five booking types", () => {
    // Arrange / Act
    renderForm();

    // Assert
    for (const type of ["flight", "train", "hotel", "restaurant", "activity"]) {
      expect(screen.getByText(`bookings.typeLabels.${type}`)).toBeTruthy();
    }
  });
});

// ─── Libellés de date ─────────────────────────────────────────────────────────

describe("BookingForm — libellés de date", () => {
  it("should label the date as a departure for a one-way flight", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.getByText("bookings.departureDate")).toBeTruthy();
    expect(screen.getByText("bookings.departureTime")).toBeTruthy();
  });

  it("should label the date as a departure for a round trip", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.press(screen.getByText("bookings.directionLabels.roundtrip"));

    // Assert
    expect(screen.getByText("bookings.departureDate")).toBeTruthy();
    expect(screen.getByText("bookings.directionLabels.return *")).toBeTruthy();
  });

  it("should label the dates as a stay when the booking is a hotel", () => {
    // Arrange / Act
    renderForm({ initialBooking: { type: "hotel", title: "Hôtel Central" } });

    // Assert
    expect(screen.getByText("bookings.startDate")).toBeTruthy();
    expect(screen.getByText("bookings.endDate *")).toBeTruthy();
    expect(screen.getByText("bookings.time")).toBeTruthy();
  });

  it("should use the plain date label for a restaurant booking", () => {
    // Arrange
    renderForm();

    // Act
    selectType("restaurant");

    // Assert
    expect(screen.getByText("bookings.date")).toBeTruthy();
    expect(screen.getByText("bookings.time")).toBeTruthy();
    expect(screen.queryByText("bookings.endDate *")).toBeNull();
  });

  it("should fall back to noon when no time has been picked yet", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.getByText("12:00")).toBeTruthy();
  });

  it("should show the recorded times when the booking already carries them", () => {
    // Arrange / Act
    renderForm({
      initialBooking: {
        type: "train",
        tripDirection: "roundtrip",
        time: "08:15",
        returnTime: "19:40",
      },
    });

    // Assert
    expect(screen.getByText("08:15")).toBeTruthy();
    expect(screen.getByText("19:40")).toBeTruthy();
    expect(screen.queryByText("12:00")).toBeNull();
  });
});

// ─── Titre ────────────────────────────────────────────────────────────────────

describe("BookingForm — titre", () => {
  it("should show a placeholder instead of an editable title for a flight without route", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.getByText("bookings.flightTitlePlaceholder")).toBeTruthy();
    expect(screen.queryByPlaceholderText("bookings.titlePlaceholder")).toBeNull();
  });

  it("should build the flight title from the chosen route", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.changeText(screen.getByPlaceholderText("bookings.originPlaceholder"), "Paris, France");
    fireEvent.changeText(
      screen.getByPlaceholderText("bookings.destinationPlaceholder"),
      "Lisbonne, Portugal"
    );

    // Assert
    expect(
      screen.getByText(
        "bookings.flightPrefix bookings.directionLabels.outbound: Paris → Lisbonne"
      )
    ).toBeTruthy();
  });

  it("should offer a free-text title for a non-flight booking", () => {
    // Arrange
    renderForm();
    selectType("activity");

    // Act
    fireEvent.changeText(screen.getByPlaceholderText("bookings.titlePlaceholder"), "Musée");

    // Assert
    expect(screen.getByPlaceholderText("bookings.titlePlaceholder")).toHaveProp("value", "Musée");
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe("BookingForm — validation", () => {
  it("should refuse to save a transport booking without origin nor destination", () => {
    // Arrange
    const { onSave, onClose } = renderForm();

    // Act
    fireEvent.press(screen.getAllByText("bookings.newBooking")[1]);

    // Assert
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("bookings.originRequired")).toBeTruthy();
    expect(screen.getByText("bookings.destinationRequired")).toBeTruthy();
    expect(screen.getByText("bookings.titleRequired")).toBeTruthy();
  });

  it("should clear the origin error as soon as the user types again", () => {
    // Arrange
    renderForm();
    fireEvent.press(screen.getAllByText("bookings.newBooking")[1]);
    expect(screen.getByText("bookings.originRequired")).toBeTruthy();

    // Act
    fireEvent.changeText(screen.getByPlaceholderText("bookings.originPlaceholder"), "Paris");

    // Assert
    expect(screen.queryByText("bookings.originRequired")).toBeNull();
  });

  it("should clear the destination error as soon as the user types again", () => {
    // Arrange
    renderForm();
    fireEvent.press(screen.getAllByText("bookings.newBooking")[1]);
    expect(screen.getByText("bookings.destinationRequired")).toBeTruthy();

    // Act
    fireEvent.changeText(
      screen.getByPlaceholderText("bookings.destinationPlaceholder"),
      "Lisbonne"
    );

    // Assert
    expect(screen.queryByText("bookings.destinationRequired")).toBeNull();
  });

  it("should clear the title error as soon as the user types again", () => {
    // Arrange
    renderForm();
    selectType("restaurant");
    fireEvent.press(screen.getAllByText("bookings.newBooking")[1]);
    expect(screen.getByText("bookings.titleRequired")).toBeTruthy();

    // Act
    fireEvent.changeText(screen.getByPlaceholderText("bookings.titlePlaceholder"), "Chez Ana");

    // Assert
    expect(screen.queryByText("bookings.titleRequired")).toBeNull();
  });

  it("should hand the completed booking to the parent and close the form", () => {
    // Arrange
    const { onSave, onClose } = renderForm();
    selectType("restaurant");
    fireEvent.changeText(screen.getByPlaceholderText("bookings.titlePlaceholder"), "Chez Ana");

    // Act
    fireEvent.press(screen.getAllByText("bookings.newBooking")[1]);

    // Assert
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: "restaurant", title: "Chez Ana", status: "pending" })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── Statut et adresse ────────────────────────────────────────────────────────

describe("BookingForm — statut et adresse", () => {
  it("should offer the three booking statuses with pending selected by default", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.getByText("bookings.status.confirmed")).toBeTruthy();
    expect(screen.getByText("bookings.status.pending")).toHaveStyle({ color: "#FF9500" });
    expect(screen.getByText("bookings.status.cancelled")).toBeTruthy();
  });

  it("should move the selection when another status is pressed", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.press(screen.getByText("bookings.status.confirmed"));

    // Assert
    expect(screen.getByText("bookings.status.confirmed")).toHaveStyle({ color: "#6B8C5A" });
  });

  it("should send every address keystroke to the autocomplete service", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.changeText(screen.getByPlaceholderText("bookings.addressPlaceholder"), "12 rue");

    // Assert
    expect(mockAddressAutocomplete.handleAddressChange).toHaveBeenCalledWith(
      "12 rue",
      expect.any(Function)
    );
  });

  it("should hide the address suggestions while the service returned none", () => {
    // Arrange
    mockAddressAutocomplete.showAddressSuggestions = true;
    mockAddressAutocomplete.addressSuggestions = [];

    // Act
    renderForm();

    // Assert
    expect(screen.queryByText("icon:location")).toBeNull();
  });

  it("should list the address suggestions and report the chosen one", () => {
    // Arrange
    const chosen = suggestion("p1", "12 rue de Rivoli, Paris");
    mockAddressAutocomplete.showAddressSuggestions = true;
    mockAddressAutocomplete.addressSuggestions = [chosen];
    renderForm();

    // Act
    fireEvent.press(screen.getByText("12 rue de Rivoli, Paris"));

    // Assert
    expect(mockAddressAutocomplete.handleSelectAddress).toHaveBeenCalledWith(
      chosen,
      expect.any(Function)
    );
  });
});

// ─── Autocomplétion transport ─────────────────────────────────────────────────

describe("BookingForm — autocomplétion transport", () => {
  it("should send every origin keystroke to the autocomplete service", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.changeText(screen.getByPlaceholderText("bookings.originPlaceholder"), "Par");

    // Assert
    expect(mockTransportAutocomplete.handleOriginChange).toHaveBeenCalledWith(
      "Par",
      expect.any(Function),
      "flight"
    );
  });

  it("should send every destination keystroke to the autocomplete service", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.changeText(screen.getByPlaceholderText("bookings.destinationPlaceholder"), "Lis");

    // Assert
    expect(mockTransportAutocomplete.handleDestinationChange).toHaveBeenCalledWith(
      "Lis",
      expect.any(Function),
      "flight"
    );
  });

  it("should offer a plane icon on the flight suggestions", () => {
    // Arrange
    mockTransportAutocomplete.showOriginSuggestions = true;
    mockTransportAutocomplete.originSuggestions = [suggestion("o1", "Paris CDG")];

    // Act
    renderForm();

    // Assert
    expect(screen.getByText("icon:airplane-outline")).toBeTruthy();
  });

  it("should offer a train icon on the train suggestions", () => {
    // Arrange
    mockTransportAutocomplete.showOriginSuggestions = true;
    mockTransportAutocomplete.originSuggestions = [suggestion("o1", "Paris Gare de Lyon")];

    // Act
    renderForm({ initialBooking: { type: "train" } });

    // Assert
    expect(screen.getByText("icon:train-outline")).toBeTruthy();
  });

  it("should report the chosen origin suggestion", () => {
    // Arrange
    const chosen = suggestion("o1", "Paris CDG");
    mockTransportAutocomplete.showOriginSuggestions = true;
    mockTransportAutocomplete.originSuggestions = [chosen];
    renderForm();

    // Act
    fireEvent.press(screen.getByText("Paris CDG"));

    // Assert
    expect(mockTransportAutocomplete.handleSelectOrigin).toHaveBeenCalledWith(
      chosen,
      expect.any(Function)
    );
  });

  it("should report the chosen destination suggestion", () => {
    // Arrange
    const chosen = suggestion("d1", "Lisbonne LIS");
    mockTransportAutocomplete.showDestinationSuggestions = true;
    mockTransportAutocomplete.destinationSuggestions = [chosen];
    renderForm();

    // Act
    fireEvent.press(screen.getByText("Lisbonne LIS"));

    // Assert
    expect(mockTransportAutocomplete.handleSelectDestination).toHaveBeenCalledWith(
      chosen,
      expect.any(Function)
    );
  });

  it("should hide the transport suggestions while the service returned none", () => {
    // Arrange
    mockTransportAutocomplete.showOriginSuggestions = true;
    mockTransportAutocomplete.showDestinationSuggestions = true;

    // Act
    renderForm();

    // Assert
    expect(screen.queryByText("icon:airplane-outline")).toBeNull();
  });
});

// ─── Pièces jointes ───────────────────────────────────────────────────────────

describe("BookingForm — pièces jointes", () => {
  const ATTACHMENT = { uri: "file://tickets/a.pdf", name: "billet.pdf", type: "pdf" as const };

  it("should list the attached files with their name", () => {
    // Arrange
    mockAttachmentManager.attachments = [ATTACHMENT];

    // Act
    renderForm();

    // Assert
    expect(screen.getByText("billet.pdf")).toBeTruthy();
    expect(screen.getByText("icon:document")).toBeTruthy();
  });

  it("should ask the manager to rename the file when the pencil is pressed", () => {
    // Arrange
    mockAttachmentManager.attachments = [ATTACHMENT];
    renderForm();

    // Act
    fireEvent.press(screen.getByText("icon:pencil"));

    // Assert
    expect(mockAttachmentManager.handleOpenRename).toHaveBeenCalledWith(0);
  });

  it("should ask the manager to drop the file when the cross is pressed", () => {
    // Arrange
    mockAttachmentManager.attachments = [ATTACHMENT];
    renderForm();

    // Act
    fireEvent.press(screen.getByText("icon:close-circle"));

    // Assert
    expect(mockAttachmentManager.handleRemoveAttachment).toHaveBeenCalledWith(0);
  });

  it("should offer a picture and a pdf when adding an attachment", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.press(screen.getByText("bookings.addAttachment"));

    // Assert
    expect(Alert.alert).toHaveBeenCalledWith(
      "bookings.attachmentTitle",
      "bookings.chooseFileType",
      expect.arrayContaining([
        expect.objectContaining({ text: "bookings.imageOption" }),
        expect.objectContaining({ text: "bookings.pdfOption" }),
        expect.objectContaining({ text: "common.cancel", style: "cancel" }),
      ])
    );
  });

  it("should delegate to the picture picker when the picture option is chosen", () => {
    // Arrange
    renderForm();
    fireEvent.press(screen.getByText("bookings.addAttachment"));
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];

    // Act
    buttons[0].onPress();

    // Assert
    expect(mockAttachmentManager.handlePickImage).toHaveBeenCalledTimes(1);
  });

  it("should delegate to the document picker when the pdf option is chosen", () => {
    // Arrange
    renderForm();
    fireEvent.press(screen.getByText("bookings.addAttachment"));
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];

    // Act
    buttons[1].onPress();

    // Assert
    expect(mockAttachmentManager.handlePickDocument).toHaveBeenCalledTimes(1);
  });
});

// ─── Renommage d'une pièce jointe ─────────────────────────────────────────────

describe("BookingForm — renommage d'une pièce jointe", () => {
  it("should keep the rename dialog closed while no file is being renamed", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.queryByText("bookings.renameFileTitle")).toBeNull();
  });

  it("should open the rename dialog on the file being renamed", () => {
    // Arrange
    mockAttachmentManager.renamingIndex = 0;

    // Act
    renderForm();

    // Assert
    expect(screen.getByText("bookings.renameFileTitle")).toBeTruthy();
    expect(screen.getByText("bookings.renameFileSubtitle")).toBeTruthy();
  });

  it("should block the confirmation while the new name is blank", () => {
    // Arrange
    mockAttachmentManager.renamingIndex = 0;
    mockAttachmentManager.renameValue = "   ";
    renderForm();

    // Act
    fireEvent.press(screen.getByText("common.confirm"));

    // Assert
    expect(screen.getByText("common.confirm")).toBeDisabled();
    expect(mockAttachmentManager.handleConfirmRename).not.toHaveBeenCalled();
  });

  it("should confirm the new name once it is not blank", () => {
    // Arrange
    mockAttachmentManager.renamingIndex = 0;
    mockAttachmentManager.renameValue = "billet retour";
    renderForm();

    // Act
    fireEvent.press(screen.getByText("common.confirm"));

    // Assert
    expect(mockAttachmentManager.handleConfirmRename).toHaveBeenCalledTimes(1);
  });

  it("should confirm the new name when the keyboard submit key is used", () => {
    // Arrange
    mockAttachmentManager.renamingIndex = 0;
    mockAttachmentManager.renameValue = "billet retour";
    renderForm();

    // Act
    fireEvent(screen.getByPlaceholderText("bookings.renamePlaceholder"), "submitEditing");

    // Assert
    expect(mockAttachmentManager.handleConfirmRename).toHaveBeenCalledTimes(1);
  });

  it("should report every keystroke of the new name", () => {
    // Arrange
    mockAttachmentManager.renamingIndex = 0;
    renderForm();

    // Act
    fireEvent.changeText(screen.getByPlaceholderText("bookings.renamePlaceholder"), "billet");

    // Assert
    expect(mockAttachmentManager.setRenameValue).toHaveBeenCalledWith("billet");
  });

  it("should abandon the renaming when the cancel button is pressed", () => {
    // Arrange
    mockAttachmentManager.renamingIndex = 0;
    renderForm();

    // Act
    fireEvent.press(screen.getByText("common.cancel"));

    // Assert
    expect(mockAttachmentManager.setRenamingIndex).toHaveBeenCalledWith(null);
  });
});

// ─── Scanner ──────────────────────────────────────────────────────────────────

describe("BookingForm — scanner de billet", () => {
  it("should keep the scanner closed until it is asked for", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.queryByText("scanner-ouvert")).toBeNull();
  });

  it("should open the scanner when the scan button is pressed", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.press(screen.getByText("bookings.scanTicketButton"));

    // Assert
    expect(screen.getByText("scanner-ouvert")).toBeTruthy();
  });
});

// ─── Sélecteurs iOS ───────────────────────────────────────────────────────────

describe("BookingForm — sélecteurs iOS", () => {
  it("should keep every picker closed until a date field is pressed", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.queryByTestId("date-time-picker")).toBeNull();
  });

  it("should open the departure date picker for a transport booking", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.press(screen.getByText("bookings.departureDate"));

    // Assert
    expect(screen.getAllByText("bookings.departureDate")).toHaveLength(2);
    expect(screen.getByTestId("date-time-picker")).toHaveProp("mode", "date");
  });

  it("should title the date picker as a stay start for a hotel booking", () => {
    // Arrange
    renderForm({ initialBooking: { type: "hotel", title: "Hôtel Central" } });

    // Act
    fireEvent.press(screen.getByText("bookings.startDate"));

    // Assert
    expect(screen.getAllByText("bookings.startDate")).toHaveLength(2);
  });

  it("should title the date picker plainly for a restaurant booking", () => {
    // Arrange
    renderForm();
    selectType("restaurant");

    // Act
    fireEvent.press(screen.getByText("bookings.date"));

    // Assert
    expect(screen.getAllByText("bookings.date")).toHaveLength(2);
  });

  it("should open the departure time picker for a transport booking", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.press(screen.getByText("bookings.departureTime"));

    // Assert
    expect(screen.getAllByText("bookings.departureTime")).toHaveLength(2);
    expect(screen.getByTestId("date-time-picker")).toHaveProp("mode", "time");
  });

  it("should open the plain time picker for a non-transport booking", () => {
    // Arrange
    renderForm();
    selectType("activity");

    // Act
    fireEvent.press(screen.getByText("bookings.time"));

    // Assert
    expect(screen.getAllByText("bookings.time")).toHaveLength(2);
  });

  it("should open the stay end picker for a hotel booking", () => {
    // Arrange
    renderForm({ initialBooking: { type: "hotel", title: "Hôtel Central" } });

    // Act
    fireEvent.press(screen.getByText("bookings.endDate *"));

    // Assert
    expect(screen.getByText("bookings.endDate")).toBeTruthy();
  });

  it("should open the return date and time pickers for a round trip", () => {
    // Arrange
    renderForm({ initialBooking: { type: "flight", tripDirection: "roundtrip" } });

    // Act
    fireEvent.press(screen.getByText("bookings.directionLabels.return *"));

    // Assert — le titre de la modale reprend le libellé du retour
    expect(screen.getAllByText("bookings.directionLabels.return")).toHaveLength(2);
  });

  it("should open the return time picker for a round trip", () => {
    // Arrange
    renderForm({ initialBooking: { type: "flight", tripDirection: "roundtrip" } });

    // Act
    fireEvent.press(screen.getByText("bookings.time"));

    // Assert
    expect(screen.getByText("bookings.returnTime")).toBeTruthy();
  });

  it("should hand the English locale to the picker when the app runs in English", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.press(screen.getByText("bookings.departureDate"));

    // Assert
    expect(screen.getByTestId("date-time-picker")).toHaveProp("locale", "en_US");
  });

  it("should hand the French locale to the picker when the app runs in French", () => {
    // Arrange
    i18next.language = "fr";
    renderForm();

    // Act
    fireEvent.press(screen.getByText("bookings.departureDate"));

    // Assert
    expect(screen.getByTestId("date-time-picker")).toHaveProp("locale", "fr_FR");
  });

  it("should close the date picker when its cancel button is pressed", () => {
    // Arrange
    renderForm();
    fireEvent.press(screen.getByText("bookings.departureDate"));

    // Act
    fireEvent.press(screen.getByText("common.cancel"));

    // Assert
    expect(screen.queryByTestId("date-time-picker")).toBeNull();
  });

  it("should record the date chosen in the picker", () => {
    // Arrange
    renderForm();
    fireEvent.press(screen.getByText("bookings.departureDate"));

    // Act
    fireEvent(screen.getByTestId("date-time-picker"), "change", { type: "set" }, new Date(2026, 5, 1));

    // Assert
    expect(screen.getByText("Jun 1, 2026")).toBeTruthy();
  });

  it("should record the time chosen in the picker", () => {
    // Arrange
    renderForm();
    fireEvent.press(screen.getByText("bookings.departureTime"));

    // Act
    fireEvent(screen.getByTestId("date-time-picker"), "change", { type: "set" }, new Date(2026, 5, 1, 7, 5));

    // Assert
    expect(screen.getByText("07:05")).toBeTruthy();
  });

  it("should close the time picker when its cancel button is pressed", () => {
    // Arrange
    renderForm();
    fireEvent.press(screen.getByText("bookings.departureTime"));

    // Act
    fireEvent.press(screen.getByText("common.cancel"));

    // Assert
    expect(screen.queryByTestId("date-time-picker")).toBeNull();
  });

  it("should record the stay end date chosen in the picker", () => {
    // Arrange
    renderForm({ initialBooking: { type: "hotel", title: "Hôtel Central" } });
    fireEvent.press(screen.getByText("bookings.endDate *"));

    // Act
    fireEvent(
      screen.getByTestId("date-time-picker"),
      "change",
      { type: "set" },
      new Date(2026, 5, 1)
    );

    // Assert
    expect(screen.getByText("Jun 1, 2026")).toBeTruthy();
  });

  it("should close the stay end picker when its cancel button is pressed", () => {
    // Arrange
    renderForm({ initialBooking: { type: "hotel", title: "Hôtel Central" } });
    fireEvent.press(screen.getByText("bookings.endDate *"));

    // Act
    fireEvent.press(screen.getByText("common.cancel"));

    // Assert
    expect(screen.queryByTestId("date-time-picker")).toBeNull();
  });

  it("should close the return time picker when its cancel button is pressed", () => {
    // Arrange
    renderForm({ initialBooking: { type: "flight", tripDirection: "roundtrip" } });
    fireEvent.press(screen.getByText("bookings.time"));

    // Act
    fireEvent.press(screen.getByText("common.cancel"));

    // Assert
    expect(screen.queryByTestId("date-time-picker")).toBeNull();
  });
});

// ─── Sélecteurs Android ───────────────────────────────────────────────────────

describe("BookingForm — sélecteurs Android", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    Platform.OS = "android";
  });

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it("should render no modal picker on Android", () => {
    // Arrange / Act
    renderForm();

    // Assert
    expect(screen.queryByTestId("date-time-picker")).toBeNull();
    expect(screen.queryByText("common.confirm")).toBeNull();
  });

  it("should show the inline date picker when the date field is pressed", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.press(screen.getByText("bookings.departureDate"));

    // Assert
    expect(screen.getByTestId("date-time-picker")).toHaveProp("display", "default");
    expect(screen.getByTestId("date-time-picker")).toHaveProp("mode", "date");
  });

  it("should show the inline time picker when the time field is pressed", () => {
    // Arrange
    renderForm();

    // Act
    fireEvent.press(screen.getByText("bookings.departureTime"));

    // Assert
    expect(screen.getByTestId("date-time-picker")).toHaveProp("mode", "time");
  });

  it("should show the inline end date picker for a hotel booking", () => {
    // Arrange
    renderForm({ initialBooking: { type: "hotel", title: "Hôtel Central" } });

    // Act
    fireEvent.press(screen.getByText("bookings.endDate *"));

    // Assert
    expect(screen.getByTestId("date-time-picker")).toHaveProp("mode", "date");
  });

  it("should show the inline return time picker for a round trip", () => {
    // Arrange
    renderForm({ initialBooking: { type: "flight", tripDirection: "roundtrip" } });

    // Act
    fireEvent.press(screen.getByText("bookings.time"));

    // Assert
    expect(screen.getByTestId("date-time-picker")).toHaveProp("mode", "time");
  });

  it("should record the date chosen in the inline picker", () => {
    // Arrange
    renderForm();
    fireEvent.press(screen.getByText("bookings.departureDate"));

    // Act
    fireEvent(
      screen.getByTestId("date-time-picker"),
      "change",
      { type: "set" },
      new Date(2026, 5, 1)
    );

    // Assert — le sélecteur natif se referme de lui-même sur Android
    expect(screen.getByText("Jun 1, 2026")).toBeTruthy();
    expect(screen.queryByTestId("date-time-picker")).toBeNull();
  });

  it("should record the stay end date chosen in the inline picker", () => {
    // Arrange
    renderForm({ initialBooking: { type: "hotel", title: "Hôtel Central" } });
    fireEvent.press(screen.getByText("bookings.endDate *"));

    // Act
    fireEvent(
      screen.getByTestId("date-time-picker"),
      "change",
      { type: "set" },
      new Date(2026, 5, 1)
    );

    // Assert
    expect(screen.getByText("Jun 1, 2026")).toBeTruthy();
    expect(screen.queryByTestId("date-time-picker")).toBeNull();
  });
});

// ─── Type transport et scanner ────────────────────────────────────────────────

describe("BookingForm — reprise d'un billet scanné", () => {
  it("should switch to a train booking when the train pill is pressed", () => {
    // Arrange
    renderForm();

    // Act
    selectType("train");

    // Assert — le titre redevient libre dès que le type n'est plus un vol
    expect(screen.getByPlaceholderText("bookings.titlePlaceholder")).toBeTruthy();
    expect(screen.getByText("bookings.direction")).toBeTruthy();
  });

  it("should close the scanner when it asks to be closed", () => {
    // Arrange
    renderForm();
    fireEvent.press(screen.getByText("bookings.scanTicketButton"));

    // Act
    fireEvent.press(screen.getByText("scanner-ouvert"));

    // Assert
    expect(screen.queryByText("scanner-ouvert")).toBeNull();
  });

  it("should flag a stay whose scanned end date precedes its start date", () => {
    // Arrange
    renderForm({ initialBooking: { type: "hotel", title: "Hôtel Central" } });
    fireEvent.press(screen.getByText("bookings.scanTicketButton"));

    // Act — le scan renseigne les dates sans les valider
    fireEvent(screen.getByText("scanner-ouvert"), "fill", {
      date: new Date(2026, 3, 10),
      endDate: new Date(2026, 3, 1),
    });
    fireEvent.press(screen.getByText("scanner-ouvert"));
    fireEvent.press(screen.getByText("common.save"));

    // Assert
    expect(screen.getByText("bookings.endDateBeforeStart")).toBeTruthy();
    expect(screen.getByText("Apr 1, 2026")).toBeTruthy();
  });

  it("should flag a round trip whose scanned return precedes its departure", () => {
    // Arrange
    renderForm({
      initialBooking: {
        type: "flight",
        tripDirection: "roundtrip",
        title: "Vol Paris → Lisbonne",
        origin: "Paris",
        destination: "Lisbonne",
      },
    });
    fireEvent.press(screen.getByText("bookings.scanTicketButton"));

    // Act
    fireEvent(screen.getByText("scanner-ouvert"), "fill", {
      date: new Date(2026, 3, 10),
      endDate: new Date(2026, 3, 1),
    });
    fireEvent.press(screen.getByText("scanner-ouvert"));
    fireEvent.press(screen.getByText("common.save"));

    // Assert
    expect(screen.getByText("bookings.endDateBeforeStart")).toBeTruthy();
  });
});
