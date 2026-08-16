import { renderHook, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { useBookingForm, isTransport, needsEndDate } from '../useBookingForm';
import type { Booking } from '../../types';
import type { AddressSuggestion } from '../../services/PlacesService';

const mockAttachmentManager = {
  attachments: [] as Array<{ uri: string; name: string; type: 'image' | 'pdf' }>,
  setAttachments: jest.fn(),
  renamingIndex: null,
  setRenamingIndex: jest.fn(),
  renameValue: '',
  setRenameValue: jest.fn(),
  handlePickImage: jest.fn(),
  handlePickDocument: jest.fn(),
  handleOpenRename: jest.fn(),
  handleConfirmRename: jest.fn(),
  handleRemoveAttachment: jest.fn(),
};

const mockAddressAutocomplete = {
  addressSuggestions: [] as AddressSuggestion[],
  showAddressSuggestions: false,
  handleAddressChange: jest.fn(),
  handleSelectAddress: jest.fn(),
};

const mockTransportAutocomplete = {
  originSuggestions: [] as AddressSuggestion[],
  showOriginSuggestions: false,
  destinationSuggestions: [] as AddressSuggestion[],
  showDestinationSuggestions: false,
  handleOriginChange: jest.fn(),
  handleDestinationChange: jest.fn(),
  handleSelectOrigin: jest.fn(),
  handleSelectDestination: jest.fn(),
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../useAttachmentManager', () => ({
  __esModule: true,
  default: () => mockAttachmentManager,
}));

jest.mock('../useAddressAutocomplete', () => ({
  __esModule: true,
  default: () => mockAddressAutocomplete,
}));

jest.mock('../useTransportAutocomplete', () => ({
  __esModule: true,
  default: () => mockTransportAutocomplete,
}));

const NOW = new Date('2025-05-01T09:00:00.000Z');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TRIP_START = new Date('2025-06-01T00:00:00.000Z');

type Props = Parameters<typeof useBookingForm>[0];

const onSave = jest.fn();
const onClose = jest.fn();

const setup = (props: Partial<Props> = {}) =>
  renderHook((p: Props) => useBookingForm(p), {
    initialProps: { visible: true, onSave, onClose, ...props } as Props,
  });

const makeSuggestion = (description: string): AddressSuggestion =>
  ({ description, placeId: 'place1' }) as AddressSuggestion;

