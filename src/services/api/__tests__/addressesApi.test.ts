import { addressesApi } from '../addressesApi';

jest.mock('../apiCore', () => ({
  request: jest.fn(),
}));

import { request } from '../apiCore';

const mockRequest = request as jest.Mock;

describe('addressesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({});
  });

  it('getAddresses — should call GET /addresses', async () => {
    await addressesApi.getAddresses();
    expect(mockRequest).toHaveBeenCalledWith('/addresses');
  });

  it('getAddressesByTripId — should call GET /addresses/trip/:tripId', async () => {
    await addressesApi.getAddressesByTripId('trip1');
    expect(mockRequest).toHaveBeenCalledWith('/addresses/trip/trip1');
  });

  it('getAddressById — should call GET /addresses/:id', async () => {
    await addressesApi.getAddressById('addr1');
    expect(mockRequest).toHaveBeenCalledWith('/addresses/addr1');
  });

  it('createAddress — should call POST /addresses with the address payload', async () => {
    const address = {
      type: 'hotel' as const,
      name: 'Hotel Tokyo',
      address: '1-1 Chiyoda',
      city: 'Tokyo',
      country: 'Japon',
      rating: 4.5,
      tripId: 'trip1',
    };
    await addressesApi.createAddress(address);
    expect(mockRequest).toHaveBeenCalledWith('/addresses', 'POST', address);
  });

  it('updateAddress — should call PUT /addresses/:id with updates', async () => {
    const updates = { name: 'Hotel Renommé', rating: 5 };
    await addressesApi.updateAddress('addr1', updates);
    expect(mockRequest).toHaveBeenCalledWith('/addresses/addr1', 'PUT', updates);
  });

  it('deleteAddress — should call DELETE /addresses/:id', async () => {
    await addressesApi.deleteAddress('addr1');
    expect(mockRequest).toHaveBeenCalledWith('/addresses/addr1', 'DELETE');
  });
});
