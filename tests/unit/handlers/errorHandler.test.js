/**
 * ErrorHandler Tests - London School TDD
 *
 * Tests error handling with mock logging and response building
 */

const ErrorHandler = require('../../../src/handlers/ErrorHandler');

describe('ErrorHandler', () => {
  let mockHandlerInput;
  let mockResponseBuilder;
  let consoleErrorSpy;

  beforeEach(() => {
    // Mock responseBuilder
    mockResponseBuilder = {
      speak: jest.fn().mockReturnThis(),
      reprompt: jest.fn().mockReturnThis(),
      getResponse: jest.fn().mockReturnValue({
        outputSpeech: { type: 'SSML' },
        reprompt: { outputSpeech: { type: 'SSML' } }
      })
    };

    // Mock handlerInput
    mockHandlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          requestId: 'test-request-id',
          intent: {
            name: 'GetTodayMenuIntent'
          }
        }
      },
      responseBuilder: mockResponseBuilder
    };

    // Spy on console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('canHandle', () => {
    it('should return true for any request (catch-all)', () => {
      const result = ErrorHandler.canHandle(mockHandlerInput);

      expect(result).toBe(true);
    });

    it('should return true for LaunchRequest', () => {
      mockHandlerInput.requestEnvelope.request.type = 'LaunchRequest';

      const result = ErrorHandler.canHandle(mockHandlerInput);

      expect(result).toBe(true);
    });

    it('should return true for IntentRequest', () => {
      mockHandlerInput.requestEnvelope.request.type = 'IntentRequest';

      const result = ErrorHandler.canHandle(mockHandlerInput);

      expect(result).toBe(true);
    });

    it('should return true for SessionEndedRequest', () => {
      mockHandlerInput.requestEnvelope.request.type = 'SessionEndedRequest';

      const result = ErrorHandler.canHandle(mockHandlerInput);

      expect(result).toBe(true);
    });

    it('should return true even with undefined handlerInput', () => {
      const result = ErrorHandler.canHandle(undefined);

      expect(result).toBe(true);
    });

    it('should return true even with null handlerInput', () => {
      const result = ErrorHandler.canHandle(null);

      expect(result).toBe(true);
    });
  });

  describe('handle - error logging', () => {
    it('should log error message', () => {
      const testError = new Error('Test error message');

      ErrorHandler.handle(mockHandlerInput, testError);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorCalls = consoleErrorSpy.mock.calls;
      const errorMessages = errorCalls.map(call => call[0]).join(' ');

      expect(errorMessages).toContain('Test error message');
    });

    it('should log error stack trace', () => {
      const testError = new Error('Stack trace test');

      ErrorHandler.handle(mockHandlerInput, testError);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      const secondCall = consoleErrorSpy.mock.calls[1][0];

      expect(secondCall).toBeDefined();
    });

    it('should handle errors without stack traces', () => {
      const testError = { message: 'Error without stack' };

      expect(() => {
        ErrorHandler.handle(mockHandlerInput, testError);
      }).not.toThrow();
    });

    it('should log multiple times for detailed error info', () => {
      const testError = new Error('Multi-log test');

      ErrorHandler.handle(mockHandlerInput, testError);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('handle - response building', () => {
    it('should call speak with error message', () => {
      const testError = new Error('Test error');

      ErrorHandler.handle(mockHandlerInput, testError);

      expect(mockResponseBuilder.speak).toHaveBeenCalledTimes(1);
    });

    it('should provide user-friendly error message', () => {
      const testError = new Error('Technical error');

      ErrorHandler.handle(mockHandlerInput, testError);

      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];
      expect(speakArg.toLowerCase()).toContain('sorry');
    });

    it('should not expose technical error details to user', () => {
      const testError = new Error('Database connection failed at line 42');

      ErrorHandler.handle(mockHandlerInput, testError);

      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];
      expect(speakArg).not.toContain('line 42');
      expect(speakArg).not.toContain('Database');
    });

    it('should call reprompt with recovery message', () => {
      const testError = new Error('Test error');

      ErrorHandler.handle(mockHandlerInput, testError);

      expect(mockResponseBuilder.reprompt).toHaveBeenCalledTimes(1);
    });

    it('should call getResponse to build final response', () => {
      const testError = new Error('Test error');

      ErrorHandler.handle(mockHandlerInput, testError);

      expect(mockResponseBuilder.getResponse).toHaveBeenCalledTimes(1);
    });

    it('should return response object', () => {
      const testError = new Error('Test error');

      const response = ErrorHandler.handle(mockHandlerInput, testError);

      expect(response).toBeDefined();
      expect(response).toHaveProperty('outputSpeech');
      expect(response).toHaveProperty('reprompt');
    });

    it('should suggest retry in message', () => {
      const testError = new Error('Test error');

      ErrorHandler.handle(mockHandlerInput, testError);

      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];
      expect(speakArg.toLowerCase()).toMatch(/try again|retry/);
    });
  });

  describe('handle - different error types', () => {
    it('should handle TypeError', () => {
      const testError = new TypeError('Type error test');

      expect(() => {
        ErrorHandler.handle(mockHandlerInput, testError);
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle ReferenceError', () => {
      const testError = new ReferenceError('Reference error test');

      expect(() => {
        ErrorHandler.handle(mockHandlerInput, testError);
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle network errors', () => {
      const testError = new Error('Network request failed');
      testError.code = 'ECONNREFUSED';

      expect(() => {
        ErrorHandler.handle(mockHandlerInput, testError);
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle custom error objects', () => {
      const testError = {
        message: 'Custom error',
        statusCode: 500
      };

      expect(() => {
        ErrorHandler.handle(mockHandlerInput, testError);
      }).not.toThrow();
    });

    it('should handle string errors', () => {
      const testError = 'String error message';

      expect(() => {
        ErrorHandler.handle(mockHandlerInput, testError);
      }).not.toThrow();
    });
  });

  describe('behavior verification', () => {
    it('should log before building response', () => {
      const testError = new Error('Test error');

      ErrorHandler.handle(mockHandlerInput, testError);

      const logOrder = consoleErrorSpy.mock.invocationCallOrder[0];
      const speakOrder = mockResponseBuilder.speak.mock.invocationCallOrder[0];

      expect(logOrder).toBeLessThan(speakOrder);
    });

    it('should coordinate with responseBuilder correctly', () => {
      const testError = new Error('Test error');

      const response = ErrorHandler.handle(mockHandlerInput, testError);

      // Verify the conversation between handler and responseBuilder
      expect(mockResponseBuilder.speak).toHaveBeenCalled();
      expect(mockResponseBuilder.reprompt).toHaveBeenCalled();
      expect(mockResponseBuilder.getResponse).toHaveBeenCalled();
      expect(response).toBeDefined();
    });

    it('should follow expected workflow sequence', () => {
      const testError = new Error('Test error');

      ErrorHandler.handle(mockHandlerInput, testError);

      const speakOrder = mockResponseBuilder.speak.mock.invocationCallOrder[0];
      const repromptOrder = mockResponseBuilder.reprompt.mock.invocationCallOrder[0];
      const responseOrder = mockResponseBuilder.getResponse.mock.invocationCallOrder[0];

      expect(speakOrder).toBeLessThan(repromptOrder);
      expect(repromptOrder).toBeLessThan(responseOrder);
    });

    it('should provide graceful degradation', () => {
      const testError = new Error('Critical system failure');

      const response = ErrorHandler.handle(mockHandlerInput, testError);

      // Should still return a valid response
      expect(response).toBeDefined();
      expect(mockResponseBuilder.speak).toHaveBeenCalled();
    });
  });
});
