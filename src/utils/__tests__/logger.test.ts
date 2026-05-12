describe('logger', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('should call console.log for debug in development', () => {
    process.env.NODE_ENV = 'development';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const logger = require('../logger').default;
    logger.debug('test message');
    expect(consoleSpy).toHaveBeenCalledWith('[debug]', 'test message');
  });

  it('should call console.log for info in development', () => {
    process.env.NODE_ENV = 'development';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const logger = require('../logger').default;
    logger.info('info message');
    expect(consoleSpy).toHaveBeenCalledWith('[info]', 'info message');
  });

  it('should not call console.log for debug in production', () => {
    process.env.NODE_ENV = 'production';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const logger = require('../logger').default;
    logger.debug('should not log');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should not call console.log for info in production', () => {
    process.env.NODE_ENV = 'production';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const logger = require('../logger').default;
    logger.info('should not log');
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should always call console.warn regardless of env', () => {
    process.env.NODE_ENV = 'production';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = require('../logger').default;
    logger.warn('warning');
    expect(warnSpy).toHaveBeenCalledWith('[warn]', 'warning');
  });

  it('should always call console.error regardless of env', () => {
    process.env.NODE_ENV = 'production';
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const logger = require('../logger').default;
    logger.error('error occurred');
    expect(errorSpy).toHaveBeenCalledWith('[error]', 'error occurred');
  });
});
