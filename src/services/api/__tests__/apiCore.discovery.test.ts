jest.mock('../../../config/api', () => ({
  API_URLS: ['https://primary.test', 'https://secondary.test'],
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

describe('apiCore — découverte de l’URL de base', () => {
  beforeEach(() => {
    jest.resetModules();
    globalThis.fetch = jest.fn();
    const secureStorage = require('../../../utils/secureStorage');
    secureStorage.getItem.mockResolvedValue('token');
    secureStorage.multiRemove.mockResolvedValue(undefined);
  });

  it('should use the first base URL whose /health responds OK', async () => {
    const mockFetch = globalThis.fetch as jest.Mock;
    mockFetch.mockImplementation((url: string) => {
      if (url === 'https://primary.test/health') {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.startsWith('https://primary.test')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true }),
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    const { request } = require('../apiCore');
    await request('/trips');

    const healthCalls = mockFetch.mock.calls.filter(([u]) => String(u).endsWith('/health'));
    expect(healthCalls).toHaveLength(1);
    expect(healthCalls[0][0]).toBe('https://primary.test/health');
  });

  it('should try the next base URL when /health is not OK', async () => {
    const mockFetch = globalThis.fetch as jest.Mock;
    mockFetch.mockImplementation((url: string) => {
      if (url === 'https://primary.test/health') {
        return Promise.resolve({ ok: false, status: 503 });
      }
      if (url === 'https://secondary.test/health') {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.startsWith('https://secondary.test')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 1 }),
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    const { request } = require('../apiCore');
    const data = await request('/x');
    expect(data).toEqual({ data: 1 });
    expect(mockFetch).toHaveBeenCalledWith('https://primary.test/health', expect.any(Object));
    expect(mockFetch).toHaveBeenCalledWith('https://secondary.test/health', expect.any(Object));
  });

  it('should stringify unknown errors when /health throws', async () => {
    const mockFetch = globalThis.fetch as jest.Mock;
    mockFetch.mockImplementation((url: string) => {
      if (url === 'https://primary.test/health') {
        return Promise.reject(new Error('42'));
      }
      if (url === 'https://secondary.test/health') {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.startsWith('https://secondary.test')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true }),
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    const { request } = require('../apiCore');
    await request('/unknown-error');
    expect(mockFetch).toHaveBeenCalledWith('https://primary.test/health', expect.any(Object));
  });

  it('should try the next base URL when /health throws', async () => {
    const mockFetch = globalThis.fetch as jest.Mock;
    mockFetch.mockImplementation((url: string) => {
      if (url === 'https://primary.test/health') {
        return Promise.reject(new Error('econnrefused'));
      }
      if (url === 'https://secondary.test/health') {
        return Promise.resolve({ ok: true, status: 200 });
      }
      if (url.startsWith('https://secondary.test')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true }),
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    const { request } = require('../apiCore');
    await request('/y');
    expect(mockFetch).toHaveBeenCalledWith('https://primary.test/health', expect.any(Object));
  });

  it('should throw when no base URL is healthy', async () => {
    const mockFetch = globalThis.fetch as jest.Mock;
    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/health')) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    const { request } = require('../apiCore');
    await expect(request('/z')).rejects.toThrow('No working API URL');
  });

  it('should share in-flight URL discovery across concurrent requests', async () => {
    const mockFetch = globalThis.fetch as jest.Mock;
    let releaseHealth!: () => void;
    const healthGate = new Promise<void>((resolve) => {
      releaseHealth = resolve;
    });

    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/health')) {
        return healthGate.then(() => ({ ok: true, status: 200 }));
      }
      if (url.startsWith('https://primary.test')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ concurrent: true }),
        });
      }
      return Promise.reject(new Error(`unexpected ${url}`));
    });

    const { request } = require('../apiCore');
    const p1 = request('/r1');
    const p2 = request('/r2');
    releaseHealth();
    await expect(Promise.all([p1, p2])).resolves.toEqual([
      { concurrent: true },
      { concurrent: true },
    ]);

    const healthCalls = mockFetch.mock.calls.filter(([u]) => String(u).endsWith('/health'));
    expect(healthCalls).toHaveLength(1);
  });

  it('should reuse the cached base URL without calling /health again', async () => {
    const mockFetch = globalThis.fetch as jest.Mock;
    mockFetch.mockImplementation((url: string) => {
      if (url.endsWith('/health')) {
        return Promise.resolve({ ok: true, status: 200 });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ n: 1 }),
      });
    });

    const { request } = require('../apiCore');
    await request('/a');
    await request('/b');

    const healthCount = mockFetch.mock.calls.filter(([u]) => String(u).endsWith('/health')).length;
    expect(healthCount).toBe(1);
  });
});
