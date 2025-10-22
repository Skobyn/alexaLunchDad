/**
 * GetTomorrowMenuHandler Tests - London School TDD
 *
 * Tests tomorrow's menu fetching with error handling
 */

describe('GetTomorrowMenuHandler', () => {
  let GetTomorrowMenuHandler;
  let mockHandlerInput;
  let mockResponseBuilder;
  let mockNutrisliceService;

  beforeEach(() => {
    // Clear module cache
    jest.clearAllMocks();
    jest.resetModules();

    // Mock nutrisliceService
    mockNutrisliceService = {
      getMenuForTomorrow: jest.fn()
    };

    // Mock require calls
    jest.mock('../../../src/services/nutrisliceService', () => mockNutrisliceService);

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
            name: 'GetTomorrowMenuIntent'
          }
        }
      },
      responseBuilder: mockResponseBuilder
    };

    // Load handler after mocks
    GetTomorrowMenuHandler = require('../../../src/handlers/tomorrowMenuHandler');
  });

  describe('canHandle', () => {
    it('should return true for GetTomorrowMenuIntent', () => {
      mockHandlerInput.requestEnvelope.request.type = 'IntentRequest';
      mockHandlerInput.requestEnvelope.request.intent.name = 'GetTomorrowMenuIntent';

      const result = GetTomorrowMenuHandler.canHandle(mockHandlerInput);

      expect(result).toBe(true);
    });

    it('should return false for GetTodayMenuIntent', () => {
      mockHandlerInput.requestEnvelope.request.intent.name = 'GetTodayMenuIntent';

      const result = GetTomorrowMenuHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });

    it('should return false for LaunchRequest', () => {
      mockHandlerInput.requestEnvelope.request.type = 'LaunchRequest';
      delete mockHandlerInput.requestEnvelope.request.intent;

      const result = GetTomorrowMenuHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });

    it('should return false when intent is undefined', () => {
      mockHandlerInput.requestEnvelope.request.intent = undefined;

      const result = GetTomorrowMenuHandler.canHandle(mockHandlerInput);

      expect(result).toBe(false);
    });
  });

  describe('handle - successful menu fetch', () => {
    beforeEach(() => {
      const mockMenu = {
        date: '2025-10-23',
        items: [
          { name: 'Tacos', category: 'Main' },
          { name: 'Rice', category: 'Side' },
          { name: 'Apple', category: 'Fruit' }
        ]
      };

      mockNutrisliceService.getMenuForTomorrow.mockResolvedValue(mockMenu);
    });

    it('should call nutrisliceService.getMenuForTomorrow', async () => {
      await GetTomorrowMenuHandler.handle(mockHandlerInput);

      expect(mockNutrisliceService.getMenuForTomorrow).toHaveBeenCalledTimes(1);
    });

    it('should call speak with menu items', async () => {
      await GetTomorrowMenuHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.speak).toHaveBeenCalledTimes(1);
      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];

      expect(speakArg).toContain('Tacos');
      expect(speakArg).toContain('Rice');
      expect(speakArg).toContain('Apple');
    });

    it('should mention "tomorrow" in response', async () => {
      await GetTomorrowMenuHandler.handle(mockHandlerInput);

      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];
      expect(speakArg.toLowerCase()).toContain('tomorrow');
    });

    it('should call getResponse to build response', async () => {
      await GetTomorrowMenuHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.getResponse).toHaveBeenCalledTimes(1);
    });

    it('should return response object', async () => {
      const response = await GetTomorrowMenuHandler.handle(mockHandlerInput);

      expect(response).toBeDefined();
      expect(response).toHaveProperty('outputSpeech');
    });
  });

  describe('handle - empty menu', () => {
    beforeEach(() => {
      const emptyMenu = {
        date: '2025-10-23',
        items: [],
        message: 'No menu available for this date'
      };

      mockNutrisliceService.getMenuForTomorrow.mockResolvedValue(emptyMenu);
    });

    it('should handle empty menu gracefully', async () => {
      await GetTomorrowMenuHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.speak).toHaveBeenCalledTimes(1);
      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];

      expect(speakArg.toLowerCase()).toContain('no menu');
    });

    it('should return valid response for empty menu', async () => {
      const response = await GetTomorrowMenuHandler.handle(mockHandlerInput);

      expect(response).toBeDefined();
      expect(response).toHaveProperty('outputSpeech');
    });
  });

  describe('handle - weekend handling', () => {
    beforeEach(() => {
      const weekendMenu = {
        date: '2025-10-25', // Saturday
        items: [],
        message: "There's no school lunch on weekends"
      };

      mockNutrisliceService.getMenuForTomorrow.mockResolvedValue(weekendMenu);
    });

    it('should handle weekend appropriately', async () => {
      await GetTomorrowMenuHandler.handle(mockHandlerInput);

      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];
      expect(speakArg.toLowerCase()).toMatch(/weekend|no school/);
    });
  });

  describe('handle - menu fetch error', () => {
    beforeEach(() => {
      mockNutrisliceService.getMenuForTomorrow.mockRejectedValue(
        new Error('Failed to fetch menu')
      );
    });

    it('should handle nutrisliceService errors gracefully', async () => {
      await GetTomorrowMenuHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.speak).toHaveBeenCalledTimes(1);
      const speakArg = mockResponseBuilder.speak.mock.calls[0][0];

      expect(speakArg.toLowerCase()).toContain('trouble');
    });

    it('should not crash when menu fetch fails', async () => {
      await expect(
        GetTomorrowMenuHandler.handle(mockHandlerInput)
      ).resolves.toBeDefined();
    });

    it('should return valid response on error', async () => {
      const response = await GetTomorrowMenuHandler.handle(mockHandlerInput);

      expect(response).toBeDefined();
      expect(response).toHaveProperty('outputSpeech');
    });
  });

  describe('handle - network timeout', () => {
    beforeEach(() => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';

      mockNutrisliceService.getMenuForTomorrow.mockRejectedValue(timeoutError);
    });

    it('should handle timeout errors', async () => {
      await GetTomorrowMenuHandler.handle(mockHandlerInput);

      expect(mockResponseBuilder.speak).toHaveBeenCalled();
    });
  });

  describe('behavior verification', () => {
    it('should coordinate with nutrisliceService properly', async () => {
      const mockMenu = {
        date: '2025-10-23',
        items: [{ name: 'Tacos', category: 'Main' }]
      };

      mockNutrisliceService.getMenuForTomorrow.mockResolvedValue(mockMenu);

      await GetTomorrowMenuHandler.handle(mockHandlerInput);

      // Verify the conversation between handler and service
      expect(mockNutrisliceService.getMenuForTomorrow).toHaveBeenCalled();
      expect(mockResponseBuilder.speak).toHaveBeenCalled();
      expect(mockResponseBuilder.getResponse).toHaveBeenCalled();
    });

    it('should follow expected workflow sequence', async () => {
      const mockMenu = {
        date: '2025-10-23',
        items: [{ name: 'Tacos', category: 'Main' }]
      };

      mockNutrisliceService.getMenuForTomorrow.mockResolvedValue(mockMenu);

      await GetTomorrowMenuHandler.handle(mockHandlerInput);

      const serviceCallOrder = mockNutrisliceService.getMenuForTomorrow.mock.invocationCallOrder[0];
      const speakCallOrder = mockResponseBuilder.speak.mock.invocationCallOrder[0];
      const responseCallOrder = mockResponseBuilder.getResponse.mock.invocationCallOrder[0];

      expect(serviceCallOrder).toBeLessThan(speakCallOrder);
      expect(speakCallOrder).toBeLessThan(responseCallOrder);
    });
  });
});
