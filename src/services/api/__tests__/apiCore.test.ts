jest.mock('../../../config/api', () => ({
  API_URLS: ['https://api.test.com'],
}));

jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../utils/secureStorage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn().mockResolvedValue(undefined),
}));

globalThis.fetch = jest.fn();

import { request, setUnauthorizedCallback, clearUnauthorizedCallback } from '../apiCore';
import * as secureStorage from '../../../utils/secureStorage';

const mockFetch = globalThis.fetch as jest.Mock;
const mockGetItem = secureStorage.getItem as jest.Mock;
const mockSetItem = secureStorage.setItem as jest.Mock;
const mockMultiRemove = secureStorage.multiRemove as jest.Mock;

// Helper: routes fetch by URL so the health-check always succeeds.
// After the first call, workingUrl is cached and /health is never called again.
function setupDefaultFetch(apiOverride?: (url: string) => any) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/health')) {
      return Promise.resolve({ ok: true, status: 200 });
    }
    if (apiOverride) return apiOverride(url);
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('{}'),
    });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  clearUnauthorizedCallback();
  mockGetItem.mockResolvedValue('test-token');
  mockMultiRemove.mockResolvedValue(undefined);
  setupDefaultFetch();
});

describe('setUnauthorizedCallback / clearUnauthorizedCallback', () => {
  it('should call the callback when a 401 occurs with no refresh token', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedCallback(onUnauthorized);

    mockGetItem
      .mockResolvedValueOnce('access-token') // initial token
      .mockResolvedValueOnce(null);          // no refresh token → triggers clearSession

    setupDefaultFetch((url) => ({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Unauthorized' }),
      text: () => Promise.resolve(JSON.stringify({ message: 'Unauthorized' })),
    }));

    await expect(request('/protected')).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('should not call the callback after clearUnauthorizedCallback', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedCallback(onUnauthorized);
    clearUnauthorizedCallback();

    mockGetItem
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce(null);

    setupDefaultFetch(() => ({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve('{}'),
    }));

    await expect(request('/protected')).rejects.toThrow();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('request', () => {
  it('should return parsed JSON on a successful GET', async () => {
    setupDefaultFetch(() => ({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1, title: 'Trip' }),
    }));

    const result = await request('/trips');
    expect(result).toEqual({ id: 1, title: 'Trip' });
  });

  it('should include the Authorization header when a token is present', async () => {
    mockGetItem.mockResolvedValue('my-token');

    await request('/trips');

    // Find the API call (not the health check which has no Authorization header requirement)
    const apiCall = mockFetch.mock.calls.find(([url]) => url.includes('/trips'));
    expect(apiCall).toBeDefined();
    expect(apiCall[1].headers.Authorization).toBe('Bearer my-token');
  });

  it('should not include the Authorization header when no token is stored', async () => {
    mockGetItem.mockResolvedValue(null);

    await request('/public');

    const apiCall = mockFetch.mock.calls.find(([url]) => url.includes('/public'));
    expect(apiCall[1].headers.Authorization).toBeUndefined();
  });

  it('should serialize the body as JSON for POST requests', async () => {
    setupDefaultFetch(() => ({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ success: true }),
    }));

    await request('/trips', 'POST', { title: 'Tokyo' });

    const apiCall = mockFetch.mock.calls.find(([url]) => url.includes('/trips'));
    expect(apiCall[1].method).toBe('POST');
    expect(apiCall[1].body).toBe(JSON.stringify({ title: 'Tokyo' }));
  });

  it('should throw on non-401 HTTP errors', async () => {
    setupDefaultFetch(() => ({
      ok: false,
      status: 404,
      text: () => Promise.resolve(JSON.stringify({ message: 'Not found' })),
    }));

    await expect(request('/trips/unknown')).rejects.toThrow();
  });

  it('should call the refresh endpoint and retry after a 401', async () => {
    mockGetItem
      .mockResolvedValueOnce('old-token')  // initial token
      .mockResolvedValueOnce('ref-token'); // refresh token

    // Transition through states to avoid counting issues with cached workingUrl
    let didSee401 = false;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.includes('/users/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, token: 'new-token' }),
        });
      }
      if (!didSee401) {
        didSee401 = true;
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve('{}'),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 1 }),
      });
    });

    const result = await request('/protected');
    expect(result).toEqual({ id: 1 });
    // Refresh endpoint was called
    const refreshCall = mockFetch.mock.calls.find(([url]) =>
      url.includes('/users/refresh')
    );
    expect(refreshCall).toBeDefined();
  });

  it('should clear the session and throw when the refresh token is missing', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedCallback(onUnauthorized);

    mockGetItem
      .mockResolvedValueOnce('old-token')
      .mockResolvedValueOnce(null); // no refresh token

    setupDefaultFetch(() => ({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ message: 'Unauthorized' })),
    }));

    await expect(request('/protected')).rejects.toThrow();
    expect(mockMultiRemove).toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('should surface plain-text error bodies when JSON parsing fails', async () => {
    setupDefaultFetch(() => ({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Service unavailable'),
    }));

    await expect(request('/fail')).rejects.toThrow('Service unavailable');
  });

  it('should use the status code when the error body is empty', async () => {
    setupDefaultFetch(() => ({
      ok: false,
      status: 502,
      text: () => Promise.resolve(''),
    }));

    await expect(request('/bad-gateway')).rejects.toThrow('HTTP 502');
  });

  it('should persist a rotated refresh token when the refresh endpoint returns one', async () => {
    mockGetItem
      .mockResolvedValueOnce('old-token')
      .mockResolvedValueOnce('old-refresh');

    let saw401 = false;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.includes('/users/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              token: 'new-access',
              refreshToken: 'new-refresh',
            }),
        });
      }
      if (!saw401) {
        saw401 = true;
        return Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve('{}'),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
    });

    await request('/resource');

    expect(mockSetItem).toHaveBeenCalledWith('token', 'new-access');
    expect(mockSetItem).toHaveBeenCalledWith('refreshToken', 'new-refresh');
  });

  it('should disconnect when refresh succeeds but returns no access token', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedCallback(onUnauthorized);

    mockGetItem
      .mockResolvedValueOnce('old-token')
      .mockResolvedValueOnce('ref-token');

    let saw401 = false;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.includes('/users/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: false }),
        });
      }
      if (!saw401) {
        saw401 = true;
        return Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve('{}'),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    });

    await expect(request('/resource')).rejects.toThrow();
    expect(mockMultiRemove).toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('should throw when the retried request fails with a non-401 error', async () => {
    mockGetItem
      .mockResolvedValueOnce('old-token')
      .mockResolvedValueOnce('ref-token');

    let saw401 = false;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.includes('/users/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, token: 'new-access' }),
        });
      }
      if (!saw401) {
        saw401 = true;
        return Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve('{}'),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve('not found'),
      });
    });

    await expect(request('/resource')).rejects.toThrow('not found');
  });

  it('should clear the session when the retried request is still unauthorized', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedCallback(onUnauthorized);

    mockGetItem
      .mockResolvedValueOnce('old-token')
      .mockResolvedValueOnce('ref-token');

    let pass = 0;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.includes('/users/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, token: 'new-access' }),
        });
      }
      pass += 1;
      if (pass === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve('{}'),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{}'),
      });
    });

    await expect(request('/resource')).rejects.toThrow();
    expect(mockMultiRemove).toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('should disconnect when the refresh endpoint responds with a non-OK status', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedCallback(onUnauthorized);

    mockGetItem
      .mockResolvedValueOnce('old-token')
      .mockResolvedValueOnce('ref-token');

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.includes('/users/refresh')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{}'),
      });
    });

    await expect(request('/resource')).rejects.toThrow();
    expect(mockMultiRemove).toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('should replay the POST body after a successful token refresh', async () => {
    mockGetItem
      .mockResolvedValueOnce('old-token')
      .mockResolvedValueOnce('ref-token');

    let pass = 0;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.includes('/users/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, token: 'new-access' }),
        });
      }
      pass += 1;
      if (pass === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve('{}'),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ saved: true }),
      });
    });

    const payload = { title: 'Tokyo' };
    await request('/trips', 'POST', payload);

    const postCalls = mockFetch.mock.calls.filter(
      ([url, init]) => String(url).includes('/trips') && init?.method === 'POST',
    );
    expect(postCalls).toHaveLength(2);
    expect(postCalls[1][1].body).toBe(JSON.stringify(payload));
  });

  it('should reuse a single refresh promise for concurrent unauthorized requests', async () => {
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'token') return Promise.resolve('access');
      if (key === 'refreshToken') return Promise.resolve('refresh');
      return Promise.resolve(null);
    });

    let refreshCalls = 0;
    const paths = { a: 0, b: 0 };

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.includes('/users/refresh')) {
        refreshCalls += 1;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, token: 'renewed' }),
        });
      }
      if (url.includes('/concurrent-a')) {
        paths.a += 1;
        if (paths.a === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            text: () => Promise.resolve('{}'),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ which: 'a' }),
        });
      }
      if (url.includes('/concurrent-b')) {
        paths.b += 1;
        if (paths.b === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            text: () => Promise.resolve('{}'),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ which: 'b' }),
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    const [ra, rb] = await Promise.all([request('/concurrent-a'), request('/concurrent-b')]);

    expect(refreshCalls).toBe(1);
    expect(ra).toEqual({ which: 'a' });
    expect(rb).toEqual({ which: 'b' });
  });

  it('should return null from refresh when the refresh request throws', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedCallback(onUnauthorized);

    mockGetItem
      .mockResolvedValueOnce('old-token')
      .mockResolvedValueOnce('ref-token');

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/health')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.includes('/users/refresh')) {
        return Promise.reject(new Error('network'));
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{}'),
      });
    });

    await expect(request('/resource')).rejects.toThrow();
    expect(mockMultiRemove).toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalled();
  });
});
