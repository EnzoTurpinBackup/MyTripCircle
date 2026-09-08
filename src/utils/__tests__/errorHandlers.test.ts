jest.mock('i18next', () => ({
  __esModule: true,
  default: {
    language: 'en',
    t: jest.fn((key: string) => key),
  },
}));

import i18n from 'i18next';
import { parseApiError, getBookingStatusTranslation } from '../errorHandlers';

const mockT = i18n.t as unknown as jest.Mock;

/** Force la langue courante d'i18next pour le cas de test en cours. */
function setLanguage(language: string | undefined): void {
  (i18n as unknown as { language: string | undefined }).language = language;
}

/** Exécute un scénario avec `__DEV__` désactivé, puis restaure la valeur. */
function withoutDevMode(scenario: () => void): void {
  const globals = globalThis as { __DEV__?: boolean };
  const original = globals.__DEV__;
  globals.__DEV__ = false;
  try {
    scenario();
  } finally {
    globals.__DEV__ = original;
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockT.mockImplementation((key: string) => key);
  setLanguage('en');
});

describe('parseApiError — mapping des messages connus', () => {
  it('should translate a known raw message coming from an Error', () => {
    // Arrange
    const error = new Error('Invalid credentials');

    // Act
    const result = parseApiError(error);

    // Assert
    expect(result).toBe('common.invalidCredentials');
    expect(mockT).toHaveBeenCalledWith('common.invalidCredentials');
  });

  it('should translate a known message wrapped in a JSON "error" field', () => {
    // Arrange
    const error = new Error(JSON.stringify({ error: 'Trip not found' }));

    // Act
    const result = parseApiError(error);

    // Assert
    expect(result).toBe('apiErrors.tripNotFound');
  });

  it('should translate a known message wrapped in a JSON "message" field', () => {
    // Arrange
    const error = new Error(JSON.stringify({ message: 'Invitation has expired' }));

    // Act
    const result = parseApiError(error);

    // Assert
    expect(result).toBe('apiErrors.invitationExpired');
  });

  it('should fall back to the raw JSON text when the payload holds neither error nor message', () => {
    // Arrange
    const error = new Error('{}');

    // Act
    const result = parseApiError(error);

    // Assert
    expect(result).toBe('{}');
  });

  it('should stringify a non-string API error before mapping it', () => {
    // Arrange
    const error = new Error(JSON.stringify({ error: 42 }));

    // Act
    const result = parseApiError(error);

    // Assert
    expect(result).toBe('42');
  });

  it('should accept a non-Error value and stringify it', () => {
    // Arrange / Act
    const result = parseApiError('Access denied');

    // Assert
    expect(result).toBe('apiErrors.accessDenied');
  });

  it('should trim surrounding whitespace before looking the message up', () => {
    // Arrange
    const error = new Error('   Unauthorized   ');

    // Act
    const result = parseApiError(error);

    // Assert
    expect(result).toBe('apiErrors.unauthorized');
  });

  it('should warn when the message is not valid JSON in development', () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    parseApiError(new Error('Not found'));

    // Assert
    expect(warnSpy).toHaveBeenCalledWith(
      '[errorHandlers] parseApiError: JSON invalide:',
      expect.any(SyntaxError)
    );
    warnSpy.mockRestore();
  });

  it('should stay silent when the message is not valid JSON in production', () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    withoutDevMode(() => {
      const result = parseApiError(new Error('Not found'));

      // Assert
      expect(result).toBe('apiErrors.notFound');
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('parseApiError — cas particulier du numéro de téléphone', () => {
  it('should map an unlisted english phone conflict through the regex fallback', () => {
    // Arrange
    const error = new Error('This phone number already in use by someone else');

    // Act
    const result = parseApiError(error);

    // Assert
    expect(result).toBe('common.phoneAlreadyInUse');
  });

  it('should map an unlisted french phone conflict through the regex fallback', () => {
    // Arrange
    const error = new Error('Le numéro de téléphone est déjà utilisé ailleurs');

    // Act
    const result = parseApiError(error);

    // Assert
    expect(result).toBe('common.phoneAlreadyInUse');
  });
});

describe('parseApiError — localisation des messages non mappés', () => {
  it('should fall back to the generic key when a french message reaches an english UI', () => {
    // Arrange
    setLanguage('en');

    // Act
    const result = parseApiError(new Error('Le brouillon est corrompu'));

    // Assert
    expect(result).toBe('apiErrors.unmappedFallback');
  });

  it('should detect a french message from its keywords when it carries no accent', () => {
    // Arrange
    setLanguage('en');

    // Act
    const result = parseApiError(new Error('Impossible de charger le brouillon'));

    // Assert
    expect(result).toBe('apiErrors.unmappedFallback');
  });

  it('should default to english when i18next exposes no language', () => {
    // Arrange
    setLanguage(undefined);

    // Act
    const result = parseApiError(new Error('Le brouillon est corrompu'));

    // Assert
    expect(result).toBe('apiErrors.unmappedFallback');
  });

  it('should fall back to the generic key when an english api error reaches a french UI', () => {
    // Arrange
    setLanguage('fr');

    // Act
    const result = parseApiError(new Error('Invalid widget identifier'));

    // Assert
    expect(result).toBe('apiErrors.unmappedFallback');
  });

  it('should recognise an english api error from its keywords when it starts with no known prefix', () => {
    // Arrange
    setLanguage('fr');

    // Act
    const result = parseApiError(new Error('The session expired'));

    // Assert
    expect(result).toBe('apiErrors.unmappedFallback');
  });

  it('should keep an accented message untouched on a french UI', () => {
    // Arrange
    setLanguage('fr');

    // Act
    const result = parseApiError(new Error('Réservation indisponible'));

    // Assert
    expect(result).toBe('Réservation indisponible');
  });

  it('should keep a long english message untouched because it is too long to be an api error', () => {
    // Arrange
    setLanguage('fr');
    const longMessage = `Invalid ${'x'.repeat(230)}`;

    // Act
    const result = parseApiError(new Error(longMessage));

    // Assert
    expect(result).toBe(longMessage);
  });

  it('should keep a neutral message untouched when it matches no locale heuristic', () => {
    // Arrange
    setLanguage('fr');

    // Act
    const result = parseApiError(new Error('Widget 42'));

    // Assert
    expect(result).toBe('Widget 42');
  });

  it('should keep a french message untouched on a french UI', () => {
    // Arrange
    setLanguage('fr');

    // Act
    const result = parseApiError(new Error('Le brouillon est corrompu'));

    // Assert
    expect(result).toBe('Le brouillon est corrompu');
  });

  it('should return the generic unexpected-error key when the message is empty', () => {
    // Arrange / Act
    const result = parseApiError(new Error(''));

    // Assert
    expect(result).toBe('common.unexpectedError');
  });
});

describe('parseApiError — garde-fou sur une défaillance interne', () => {
  it('should recover from a translation failure and return the raw message', () => {
    // Arrange
    mockT.mockImplementationOnce(() => {
      throw new Error('i18next non initialisé');
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    const result = parseApiError(new Error('Unauthorized'));

    // Assert
    expect(result).toBe('Unauthorized');
    expect(warnSpy).toHaveBeenCalledWith(
      '[errorHandlers] parseApiError: erreur inattendue:',
      expect.objectContaining({ message: 'i18next non initialisé' })
    );
    warnSpy.mockRestore();
  });

  it('should recover silently from a translation failure in production', () => {
    // Arrange
    mockT.mockImplementationOnce(() => {
      throw new Error('i18next non initialisé');
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    withoutDevMode(() => {
      const result = parseApiError(new Error('Unauthorized'));

      // Assert
      expect(result).toBe('Unauthorized');
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should return an empty-message fallback when the thrown value cannot be stringified', () => {
    // Arrange — `String(error)` lève, ce qui déclenche le catch dès la 1re ligne
    const hostile = {
      toString() {
        throw new Error('toString hostile');
      },
    };
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    const result = parseApiError(hostile);

    // Assert
    expect(result).toBe('common.unexpectedError');
    warnSpy.mockRestore();
  });

  it('should return the whitespace message untouched when translation fails on a blank message', () => {
    // Arrange — le message brut n'est pas vide mais son trim l'est
    mockT.mockImplementationOnce(() => {
      throw new Error('i18next non initialisé');
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    const result = parseApiError(new Error('   '));

    // Assert
    expect(result).toBe('   ');
    warnSpy.mockRestore();
  });
});

describe('getBookingStatusTranslation', () => {
  it('should return the translated label when the status key exists', () => {
    // Arrange
    mockT.mockImplementation((key: string) =>
      key === 'bookings.status.confirmed' ? 'Confirmée' : key
    );

    // Act
    const result = getBookingStatusTranslation('confirmed');

    // Assert
    expect(result).toBe('Confirmée');
  });

  it('should return the raw status when the key has no translation', () => {
    // Arrange — i18next renvoie la clé elle-même quand elle est absente
    mockT.mockImplementation((key: string) => key);

    // Act
    const result = getBookingStatusTranslation('exotic_status');

    // Assert
    expect(result).toBe('exotic_status');
  });
});
