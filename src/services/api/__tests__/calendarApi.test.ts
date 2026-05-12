import { calendarApi } from '../calendarApi';

jest.mock('../apiCore', () => ({
  request: jest.fn(),
}));

import { request } from '../apiCore';

const mockRequest = request as jest.Mock;

describe('calendarApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.mockResolvedValue({ success: true });
  });

  it('getToken — should call GET /users/calendar/token', async () => {
    await calendarApi.getToken();
    expect(mockRequest).toHaveBeenCalledWith('/users/calendar/token', 'GET');
  });

  it('generateToken — should call POST /users/calendar/token', async () => {
    await calendarApi.generateToken();
    expect(mockRequest).toHaveBeenCalledWith('/users/calendar/token', 'POST');
  });

  it('revokeToken — should call DELETE /users/calendar/token', async () => {
    await calendarApi.revokeToken();
    expect(mockRequest).toHaveBeenCalledWith('/users/calendar/token', 'DELETE');
  });
});
