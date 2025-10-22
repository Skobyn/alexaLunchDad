/**
 * SessionEndedRequestHandler Tests - London School TDD
 *
 * Tests session end logging and cleanup
 */

const SessionEndedRequestHandler = require('../../../src/handlers/SessionEndedRequestHandler');

describe('SessionEndedRequestHandler', () => {
  let mockHandlerInput;
  let mockResponseBuilder;
  let consoleLogSpy;

  beforeEach(() => {
    // Mock responseBuilder
    mockResponseBuilder = {
      getResponse: jest.fn().mockReturnValue({})
    };

    // Mock handlerInput
    mockHandlerInput = {
      requestEnvelope: {
        request: {
          type: 'SessionEndedRequest',
          requestId: 'test-request-id',
          reason: 'USER_INITIATED'
        }
      },
      responseBuilder: mockResponseBuilder
    };

    // Spy on console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('canHandle', () => {
    it('should return true for SessionEndedRequest type', () => {
      mockHandlerInput.requestEnvelope.request.type = 'SessionEndedRequest';

      const result = SessionEndedRequestHandler.canHandle(mockHandlerInput);

      expect(result).toBe(true);
    });

    it('should return false for LaunchRequest', () => {
      mockHandlerInput.requestEnvelope.request.type = 'LaunchRequest';

      const result = SessionEndedRequestHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });

    it('should return false for IntentRequest', () => {
      mockHandlerInput.requestEnvelope.request.type = 'IntentRequest';
      mockHandlerInput.requestEnvelope.request.intent = { name: 'GetLunchIntent' };

      const result = SessionEndedRequestHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });

    it('should return false for undefined request type', () => {
      mockHandlerInput.requestEnvelope.request.type = undefined;

      const result = SessionEndedRequestHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });
  });

  describe('handle', () => {
    it('should call getResponse with no output speech', () => {
      SessionEndedRequestHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.getResponse).toHaveBeenCalledTimes(1);
    });

    it('should return empty response object', () => {
      const response = SessionEndedRequestHandler.handle(mockHandlerInput);

      expect(response).toBeDefined();
      expect(response).toEqual({});
    });

    it('should not call speak or reprompt', () => {
      mockResponseBuilder.speak = jest.fn().mockReturnThis();
      mockResponseBuilder.reprompt = jest.fn().mockReturnThis();

      SessionEndedRequestHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.speak).not.toHaveBeenCalled();
      expect(mockResponseBuilder.reprompt).not.toHaveBeenCalled();
    });

    it('should handle USER_INITIATED reason', () => {
      mockHandlerInput.requestEnvelope.request.reason = 'USER_INITIATED';

      expect(() => {
        SessionEndedRequestHandler.handle(mockHandlerInput);
      }).not.toThrow();
    });

    it('should handle ERROR reason', () => {
      mockHandlerInput.requestEnvelope.request.reason = 'ERROR';
      mockHandlerInput.requestEnvelope.request.error = {
        type: 'INVALID_RESPONSE',
        message: 'Invalid response'
      };

      expect(() => {
        SessionEndedRequestHandler.handle(mockHandlerInput);
      }).not.toThrow();
    });

    it('should handle EXCEEDED_MAX_REPROMPTS reason', () => {
      mockHandlerInput.requestEnvelope.request.reason = 'EXCEEDED_MAX_REPROMPTS';

      expect(() => {
        SessionEndedRequestHandler.handle(mockHandlerInput);
      }).not.toThrow();
    });

    it('should not throw error for any reason type', () => {
      const reasons = ['USER_INITIATED', 'ERROR', 'EXCEEDED_MAX_REPROMPTS'];

      reasons.forEach(reason => {
        mockHandlerInput.requestEnvelope.request.reason = reason;

        expect(() => {
          SessionEndedRequestHandler.handle(mockHandlerInput);
        }).not.toThrow();
      });
    });
  });

  describe('behavior verification', () => {
    it('should coordinate with responseBuilder minimally', () => {
      const response = SessionEndedRequestHandler.handle(mockHandlerInput);

      // Only getResponse should be called, no speak/reprompt
      expect(mockResponseBuilder.getResponse).toHaveBeenCalled();
      expect(response).toEqual({});
    });

    it('should complete successfully even with malformed request', () => {
      mockHandlerInput.requestEnvelope.request = {
        type: 'SessionEndedRequest'
        // Missing reason field
      };

      expect(() => {
        SessionEndedRequestHandler.handle(mockHandlerInput);
      }).not.toThrow();
    });
  });
});
