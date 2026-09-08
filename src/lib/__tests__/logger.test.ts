import logger from "../logger";

/**
 * `__DEV__` est un booléen global injecté par Metro. Les tests le basculent
 * pour vérifier les deux régimes du logger : verbeux en développement, muet sur
 * les niveaux bas en production.
 */
const dev = globalThis as unknown as { __DEV__: boolean };

describe("logger", () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  let previousDev: boolean;

  beforeEach(() => {
    previousDev = dev.__DEV__;
    log = jest.spyOn(console, "log").mockImplementation(() => {});
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    error = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    dev.__DEV__ = previousDev;
    jest.restoreAllMocks();
  });

  describe("en développement", () => {
    beforeEach(() => {
      dev.__DEV__ = true;
    });

    it("should tag debug messages with their level", () => {
      // Arrange & Act
      logger.debug("chargement", 42);

      // Assert
      expect(log).toHaveBeenCalledWith("[debug]", "chargement", 42);
    });

    it("should tag info messages with their level", () => {
      // Arrange & Act
      logger.info("session ouverte");

      // Assert
      expect(log).toHaveBeenCalledWith("[info]", "session ouverte");
    });
  });

  describe("hors développement", () => {
    beforeEach(() => {
      dev.__DEV__ = false;
    });

    it("should drop debug messages", () => {
      // Arrange & Act
      logger.debug("chargement");

      // Assert
      expect(log).not.toHaveBeenCalled();
    });

    it("should drop info messages", () => {
      // Arrange & Act
      logger.info("session ouverte");

      // Assert
      expect(log).not.toHaveBeenCalled();
    });

    it("should still report warnings", () => {
      // Arrange & Act
      logger.warn("quota bientôt atteint");

      // Assert
      expect(warn).toHaveBeenCalledWith("[warn]", "quota bientôt atteint");
    });

    it("should still report errors", () => {
      // Arrange
      const cause = new Error("réseau indisponible");

      // Act
      logger.error("échec de l'envoi", cause);

      // Assert
      expect(error).toHaveBeenCalledWith("[error]", "échec de l'envoi", cause);
    });
  });
});
