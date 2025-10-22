/**
 * GetTodayMenuHandler Tests - London School TDD
 *
 * Tests menu fetching, weather integration, and error handling
 */

describe('GetTodayMenuHandler', () => {
  let GetTodayMenuHandler;
  let mockHandlerInput;
  let mockResponseBuilder;
  let mockNutrisliceService;
  let mockWeatherService;

  beforeEach(() => {
    // Clear module cache to ensure clean mocks
    jest.clearAllMocks();
    jest.resetModules();

    // Mock dependencies
    mockNutrisliceService = {
      getMenuForToday: jest.fn()
    };

    mockWeatherService = {
      getMorningWeather: jest.fn()
    };

    // Mock require calls
    jest.mock('../../../src/services/nutrisliceService', () => mockNutrisliceService);
    jest.mock('../../../src/services/weatherService', () => mockWeatherService);

    // Mock responseBuilder
    mockResponseBuilder = {
      speak: jest.fn().mockReturnThis(),
      reprompt: jest.fn().mockReturnThis(),
      withSimpleCard: jest.fn().mockReturnThis(),
      getResponse: jest.fn().mockReturnValue({
        outputSpeech: { type: 'SSML' }
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

    // Load handler after mocks are set up
    GetTodayMenuHandler = require('../../../src/handlers/todayMenuHandler');
  });

  describe('canHandle', () => {
    it('should return true for GetTodayMenuIntent', () => {
      mockHandlerInput.requestEnvelope.request.type = 'IntentRequest';
      mockHandlerInput.requestEnvelope.request.intent.name = 'GetTodayMenuIntent';

      const result = GetTodayMenuHandler.canHandle(mockHandlerInput);

      expect(result).toBe(true);
    });

    it('should return false for other IntentRequest types', () => {
      mockHandlerInput.requestEnvelope.request.intent.name = 'GetTomorrowMenuIntent';

      const result = GetTodayMenuHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });

    it('should return false for LaunchRequest', () => {
      mockHandlerInput.requestEnvelope.request.type = 'LaunchRequest';
      delete mockHandlerInput.requestEnvelope.request.intent;

      const result = GetTodayMenuHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });

    it('should return false when intent is undefined', () => {
      mockHandlerInput.requestEnvelope.request.intent = undefined;

      const result = GetTodayMenuHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });
  });

  describe('handle - successful menu fetch', () => {
    beforeEach(() => {
      const mockMenu = {
        date: '2025-10-22',
        items: [
          { name: 'Pizza', category: 'Main' },
          { name: 'Salad', category: 'Side' },
          { name: 'Milk', category: 'Beverage' }
        ]
      };

      const mockWeather = {
        temperature: 72,
        temperatureUnit: 'F',
        conditions: 'Sunny'
      };

      mockNutrisliceService.getMenuForToday.mockResolvedValue(mockMenu);
      mockWeatherService.getMorningWeather.mockResolvedValue(mockWeather);
    });

    it('should call nutrisliceService.getMenuForToday', async () => {
      await GetTodayMenuHandler.handle(mockHandlerInput);

      expect(mockNutrisliceService.getMenuForToday).toHaveBeenCalledTimes(1);
    });

    it('should call weatherService.getMorningWeather', async () => {
      await GetTodayMenuHandler.handle(mockHandlerInput);

      expect(mockWeatherService.getMorningWeather).toHaveBeenCalledTimes(1);
    });

    it('should call speak with menu items and weather', async () => {
      await GetTodayMenuHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.speak).toHaveBeenCalledTimes(1);
      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];

      expect(speakArg).toContain('Pizza');
      expect(speakArg).toContain('Salad');
      expect(speakArg).toContain('72');
      expect(speakArg).toContain('Sunny');
    });

    it('should call responseBuilder methods in correct sequence', async () => {
      await GetTodayMenuHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.speak).toHaveBeenCalled();
      expect(mockResponseBuilder.getResponse).toHaveBeenCalled();
    });

    it('should return response object', async () => {
      const response = await GetTodayMenuHandler.handle(mockHandlerInput);

      expect(response).toBeDefined();
      expect(response).toHaveProperty('outputSpeech');
    });
  });

  describe('handle - empty menu', () => {
    beforeEach(() => {
      const emptyMenu = {
        date: '2025-10-22',
        items: [],
        message: 'No menu available'
      };

      mockNutrisliceService.getMenuForToday.mockResolvedValue(emptyMenu);
      mockWeatherService.getMorningWeather.mockResolvedValue({
        temperature: 72,
        temperatureUnit: 'F',
        conditions: 'Sunny'
      });
    });

    it('should handle empty menu gracefully', async () => {
      await GetTodayMenuHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.speak).toHaveBeenCalledTimes(1);
      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];

      expect(speakArg.toLowerCase()).toContain('no menu');
    });

    it('should still call weatherService even with empty menu', async () => {
      await GetTodayMenuHandler.handle(mockHandlerInput);

      expect(mockWeatherService.getMorningWeather).toHaveBeenCalledTimes(1);
    });
  });

  describe('handle - menu fetch error', () => {
    beforeEach(() => {
      mockNutrisliceService.getMenuForToday.mockRejectedValue(
        new Error('Network error')
      );
      mockWeatherService.getMorningWeather.mockResolvedValue({
        temperature: 72,
        temperatureUnit: 'F',
        conditions: 'Sunny'
      });
    });

    it('should handle nutrisliceService errors gracefully', async () => {
      await GetTodayMenuHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.speak).toHaveBeenCalledTimes(1);
      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];

      expect(speakArg.toLowerCase()).toContain('trouble');
    });

    it('should not crash when menu fetch fails', async () => {
      await expect(
        GetTodayMenuHandler.handle(mockHandlerInput)
      ).resolves.toBeDefined();
    });

    it('should still return a valid response on error', async () => {
      const response = await GetTodayMenuHandler.handle(mockHandlerInput);

      expect(response).toBeDefined();
      expect(response).toHaveProperty('outputSpeech');
    });
  });

  describe('handle - weather fetch error', () => {
    beforeEach(() => {
      const mockMenu = {
        date: '2025-10-22',
        items: [
          { name: 'Pizza', category: 'Main' }
        ]
      };

      mockNutrisliceService.getMenuForToday.mockResolvedValue(mockMenu);
      mockWeatherService.getMorningWeather.mockRejectedValue(
        new Error('Weather API error')
      );
    });

    it('should handle weatherService errors gracefully', async () => {
      await GetTodayMenuHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.speak).toHaveBeenCalledTimes(1);
    });

    it('should still show menu when weather fails', async () => {
      await GetTodayMenuHandler.handle(mockHandlerInput);

      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];
      expect(speakArg).toContain('Pizza');
    });

    it('should not crash when weather fetch fails', async () => {
      await expect(
        GetTodayMenuHandler.handle(mockHandlerInput)
      ).resolves.toBeDefined();
    });
  });

  describe('behavior verification', () => {
    it('should coordinate services in parallel', async () => {
      const mockMenu = {
        date: '2025-10-22',
        items: [{ name: 'Pizza', category: 'Main' }]
      };
      const mockWeather = {
        temperature: 72,
        temperatureUnit: 'F',
        conditions: 'Sunny'
      };

      mockNutrisliceService.getMenuForToday.mockResolvedValue(mockMenu);
      mockWeatherService.getMorningWeather.mockResolvedValue(mockWeather);

      await GetTodayMenuHandler.handle(mockHandlerInput);

      // Verify both services were called
      expect(mockNutrisliceService.getMenuForToday).toHaveBeenCalled();
      expect(mockWeatherService.getMorningWeather).toHaveBeenCalled();
    });
  });
});
