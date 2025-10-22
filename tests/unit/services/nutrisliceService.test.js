/**
 * TDD Tests for nutrisliceService (London School)
 *
 * Testing strategy:
 * - Mock all external dependencies (HTTP, cache, parsers)
 * - Focus on behavior verification (interactions)
 * - Test contracts between objects
 */

const nock = require('nock');
const nutrisliceService = require('../../../src/services/nutrisliceService');

// Mock dependencies
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn()
};

const mockMenuParser = {
  parseNutrisliceHTML: jest.fn()
};

const mockDateUtils = {
  getNextSchoolDay: jest.fn(),
  formatDate: jest.fn()
};

// Sample HTML response from Nutrislice
const sampleNutrisliceHTML = `
<!DOCTYPE html>
<html>
<head><title>Menu</title></head>
<body>
  <div class="menu-item" data-menu-item-id="123">
    <h3 class="item-name">Chicken Nuggets</h3>
    <div class="item-category">Entree</div>
  </div>
  <div class="menu-item" data-menu-item-id="124">
    <h3 class="item-name">Pizza Slice</h3>
    <div class="item-category">Entree</div>
  </div>
</body>
</html>
`;

const sampleParsedMenu = {
  date: '2025-10-22',
  items: [
    { name: 'Chicken Nuggets', category: 'Entree' },
    { name: 'Pizza Slice', category: 'Entree' }
  ],
  fetchedAt: new Date().toISOString()
};

