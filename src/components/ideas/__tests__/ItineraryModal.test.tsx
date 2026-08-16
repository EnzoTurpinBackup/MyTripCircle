import "../../__tests__/support/nativeMocks";

import React from "react";
import { ActivityIndicator, Animated, Modal, Platform, TouchableOpacity } from "react-native";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import ItineraryModal from "../ItineraryModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// `utils/i18n` initialise i18next et le client API au chargement : seule la
// mise en forme des dates est utilisée par la modale.
jest.mock("../../../utils/i18n", () => ({
  formatDate: (date: Date) => `date(${date.toISOString().slice(0, 10)})`,
}));

// Le sélecteur de date natif est remplacé par un bouton pilotable, afin de
// déclencher `onChange` sans dépendre du module natif.
jest.mock("@react-native-community/datetimepicker", () => {
  const { Text, TouchableOpacity } = require("react-native");
  return {
    __esModule: true,
    default: ({ onChange, value }: { onChange: Function; value: Date }) => (
      <>
        <TouchableOpacity
          testID="date-picker"
          onPress={() => onChange({ type: "set" }, new Date("2026-07-04T00:00:00Z"))}
        >
          <Text>{`picker:${value.toISOString().slice(0, 10)}`}</Text>
        </TouchableOpacity>
        {/* Rejet du sélecteur natif : `onChange` est appelé sans date. */}
        <TouchableOpacity
          testID="date-picker-dismiss"
          onPress={() => onChange({ type: "dismissed" }, undefined)}
        />
      </>
    ),
  };
});

const START_DATE = new Date("2026-06-01T00:00:00Z");

const ITINERARY = {
  city: "Kyoto",
  days: [
    {
      day: 1,
      title: "Arrivée",
      morning: { activity: "Balade à Gion", tip: "Aller tôt" },
      afternoon: { activity: "Temple Kiyomizu-dera" },
      evening: { activity: "Dîner à Pontocho" },
    },
    {
      day: 2,
      title: "Bambouseraie",
      morning: { activity: "Arashiyama" },
      afternoon: null,
      evening: null,
    },
  ],
};

type ModalProps = React.ComponentProps<typeof ItineraryModal>;

const baseProps = (): ModalProps => ({
  visible: true,
  onClose: jest.fn(),
  cityInput: "",
  onCityChange: jest.fn(),
  daysInput: "2",
  onDaysChange: jest.fn(),
  loading: false,
  itinerary: null,
  showCreateStep: false,
  onShowCreateStep: jest.fn(),
  onBackFromCreate: jest.fn(),
  startDate: START_DATE,
  onStartDateChange: jest.fn(),
  showDatePicker: false,
  onToggleDatePicker: jest.fn(),
  creating: false,
  onGenerate: jest.fn(),
  onCreateTrip: jest.fn(),
  onNewSearch: jest.fn(),
});

const renderModal = (overrides: Partial<ModalProps> = {}) => {
  const props: ModalProps = { ...baseProps(), ...overrides };
  render(<ItineraryModal {...props} />);
  return { props };
};

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/** L'arrière-plan du sélecteur iOS n'a pas de testID : on le reconnaît à son voile. */
const pickerOverlay = () =>
  screen
    .UNSAFE_getAllByType(TouchableOpacity)
    .find(
      (node) => flatten(node.props.style).backgroundColor === "rgba(0,0,0,0.45)",
    )!;

const withPlatform = (os: "ios" | "android", run: () => void) => {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
  try {
    run();
  } finally {
    Object.defineProperty(Platform, "OS", { value: original, configurable: true });
  }
};

