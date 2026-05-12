import { bookingsApi } from '../bookingsApi';

jest.mock('../apiCore', () => ({
  request: jest.fn(),
}));

import { request } from '../apiCore';

const mockRequest = request as jest.Mock;

describe('bookingsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({});
  });

  it('getBookings — should call GET /bookings', async () => {
    await bookingsApi.getBookings();
    expect(mockRequest).toHaveBeenCalledWith('/bookings');
  });

  it('getBookingById — should call GET /bookings/:id', async () => {
    await bookingsApi.getBookingById('book1');
    expect(mockRequest).toHaveBeenCalledWith('/bookings/book1');
  });

  it('getBookingsByTripId — should call GET /bookings/trip/:tripId', async () => {
    await bookingsApi.getBookingsByTripId('trip1');
    expect(mockRequest).toHaveBeenCalledWith('/bookings/trip/trip1');
  });

  it('createBooking — should call POST /bookings with the booking payload', async () => {
    const booking = {
      tripId: 'trip1',
      type: 'flight' as const,
      title: 'CDG → NRT',
      date: new Date('2025-06-01'),
      price: 850,
    };
    await bookingsApi.createBooking(booking);
    expect(mockRequest).toHaveBeenCalledWith('/bookings', 'POST', booking);
  });

  it('updateBooking — should call PUT /bookings/:id with updates', async () => {
    const updates = { title: 'Updated title', price: 900 };
    await bookingsApi.updateBooking('book1', updates);
    expect(mockRequest).toHaveBeenCalledWith('/bookings/book1', 'PUT', updates);
  });

  it('deleteBooking — should call DELETE /bookings/:id', async () => {
    await bookingsApi.deleteBooking('book1');
    expect(mockRequest).toHaveBeenCalledWith('/bookings/book1', 'DELETE');
  });
});
