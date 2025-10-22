/**
 * Unit tests for GetTodayMenuHandler
 * London School TDD Pattern - Mock all dependencies
 */

const GetTodayMenuHandler = require('../../../src/intents/GetTodayMenuHandler');

// Mock dependencies
jest.mock('../../../src/services/nutrisliceService');
jest.mock('../../../src/services/weatherService');
jest.mock('../../../src/utils/menuParser');
jest.mock('../../../src/utils/constants');

const nutrisliceService = require('../../../src/services/nutrisliceService');
const weatherService = require('../../../src/services/weatherService');
const menuParser = require('../../../src/utils/menuParser');
const constants = require('../../../src/utils/constants');

describe('GetTodayMenuHandler', () => {
  let handlerInput;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up constants mock
    constants.ERRORS = {
      NO_MENU: "I couldn't find the lunch menu for that day.",
      API_ERROR: "I'm having trouble getting the menu right now. Please try again later."
    };

    // Standard handler input
    handlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'GetTodayMenuIntent'
          }
        }
      },
      responseBuilder: {
        speak: jest.fn().mockReturnThis(),
        reprompt: jest.fn().mockReturnThis(),
        getResponse: jest.fn().mockReturnValue({ outputSpeech: 'test' })
      }
    };
  });

  describe('canHandle', () => {
    test('returns true for GetTodayMenuIntent', () => {
      const result = GetTodayMenuHandler.canHandle(handlerInput);
      expect(result).toBe(true);
    });

    test('returns false for other intents', () => {
      handlerInput.requestEnvelope.request.intent.name = 'GetTomorrowMenuIntent';
      const result = GetTodayMenuHandler.canHandle(handlerInput);
      expect(result).toBe(false);
    });

    test('returns false for non-IntentRequest', () => {
      handlerInput.requestEnvelope.request.type = 'LaunchRequest';
      const result = GetTodayMenuHandler.canHandle(handlerInput);
      expect(result).toBe(false);
    });
  });

  describe('handle', () => {
    test('returns menu with weather when both available', async () => {
      // Arrange
      const mockMenuData = {
        items: [
          { name: 'Pizza', category: 'Entree' },
          { name: 'Salad', category: 'Side' }
        ]
      };

      const mockWeatherData = {
        temperature: 72,
        conditions: 'Sunny',
        isFallback: false
      };

      const mockMainItems = [
        { name: 'Pizza', category: 'Entree' }
      ];

      nutrisliceService.getMenuForToday.mockResolvedValue(mockMenuData);
      weatherService.getMorningWeather.mockResolvedValue(mockWeatherData);
      menuParser.extractMainItems.mockReturnValue(mockMainItems);
      menuParser.formatMenuItems.mockReturnValue('Pizza');

      // Act
      await GetTodayMenuHandler.handle(handlerInput);

      // Assert
      expect(nutrisliceService.getMenuForToday).toHaveBeenCalledTimes(1);
      expect(weatherService.getMorningWeather).toHaveBeenCalledTimes(1);
      expect(menuParser.extractMainItems).toHaveBeenCalledWith(mockMenuData);
      expect(menuParser.formatMenuItems).toHaveBeenCalledWith(mockMainItems);

      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        expect.stringContaining('72 degrees')
      );
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        expect.stringContaining('sunny')
      );
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        expect.stringContaining('Pizza')
      );
    });

    test('returns menu without weather when weather fails', async () => {
      // Arrange
      const mockMenuData = {
        items: [{ name: 'Burger', category: 'Entree' }]
      };

      const mockMainItems = [{ name: 'Burger', category: 'Entree' }];

      nutrisliceService.getMenuForToday.mockResolvedValue(mockMenuData);
      weatherService.getMorningWeather.mockRejectedValue(new Error('Weather API down'));
      menuParser.extractMainItems.mockReturnValue(mockMainItems);
      menuParser.formatMenuItems.mockReturnValue('Burger');

      // Act
      await GetTodayMenuHandler.handle(handlerInput);

      // Assert
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        "Today's lunch menu includes Burger."
      );
    });

    test('returns error when menu is empty', async () => {
      // Arrange
      nutrisliceService.getMenuForToday.mockResolvedValue({ items: [] });
      weatherService.getMorningWeather.mockResolvedValue(null);

      // Act
      await GetTodayMenuHandler.handle(handlerInput);

      // Assert
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        constants.ERRORS.NO_MENU
      );
    });

    test('returns error when no main items found', async () => {
      // Arrange
      const mockMenuData = {
        items: [{ name: 'Milk', category: 'Beverage' }]
      };

      nutrisliceService.getMenuForToday.mockResolvedValue(mockMenuData);
      weatherService.getMorningWeather.mockResolvedValue(null);
      menuParser.extractMainItems.mockReturnValue([]);

      // Act
      await GetTodayMenuHandler.handle(handlerInput);

      // Assert
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        constants.ERRORS.NO_MENU
      );
    });

    test('handles API errors gracefully', async () => {
      // Arrange
      nutrisliceService.getMenuForToday.mockRejectedValue(new Error('Network error'));
      weatherService.getMorningWeather.mockResolvedValue(null);

      // Act
      await GetTodayMenuHandler.handle(handlerInput);

      // Assert
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        constants.ERRORS.API_ERROR
      );
    });

    test('skips weather context when weather is fallback', async () => {
      // Arrange
      const mockMenuData = {
        items: [{ name: 'Tacos', category: 'Entree' }]
      };

      const mockWeatherData = {
        temperature: null,
        conditions: 'Weather unavailable',
        isFallback: true
      };

      const mockMainItems = [{ name: 'Tacos', category: 'Entree' }];

      nutrisliceService.getMenuForToday.mockResolvedValue(mockMenuData);
      weatherService.getMorningWeather.mockResolvedValue(mockWeatherData);
      menuParser.extractMainItems.mockReturnValue(mockMainItems);
      menuParser.formatMenuItems.mockReturnValue('Tacos');

      // Act
      await GetTodayMenuHandler.handle(handlerInput);

      // Assert
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        "Today's lunch menu includes Tacos."
      );
    });
  });
});