describe('useBookingForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockAttachmentManager.attachments = [];
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('isTransport', () => {
    it('should recognize a flight as a transport', () => {
      expect(isTransport('flight')).toBe(true);
    });

    it('should recognize a train as a transport', () => {
      expect(isTransport('train')).toBe(true);
    });

    it('should not recognize a hotel as a transport', () => {
      expect(isTransport('hotel')).toBe(false);
    });
  });

  describe('needsEndDate', () => {
    it('should require an end date for a hotel', () => {
      expect(needsEndDate('hotel')).toBe(true);
    });

    it('should require an end date for a round trip transport', () => {
      expect(needsEndDate('flight', 'roundtrip')).toBe(true);
    });

    it('should not require an end date for a one way transport', () => {
      expect(needsEndDate('flight', 'outbound')).toBe(false);
    });

    it('should not require an end date for an activity', () => {
      expect(needsEndDate('activity')).toBe(false);
    });
  });

  describe('initial form data', () => {
    it('should start an empty outbound flight on the current day', () => {
      const { result } = setup();

      expect(result.current.formData).toEqual({
        type: 'flight',
        tripDirection: 'outbound',
        title: '',
        description: '',
        date: NOW,
        endDate: new Date(NOW.getTime() + ONE_DAY_MS),
        time: '',
        address: '',
        confirmationNumber: '',
        returnTime: '',
        origin: '',
        destination: '',
        status: 'pending',
      });
      expect(result.current.fieldErrors).toEqual({});
    });

    it('should start on the trip start date when the trip is known', () => {
      const { result } = setup({ tripStartDate: TRIP_START });

      expect(result.current.formData.date).toEqual(TRIP_START);
    });

    it('should fall back to the current day when the trip start date is invalid', () => {
      const { result } = setup({ tripStartDate: new Date('pas-une-date') });

      expect(result.current.formData.date).toEqual(NOW);
    });

    it('should prefill the form from the edited booking', () => {
      const { result } = setup({
        initialBooking: {
          type: 'hotel',
          title: 'Hôtel Central',
          description: 'Vue mer',
          date: new Date('2025-07-01T00:00:00.000Z'),
          endDate: new Date('2025-07-05T00:00:00.000Z'),
          time: '14:00',
          address: '1 via Roma',
          confirmationNumber: 'ABC123',
          returnTime: '10:00',
          origin: 'Paris',
          destination: 'Rome',
          status: 'confirmed',
        } as Partial<Booking>,
      });

      expect(result.current.formData).toEqual({
        type: 'hotel',
        tripDirection: undefined,
        title: 'Hôtel Central',
        description: 'Vue mer',
        date: new Date('2025-07-01T00:00:00.000Z'),
        endDate: new Date('2025-07-05T00:00:00.000Z'),
        time: '14:00',
        address: '1 via Roma',
        confirmationNumber: 'ABC123',
        returnTime: '10:00',
        origin: 'Paris',
        destination: 'Rome',
        status: 'confirmed',
      });
    });

    it('should parse the dates of the edited booking given as strings', () => {
      const { result } = setup({
        initialBooking: {
          date: '2025-07-01T00:00:00.000Z',
          endDate: '2025-07-05T00:00:00.000Z',
        } as unknown as Partial<Booking>,
      });

      expect(result.current.formData.date).toEqual(new Date('2025-07-01T00:00:00.000Z'));
      expect(result.current.formData.endDate).toEqual(new Date('2025-07-05T00:00:00.000Z'));
    });

    it('should fall back to the trip start date when the booking date is unreadable', () => {
      const { result } = setup({
        tripStartDate: TRIP_START,
        initialBooking: { date: 'pas-une-date' } as unknown as Partial<Booking>,
      });

      expect(result.current.formData.date).toEqual(TRIP_START);
    });

    it('should default the end date to the day after the start date', () => {
      const { result } = setup({
        initialBooking: {
          type: 'hotel',
          date: new Date('2025-07-01T00:00:00.000Z'),
          endDate: 'pas-une-date',
        } as unknown as Partial<Booking>,
      });

      expect(result.current.formData.endDate).toEqual(
        new Date(new Date('2025-07-01T00:00:00.000Z').getTime() + ONE_DAY_MS)
      );
    });

    it('should keep the direction of the edited transport booking', () => {
      const { result } = setup({
        initialBooking: { type: 'train', tripDirection: 'roundtrip' } as Partial<Booking>,
      });

      expect(result.current.formData.tripDirection).toBe('roundtrip');
    });
  });

  describe('reset on reopening', () => {
    it('should not rebuild the form while the modal stays hidden', () => {
      const { result, rerender } = setup({ visible: false });
      act(() => result.current.handleInputChange('title', 'Brouillon'));

      rerender({ visible: false, onSave, onClose } as Props);

      expect(result.current.formData.title).toBe('Brouillon');
      expect(mockAttachmentManager.setAttachments).not.toHaveBeenCalled();
    });

    it('should rebuild the form when the modal is reopened', () => {
      const { result, rerender } = setup({ visible: false });
      act(() => result.current.handleInputChange('title', 'Brouillon'));

      rerender({ visible: true, onSave, onClose } as Props);

      expect(result.current.formData.title).toBe('');
      expect(result.current.fieldErrors).toEqual({});
    });

    it('should start without attachment when the edited booking has none', () => {
      setup({ initialBooking: { title: 'Vol' } as Partial<Booking> });

      expect(mockAttachmentManager.setAttachments).toHaveBeenCalledWith([]);
    });

    it('should split the stored attachments into a name and a uri', () => {
      setup({
        initialBooking: { attachments: ['billet.pdf::file://billet.pdf'] } as Partial<Booking>,
      });

      expect(mockAttachmentManager.setAttachments).toHaveBeenCalledWith([
        { uri: 'file://billet.pdf', name: 'billet.pdf', type: 'pdf' },
      ]);
    });

    it('should name a legacy attachment after the last segment of its uri', () => {
      setup({
        initialBooking: { attachments: ['file://photos/ticket.jpg'] } as Partial<Booking>,
      });

      expect(mockAttachmentManager.setAttachments).toHaveBeenCalledWith([
        { uri: 'file://photos/ticket.jpg', name: 'ticket.jpg', type: 'image' },
      ]);
    });

    it('should name a legacy attachment after itself when its uri has no segment', () => {
      setup({ initialBooking: { attachments: [''] } as Partial<Booking> });

      expect(mockAttachmentManager.setAttachments).toHaveBeenCalledWith([
        { uri: '', name: '', type: 'image' },
      ]);
    });
  });

  describe('handleInputChange', () => {
    it('should update the edited field', () => {
      const { result } = setup();

      act(() => result.current.handleInputChange('description', 'Bagage cabine'));

      expect(result.current.formData.description).toBe('Bagage cabine');
    });

    it('should default a transport to an outbound trip when its type is picked', () => {
      const { result } = setup({ initialBooking: { type: 'hotel' } as Partial<Booking> });

      act(() => result.current.handleInputChange('type', 'train'));

      expect(result.current.formData.tripDirection).toBe('outbound');
      expect(result.current.formData.endDate).toBeUndefined();
    });

    it('should keep the current direction when the transport type changes', () => {
      const { result } = setup({
        initialBooking: { type: 'flight', tripDirection: 'roundtrip' } as Partial<Booking>,
      });

      act(() => result.current.handleInputChange('type', 'train'));

      expect(result.current.formData.tripDirection).toBe('roundtrip');
    });

    it('should drop the direction when a non transport type is picked', () => {
      const { result } = setup();

      act(() => result.current.handleInputChange('type', 'restaurant'));

      expect(result.current.formData.tripDirection).toBeUndefined();
      expect(result.current.formData.endDate).toBeUndefined();
    });

    it('should add an end date when a hotel is picked without one', () => {
      const { result } = setup();
      act(() => result.current.handleInputChange('type', 'restaurant'));

      act(() => result.current.handleInputChange('type', 'hotel'));

      expect(result.current.formData.endDate).toEqual(new Date(NOW.getTime() + ONE_DAY_MS));
    });

    it('should keep the existing end date when a hotel is picked', () => {
      const { result } = setup({
        initialBooking: {
          type: 'hotel',
          date: new Date('2025-07-01T00:00:00.000Z'),
          endDate: new Date('2025-07-09T00:00:00.000Z'),
        } as Partial<Booking>,
      });

      act(() => result.current.handleInputChange('type', 'hotel'));

      expect(result.current.formData.endDate).toEqual(new Date('2025-07-09T00:00:00.000Z'));
    });

    it('should add an end date when the trip becomes a round trip', () => {
      const { result } = setup();
      act(() => result.current.handleInputChange('type', 'restaurant'));
      act(() => result.current.handleInputChange('type', 'flight'));

      act(() => result.current.handleInputChange('tripDirection', 'roundtrip'));

      expect(result.current.formData.endDate).toEqual(new Date(NOW.getTime() + ONE_DAY_MS));
    });

    it('should keep the existing end date when the trip becomes a round trip', () => {
      const { result } = setup({
        initialBooking: {
          type: 'flight',
          tripDirection: 'roundtrip',
          date: new Date('2025-07-01T00:00:00.000Z'),
          endDate: new Date('2025-07-09T00:00:00.000Z'),
        } as Partial<Booking>,
      });

      act(() => result.current.handleInputChange('tripDirection', 'roundtrip'));

      expect(result.current.formData.endDate).toEqual(new Date('2025-07-09T00:00:00.000Z'));
    });

    it('should drop the end date when the trip becomes one way', () => {
      const { result } = setup({
        initialBooking: { type: 'flight', tripDirection: 'roundtrip' } as Partial<Booking>,
      });

      act(() => result.current.handleInputChange('tripDirection', 'return'));

      expect(result.current.formData.endDate).toBeUndefined();
    });
  });

  describe('flight title', () => {
    const fillRoute = (result: { current: ReturnType<typeof useBookingForm> }) => {
      act(() => result.current.handleInputChange('origin', 'Paris, France'));
      act(() => result.current.handleInputChange('destination', 'Rome, Italie'));
    };

    it('should build the outbound title from the route', () => {
      const { result } = setup();

      fillRoute(result);

      expect(result.current.formData.title).toBe(
        'bookings.flightPrefix bookings.directionLabels.outbound: Paris → Rome'
      );
    });

    it('should build the return title when the direction is a return', () => {
      const { result } = setup();
      fillRoute(result);

      act(() => result.current.handleInputChange('tripDirection', 'return'));

      expect(result.current.formData.title).toBe(
        'bookings.flightPrefix bookings.directionLabels.return: Paris → Rome'
      );
    });

    it('should build the round trip title when the direction is a round trip', () => {
      const { result } = setup();
      fillRoute(result);

      act(() => result.current.handleInputChange('tripDirection', 'roundtrip'));

      expect(result.current.formData.title).toBe(
        'bookings.flightPrefix bookings.directionLabels.roundtrip: Paris → Rome'
      );
    });

    it('should leave the title empty while the origin is missing', () => {
      const { result } = setup();

      act(() => result.current.handleInputChange('destination', 'Rome, Italie'));

      expect(result.current.formData.title).toBe('');
    });

    it('should leave the title empty while the destination is missing', () => {
      const { result } = setup();

      act(() => result.current.handleInputChange('origin', 'Paris, France'));

      expect(result.current.formData.title).toBe('');
    });

    it('should not rebuild the title for a train booking', () => {
      const { result } = setup({ initialBooking: { type: 'train' } as Partial<Booking> });

      fillRoute(result);

      expect(result.current.formData.title).toBe('');
    });
  });

  describe('handleDateChange', () => {
    it('should apply the picked start date', () => {
      const { result } = setup();

      act(() => result.current.handleDateChange({}, new Date('2025-05-10T00:00:00.000Z')));

      expect(result.current.formData.date).toEqual(new Date('2025-05-10T00:00:00.000Z'));
    });

    it('should accept a start date given as a string', () => {
      const { result } = setup();

      act(() =>
        result.current.handleDateChange({}, '2025-05-10T00:00:00.000Z' as unknown as Date)
      );

      expect(result.current.formData.date).toEqual(new Date('2025-05-10T00:00:00.000Z'));
    });

    it('should ignore an unreadable date', () => {
      const { result } = setup();

      act(() => result.current.handleDateChange({}, new Date('pas-une-date')));

      expect(result.current.formData.date).toEqual(NOW);
    });

    it('should push the end date forward when the new start date is later', () => {
      const { result } = setup({ initialBooking: { type: 'hotel' } as Partial<Booking> });

      act(() => result.current.handleDateChange({}, new Date('2025-06-10T00:00:00.000Z')));

      expect(result.current.formData.endDate).toEqual(
        new Date(new Date('2025-06-10T00:00:00.000Z').getTime() + ONE_DAY_MS)
      );
    });

    it('should keep the end date when the new start date stays earlier', () => {
      const { result } = setup({
        initialBooking: {
          type: 'hotel',
          date: new Date('2025-07-01T00:00:00.000Z'),
          endDate: new Date('2025-07-09T00:00:00.000Z'),
        } as Partial<Booking>,
      });

      act(() => result.current.handleDateChange({}, new Date('2025-07-02T00:00:00.000Z')));

      expect(result.current.formData.endDate).toEqual(new Date('2025-07-09T00:00:00.000Z'));
    });

    it('should keep the start date when the booking has no end date', () => {
      const { result } = setup();
      act(() => result.current.handleInputChange('type', 'restaurant'));

      act(() => result.current.handleDateChange({}, new Date('2025-06-10T00:00:00.000Z')));

      expect(result.current.formData.endDate).toBeUndefined();
      expect(result.current.formData.date).toEqual(new Date('2025-06-10T00:00:00.000Z'));
    });

    it('should apply the picked end date', () => {
      const { result } = setup({ initialBooking: { type: 'hotel' } as Partial<Booking> });

      act(() => result.current.handleDateChange({}, new Date('2025-05-20T00:00:00.000Z'), 'end'));

      expect(result.current.formData.endDate).toEqual(new Date('2025-05-20T00:00:00.000Z'));
    });

    it('should refuse an end date earlier than the start date', () => {
      const { result } = setup({ initialBooking: { type: 'hotel' } as Partial<Booking> });

      act(() => result.current.handleDateChange({}, new Date('2025-04-01T00:00:00.000Z'), 'end'));

      expect(Alert.alert).toHaveBeenCalledWith('common.error', 'bookings.endDateBeforeStart');
      expect(result.current.formData.endDate).toEqual(new Date(NOW.getTime() + ONE_DAY_MS));
    });

    it('should close the start date picker on android', () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const { result } = setup();
      act(() => result.current.setShowDatePicker(true));

      act(() => result.current.handleDateChange({}, new Date('2025-05-10T00:00:00.000Z')));

      expect(result.current.showDatePicker).toBe(false);
    });

    it('should close the end date picker on android', () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const { result } = setup({ initialBooking: { type: 'hotel' } as Partial<Booking> });
      act(() => result.current.setShowEndDatePicker(true));

      act(() => result.current.handleDateChange({}, new Date('2025-05-20T00:00:00.000Z'), 'end'));

      expect(result.current.showEndDatePicker).toBe(false);
    });

    it('should close the date picker when the ios picker is dismissed', () => {
      const { result } = setup();
      act(() => result.current.setShowDatePicker(true));

      act(() => result.current.handleDateChange({ type: 'dismissed' }, undefined));

      expect(result.current.showDatePicker).toBe(false);
    });

    it('should keep the ios picker open when no date is picked yet', () => {
      const { result } = setup();
      act(() => result.current.setShowDatePicker(true));

      act(() => result.current.handleDateChange({ type: 'set' }, undefined));

      expect(result.current.showDatePicker).toBe(true);
    });
  });

  describe('handleTimeChange', () => {
    it('should store the picked time padded to two digits', () => {
      const { result } = setup();

      act(() => result.current.handleTimeChange({}, new Date(2025, 4, 1, 9, 5)));

      expect(result.current.formData.time).toBe('09:05');
    });

    it('should close the time picker on android', () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const { result } = setup();
      act(() => result.current.setShowTimePicker(true));

      act(() => result.current.handleTimeChange({}, new Date(2025, 4, 1, 9, 5)));

      expect(result.current.showTimePicker).toBe(false);
    });

    it('should close the time picker when the ios picker is dismissed', () => {
      const { result } = setup();
      act(() => result.current.setShowTimePicker(true));

      act(() => result.current.handleTimeChange({ type: 'dismissed' }, undefined));

      expect(result.current.showTimePicker).toBe(false);
    });

    it('should keep the ios time picker open when no time is picked yet', () => {
      const { result } = setup();
      act(() => result.current.setShowTimePicker(true));

      act(() => result.current.handleTimeChange({ type: 'set' }, undefined));

      expect(result.current.showTimePicker).toBe(true);
    });
  });

  describe('handleReturnTimeChange', () => {
    it('should store the picked return time padded to two digits', () => {
      const { result } = setup();

      act(() => result.current.handleReturnTimeChange({}, new Date(2025, 4, 1, 18, 7)));

      expect(result.current.formData.returnTime).toBe('18:07');
    });

    it('should close the return time picker on android', () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const { result } = setup();
      act(() => result.current.setShowReturnTimePicker(true));

      act(() => result.current.handleReturnTimeChange({}, new Date(2025, 4, 1, 18, 7)));

      expect(result.current.showReturnTimePicker).toBe(false);
    });

    it('should close the return time picker when the ios picker is dismissed', () => {
      const { result } = setup();
      act(() => result.current.setShowReturnTimePicker(true));

      act(() => result.current.handleReturnTimeChange({ type: 'dismissed' }, undefined));

      expect(result.current.showReturnTimePicker).toBe(false);
    });

    it('should keep the ios return time picker open when no time is picked yet', () => {
      const { result } = setup();
      act(() => result.current.setShowReturnTimePicker(true));

      act(() => result.current.handleReturnTimeChange({ type: 'set' }, undefined));

      expect(result.current.showReturnTimePicker).toBe(true);
    });
  });

  describe('picker values', () => {
    it('should open the time picker on the stored time', () => {
      const { result } = setup({
        initialBooking: { date: new Date(2025, 6, 1), time: '08:30' } as Partial<Booking>,
      });

      expect(result.current.getTimePickerValue()).toEqual(new Date(2025, 6, 1, 8, 30, 0, 0));
    });

    it('should open the time picker at noon when no time is stored', () => {
      const { result } = setup({ initialBooking: { date: new Date(2025, 6, 1) } as Partial<Booking> });

      expect(result.current.getTimePickerValue()).toEqual(new Date(2025, 6, 1, 12, 0, 0, 0));
    });

    it('should open the return time picker on the stored return time', () => {
      const { result } = setup({
        initialBooking: {
          type: 'hotel',
          date: new Date(2025, 6, 1),
          endDate: new Date(2025, 6, 5),
          returnTime: '19:45',
        } as Partial<Booking>,
      });

      expect(result.current.getReturnTimePickerValue()).toEqual(new Date(2025, 6, 5, 19, 45, 0, 0));
    });

    it('should open the return time picker at noon on the start day without an end date', () => {
      const { result } = setup({
        initialBooking: { type: 'restaurant', date: new Date(2025, 6, 1) } as Partial<Booking>,
      });
      act(() => result.current.handleInputChange('type', 'restaurant'));

      expect(result.current.getReturnTimePickerValue()).toEqual(new Date(2025, 6, 1, 12, 0, 0, 0));
    });
  });

  describe('handleScanFill', () => {
    it('should fill the form from the scanned ticket', () => {
      const { result } = setup();

      act(() =>
        result.current.handleScanFill({
          type: 'train',
          title: 'Paris → Lyon',
          time: '07:15',
          address: 'Gare de Lyon',
          confirmationNumber: 'XYZ789',
          date: new Date('2025-08-01T00:00:00.000Z'),
          endDate: new Date('2025-08-03T00:00:00.000Z'),
        })
      );

      expect(result.current.formData).toEqual(
        expect.objectContaining({
          type: 'train',
          title: 'Paris → Lyon',
          time: '07:15',
          address: 'Gare de Lyon',
          confirmationNumber: 'XYZ789',
          date: new Date('2025-08-01T00:00:00.000Z'),
          endDate: new Date('2025-08-03T00:00:00.000Z'),
        })
      );
    });

    it('should keep the current values for the fields the scan could not read', () => {
      const { result } = setup({
        initialBooking: { title: 'Vol Paris Rome', time: '10:00' } as Partial<Booking>,
      });

      act(() => result.current.handleScanFill({}));

      expect(result.current.formData.title).toBe('Vol Paris Rome');
      expect(result.current.formData.time).toBe('10:00');
      expect(result.current.formData.date).toEqual(NOW);
    });

    it('should ignore the scanned dates when they are unreadable', () => {
      const { result } = setup();

      act(() =>
        result.current.handleScanFill({
          date: new Date('pas-une-date'),
          endDate: new Date('pas-une-date'),
        })
      );

      expect(result.current.formData.date).toEqual(NOW);
      expect(result.current.formData.endDate).toEqual(new Date(NOW.getTime() + ONE_DAY_MS));
    });
  });

  describe('autocomplete delegation', () => {
    it('should write the typed address into the form through the autocomplete', () => {
      mockAddressAutocomplete.handleAddressChange.mockImplementation(
        (text: string, onTextChange: (value: string) => void) => onTextChange(text)
      );
      const { result } = setup();

      act(() => result.current.handleAddressChange('1 via Roma'));

      expect(mockAddressAutocomplete.handleAddressChange).toHaveBeenCalledWith(
        '1 via Roma',
        expect.any(Function)
      );
      expect(result.current.formData.address).toBe('1 via Roma');
    });

    it('should write the address picked in the suggestions', () => {
      mockAddressAutocomplete.handleSelectAddress.mockImplementation(
        (suggestion: AddressSuggestion, onSelect: (description: string) => void) =>
          onSelect(suggestion.description)
      );
      const { result } = setup();

      act(() => result.current.handleSelectAddress(makeSuggestion('1 via Roma')));

      expect(result.current.formData.address).toBe('1 via Roma');
    });

    it('should write the typed origin into the form through the transport autocomplete', () => {
      mockTransportAutocomplete.handleOriginChange.mockImplementation(
        (text: string, onTextChange: (value: string) => void) => onTextChange(text)
      );
      const { result } = setup();

      act(() => result.current.handleOriginChange('Paris'));

      expect(mockTransportAutocomplete.handleOriginChange).toHaveBeenCalledWith(
        'Paris',
        expect.any(Function),
        'flight'
      );
      expect(result.current.formData.origin).toBe('Paris');
    });

    it('should write the typed destination into the form through the transport autocomplete', () => {
      mockTransportAutocomplete.handleDestinationChange.mockImplementation(
        (text: string, onTextChange: (value: string) => void) => onTextChange(text)
      );
      const { result } = setup();

      act(() => result.current.handleDestinationChange('Rome'));

      expect(mockTransportAutocomplete.handleDestinationChange).toHaveBeenCalledWith(
        'Rome',
        expect.any(Function),
        'flight'
      );
      expect(result.current.formData.destination).toBe('Rome');
    });

    it('should write the origin picked in the suggestions', () => {
      mockTransportAutocomplete.handleSelectOrigin.mockImplementation(
        (suggestion: AddressSuggestion, onSelect: (description: string) => void) =>
          onSelect(suggestion.description)
      );
      const { result } = setup();

      act(() => result.current.handleSelectOrigin(makeSuggestion('Paris, France')));

      expect(result.current.formData.origin).toBe('Paris, France');
    });

    it('should write the destination picked in the suggestions', () => {
      mockTransportAutocomplete.handleSelectDestination.mockImplementation(
        (suggestion: AddressSuggestion, onSelect: (description: string) => void) =>
          onSelect(suggestion.description)
      );
      const { result } = setup();

      act(() => result.current.handleSelectDestination(makeSuggestion('Rome, Italie')));

      expect(result.current.formData.destination).toBe('Rome, Italie');
    });
  });

  describe('handleSave', () => {
    const fillFlight = (result: { current: ReturnType<typeof useBookingForm> }) => {
      act(() => result.current.handleInputChange('origin', 'Paris, France'));
      act(() => result.current.handleInputChange('destination', 'Rome, Italie'));
    };

    it('should report a missing title', () => {
      const { result } = setup({ initialBooking: { type: 'restaurant' } as Partial<Booking> });

      act(() => result.current.handleSave());

      expect(result.current.fieldErrors).toEqual({ title: 'bookings.titleRequired' });
      expect(onSave).not.toHaveBeenCalled();
    });

    it('should report the missing route of a transport booking', () => {
      const { result } = setup();

      act(() => result.current.handleSave());

      expect(result.current.fieldErrors).toEqual({
        title: 'bookings.titleRequired',
        origin: 'bookings.originRequired',
        destination: 'bookings.destinationRequired',
      });
    });

    it('should report an end date earlier than the start date', () => {
      const { result } = setup({
        initialBooking: {
          type: 'hotel',
          title: 'Hôtel Central',
          date: new Date('2025-07-10T00:00:00.000Z'),
          endDate: new Date('2025-07-01T00:00:00.000Z'),
        } as Partial<Booking>,
      });

      act(() => result.current.handleSave());

      expect(result.current.fieldErrors).toEqual({ endDate: 'bookings.endDateBeforeStart' });
      expect(onSave).not.toHaveBeenCalled();
    });

    it('should save a one way flight and close the form', () => {
      const { result } = setup({ preselectedTripId: 'trip1' });
      fillFlight(result);

      act(() => result.current.handleSave());

      expect(onSave).toHaveBeenCalledWith({
        tripId: 'trip1',
        type: 'flight',
        title: 'bookings.flightPrefix bookings.directionLabels.outbound: Paris → Rome',
        description: undefined,
        date: NOW,
        tripDirection: 'outbound',
        endDate: undefined,
        time: undefined,
        returnTime: undefined,
        origin: 'Paris, France',
        destination: 'Rome, Italie',
        address: undefined,
        confirmationNumber: undefined,
        status: 'pending',
        attachments: undefined,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(result.current.fieldErrors).toEqual({});
    });

    it('should save an empty trip id when no trip is preselected', () => {
      const { result } = setup();
      fillFlight(result);

      act(() => result.current.handleSave());

      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ tripId: '' }));
    });

    it('should save the return time of a round trip', () => {
      const { result } = setup();
      fillFlight(result);
      act(() => result.current.handleInputChange('tripDirection', 'roundtrip'));
      act(() => result.current.handleInputChange('returnTime', '18:30'));

      act(() => result.current.handleSave());

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          tripDirection: 'roundtrip',
          returnTime: '18:30',
          endDate: new Date(NOW.getTime() + ONE_DAY_MS),
        })
      );
    });

    it('should save no return time when the round trip has none', () => {
      const { result } = setup();
      fillFlight(result);
      act(() => result.current.handleInputChange('tripDirection', 'roundtrip'));

      act(() => result.current.handleSave());

      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ returnTime: undefined }));
    });

    it('should save the trimmed optional fields of a non transport booking', () => {
      const { result } = setup({ initialBooking: { type: 'restaurant' } as Partial<Booking> });
      act(() => result.current.handleInputChange('title', '  Chez Léon  '));
      act(() => result.current.handleInputChange('description', '  Terrasse  '));
      act(() => result.current.handleInputChange('address', '  1 via Roma  '));
      act(() => result.current.handleInputChange('confirmationNumber', '  ABC123  '));
      act(() => result.current.handleInputChange('time', '20:00'));

      act(() => result.current.handleSave());

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Chez Léon',
          description: 'Terrasse',
          address: '1 via Roma',
          confirmationNumber: 'ABC123',
          time: '20:00',
          origin: undefined,
          destination: undefined,
          tripDirection: undefined,
        })
      );
    });

    it('should save a transport booking without a route as having none', () => {
      const { result } = setup({
        initialBooking: { type: 'train', title: 'Train de nuit' } as Partial<Booking>,
      });
      act(() => result.current.handleInputChange('origin', '  '));
      act(() => result.current.handleInputChange('destination', '  '));

      act(() => result.current.handleSave());

      expect(result.current.fieldErrors).toEqual({
        origin: 'bookings.originRequired',
        destination: 'bookings.destinationRequired',
      });
      expect(onSave).not.toHaveBeenCalled();
    });

    it('should save the end date of a hotel booking', () => {
      const { result } = setup({
        initialBooking: {
          type: 'hotel',
          title: 'Hôtel Central',
          date: new Date('2025-07-01T00:00:00.000Z'),
          endDate: new Date('2025-07-05T00:00:00.000Z'),
        } as Partial<Booking>,
      });

      act(() => result.current.handleSave());

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ endDate: new Date('2025-07-05T00:00:00.000Z') })
      );
    });

    it('should serialize the attachments as name and uri pairs', () => {
      mockAttachmentManager.attachments = [
        { uri: 'file://billet.pdf', name: 'billet.pdf', type: 'pdf' },
      ];
      const { result } = setup({ initialBooking: { type: 'hotel', title: 'Hôtel' } as Partial<Booking> });

      act(() => result.current.handleSave());

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ attachments: ['billet.pdf::file://billet.pdf'] })
      );
    });
  });

  describe('exposed sub-hook state', () => {
    it('should expose the attachment manager state', () => {
      const { result } = setup();

      expect(result.current.attachments).toBe(mockAttachmentManager.attachments);
      expect(result.current.handlePickImage).toBe(mockAttachmentManager.handlePickImage);
      expect(result.current.handleRemoveAttachment).toBe(
        mockAttachmentManager.handleRemoveAttachment
      );
    });

    it('should expose the autocomplete suggestions', () => {
      const { result } = setup();

      expect(result.current.addressSuggestions).toBe(mockAddressAutocomplete.addressSuggestions);
      expect(result.current.showOriginSuggestions).toBe(false);
      expect(result.current.showDestinationSuggestions).toBe(false);
    });

    it('should let the screen open the ticket scanner', () => {
      const { result } = setup();

      act(() => result.current.setShowScanner(true));

      expect(result.current.showScanner).toBe(true);
    });
  });
});
