/**
 * `sendOtpEmail` résout nodemailer au chargement du module : chaque cas
 * recharge donc le module derrière un `jest.resetModules()` pour choisir
 * si la dépendance est disponible ou non.
 */

type SendOtpEmail = (to: string, otp: string) => Promise<void>;

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));

/** Recharge le module avec un nodemailer fonctionnel. */
function loadWithNodemailer(): SendOtpEmail {
  let loaded!: SendOtpEmail;
  jest.isolateModules(() => {
    jest.doMock('nodemailer', () => ({ createTransport: mockCreateTransport }));
    loaded = require('../sendOtpEmail').sendOtpEmail;
  });
  return loaded;
}

/** Recharge le module en simulant un paquet nodemailer absent. */
function loadWithoutNodemailer(): SendOtpEmail {
  let loaded!: SendOtpEmail;
  jest.isolateModules(() => {
    jest.doMock('nodemailer', () => {
      throw new Error("Cannot find module 'nodemailer'");
    });
    loaded = require('../sendOtpEmail').sendOtpEmail;
  });
  return loaded;
}

const ORIGINAL_MAIL_USER = process.env.MAIL_USER;
const ORIGINAL_MAIL_PASS = process.env.MAIL_PASS;

beforeEach(() => {
  jest.clearAllMocks();
  mockSendMail.mockResolvedValue(undefined);
  process.env.MAIL_USER = 'contact@mytripcircle.test';
  process.env.MAIL_PASS = 'mot-de-passe-applicatif';
});

afterEach(() => {
  jest.dontMock('nodemailer');
  process.env.MAIL_USER = ORIGINAL_MAIL_USER;
  process.env.MAIL_PASS = ORIGINAL_MAIL_PASS;
});

describe('sendOtpEmail', () => {
  it('should send the OTP through a gmail transport when everything is configured', async () => {
    // Arrange
    const sendOtpEmail = loadWithNodemailer();

    // Act
    await sendOtpEmail('voyageur@example.com', '123456');

    // Assert
    expect(mockCreateTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: {
        user: 'contact@mytripcircle.test',
        pass: 'mot-de-passe-applicatif',
      },
    });
    expect(mockSendMail).toHaveBeenCalledWith({
      from: '"MyTripCircle" <contact@mytripcircle.test>',
      to: 'voyageur@example.com',
      subject: 'Your OTP code',
      text: 'Your OTP code is: 123456',
    });
  });

  it('should not send anything when MAIL_USER is missing', async () => {
    // Arrange
    delete process.env.MAIL_USER;
    const sendOtpEmail = loadWithNodemailer();

    // Act
    await sendOtpEmail('voyageur@example.com', '123456');

    // Assert
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should not send anything when MAIL_PASS is missing', async () => {
    // Arrange
    delete process.env.MAIL_PASS;
    const sendOtpEmail = loadWithNodemailer();

    // Act
    await sendOtpEmail('voyageur@example.com', '123456');

    // Assert
    expect(mockCreateTransport).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should do nothing and warn at load time when nodemailer is unavailable in development', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    const sendOtpEmail = loadWithoutNodemailer();
    await sendOtpEmail('voyageur@example.com', '123456');

    // Assert
    expect(warnSpy).toHaveBeenCalledWith(
      '[sendOtpEmail] nodemailer non disponible:',
      expect.objectContaining({ message: "Cannot find module 'nodemailer'" })
    );
    expect(mockSendMail).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should stay silent at load time when nodemailer is unavailable in production', async () => {
    // Arrange
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const globals = globalThis as { __DEV__?: boolean };
    const originalDev = globals.__DEV__;
    globals.__DEV__ = false;

    // Act
    const sendOtpEmail = loadWithoutNodemailer();
    await sendOtpEmail('voyageur@example.com', '123456');

    // Assert
    expect(warnSpy).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
    globals.__DEV__ = originalDev;
    warnSpy.mockRestore();
  });
});
