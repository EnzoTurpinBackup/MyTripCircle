import { tripsApi } from '../tripsApi';

jest.mock('../apiCore', () => ({
  request: jest.fn(),
}));

import { request } from '../apiCore';

const mockRequest = request as jest.Mock;

describe('tripsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({});
  });

  it('getTrips — should call GET /trips', async () => {
    await tripsApi.getTrips();
    expect(mockRequest).toHaveBeenCalledWith('/trips');
  });

  it('getTripById — should call GET /trips/:id', async () => {
    await tripsApi.getTripById('trip123');
    expect(mockRequest).toHaveBeenCalledWith('/trips/trip123');
  });

  it('createTrip — should call POST /trips with the trip payload', async () => {
    const trip = {
      title: 'Tokyo',
      destination: 'Tokyo',
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-06-15'),
    };
    await tripsApi.createTrip(trip);
    expect(mockRequest).toHaveBeenCalledWith('/trips', 'POST', trip);
  });

  it('updateTrip — should call PUT /trips/:id with updates', async () => {
    const updates = { title: 'Tokyo Updated', status: 'validated' as const };
    await tripsApi.updateTrip('trip123', updates);
    expect(mockRequest).toHaveBeenCalledWith('/trips/trip123', 'PUT', updates);
  });

  it('deleteTrip — should call DELETE /trips/:id', async () => {
    await tripsApi.deleteTrip('trip123');
    expect(mockRequest).toHaveBeenCalledWith('/trips/trip123', 'DELETE');
  });

  it('removeTripCollaborator — should call DELETE /trips/:id/collaborators/:userId', async () => {
    await tripsApi.removeTripCollaborator('trip123', 'user456');
    expect(mockRequest).toHaveBeenCalledWith(
      '/trips/trip123/collaborators/user456',
      'DELETE'
    );
  });

  it('transferTripOwnership — should call PUT with the new owner id', async () => {
    await tripsApi.transferTripOwnership('trip123', 'newOwner789');
    expect(mockRequest).toHaveBeenCalledWith(
      '/trips/trip123/transfer-ownership',
      'PUT',
      { newOwnerId: 'newOwner789' }
    );
  });
});