describe("ItineraryModal", () => {
  let parallelSpy: jest.SpyInstance;

  beforeEach(() => {
    // L'ouverture de la feuille est animée : on neutralise la composition pour
    // que le montage soit synchrone et sans timer résiduel.
    parallelSpy = jest
      .spyOn(Animated, "parallel")
      .mockReturnValue({ start: jest.fn() } as unknown as Animated.CompositeAnimation);
  });

  afterEach(() => {
    parallelSpy.mockRestore();
  });

  describe("shell", () => {
    it("should render the modal heading when visible", () => {
      renderModal();

      expect(screen.getByText("ideas.itinerary.title")).toBeTruthy();
      expect(screen.getByText("ideas.itinerary.subtitle")).toBeTruthy();
    });

    it("should render nothing when not visible", () => {
      renderModal({ visible: false });

      expect(screen.queryByText("ideas.itinerary.title")).toBeNull();
    });

    it("should run the opening animation when it becomes visible", () => {
      renderModal();

      expect(parallelSpy).toHaveBeenCalledTimes(1);
    });

    it("should not run the opening animation while it stays hidden", () => {
      renderModal({ visible: false });

      expect(parallelSpy).not.toHaveBeenCalled();
    });

    it("should close when the header close button is pressed", () => {
      const { props } = renderModal();

      fireEvent.press(screen.UNSAFE_getByProps({ name: "close" }));

      expect(props.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("search form", () => {
    it("should show the search form while no itinerary has been generated", () => {
      renderModal();

      expect(screen.getByPlaceholderText("ideas.itinerary.cityPlaceholder")).toBeTruthy();
      expect(screen.getByPlaceholderText("ideas.itinerary.daysPlaceholder")).toBeTruthy();
    });

    it("should report city edits to the caller", () => {
      const { props } = renderModal();

      fireEvent.changeText(
        screen.getByPlaceholderText("ideas.itinerary.cityPlaceholder"),
        "Kyoto",
      );

      expect(props.onCityChange).toHaveBeenCalledWith("Kyoto");
    });

    it("should report day count edits to the caller", () => {
      const { props } = renderModal();

      fireEvent.changeText(
        screen.getByPlaceholderText("ideas.itinerary.daysPlaceholder"),
        "4",
      );

      expect(props.onDaysChange).toHaveBeenCalledWith("4");
    });

    it("should generate the itinerary when a city has been typed", () => {
      const { props } = renderModal({ cityInput: "Kyoto" });

      fireEvent.press(screen.getByText("ideas.itinerary.generate"));

      expect(props.onGenerate).toHaveBeenCalledTimes(1);
    });

    it("should not generate the itinerary while the city is blank", () => {
      const { props } = renderModal({ cityInput: "   " });

      fireEvent.press(screen.getByText("ideas.itinerary.generate"));

      expect(props.onGenerate).not.toHaveBeenCalled();
    });

    it("should replace the generate label with a spinner while loading", () => {
      renderModal({ cityInput: "Kyoto", loading: true });

      expect(screen.queryByText("ideas.itinerary.generate")).toBeNull();
      expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });
  });

  describe("itinerary preview", () => {
    const previewProps = { itinerary: ITINERARY, showCreateStep: false };

    it("should show the destination city", () => {
      renderModal(previewProps);

      expect(screen.getByText("📍 Kyoto")).toBeTruthy();
    });

    it("should hide the search form once an itinerary exists", () => {
      renderModal(previewProps);

      expect(screen.queryByPlaceholderText("ideas.itinerary.cityPlaceholder")).toBeNull();
    });

    it("should render one card per itinerary day", () => {
      renderModal(previewProps);

      expect(screen.getByText("ideas.itinerary.day 1 — Arrivée")).toBeTruthy();
      expect(screen.getByText("ideas.itinerary.day 2 — Bambouseraie")).toBeTruthy();
    });

    it("should render each filled time slot of a day", () => {
      renderModal(previewProps);

      expect(screen.getByText("Balade à Gion")).toBeTruthy();
      expect(screen.getByText("Temple Kiyomizu-dera")).toBeTruthy();
      expect(screen.getByText("Dîner à Pontocho")).toBeTruthy();
    });

    it("should skip the empty time slots of a day", () => {
      renderModal(previewProps);

      expect(screen.getAllByText("ideas.itinerary.morning")).toHaveLength(2);
      expect(screen.getAllByText("ideas.itinerary.afternoon")).toHaveLength(1);
    });

    it("should render the tip of a slot when there is one", () => {
      renderModal(previewProps);

      expect(screen.getByText("💡 Aller tôt")).toBeTruthy();
    });

    it("should omit the tip line when the slot has none", () => {
      renderModal(previewProps);

      expect(screen.queryByText("💡 Arashiyama")).toBeNull();
    });

    it("should decrement the day count through the stepper", () => {
      const { props } = renderModal({ ...previewProps, daysInput: "3" });

      fireEvent.press(screen.UNSAFE_getByProps({ name: "remove" }));

      expect(props.onDaysChange).toHaveBeenCalledWith("2");
    });

    it("should not let the day count fall below one", () => {
      const { props } = renderModal({ ...previewProps, daysInput: "1" });

      fireEvent.press(screen.UNSAFE_getByProps({ name: "remove" }));

      expect(props.onDaysChange).toHaveBeenCalledWith("1");
    });

    it("should increment the day count through the stepper", () => {
      const { props } = renderModal({ ...previewProps, daysInput: "3" });

      fireEvent.press(screen.UNSAFE_getByProps({ name: "add" }));

      expect(props.onDaysChange).toHaveBeenCalledWith("4");
    });

    it("should cap the day count at thirty", () => {
      const { props } = renderModal({ ...previewProps, daysInput: "30" });

      fireEvent.press(screen.UNSAFE_getByProps({ name: "add" }));

      expect(props.onDaysChange).toHaveBeenCalledWith("30");
    });

    it("should hide the regenerate button while the day count matches the itinerary", () => {
      renderModal({ ...previewProps, daysInput: "2" });

      expect(screen.queryByText("ideas.itinerary.regenerate")).toBeNull();
    });

    it("should offer to regenerate once the day count no longer matches", () => {
      renderModal({ ...previewProps, daysInput: "3" });

      expect(screen.getByText("ideas.itinerary.regenerate")).toBeTruthy();
    });

    it("should regenerate the itinerary when the button is pressed", () => {
      const { props } = renderModal({ ...previewProps, daysInput: "3" });

      fireEvent.press(screen.getByText("ideas.itinerary.regenerate"));

      expect(props.onGenerate).toHaveBeenCalledTimes(1);
    });

    it("should replace the regenerate label with a spinner while loading", () => {
      renderModal({ ...previewProps, daysInput: "3", loading: true });

      expect(screen.queryByText("ideas.itinerary.regenerate")).toBeNull();
      expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it("should move to the create step when the create button is pressed", () => {
      const { props } = renderModal(previewProps);

      fireEvent.press(screen.getByText("ideas.itinerary.createTrip"));

      expect(props.onDaysChange).toHaveBeenCalledWith("2");
      expect(props.onShowCreateStep).toHaveBeenCalledTimes(1);
    });

    it("should start a new search when the new search button is pressed", () => {
      const { props } = renderModal(previewProps);

      fireEvent.press(screen.getByText("ideas.itinerary.newSearch"));

      expect(props.onNewSearch).toHaveBeenCalledTimes(1);
    });

    it("should render no day card when the itinerary has no days", () => {
      renderModal({ itinerary: { city: "Kyoto" }, showCreateStep: false });

      expect(screen.getByText("📍 Kyoto")).toBeTruthy();
      expect(screen.queryByText("ideas.itinerary.day 1 — Arrivée")).toBeNull();
    });
  });

  describe("create trip step", () => {
    const createProps = { itinerary: ITINERARY, showCreateStep: true };

    it("should summarise the destination and the number of days", () => {
      renderModal(createProps);

      expect(screen.getByText("📍 Kyoto")).toBeTruthy();
      expect(screen.getByText("2 ideas.addModal.days")).toBeTruthy();
    });

    it("should derive the end date from the start date and the day count", () => {
      renderModal(createProps);

      // 2 jours à partir du 1er juin → arrivée le 2 juin
      expect(screen.getByText("date(2026-06-02)")).toBeTruthy();
    });

    it("should go back to the preview when the back button is pressed", () => {
      const { props } = renderModal(createProps);

      fireEvent.press(screen.getByText("ideas.itinerary.back"));

      expect(props.onBackFromCreate).toHaveBeenCalledTimes(1);
    });

    it("should open the date picker when the date field is pressed", () => {
      const { props } = renderModal(createProps);

      // La date apparaît aussi dans la carte récapitulative, non cliquable :
      // on vise le champ, seul porteur de l'icône calendrier.
      fireEvent.press(screen.UNSAFE_getByProps({ name: "calendar-outline" }));

      expect(props.onToggleDatePicker).toHaveBeenCalledWith(true);
    });

    it("should create the trip when the create button is pressed", () => {
      const { props } = renderModal(createProps);

      fireEvent.press(screen.getByText("ideas.itinerary.createTrip"));

      expect(props.onCreateTrip).toHaveBeenCalledTimes(1);
    });

    it("should replace the create label with a spinner while creating", () => {
      renderModal({ ...createProps, creating: true });

      expect(screen.queryByText("ideas.itinerary.createTrip")).toBeNull();
      expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });
  });

  describe("date picker on Android", () => {
    it("should not render the native picker while it is closed", () => {
      withPlatform("android", () => {
        renderModal({ itinerary: ITINERARY, showCreateStep: true });

        expect(screen.queryByTestId("date-picker")).toBeNull();
      });
    });

    it("should render the inline native picker when it is open", () => {
      withPlatform("android", () => {
        renderModal({
          itinerary: ITINERARY,
          showCreateStep: true,
          showDatePicker: true,
        });

        expect(screen.getByTestId("date-picker")).toBeTruthy();
      });
    });

    it("should close the picker and report the chosen date", () => {
      withPlatform("android", () => {
        const { props } = renderModal({
          itinerary: ITINERARY,
          showCreateStep: true,
          showDatePicker: true,
        });

        fireEvent.press(screen.getByTestId("date-picker"));

        expect(props.onToggleDatePicker).toHaveBeenCalledWith(false);
        expect(props.onStartDateChange).toHaveBeenCalledWith(
          new Date("2026-07-04T00:00:00Z"),
        );
      });
    });

    it("should only close the picker when it is dismissed without a date", () => {
      withPlatform("android", () => {
        const { props } = renderModal({
          itinerary: ITINERARY,
          showCreateStep: true,
          showDatePicker: true,
        });

        fireEvent.press(screen.getByTestId("date-picker-dismiss"));

        expect(props.onToggleDatePicker).toHaveBeenCalledWith(false);
        expect(props.onStartDateChange).not.toHaveBeenCalled();
      });
    });
  });

  describe("date picker on iOS", () => {
    const iosProps = {
      itinerary: ITINERARY,
      showCreateStep: true,
      showDatePicker: true,
    };

    it("should render the picker sheet with cancel and confirm actions", () => {
      withPlatform("ios", () => {
        renderModal(iosProps);

        expect(screen.getByText("common.cancel")).toBeTruthy();
        expect(screen.getByText("common.confirm")).toBeTruthy();
      });
    });

    it("should dismiss the sheet without changing the date when cancelled", () => {
      withPlatform("ios", () => {
        const { props } = renderModal(iosProps);

        fireEvent.press(screen.getByText("common.cancel"));

        expect(props.onToggleDatePicker).toHaveBeenCalledWith(false);
        expect(props.onStartDateChange).not.toHaveBeenCalled();
      });
    });

    it("should report the picked date and dismiss the sheet when confirmed", () => {
      withPlatform("ios", () => {
        const { props } = renderModal(iosProps);

        fireEvent.press(screen.getByTestId("date-picker"));
        fireEvent.press(screen.getByText("common.confirm"));

        expect(props.onStartDateChange).toHaveBeenCalledWith(
          new Date("2026-07-04T00:00:00Z"),
        );
        expect(props.onToggleDatePicker).toHaveBeenCalledWith(false);
      });
    });

    it("should dismiss the sheet when the surrounding overlay is tapped", () => {
      withPlatform("ios", () => {
        const { props } = renderModal(iosProps);

        fireEvent.press(pickerOverlay());

        expect(props.onToggleDatePicker).toHaveBeenCalledWith(false);
        expect(props.onStartDateChange).not.toHaveBeenCalled();
      });
    });

    it("should dismiss the sheet on a hardware back request", () => {
      withPlatform("ios", () => {
        const { props } = renderModal(iosProps);

        // La modale interne du sélecteur est la seconde du rendu.
        const pickerModal = screen.UNSAFE_getAllByType(Modal)[1];
        act(() => pickerModal.props.onRequestClose());

        expect(props.onToggleDatePicker).toHaveBeenCalledWith(false);
      });
    });

    it("should keep the pending date when the spinner is dismissed without a value", () => {
      withPlatform("ios", () => {
        const { props } = renderModal(iosProps);

        fireEvent.press(screen.getByTestId("date-picker"));
        fireEvent.press(screen.getByTestId("date-picker-dismiss"));
        fireEvent.press(screen.getByText("common.confirm"));

        expect(props.onStartDateChange).toHaveBeenCalledWith(
          new Date("2026-07-04T00:00:00Z"),
        );
      });
    });

    it("should confirm the untouched start date when no new date was picked", () => {
      withPlatform("ios", () => {
        const { props } = renderModal(iosProps);

        fireEvent.press(screen.getByText("common.confirm"));

        expect(props.onStartDateChange).toHaveBeenCalledWith(START_DATE);
      });
    });
  });
});
