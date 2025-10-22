/**
 * Tests for responseBuilder utility (London School TDD)
 * Focus: Mock-driven development and behavior verification
 */

const responseBuilder = require('../../../src/utils/responseBuilder');
const constants = require('../../../src/utils/constants');

describe('responseBuilder - London School TDD', () => {
  // Mock ResponseBuilder from ASK SDK
  let mockResponseBuilder;
  let mockHandlerInput;

  beforeEach(() => {
    // Create mock ResponseBuilder with chainable methods
    mockResponseBuilder = {
      speak: jest.fn().mockReturnThis(),
      reprompt: jest.fn().mockReturnThis(),
      withShouldEndSession: jest.fn().mockReturnThis(),
      addDirective: jest.fn().mockReturnThis(),
      getResponse: jest.fn().mockReturnValue({ outputSpeech: 'mocked response' })
    };

    // Mock HandlerInput with device capabilities
    mockHandlerInput = {
      responseBuilder: mockResponseBuilder,
      requestEnvelope: {
        context: {
          System: {
            device: {
              supportedInterfaces: {}
            }
          }
        }
      }
    };
  });

  describe('buildVoiceResponse', () => {
    it('should create simple voice response with end session', () => {
      const speechText = 'Test speech output';
      const shouldEndSession = true;

      responseBuilder.buildVoiceResponse(mockHandlerInput, speechText, shouldEndSession);

      // Verify interactions with ResponseBuilder
      expect(mockResponseBuilder.speak).toHaveBeenCalledWith(speechText);
      expect(mockResponseBuilder.withShouldEndSession).toHaveBeenCalledWith(true);
      expect(mockResponseBuilder.getResponse).toHaveBeenCalled();
    });

    it('should create voice response without ending session', () => {
      const speechText = 'Keep session open';
      const shouldEndSession = false;

      responseBuilder.buildVoiceResponse(mockHandlerInput, speechText, shouldEndSession);

      expect(mockResponseBuilder.speak).toHaveBeenCalledWith(speechText);
      expect(mockResponseBuilder.withShouldEndSession).toHaveBeenCalledWith(false);
      expect(mockResponseBuilder.getResponse).toHaveBeenCalled();
    });

    it('should default to not ending session if parameter omitted', () => {
      const speechText = 'Default behavior test';

      responseBuilder.buildVoiceResponse(mockHandlerInput, speechText);

      expect(mockResponseBuilder.speak).toHaveBeenCalledWith(speechText);
      expect(mockResponseBuilder.withShouldEndSession).toHaveBeenCalledWith(false);
    });

    it('should call methods in correct order (speak -> withShouldEndSession -> getResponse)', () => {
      const calls = [];

      mockResponseBuilder.speak.mockImplementation((text) => {
        calls.push('speak');
        return mockResponseBuilder;
      });
      mockResponseBuilder.withShouldEndSession.mockImplementation((flag) => {
        calls.push('withShouldEndSession');
        return mockResponseBuilder;
      });
      mockResponseBuilder.getResponse.mockImplementation(() => {
        calls.push('getResponse');
        return { outputSpeech: 'response' };
      });

      responseBuilder.buildVoiceResponse(mockHandlerInput, 'test', true);

      expect(calls).toEqual(['speak', 'withShouldEndSession', 'getResponse']);
    });
  });

  describe('formatMenuForSpeech', () => {
    it('should format single item without connectors', () => {
      const items = ['Chicken Sandwich'];
      const result = responseBuilder.formatMenuForSpeech(items);

      expect(result).toBe('Chicken Sandwich');
    });

    it('should format two items with "and"', () => {
      const items = ['Pizza', 'Salad'];
      const result = responseBuilder.formatMenuForSpeech(items);

      expect(result).toBe('Pizza and Salad');
    });

    it('should format three items with commas and "and"', () => {
      const items = ['Burger', 'Fries', 'Juice'];
      const result = responseBuilder.formatMenuForSpeech(items);

      expect(result).toBe('Burger, Fries, and Juice');
    });

    it('should format four or more items with Oxford comma', () => {
      const items = ['Chicken', 'Rice', 'Beans', 'Vegetables', 'Milk'];
      const result = responseBuilder.formatMenuForSpeech(items);

      expect(result).toBe('Chicken, Rice, Beans, Vegetables, and Milk');
    });

    it('should handle empty array gracefully', () => {
      const items = [];
      const result = responseBuilder.formatMenuForSpeech(items);

      expect(result).toBe('');
    });

    it('should trim whitespace from items', () => {
      const items = ['  Pizza  ', '  Salad  '];
      const result = responseBuilder.formatMenuForSpeech(items);

      expect(result).toBe('Pizza and Salad');
    });
  });

  describe('buildMenuResponse', () => {
    const mockMenuItems = ['Spicy Chicken Sandwich', 'Individual Cheese Pizza', 'Sun Butter and Jelly Sandwich'];
    const mockWeatherData = {
      temperature: 72,
      condition: 'Sunny',
      icon: 'sun'
    };

    it('should build voice-only response when APL not supported', () => {
      const dateContext = 'today';

      const result = responseBuilder.buildMenuResponse(
        mockHandlerInput,
        mockMenuItems,
        dateContext,
        false, // includeAPL
        mockWeatherData
      );

      const expectedSpeech = "Today's lunch includes Spicy Chicken Sandwich, Individual Cheese Pizza, and Sun Butter and Jelly Sandwich.";

      expect(mockResponseBuilder.speak).toHaveBeenCalledWith(expectedSpeech);
      expect(mockResponseBuilder.addDirective).not.toHaveBeenCalled();
      expect(mockResponseBuilder.getResponse).toHaveBeenCalled();
    });

    it('should build response with APL when supported', () => {
      const dateContext = 'tomorrow';

      const result = responseBuilder.buildMenuResponse(
        mockHandlerInput,
        mockMenuItems,
        dateContext,
        true, // includeAPL
        mockWeatherData
      );

      const expectedSpeech = "Tomorrow's lunch includes Spicy Chicken Sandwich, Individual Cheese Pizza, and Sun Butter and Jelly Sandwich.";

      expect(mockResponseBuilder.speak).toHaveBeenCalledWith(expectedSpeech);
      expect(mockResponseBuilder.addDirective).toHaveBeenCalled();

      // Verify APL directive structure
      const aplDirectiveCall = mockResponseBuilder.addDirective.mock.calls[0][0];
      expect(aplDirectiveCall.type).toBe('Alexa.Presentation.APL.RenderDocument');
      expect(aplDirectiveCall.document).toBeDefined();
      expect(aplDirectiveCall.datasources).toBeDefined();
    });

    it('should include weather data in APL datasources', () => {
      responseBuilder.buildMenuResponse(
        mockHandlerInput,
        mockMenuItems,
        'today',
        true,
        mockWeatherData
      );

      const aplDirectiveCall = mockResponseBuilder.addDirective.mock.calls[0][0];
      expect(aplDirectiveCall.datasources.menuData.weather).toEqual(mockWeatherData);
    });

    it('should include menu items in APL datasources', () => {
      responseBuilder.buildMenuResponse(
        mockHandlerInput,
        mockMenuItems,
        'today',
        true,
        mockWeatherData
      );

      const aplDirectiveCall = mockResponseBuilder.addDirective.mock.calls[0][0];
      expect(aplDirectiveCall.datasources.menuData.items).toEqual(mockMenuItems);
      expect(aplDirectiveCall.datasources.menuData.dateContext).toBe('today');
    });

    it('should handle null weather data gracefully', () => {
      responseBuilder.buildMenuResponse(
        mockHandlerInput,
        mockMenuItems,
        'today',
        true,
        null // no weather data
      );

      const aplDirectiveCall = mockResponseBuilder.addDirective.mock.calls[0][0];
      expect(aplDirectiveCall.datasources.menuData.weather).toBeNull();
    });

    it('should not end session for menu response', () => {
      responseBuilder.buildMenuResponse(
        mockHandlerInput,
        mockMenuItems,
        'today',
        false,
        mockWeatherData
      );

      expect(mockResponseBuilder.withShouldEndSession).toHaveBeenCalledWith(false);
    });
  });

  describe('buildLaunchResponse', () => {
    it('should create welcome message', () => {
      responseBuilder.buildLaunchResponse(mockHandlerInput);

      const expectedSpeech = "Welcome to Lunch Dad! You can ask what's for lunch today or tomorrow. What would you like to know?";

      expect(mockResponseBuilder.speak).toHaveBeenCalledWith(expectedSpeech);
      expect(mockResponseBuilder.reprompt).toHaveBeenCalledWith(expectedSpeech);
      expect(mockResponseBuilder.withShouldEndSession).toHaveBeenCalledWith(false);
    });

    it('should include reprompt for better UX', () => {
      responseBuilder.buildLaunchResponse(mockHandlerInput);

      expect(mockResponseBuilder.reprompt).toHaveBeenCalled();
      expect(mockResponseBuilder.getResponse).toHaveBeenCalled();
    });
  });

  describe('buildHelpResponse', () => {
    it('should create help message with instructions', () => {
      responseBuilder.buildHelpResponse(mockHandlerInput);

      const expectedSpeech = "You can ask me what's for lunch today or tomorrow. For example, say 'what's for lunch today?' What would you like to know?";

      expect(mockResponseBuilder.speak).toHaveBeenCalledWith(expectedSpeech);
      expect(mockResponseBuilder.reprompt).toHaveBeenCalledWith("What would you like to know?");
      expect(mockResponseBuilder.withShouldEndSession).toHaveBeenCalledWith(false);
    });

    it('should keep session open for follow-up', () => {
      responseBuilder.buildHelpResponse(mockHandlerInput);

      expect(mockResponseBuilder.withShouldEndSession).toHaveBeenCalledWith(false);
    });
  });

  describe('buildErrorResponse', () => {
    it('should create error response with custom message', () => {
      const errorMessage = 'Custom error occurred';

      responseBuilder.buildErrorResponse(mockHandlerInput, errorMessage);

      expect(mockResponseBuilder.speak).toHaveBeenCalledWith(errorMessage);
      expect(mockResponseBuilder.withShouldEndSession).toHaveBeenCalledWith(true);
    });

    it('should use default API error message if none provided', () => {
      responseBuilder.buildErrorResponse(mockHandlerInput);

      expect(mockResponseBuilder.speak).toHaveBeenCalledWith(constants.ERRORS.API_ERROR);
    });

    it('should end session on error', () => {
      responseBuilder.buildErrorResponse(mockHandlerInput, 'Error');

      expect(mockResponseBuilder.withShouldEndSession).toHaveBeenCalledWith(true);
      expect(mockResponseBuilder.getResponse).toHaveBeenCalled();
    });
  });

  describe('supportsAPL - Device capability detection', () => {
    it('should detect when device supports APL', () => {
      mockHandlerInput.requestEnvelope.context.System.device.supportedInterfaces['Alexa.Presentation.APL'] = {};

      const result = responseBuilder.supportsAPL(mockHandlerInput);

      expect(result).toBe(true);
    });

    it('should detect when device does not support APL', () => {
      // supportedInterfaces is empty by default
      const result = responseBuilder.supportsAPL(mockHandlerInput);

      expect(result).toBe(false);
    });

    it('should handle missing device information gracefully', () => {
      mockHandlerInput.requestEnvelope.context.System.device = {};

      const result = responseBuilder.supportsAPL(mockHandlerInput);

      expect(result).toBe(false);
    });
  });

  describe('Response Builder Interaction Patterns', () => {
    it('should verify chaining pattern is used correctly', () => {
      // Track the context (this) for each call
      let speakContext, sessionContext, responseContext;

      mockResponseBuilder.speak.mockImplementation(function(text) {
        speakContext = this;
        return this;
      });
      mockResponseBuilder.withShouldEndSession.mockImplementation(function(flag) {
        sessionContext = this;
        return this;
      });
      mockResponseBuilder.getResponse.mockImplementation(function() {
        responseContext = this;
        return { outputSpeech: 'response' };
      });

      responseBuilder.buildVoiceResponse(mockHandlerInput, 'test', false);

      // All methods should be called on the same object (chaining)
      expect(speakContext).toBe(mockResponseBuilder);
      expect(sessionContext).toBe(mockResponseBuilder);
      expect(responseContext).toBe(mockResponseBuilder);
    });

    it('should not call unnecessary methods for simple responses', () => {
      responseBuilder.buildVoiceResponse(mockHandlerInput, 'simple', true);

      // Should NOT call addDirective for simple voice response
      expect(mockResponseBuilder.addDirective).not.toHaveBeenCalled();
      // Should NOT call reprompt for simple response
      expect(mockResponseBuilder.reprompt).not.toHaveBeenCalled();
    });
  });
});
