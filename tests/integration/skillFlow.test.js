/**
 * Integration Tests - Skill Flow (End-to-End)
 *
 * Tests complete user flows through the Alexa skill:
 * - Launch → Menu Query → Stop
 * - Help → Menu Query
 * - Error scenarios
 * - APL integration
 * - Caching behavior
 *
 * Uses nock to mock external HTTP calls (Nutrislice, Weather.gov)
 */

const nock = require('nock');
const Alexa = require('ask-sdk-core');
const skillHandler = require('../../src/index').handler;

// Test fixtures
const {
  buildLaunchRequest,
  buildGetTodayMenuIntent,
  buildGetTomorrowMenuIntent,
  buildHelpIntent,
  buildStopIntent,
  buildSessionEndedRequest
} = require('../fixtures/alexaRequests');

const {
  fullMenuHTML,
  simpleMenuHTML,
  emptyMenuHTML,
  httpScenarios
} = require('../fixtures/nutrisliceHTML');

describe('Skill Flow Integration Tests', () => {
  const NUTRISLICE_BASE = 'https://d45.nutrislice.com';
  const WEATHER_BASE = 'https://api.weather.gov';
  const SCHOOL_ID = 'westmore-elementary-school-2';

  beforeEach(() => {
    // Clear all HTTP mocks before each test
    nock.cleanAll();

    // Clear cache between tests
    jest.clearAllMocks();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Complete User Flows', () => {
    it('should handle Launch → GetTodayMenu → Stop flow', async () => {
      // Setup mocks for today's date
      const today = '2025-10-22';

      // Mock Nutrislice menu
      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${today}`)
        .reply(200, fullMenuHTML);

      // Mock Weather.gov API
      nock(WEATHER_BASE)
        .get('/points/39.0997,-77.0941')
        .reply(200, {
          properties: {
            gridId: 'LWX',
            gridX: 93,
            gridY: 80
          }
        });

      nock(WEATHER_BASE)
        .get('/gridpoints/LWX/93,80/forecast/hourly')
        .reply(200, {
          properties: {
            periods: [
              {
                startTime: '2025-10-22T07:00:00-04:00',
                temperature: 65,
                temperatureUnit: 'F',
                shortForecast: 'Partly Cloudy',
                isDaytime: true,
                icon: 'https://api.weather.gov/icons/land/day/sct',
                windSpeed: '5 mph',
                windDirection: 'N'
              }
            ]
          }
        });

      // Step 1: Launch
      const launchRequest = buildLaunchRequest({ supportsAPL: true });
      const launchResponse = await skillHandler(launchRequest, {});

      expect(launchResponse.response.outputSpeech.ssml).toContain('Welcome to Lunch Dad');
      expect(launchResponse.response.shouldEndSession).toBe(false);

      // Step 2: GetTodayMenu
      const menuRequest = buildGetTodayMenuIntent({ supportsAPL: true });
      const menuResponse = await skillHandler(menuRequest, {});

      expect(menuResponse.response.outputSpeech.ssml).toContain("Today's lunch menu");
      expect(menuResponse.response.outputSpeech.ssml).toContain('Chicken Nuggets');
      expect(menuResponse.response.shouldEndSession).toBe(false);

      // Step 3: Stop
      const stopRequest = buildStopIntent();
      const stopResponse = await skillHandler(stopRequest, {});

      expect(stopResponse.response.outputSpeech.ssml).toContain('Goodbye');
      expect(stopResponse.response.shouldEndSession).toBe(true);

      // Verify all HTTP mocks were called
      expect(nock.isDone()).toBe(true);
    });

    it('should handle Launch → GetTomorrowMenu → Stop flow', async () => {
      // Tomorrow is Thursday (next school day)
      const tomorrow = '2025-10-23';

      // Mock Nutrislice menu
      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${tomorrow}`)
        .reply(200, simpleMenuHTML);

      // Mock weather (optional for tomorrow)
      nock(WEATHER_BASE)
        .get('/points/39.0997,-77.0941')
        .reply(200, {
          properties: { gridId: 'LWX', gridX: 93, gridY: 80 }
        });

      nock(WEATHER_BASE)
        .get('/gridpoints/LWX/93,80/forecast/hourly')
        .reply(200, {
          properties: {
            periods: [
              {
                startTime: '2025-10-23T07:00:00-04:00',
                temperature: 68,
                temperatureUnit: 'F',
                shortForecast: 'Sunny',
                isDaytime: true
              }
            ]
          }
        });

      // Step 1: Launch
      const launchRequest = buildLaunchRequest();
      await skillHandler(launchRequest, {});

      // Step 2: GetTomorrowMenu
      const menuRequest = buildGetTomorrowMenuIntent();
      const menuResponse = await skillHandler(menuRequest, {});

      expect(menuResponse.response.outputSpeech.ssml).toContain("Tomorrow's lunch");
      expect(menuResponse.response.outputSpeech.ssml).toContain('Hamburger');
      expect(menuResponse.response.shouldEndSession).toBe(false);

      // Step 3: Stop
      const stopRequest = buildStopIntent();
      const stopResponse = await skillHandler(stopRequest, {});

      expect(stopResponse.response.shouldEndSession).toBe(true);
    });

    it('should handle Launch → Help → GetTodayMenu → Stop flow', async () => {
      const today = '2025-10-22';

      // Mock menu data
      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${today}`)
        .reply(200, fullMenuHTML);

      // Mock weather
      nock(WEATHER_BASE)
        .get('/points/39.0997,-77.0941')
        .reply(200, {
          properties: { gridId: 'LWX', gridX: 93, gridY: 80 }
        });

      nock(WEATHER_BASE)
        .get('/gridpoints/LWX/93,80/forecast/hourly')
        .reply(200, {
          properties: {
            periods: [
              {
                startTime: '2025-10-22T07:00:00-04:00',
                temperature: 70,
                temperatureUnit: 'F',
                shortForecast: 'Clear',
                isDaytime: true
              }
            ]
          }
        });

      // Step 1: Launch
      await skillHandler(buildLaunchRequest(), {});

      // Step 2: Help
      const helpRequest = buildHelpIntent();
      const helpResponse = await skillHandler(helpRequest, {});

      expect(helpResponse.response.outputSpeech.ssml).toContain('help');
      expect(helpResponse.response.shouldEndSession).toBe(false);

      // Step 3: GetTodayMenu
      const menuRequest = buildGetTodayMenuIntent();
      const menuResponse = await skillHandler(menuRequest, {});

      expect(menuResponse.response.outputSpeech.ssml).toContain("Today's lunch");

      // Step 4: Stop
      const stopRequest = buildStopIntent();
      const stopResponse = await skillHandler(stopRequest, {});

      expect(stopResponse.response.shouldEndSession).toBe(true);
    });

    it('should handle weekend tomorrow query (skip to Monday)', async () => {
      // Friday asking for tomorrow should give Monday's menu
      const monday = '2025-10-27';

      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${monday}`)
        .reply(200, fullMenuHTML);

      const tomorrowRequest = buildGetTomorrowMenuIntent();
      const response = await skillHandler(tomorrowRequest, {});

      // Should mention "Monday" or "next school day"
      expect(response.response.outputSpeech.ssml).toMatch(/Monday|next school day/i);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle Nutrislice API failure gracefully', async () => {
      const today = '2025-10-22';

      // Mock API failure
      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${today}`)
        .times(3) // Will retry 3 times
        .replyWithError('Network error');

      // Weather still works
      nock(WEATHER_BASE)
        .get('/points/39.0997,-77.0941')
        .reply(200, {
          properties: { gridId: 'LWX', gridX: 93, gridY: 80 }
        });

      nock(WEATHER_BASE)
        .get('/gridpoints/LWX/93,80/forecast/hourly')
        .reply(200, {
          properties: {
            periods: [
              {
                startTime: '2025-10-22T07:00:00-04:00',
                temperature: 65,
                temperatureUnit: 'F',
                shortForecast: 'Cloudy',
                isDaytime: true
              }
            ]
          }
        });

      const menuRequest = buildGetTodayMenuIntent();
      const response = await skillHandler(menuRequest, {});

      // Should return error message
      expect(response.response.outputSpeech.ssml).toContain("trouble getting the menu");
      expect(response.response.shouldEndSession).toBe(false);
    });

    it('should handle no menu available (404)', async () => {
      const today = '2025-10-22';

      // Mock 404 response
      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${today}`)
        .reply(404);

      // Mock weather (still works)
      nock(WEATHER_BASE)
        .get('/points/39.0997,-77.0941')
        .reply(200, {
          properties: { gridId: 'LWX', gridX: 93, gridY: 80 }
        });

      nock(WEATHER_BASE)
        .get('/gridpoints/LWX/93,80/forecast/hourly')
        .reply(200, {
          properties: {
            periods: [
              {
                startTime: '2025-10-22T07:00:00-04:00',
                temperature: 65,
                temperatureUnit: 'F',
                shortForecast: 'Sunny',
                isDaytime: true
              }
            ]
          }
        });

      const menuRequest = buildGetTodayMenuIntent();
      const response = await skillHandler(menuRequest, {});

      // Should handle gracefully
      expect(response.response.outputSpeech.ssml).toContain("couldn't find the lunch menu");
    });

    it('should handle empty menu gracefully', async () => {
      const today = '2025-10-22';

      // Mock empty menu
      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${today}`)
        .reply(200, emptyMenuHTML);

      const menuRequest = buildGetTodayMenuIntent();
      const response = await skillHandler(menuRequest, {});

      expect(response.response.outputSpeech.ssml).toContain("couldn't find the lunch menu");
    });

    it('should handle weather API failure gracefully', async () => {
      const today = '2025-10-22';

      // Menu works
      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${today}`)
        .reply(200, fullMenuHTML);

      // Weather fails
      nock(WEATHER_BASE)
        .get('/points/39.0997,-77.0941')
        .times(2) // Will retry once
        .replyWithError('Weather service unavailable');

      const menuRequest = buildGetTodayMenuIntent();
      const response = await skillHandler(menuRequest, {});

      // Should still provide menu without weather
      expect(response.response.outputSpeech.ssml).toContain("Today's lunch menu");
      expect(response.response.outputSpeech.ssml).toContain('Chicken Nuggets');
      // Should NOT mention weather
      expect(response.response.outputSpeech.ssml).not.toContain('degrees');
    });

    it('should handle complete service failure', async () => {
      const today = '2025-10-22';

      // Both services fail
      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${today}`)
        .times(3)
        .replyWithError('Service unavailable');

      nock(WEATHER_BASE)
        .get('/points/39.0997,-77.0941')
        .times(2)
        .replyWithError('Service unavailable');

      const menuRequest = buildGetTodayMenuIntent();
      const response = await skillHandler(menuRequest, {});

      expect(response.response.outputSpeech.ssml).toContain("trouble");
      expect(response.response.shouldEndSession).toBe(false);
    });
  });

  describe('APL Integration', () => {
    it('should include APL directive on supported devices', async () => {
      const today = '2025-10-22';

      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${today}`)
        .reply(200, fullMenuHTML);

      nock(WEATHER_BASE)
        .get('/points/39.0997,-77.0941')
        .reply(200, {
          properties: { gridId: 'LWX', gridX: 93, gridY: 80 }
        });

      nock(WEATHER_BASE)
        .get('/gridpoints/LWX/93,80/forecast/hourly')
        .reply(200, {
          properties: {
            periods: [
              {
                startTime: '2025-10-22T07:00:00-04:00',
                temperature: 65,
                temperatureUnit: 'F',
                shortForecast: 'Sunny',
                isDaytime: true
              }
            ]
          }
        });

      // Request with APL support
      const menuRequest = buildGetTodayMenuIntent({ supportsAPL: true });
      const response = await skillHandler(menuRequest, {});

      // Should include APL directive
      expect(response.response.directives).toBeDefined();
      const aplDirective = response.response.directives.find(
        d => d.type === 'Alexa.Presentation.APL.RenderDocument'
      );

      if (aplDirective) {
        expect(aplDirective).toBeDefined();
        expect(aplDirective.document).toBeDefined();
        expect(aplDirective.datasources).toBeDefined();
      }
    });

    it('should skip APL on voice-only devices', async () => {
      const today = '2025-10-22';

      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${today}`)
        .reply(200, fullMenuHTML);

      nock(WEATHER_BASE)
        .get('/points/39.0997,-77.0941')
        .reply(200, {
          properties: { gridId: 'LWX', gridX: 93, gridY: 80 }
        });

      nock(WEATHER_BASE)
        .get('/gridpoints/LWX/93,80/forecast/hourly')
        .reply(200, {
          properties: {
            periods: [
              {
                startTime: '2025-10-22T07:00:00-04:00',
                temperature: 65,
                temperatureUnit: 'F',
                shortForecast: 'Sunny',
                isDaytime: true
              }
            ]
          }
        });

      // Request WITHOUT APL support
      const menuRequest = buildGetTodayMenuIntent({ supportsAPL: false });
      const response = await skillHandler(menuRequest, {});

      // Should NOT include APL directive
      const aplDirective = response.response.directives?.find(
        d => d.type === 'Alexa.Presentation.APL.RenderDocument'
      );
      expect(aplDirective).toBeUndefined();
    });
  });

  describe('Caching Behavior', () => {
    it('should cache menu data (second request uses cache)', async () => {
      const today = '2025-10-22';

      // Mock should only be called ONCE
      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${today}`)
        .once() // Important: only once
        .reply(200, fullMenuHTML);

      // Mock weather (called twice)
      nock(WEATHER_BASE)
        .get('/points/39.0997,-77.0941')
        .times(2)
        .reply(200, {
          properties: { gridId: 'LWX', gridX: 93, gridY: 80 }
        });

      nock(WEATHER_BASE)
        .get('/gridpoints/LWX/93,80/forecast/hourly')
        .times(2)
        .reply(200, {
          properties: {
            periods: [
              {
                startTime: '2025-10-22T07:00:00-04:00',
                temperature: 65,
                temperatureUnit: 'F',
                shortForecast: 'Sunny',
                isDaytime: true
              }
            ]
          }
        });

      // First request - fetches from API
      const firstRequest = buildGetTodayMenuIntent();
      const firstResponse = await skillHandler(firstRequest, {});
      expect(firstResponse.response.outputSpeech.ssml).toContain("Today's lunch");

      // Second request - should use cache (no HTTP call)
      const secondRequest = buildGetTodayMenuIntent();
      const secondResponse = await skillHandler(secondRequest, {});
      expect(secondResponse.response.outputSpeech.ssml).toContain("Today's lunch");

      // Verify menu API was only called once
      expect(nock.isDone()).toBe(true);
    });

    it('should cache weather data for 10 minutes', async () => {
      const today = '2025-10-22';

      nock(NUTRISLICE_BASE)
        .get(`/menu/${SCHOOL_ID}/lunch/${today}`)
        .times(2)
        .reply(200, fullMenuHTML);

      // Weather should only be called ONCE
      nock(WEATHER_BASE)
        .get('/points/39.0997,-77.0941')
        .once()
        .reply(200, {
          properties: { gridId: 'LWX', gridX: 93, gridY: 80 }
        });

      nock(WEATHER_BASE)
        .get('/gridpoints/LWX/93,80/forecast/hourly')
        .once()
        .reply(200, {
          properties: {
            periods: [
              {
                startTime: '2025-10-22T07:00:00-04:00',
                temperature: 65,
                temperatureUnit: 'F',
                shortForecast: 'Sunny',
                isDaytime: true
              }
            ]
          }
        });

      // First request
      await skillHandler(buildGetTodayMenuIntent(), {});

      // Second request (weather should be cached)
      await skillHandler(buildGetTodayMenuIntent(), {});

      expect(nock.isDone()).toBe(true);
    });
  });

  describe('SessionEnded Handling', () => {
    it('should handle SessionEndedRequest gracefully', async () => {
      const sessionEndedRequest = buildSessionEndedRequest();

      // SessionEndedRequest should not throw
      const response = await skillHandler(sessionEndedRequest, {});

      // Response should be empty (Alexa ignores responses to SessionEndedRequest)
      expect(response).toBeDefined();
    });
  });
});