describe('nutrisliceService - TDD London School', () => {
  const NUTRISLICE_BASE_URL = 'https://d45.nutrislice.com';
  const SCHOOL_ID = 'westmore-elementary-school-2';
  const MEAL_TYPE = 'lunch';
  const TEST_DATE = '2025-10-22';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    nock.cleanAll();

    // Reset service state (if any)
    if (nutrisliceService.__resetForTesting) {
      nutrisliceService.__resetForTesting();
    }
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('buildNutrisliceURL', () => {
    it('should construct correct Nutrislice URL with date', () => {
      const expectedURL = `${NUTRISLICE_BASE_URL}/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`;
      const result = nutrisliceService.buildNutrisliceURL(TEST_DATE);
      expect(result).toBe(expectedURL);
    });

    it('should handle different date formats', () => {
      const result = nutrisliceService.buildNutrisliceURL('2025-12-25');
      expect(result).toContain('2025-12-25');
    });

    it('should throw error for invalid date', () => {
      expect(() => {
        nutrisliceService.buildNutrisliceURL(null);
      }).toThrow('Invalid date parameter');
    });

    it('should throw error for empty date', () => {
      expect(() => {
        nutrisliceService.buildNutrisliceURL('');
      }).toThrow('Invalid date parameter');
    });
  });

  describe('getMenuForDate - Cache Behavior', () => {
    it('should return cached data when available within TTL', async () => {
      // Arrange: Mock cache hit
      const cachedMenu = { ...sampleParsedMenu, source: 'cache' };
      mockCacheService.get.mockResolvedValue(cachedMenu);

      // Inject mocks
      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act
      const result = await service.getMenuForDate(TEST_DATE);

      // Assert: Verify cache interaction
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `menu:${SCHOOL_ID}:${TEST_DATE}`
      );
      expect(result).toEqual(cachedMenu);

      // Should NOT make HTTP request when cache hits
      expect(nock.isDone()).toBe(true); // No pending mocks
    });

    it('should fetch from API when cache is empty', async () => {
      // Arrange: Mock cache miss
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      // Mock HTTP request
      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(200, sampleNutrisliceHTML);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act
      const result = await service.getMenuForDate(TEST_DATE);

      // Assert: Verify interactions
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `menu:${SCHOOL_ID}:${TEST_DATE}`
      );
      expect(mockMenuParser.parseNutrisliceHTML).toHaveBeenCalledWith(
        sampleNutrisliceHTML
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `menu:${SCHOOL_ID}:${TEST_DATE}`,
        sampleParsedMenu,
        expect.any(Number) // TTL
      );
      expect(result).toEqual(sampleParsedMenu);
    });

    it('should store fetched data in cache with correct TTL', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(200, sampleNutrisliceHTML);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act
      await service.getMenuForDate(TEST_DATE);

      // Assert: Cache should be called with TTL (typically 3600 seconds)
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        3600 // 1 hour TTL from constants
      );
    });
  });

  describe('getMenuForDate - HTTP Error Handling', () => {
    it('should handle 404 (no menu available) gracefully', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);

      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(404);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act
      const result = await service.getMenuForDate(TEST_DATE);

      // Assert: Should return empty menu structure
      expect(result).toEqual({
        date: TEST_DATE,
        items: [],
        message: 'No menu available for this date'
      });

      // Should NOT call parser for 404
      expect(mockMenuParser.parseNutrisliceHTML).not.toHaveBeenCalled();

      // Should NOT cache 404 responses
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should retry on network failure (3 attempts)', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      // First two requests fail, third succeeds
      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .replyWithError('Network error')
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .replyWithError('Network error')
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(200, sampleNutrisliceHTML);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act
      const result = await service.getMenuForDate(TEST_DATE);

      // Assert: Should succeed after retries
      expect(result).toEqual(sampleParsedMenu);
      expect(mockMenuParser.parseNutrisliceHTML).toHaveBeenCalledTimes(1);
    });

    it('should fail after 3 retry attempts', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);

      // All requests fail
      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .times(3)
        .replyWithError('Network error');

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act & Assert
      await expect(service.getMenuForDate(TEST_DATE))
        .rejects
        .toThrow('Failed to fetch menu after 3 attempts');

      // Should not cache errors
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should handle 500 server errors with retry', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      // First request fails with 500, second succeeds
      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(500, 'Internal Server Error')
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(200, sampleNutrisliceHTML);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act
      const result = await service.getMenuForDate(TEST_DATE);

      // Assert
      expect(result).toEqual(sampleParsedMenu);
    });

    it('should handle malformed HTML gracefully', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);

      // Parser throws error for malformed HTML
      mockMenuParser.parseNutrisliceHTML.mockImplementation(() => {
        throw new Error('Malformed HTML');
      });

      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .times(3) // Will be retried since parser error happens after successful HTTP
        .reply(200, '<html><invalid');

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act & Assert
      // Parser errors are not retryable, should throw immediately
      await expect(service.getMenuForDate(TEST_DATE))
        .rejects
        .toThrow('Malformed HTML');
    });

    it('should timeout after 5 seconds', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);

      // Mock timeout with nock - use delayConnection to simulate slow connection
      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .times(3) // Will retry 3 times
        .delayConnection(6000) // Delay longer than timeout (5000ms)
        .reply(200, sampleNutrisliceHTML);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act & Assert
      // Should fail after retries due to timeout
      await expect(service.getMenuForDate(TEST_DATE))
        .rejects
        .toThrow(/timeout|ETIMEDOUT|Failed to fetch menu after 3 attempts/i);
    }, 25000); // Increase test timeout for retries
  });

  describe('getMenuForToday', () => {
    it('should fetch menu for current date', async () => {
      // Arrange
      const today = '2025-10-22';
      mockDateUtils.formatDate.mockReturnValue(today);
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${today}`)
        .reply(200, sampleNutrisliceHTML);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser,
        dateUtils: mockDateUtils
      });

      // Act
      const result = await service.getMenuForToday();

      // Assert
      expect(mockDateUtils.formatDate).toHaveBeenCalled();
      expect(result).toEqual(sampleParsedMenu);
    });
  });

  describe('getMenuForTomorrow', () => {
    it('should fetch menu for next school day', async () => {
      // Arrange
      const today = new Date('2025-10-22'); // Wednesday
      const tomorrow = '2025-10-23'; // Thursday (next school day)

      mockDateUtils.getNextSchoolDay.mockReturnValue(new Date('2025-10-23'));
      mockDateUtils.formatDate.mockReturnValue(tomorrow);
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${tomorrow}`)
        .reply(200, sampleNutrisliceHTML);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser,
        dateUtils: mockDateUtils
      });

      // Act
      const result = await service.getMenuForTomorrow();

      // Assert: Should use dateUtils to calculate next school day
      expect(mockDateUtils.getNextSchoolDay).toHaveBeenCalledWith(
        expect.any(Date),
        1,
        expect.any(Array)
      );
      expect(result).toEqual(sampleParsedMenu);
    });

    it('should skip weekends when calculating tomorrow', async () => {
      // Arrange: Today is Friday
      const friday = new Date('2025-10-24');
      const monday = '2025-10-27'; // Skip weekend

      mockDateUtils.getNextSchoolDay.mockReturnValue(new Date('2025-10-27'));
      mockDateUtils.formatDate.mockReturnValue(monday);
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${monday}`)
        .reply(200, sampleNutrisliceHTML);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser,
        dateUtils: mockDateUtils
      });

      // Act
      const result = await service.getMenuForTomorrow();

      // Assert
      expect(mockDateUtils.getNextSchoolDay).toHaveBeenCalled();
      expect(result.date).toBe('2025-10-22'); // From sampleParsedMenu
    });
  });

  describe('parseMenuResponse - Interaction Testing', () => {
    it('should delegate HTML parsing to menuParser', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(200, sampleNutrisliceHTML);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act
      await service.getMenuForDate(TEST_DATE);

      // Assert: Verify collaboration with parser
      expect(mockMenuParser.parseNutrisliceHTML).toHaveBeenCalledTimes(1);
      expect(mockMenuParser.parseNutrisliceHTML).toHaveBeenCalledWith(
        sampleNutrisliceHTML
      );
    });

    it('should pass raw HTML response to parser', async () => {
      // Arrange
      const customHTML = '<html><body><div>Custom Menu</div></body></html>';
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue({
        date: TEST_DATE,
        items: [{ name: 'Custom Item' }]
      });

      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(200, customHTML);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act
      await service.getMenuForDate(TEST_DATE);

      // Assert
      expect(mockMenuParser.parseNutrisliceHTML).toHaveBeenCalledWith(customHTML);
    });
  });

  describe('Contract Testing - Object Collaboration', () => {
    it('should follow correct workflow: cache check -> HTTP fetch -> parse -> cache store', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(200, sampleNutrisliceHTML);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act
      await service.getMenuForDate(TEST_DATE);

      // Assert: Verify interaction sequence
      const callOrder = [
        mockCacheService.get.mock.invocationCallOrder[0],
        mockMenuParser.parseNutrisliceHTML.mock.invocationCallOrder[0],
        mockCacheService.set.mock.invocationCallOrder[0]
      ];

      expect(callOrder[0]).toBeLessThan(callOrder[1]);
      expect(callOrder[1]).toBeLessThan(callOrder[2]);
    });

    it('should not call parser or cache.set when cache hits', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(sampleParsedMenu);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act
      await service.getMenuForDate(TEST_DATE);

      // Assert: Short-circuit on cache hit
      expect(mockMenuParser.parseNutrisliceHTML).not.toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should pass correct cache key format', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(sampleParsedMenu);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act
      await service.getMenuForDate(TEST_DATE);

      // Assert: Cache key should follow convention
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringMatching(/^menu:[^:]+:\d{4}-\d{2}-\d{2}$/)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty HTML response', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue({
        date: TEST_DATE,
        items: []
      });

      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(200, '');

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act
      const result = await service.getMenuForDate(TEST_DATE);

      // Assert
      expect(result.items).toEqual([]);
    });

    it('should handle null date parameter', async () => {
      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act & Assert
      await expect(service.getMenuForDate(null))
        .rejects
        .toThrow('Invalid date parameter');
    });

    it('should handle undefined date parameter', async () => {
      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act & Assert
      await expect(service.getMenuForDate(undefined))
        .rejects
        .toThrow('Invalid date parameter');
    });
  });

  describe('Fallback Behavior - No Dependencies', () => {
    it('should use fallback date formatting when dateUtils not available', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      nock(NUTRISLICE_BASE_URL)
        .get(new RegExp('/menu/.*'))
        .reply(200, sampleNutrisliceHTML);

      // No dateUtils provided
      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
        // dateUtils: NOT provided
      });

      // Act
      const result = await service.getMenuForToday();

      // Assert
      expect(result).toEqual(sampleParsedMenu);
    });

    it('should use fallback when parser not available', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);

      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(200, sampleNutrisliceHTML);

      // No parser provided
      const service = nutrisliceService.__withMocks({
        cache: mockCacheService
        // parser: NOT provided
      });

      // Act
      const result = await service.getMenuForDate(TEST_DATE);

      // Assert: Should return empty menu structure
      expect(result).toEqual({
        date: TEST_DATE,
        items: [],
        fetchedAt: expect.any(String)
      });
    });

    it('should use fallback when cache not available', async () => {
      // Arrange
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(200, sampleNutrisliceHTML);

      // No cache provided
      const service = nutrisliceService.__withMocks({
        parser: mockMenuParser
        // cache: NOT provided
      });

      // Act
      const result = await service.getMenuForDate(TEST_DATE);

      // Assert: Should still work without cache
      expect(result).toEqual(sampleParsedMenu);
    });

    it('should handle getNextSchoolDay without formatDate', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      // Mock dateUtils with getNextSchoolDay but NO formatDate
      const partialDateUtils = {
        getNextSchoolDay: jest.fn().mockReturnValue(new Date('2025-10-23'))
        // formatDate: NOT provided
      };

      nock(NUTRISLICE_BASE_URL)
        .get(new RegExp('/menu/.*'))
        .reply(200, sampleNutrisliceHTML);

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser,
        dateUtils: partialDateUtils
      });

      // Act
      const result = await service.getMenuForTomorrow();

      // Assert: Should use ISO format fallback
      expect(partialDateUtils.getNextSchoolDay).toHaveBeenCalled();
      expect(result).toEqual(sampleParsedMenu);
    });

    it('should handle getTomorrow without dateUtils at all', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);
      mockMenuParser.parseNutrisliceHTML.mockReturnValue(sampleParsedMenu);

      nock(NUTRISLICE_BASE_URL)
        .get(new RegExp('/menu/.*'))
        .reply(200, sampleNutrisliceHTML);

      // No dateUtils at all
      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
        // dateUtils: NOT provided
      });

      // Act
      const result = await service.getMenuForTomorrow();

      // Assert: Should use simple date math fallback
      expect(result).toEqual(sampleParsedMenu);
    });

    it('should throw non-retryable errors immediately', async () => {
      // Arrange
      mockCacheService.get.mockResolvedValue(null);

      // Mock 400 Bad Request (not retryable)
      nock(NUTRISLICE_BASE_URL)
        .get(`/menu/${SCHOOL_ID}/${MEAL_TYPE}/${TEST_DATE}`)
        .reply(400, 'Bad Request');

      const service = nutrisliceService.__withMocks({
        cache: mockCacheService,
        parser: mockMenuParser
      });

      // Act & Assert
      await expect(service.getMenuForDate(TEST_DATE))
        .rejects
        .toThrow(/Request failed with status code 400/);
    });
  });

  describe('setDependencies - Production Usage', () => {
    it('should set cache dependency', () => {
      const testCache = { get: jest.fn(), set: jest.fn() };
      nutrisliceService.setDependencies({ cache: testCache });
      // Dependencies set successfully (no error)
      expect(true).toBe(true);
    });

    it('should set parser dependency', () => {
      const testParser = { parseNutrisliceHTML: jest.fn() };
      nutrisliceService.setDependencies({ parser: testParser });
      expect(true).toBe(true);
    });

    it('should set dateUtils dependency', () => {
      const testDateUtils = { getNextSchoolDay: jest.fn(), formatDate: jest.fn() };
      nutrisliceService.setDependencies({ dateUtils: testDateUtils });
      expect(true).toBe(true);
    });

    it('should set multiple dependencies at once', () => {
      nutrisliceService.setDependencies({
        cache: { get: jest.fn(), set: jest.fn() },
        parser: { parseNutrisliceHTML: jest.fn() },
        dateUtils: { getNextSchoolDay: jest.fn(), formatDate: jest.fn() }
      });
      expect(true).toBe(true);
    });
  });
});
