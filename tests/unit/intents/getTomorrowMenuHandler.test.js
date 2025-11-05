/**
 * Unit tests for GetTomorrowMenuHandler
 * London School TDD Pattern - Mock all dependencies
 */

const GetTomorrowMenuHandler = require('../../../src/intents/GetTomorrowMenuHandler');

// Mock dependencies
jest.mock('../../../src/services/nutrisliceService');
jest.mock('../../../src/services/weatherService');
jest.mock('../../../src/utils/menuParser');
jest.mock('../../../src/utils/dateUtils');
jest.mock('../../../src/utils/constants');

const nutrisliceService = require('../../../src/services/nutrisliceService');
const weatherService = require('../../../src/services/weatherService');
const menuParser = require('../../../src/utils/menuParser');
const dateUtils = require('../../../src/utils/dateUtils');
const constants = require('../../../src/utils/constants');

describe('GetTomorrowMenuHandler', () => {
  let handlerInput;
  let mockToday;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up constants mock
    constants.ERRORS = {
      NO_MENU: "I couldn't find the lunch menu for that day.",
      API_ERROR: "I'm having trouble getting the menu right now. Please try again later."
    };

    // Mock current date (Monday, Oct 20, 2025)
    mockToday = new Date('2025-10-20T08:00:00.000Z');
    // Don't mock Date here - we'll do it per-test as needed

    // Standard handler input
    handlerInput = {
      requestEnvelope: {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'GetTomorrowMenuIntent'
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('canHandle', () => {
    test('returns true for GetTomorrowMenuIntent', () => {
      const result = GetTomorrowMenuHandler.canHandle(handlerInput);
      expect(result).toBe(true);
    });

    test('returns false for other intents', () => {
      handlerInput.requestEnvelope.request.intent.name = 'GetTodayMenuIntent';
      const result = GetTomorrowMenuHandler.canHandle(handlerInput);
      expect(result).toBe(false);
    });

    test('returns false for non-IntentRequest', () => {
      handlerInput.requestEnvelope.request.type = 'LaunchRequest';
      const result = GetTomorrowMenuHandler.canHandle(handlerInput);
      expect(result).toBe(false);
    });
  });

  describe('handle', () => {
    test('returns tomorrow menu when tomorrow is actual next day', async () => {
      // Arrange - Mock timezone-aware "today" and "tomorrow"
      const mockToday = new Date('2025-10-20T12:00:00Z'); // Monday in UTC
      const mockTomorrow = new Date('2025-10-21T12:00:00Z'); // Tuesday

      const mockMenuData = {
        items: [{ name: 'Spaghetti', category: 'Entree' }]
      };

      const mockMainItems = [{ name: 'Spaghetti', category: 'Entree' }];

      // Mock the timezone-aware date function
      dateUtils.getTodayInTimezone.mockReturnValue(mockToday);
      dateUtils.getNextSchoolDay.mockReturnValue(mockTomorrow);
      nutrisliceService.getMenuForTomorrow.mockResolvedValue(mockMenuData);
      weatherService.getTomorrowWeather.mockResolvedValue({
        tomorrow: {
          dayName: 'Tuesday',
          temperature: 50,
          temperatureUnit: 'F',
          detailedForecast: 'Partly cloudy with a high near 50. West wind around 10 mph',
          shortForecast: 'Partly Cloudy'
        },
        isFallback: false
      });
      menuParser.extractMainItems.mockReturnValue(mockMainItems);
      menuParser.formatMenuItems.mockReturnValue('Spaghetti');

      // Act
      await GetTomorrowMenuHandler.handle(handlerInput);

      // Assert
      expect(nutrisliceService.getMenuForTomorrow).toHaveBeenCalledTimes(1);
      expect(menuParser.extractMainItems).toHaveBeenCalledWith(mockMenuData);
      expect(menuParser.formatMenuItems).toHaveBeenCalledWith(mockMainItems);

      // Should include both weather and menu
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        expect.stringContaining("Tomorrow's lunch menu includes Spaghetti")
      );
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        expect.stringContaining("Tuesday's forecast is partly cloudy with a high of 50")
      );
    });

    test('returns next school day when skipping weekend', async () => {
      // Arrange - Asking about "tomorrow" when next school day is several days away
      // Return a date that's NOT tomorrow (4 days away to clearly demonstrate skip logic)
      const mockFutureSchoolDay = new Date('2025-10-28T08:00:00.000Z'); // Tuesday, 4 days away

      const mockMenuData = {
        items: [{ name: 'Chicken Nuggets', category: 'Entree' }]
      };

      const mockMainItems = [{ name: 'Chicken Nuggets', category: 'Entree' }];

      dateUtils.getNextSchoolDay.mockReturnValue(mockFutureSchoolDay);
      nutrisliceService.getMenuForTomorrow.mockResolvedValue(mockMenuData);
      menuParser.extractMainItems.mockReturnValue(mockMainItems);
      menuParser.formatMenuItems.mockReturnValue('Chicken Nuggets');

      // Act
      await GetTomorrowMenuHandler.handle(handlerInput);

      // Assert
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        expect.stringContaining('next school lunch is on Tuesday')
      );
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        expect.stringContaining('Chicken Nuggets')
      );
    });

    test('returns error when menu is empty', async () => {
      // Arrange
      const mockTomorrow = new Date('2025-10-21T08:00:00.000Z');

      dateUtils.getNextSchoolDay.mockReturnValue(mockTomorrow);
      nutrisliceService.getMenuForTomorrow.mockResolvedValue({ items: [] });

      // Act
      await GetTomorrowMenuHandler.handle(handlerInput);

      // Assert
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        constants.ERRORS.NO_MENU
      );
    });

    test('returns error when no main items found', async () => {
      // Arrange
      const mockTomorrow = new Date('2025-10-21T08:00:00.000Z');

      const mockMenuData = {
        items: [{ name: 'Milk', category: 'Beverage' }]
      };

      dateUtils.getNextSchoolDay.mockReturnValue(mockTomorrow);
      nutrisliceService.getMenuForTomorrow.mockResolvedValue(mockMenuData);
      menuParser.extractMainItems.mockReturnValue([]);

      // Act
      await GetTomorrowMenuHandler.handle(handlerInput);

      // Assert
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        constants.ERRORS.NO_MENU
      );
    });

    test('handles API errors gracefully', async () => {
      // Arrange
      const mockTomorrow = new Date('2025-10-21T08:00:00.000Z');

      dateUtils.getNextSchoolDay.mockReturnValue(mockTomorrow);
      nutrisliceService.getMenuForTomorrow.mockRejectedValue(new Error('Network error'));

      // Act
      await GetTomorrowMenuHandler.handle(handlerInput);

      // Assert
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        constants.ERRORS.API_ERROR
      );
    });

    test('handles multiple items in menu', async () => {
      // Arrange - Mock timezone-aware "today" and "tomorrow"
      const mockToday = new Date('2025-10-20T12:00:00Z'); // Monday in UTC
      const mockTomorrow = new Date('2025-10-21T12:00:00Z'); // Tuesday

      const mockMenuData = {
        items: [
          { name: 'Pizza', category: 'Entree' },
          { name: 'Burger', category: 'Entree' },
          { name: 'Salad', category: 'Side' }
        ]
      };

      const mockMainItems = [
        { name: 'Pizza', category: 'Entree' },
        { name: 'Burger', category: 'Entree' }
      ];

      // Mock the timezone-aware date function
      dateUtils.getTodayInTimezone.mockReturnValue(mockToday);
      dateUtils.getNextSchoolDay.mockReturnValue(mockTomorrow);
      nutrisliceService.getMenuForTomorrow.mockResolvedValue(mockMenuData);
      weatherService.getTomorrowWeather.mockResolvedValue({
        tomorrow: {
          dayName: 'Tuesday',
          temperature: 50,
          temperatureUnit: 'F',
          detailedForecast: 'Partly cloudy with a high near 50. West wind around 10 mph',
          shortForecast: 'Partly Cloudy'
        },
        isFallback: false
      });
      menuParser.extractMainItems.mockReturnValue(mockMainItems);
      menuParser.formatMenuItems.mockReturnValue('Pizza and Burger');

      // Act
      await GetTomorrowMenuHandler.handle(handlerInput);

      // Assert - Should include both weather and menu
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        expect.stringContaining("Tomorrow's lunch menu includes Pizza and Burger")
      );
      expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
        expect.stringContaining("Tuesday's forecast is partly cloudy with a high of 50")
      );
    });
  });
});
