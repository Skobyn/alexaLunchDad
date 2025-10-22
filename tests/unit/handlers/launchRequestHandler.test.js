/**
 * LaunchRequestHandler Tests - London School TDD
 *
 * Tests handler canHandle and handle methods with mock collaboration
 */

const LaunchRequestHandler = require('../../../src/handlers/LaunchRequestHandler');

describe('LaunchRequestHandler', () => {
  let mockHandlerInput;
  let mockResponseBuilder;

  beforeEach(() => {
    // Mock responseBuilder with fluent interface
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
          type: '',
          requestId: 'test-request-id',
          timestamp: '2025-10-22T10:00:00Z'
        }
      },
      responseBuilder: mockResponseBuilder
    };
  });

  describe('canHandle', () => {
    it('should return true for LaunchRequest type', () => {
      mockHandlerInput.requestEnvelope.request.type = 'LaunchRequest';

      const result = LaunchRequestHandler.canHandle(mockHandlerInput);

      expect(result).toBe(true);
    });

    it('should return false for IntentRequest type', () => {
      mockHandlerInput.requestEnvelope.request.type = 'IntentRequest';
      mockHandlerInput.requestEnvelope.request.intent = { name: 'GetLunchIntent' };

      const result = LaunchRequestHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });

    it('should return false for SessionEndedRequest type', () => {
      mockHandlerInput.requestEnvelope.request.type = 'SessionEndedRequest';

      const result = LaunchRequestHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });

    it('should return false for undefined request type', () => {
      mockHandlerInput.requestEnvelope.request.type = undefined;

      const result = LaunchRequestHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });
  });

  describe('handle', () => {
    beforeEach(() => {
      mockHandlerInput.requestEnvelope.request.type = 'LaunchRequest';
    });

    it('should call speak with welcome message', () => {
      LaunchRequestHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.speak).toHaveBeenCalledTimes(1);
      expect(mockResponseBuilder.speak).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to Lunch Dad')
      );
    });

    it('should call reprompt with follow-up question', () => {
      LaunchRequestHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.reprompt).toHaveBeenCalledTimes(1);
      expect(mockResponseBuilder.reprompt).toHaveBeenCalledWith(
        expect.stringContaining('lunch')
      );
    });

    it('should call getResponse to build final response', () => {
      LaunchRequestHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.getResponse).toHaveBeenCalledTimes(1);
    });

    it('should return response object with correct structure', () => {
      const response = LaunchRequestHandler.handle(mockHandlerInput);

      expect(response).toBeDefined();
      expect(response).toHaveProperty('outputSpeech');
      expect(response).toHaveProperty('reprompt');
    });

    it('should call responseBuilder methods in correct order', () => {
      LaunchRequestHandler.handle(mockHandlerInput);

      // Verify interaction sequence
      const calls = mockResponseBuilder.speak.mock.invocationCallOrder[0];
      const repromptCalls = mockResponseBuilder.reprompt.mock.invocationCallOrder[0];
      const responseCalls = mockResponseBuilder.getResponse.mock.invocationCallOrder[0];

      expect(calls).toBeLessThan(repromptCalls);
      expect(repromptCalls).toBeLessThan(responseCalls);
    });

    it('should include instructions in welcome message', () => {
      LaunchRequestHandler.handle(mockHandlerInput);

      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];
      expect(speakArg.toLowerCase()).toContain('lunch');
    });

    it('should not throw error when called with valid handlerInput', () => {
      expect(() => {
        LaunchRequestHandler.handle(mockHandlerInput);
      }).not.toThrow();
    });
  });

  describe('behavior verification', () => {
    it('should coordinate with responseBuilder correctly', () => {
      mockHandlerInput.requestEnvelope.request.type = 'LaunchRequest';

      const response = LaunchRequestHandler.handle(mockHandlerInput);

      // Verify the conversation between handler and responseBuilder
      expect(mockResponseBuilder.speak).toHaveBeenCalled();
      expect(mockResponseBuilder.reprompt).toHaveBeenCalled();
      expect(mockResponseBuilder.getResponse).toHaveBeenCalled();
      expect(response).toBeDefined();
    });
  });
});
