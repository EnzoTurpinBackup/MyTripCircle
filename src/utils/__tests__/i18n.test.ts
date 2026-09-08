jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock('../secureStorage', () => ({
  getItem: jest.fn(),
}));

jest.mock('../../services/ApiService', () => ({
  ApiService: { updateLanguage: jest.fn() },
}));

jest.mock('../i18n/index', () => ({
  resources: {
    en: { translation: { hello: 'Hello' } },
    fr: { translation: { hello: 'Bonjour' } },
  },
}));

jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

jest.mock('i18next', () => {
  const instance: Record<string, unknown> = {
    language: 'en',
    changeLanguage: jest.fn(),
    init: jest.fn(),
    t: jest.fn((key: string) => key),
  };
  instance.use = jest.fn(() => instance);
  return { __esModule: true, default: instance };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as secureStorage from '../secureStorage';
import { ApiService } from '../../services/ApiService';

const mockAsyncGetItem = AsyncStorage.getItem as unknown as jest.Mock;
const mockAsyncSetItem = AsyncStorage.setItem as unknown as jest.Mock;
const mockSecureGetItem = secureStorage.getItem as jest.Mock;
const mockUpdateLanguage = ApiService.updateLanguage as jest.Mock;

type I18nModule = typeof import('../i18n');
type I18nInstance = {
  language: string;
  changeLanguage: jest.Mock;
  init: jest.Mock;
  use: jest.Mock;
};

type DeviceLocale = { languageCode?: string | null; languageTag?: string | null };

/**
 * Le module i18n exécute son initialisation au chargement (lecture de la locale
 * système puis `i18n.init`). Chaque cas le recharge donc dans un registre isolé
 * pour choisir la locale annoncée par le device.
 */
function loadI18n(
  locales: DeviceLocale[] | null | undefined,
  options: { withGetLocales?: boolean } = {}
): { module: I18nModule; instance: I18nInstance } {
  const withGetLocales = options.withGetLocales ?? true;
  let result!: { module: I18nModule; instance: I18nInstance };

  jest.isolateModules(() => {
    jest.doMock(
      'expo-localization',
      () => (withGetLocales ? { getLocales: () => locales } : {})
    );
    const module = require('../i18n') as I18nModule;
    const instance = (require('i18next') as { default: I18nInstance }).default;
    result = { module, instance };
  });

  return result;
}

/** Charge le module avec une locale système neutre (anglais). */
function loadDefaultI18n(): { module: I18nModule; instance: I18nInstance } {
  return loadI18n([{ languageCode: 'en', languageTag: 'en-US' }]);
}

/** Exécute un scénario avec `__DEV__` désactivé, puis restaure la valeur. */
async function withoutDevMode(scenario: () => Promise<void>): Promise<void> {
  const globals = globalThis as { __DEV__?: boolean };
  const original = globals.__DEV__;
  globals.__DEV__ = false;
  try {
    await scenario();
  } finally {
    globals.__DEV__ = original;
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncGetItem.mockResolvedValue(null);
  mockAsyncSetItem.mockResolvedValue(undefined);
  mockSecureGetItem.mockResolvedValue(null);
  mockUpdateLanguage.mockResolvedValue(undefined);
});

describe("détection de la langue de l'appareil", () => {
  it('should initialise i18next with the device language code', () => {
    // Arrange / Act
    const { instance } = loadI18n([{ languageCode: 'fr', languageTag: 'fr-FR' }]);

    // Assert
    expect(instance.init).toHaveBeenCalledWith(
      expect.objectContaining({ lng: 'fr', fallbackLng: 'en' })
    );
  });

  it('should fall back to the language tag prefix when no language code is exposed', () => {
    // Arrange / Act
    const { instance } = loadI18n([{ languageCode: null, languageTag: 'de-DE' }]);

    // Assert
    expect(instance.init).toHaveBeenCalledWith(expect.objectContaining({ lng: 'de' }));
  });

  it('should fall back to english when the first locale exposes neither code nor tag', () => {
    // Arrange / Act
    const { instance } = loadI18n([{ languageCode: null, languageTag: null }]);

    // Assert
    expect(instance.init).toHaveBeenCalledWith(expect.objectContaining({ lng: 'en' }));
  });

  it('should fall back to english when the device exposes no locale', () => {
    // Arrange / Act
    const { instance } = loadI18n([]);

    // Assert
    expect(instance.init).toHaveBeenCalledWith(expect.objectContaining({ lng: 'en' }));
  });

  it('should fall back to english when getLocales is unavailable on the platform', () => {
    // Arrange / Act
    const { instance } = loadI18n(undefined, { withGetLocales: false });

    // Assert
    expect(instance.init).toHaveBeenCalledWith(expect.objectContaining({ lng: 'en' }));
  });

  it('should register the react-i18next plugin before initialising', () => {
    // Arrange / Act
    const { instance } = loadDefaultI18n();

    // Assert
    expect(instance.use).toHaveBeenCalledWith(
      expect.objectContaining({ type: '3rdParty' })
    );
  });
});

describe('getCurrentLanguage', () => {
  it('should expose the language currently held by i18next', () => {
    // Arrange
    const { module, instance } = loadDefaultI18n();
    instance.language = 'fr';

    // Act
    const result = module.getCurrentLanguage();

    // Assert
    expect(result).toBe('fr');
  });
});

describe('changeLanguage', () => {
  it('should switch i18next and persist the choice locally', async () => {
    // Arrange
    const { module, instance } = loadDefaultI18n();

    // Act
    await module.changeLanguage('fr');

    // Assert
    expect(instance.changeLanguage).toHaveBeenCalledWith('fr');
    expect(mockAsyncSetItem).toHaveBeenCalledWith('@mytripcircle_language', 'fr');
  });

  it('should sync the preference to the server when the user is authenticated', async () => {
    // Arrange
    mockSecureGetItem.mockResolvedValue('jwt-token');
    const { module } = loadDefaultI18n();

    // Act
    await module.changeLanguage('en');

    // Assert
    expect(mockSecureGetItem).toHaveBeenCalledWith('token');
    expect(mockUpdateLanguage).toHaveBeenCalledWith('en');
  });

  it('should skip the server sync when no token is stored', async () => {
    // Arrange
    mockSecureGetItem.mockResolvedValue(null);
    const { module } = loadDefaultI18n();

    // Act
    await module.changeLanguage('en');

    // Assert
    expect(mockUpdateLanguage).not.toHaveBeenCalled();
  });

  it('should warn but keep the language when persisting fails in development', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockAsyncSetItem.mockRejectedValue(new Error('stockage plein'));
    const { module, instance } = loadDefaultI18n();

    // Act
    await module.changeLanguage('fr');

    // Assert
    expect(instance.changeLanguage).toHaveBeenCalledWith('fr');
    expect(warnSpy).toHaveBeenCalledWith(
      '[i18n] Impossible de persister la langue :',
      expect.objectContaining({ message: 'stockage plein' })
    );
    warnSpy.mockRestore();
  });

  it('should stay silent when persisting fails in production', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockAsyncSetItem.mockRejectedValue(new Error('stockage plein'));
    const { module } = loadDefaultI18n();

    // Act
    await withoutDevMode(async () => {
      await module.changeLanguage('fr');
    });

    // Assert
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should warn when the server sync fails in development', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockSecureGetItem.mockResolvedValue('jwt-token');
    mockUpdateLanguage.mockRejectedValue(new Error('hors ligne'));
    const { module } = loadDefaultI18n();

    // Act
    await module.changeLanguage('fr');

    // Assert
    expect(warnSpy).toHaveBeenCalledWith(
      '[i18n] Impossible de synchroniser la langue :',
      expect.objectContaining({ message: 'hors ligne' })
    );
    warnSpy.mockRestore();
  });

  it('should stay silent when the server sync fails in production', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockSecureGetItem.mockResolvedValue('jwt-token');
    mockUpdateLanguage.mockRejectedValue(new Error('hors ligne'));
    const { module } = loadDefaultI18n();

    // Act
    await withoutDevMode(async () => {
      await module.changeLanguage('fr');
    });

    // Assert
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('initLanguage', () => {
  it('should restore the persisted language when it is supported', async () => {
    // Arrange
    mockAsyncGetItem.mockResolvedValue('fr');
    const { module, instance } = loadDefaultI18n();
    instance.changeLanguage.mockClear();

    // Act
    await module.initLanguage();

    // Assert
    expect(mockAsyncGetItem).toHaveBeenCalledWith('@mytripcircle_language');
    expect(instance.changeLanguage).toHaveBeenCalledWith('fr');
  });

  it('should restore english as well as french', async () => {
    // Arrange
    mockAsyncGetItem.mockResolvedValue('en');
    const { module, instance } = loadDefaultI18n();
    instance.changeLanguage.mockClear();

    // Act
    await module.initLanguage();

    // Assert
    expect(instance.changeLanguage).toHaveBeenCalledWith('en');
  });

  it('should ignore an unsupported persisted language', async () => {
    // Arrange
    mockAsyncGetItem.mockResolvedValue('es');
    const { module, instance } = loadDefaultI18n();
    instance.changeLanguage.mockClear();

    // Act
    await module.initLanguage();

    // Assert
    expect(instance.changeLanguage).not.toHaveBeenCalled();
    expect(mockSecureGetItem).not.toHaveBeenCalled();
  });

  it('should do nothing when no language was ever persisted', async () => {
    // Arrange
    mockAsyncGetItem.mockResolvedValue(null);
    const { module, instance } = loadDefaultI18n();
    instance.changeLanguage.mockClear();

    // Act
    await module.initLanguage();

    // Assert
    expect(instance.changeLanguage).not.toHaveBeenCalled();
  });

  it('should push the restored language to the server when the user is authenticated', async () => {
    // Arrange
    mockAsyncGetItem.mockResolvedValue('fr');
    mockSecureGetItem.mockResolvedValue('jwt-token');
    const { module } = loadDefaultI18n();

    // Act
    await module.initLanguage();

    // Assert
    expect(mockUpdateLanguage).toHaveBeenCalledWith('fr');
  });

  it('should skip the server push when no token is stored', async () => {
    // Arrange
    mockAsyncGetItem.mockResolvedValue('fr');
    mockSecureGetItem.mockResolvedValue(null);
    const { module } = loadDefaultI18n();

    // Act
    await module.initLanguage();

    // Assert
    expect(mockUpdateLanguage).not.toHaveBeenCalled();
  });

  it('should swallow a failing server push without rejecting', async () => {
    // Arrange
    mockAsyncGetItem.mockResolvedValue('fr');
    mockSecureGetItem.mockResolvedValue('jwt-token');
    mockUpdateLanguage.mockRejectedValue(new Error('hors ligne'));
    const { module } = loadDefaultI18n();

    // Act / Assert
    await expect(module.initLanguage()).resolves.toBeUndefined();
    expect(mockUpdateLanguage).toHaveBeenCalledWith('fr');
  });

  it('should warn when reading the persisted language fails in development', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockAsyncGetItem.mockRejectedValue(new Error('lecture impossible'));
    const { module } = loadDefaultI18n();

    // Act
    await module.initLanguage();

    // Assert
    expect(warnSpy).toHaveBeenCalledWith(
      '[i18n] Impossible de lire la langue sauvegardée :',
      expect.objectContaining({ message: 'lecture impossible' })
    );
    warnSpy.mockRestore();
  });

  it('should stay silent when reading the persisted language fails in production', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockAsyncGetItem.mockRejectedValue(new Error('lecture impossible'));
    const { module } = loadDefaultI18n();

    // Act
    await withoutDevMode(async () => {
      await module.initLanguage();
    });

    // Assert
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
