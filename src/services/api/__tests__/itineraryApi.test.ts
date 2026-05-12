import { itineraryApi } from '../itineraryApi';

jest.mock('../apiCore', () => ({
  request: jest.fn(),
}));

import { request } from '../apiCore';

const mockRequest = request as jest.Mock;

describe('itineraryApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({ cached: false, itinerary: {} });
  });

  it('generateItinerary — should call POST /itinerary/generate with city and days', async () => {
    await itineraryApi.generateItinerary({ city: 'Lisbonne', days: 4 });
    expect(mockRequest).toHaveBeenCalledWith('/itinerary/generate', 'POST', {
      city: 'Lisbonne',
      days: 4,
    });
  });
});
