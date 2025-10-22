/**
 * HelpIntentHandler Tests - London School TDD
 *
 * Tests help intent with mock response builder
 */

const HelpIntentHandler = require('../../../src/handlers/HelpIntentHandler');

describe('HelpIntentHandler', () => {
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
          type: 'IntentRequest',
          requestId: 'test-request-id',
          intent: {
            name: 'AMAZON.HelpIntent'
          }
        }
      },
      responseBuilder: mockResponseBuilder
    };
  });

  describe('canHandle', () => {
    it('should return true for AMAZON.HelpIntent', () => {
      mockHandlerInput.requestEnvelope.request.type = 'IntentRequest';
      mockHandlerInput.requestEnvelope.request.intent.name = 'AMAZON.HelpIntent';

      const result = HelpIntentHandler.canHandle(mockHandlerInput);

      expect(result).toBe(true);
    });

    it('should return false for other intents', () => {
      mockHandlerInput.requestEnvelope.request.intent.name = 'GetTodayMenuIntent';

      const result = HelpIntentHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });

    it('should return false for LaunchRequest', () => {
      mockHandlerInput.requestEnvelope.request.type = 'LaunchRequest';
      delete mockHandlerInput.requestEnvelope.request.intent;

      const result = HelpIntentHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });

    it('should return false when intent is undefined', () => {
      mockHandlerInput.requestEnvelope.request.intent = undefined;

      const result = HelpIntentHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });

    it('should require exact IntentRequest type', () => {
      mockHandlerInput.requestEnvelope.request.type = 'SessionEndedRequest';

      const result = HelpIntentHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });
  });

  describe('handle', () => {
    it('should call speak with help message', () => {
      HelpIntentHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.speak).toHaveBeenCalledTimes(1);
    });

    it('should provide instructions about skill usage', () => {
      HelpIntentHandler.handle(mockHandlerInput);

      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];
      expect(speakArg.toLowerCase()).toContain('lunch');
    });

    it('should mention available intents in help text', () => {
      HelpIntentHandler.handle(mockHandlerInput);

      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];
      expect(speakArg.toLowerCase()).toMatch(/today|tomorrow|menu/);
    });

    it('should call reprompt with same or similar message', () => {
      HelpIntentHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.reprompt).toHaveBeenCalledTimes(1);
    });

    it('should call getResponse to build final response', () => {
      HelpIntentHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.getResponse).toHaveBeenCalledTimes(1);
    });

    it('should return response object with correct structure', () => {
      const response = HelpIntentHandler.handle(mockHandlerInput);

      expect(response).toBeDefined();
      expect(response).toHaveProperty('outputSpeech');
      expect(response).toHaveProperty('reprompt');
    });

    it('should call responseBuilder methods in correct order', () => {
      HelpIntentHandler.handle(mockHandlerInput);

      const speakOrder = mockResponseBuilder.speak.mock.invocationCallOrder[0];
      const repromptOrder = mockResponseBuilder.reprompt.mock.invocationCallOrder[0];
      const responseOrder = mockResponseBuilder.getResponse.mock.invocationCallOrder[0];

      expect(speakOrder).toBeLessThan(repromptOrder);
      expect(repromptOrder).toBeLessThan(responseOrder);
    });

    it('should not throw error when called', () => {
      expect(() => {
        HelpIntentHandler.handle(mockHandlerInput);
      }).not.toThrow();
    });

    it('should provide actionable instructions', () => {
      HelpIntentHandler.handle(mockHandlerInput);

      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];
      // Should contain example phrases users can say
      expect(speakArg.toLowerCase()).toMatch(/ask|say|tell/);
    });
  });

  describe('behavior verification', () => {
    it('should coordinate with responseBuilder correctly', () => {
      const response = HelpIntentHandler.handle(mockHandlerInput);

      // Verify the conversation between handler and responseBuilder
      expect(mockResponseBuilder.speak).toHaveBeenCalled();
      expect(mockResponseBuilder.reprompt).toHaveBeenCalled();
      expect(mockResponseBuilder.getResponse).toHaveBeenCalled();
      expect(response).toBeDefined();
    });

    it('should keep session open for follow-up', () => {
      HelpIntentHandler.handle(mockHandlerInput);

      // Reprompt indicates session should stay open
      expect(mockResponseBuilder.reprompt).toHaveBeenCalled();
    });
  });
});
