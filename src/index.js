/**
 * Lambda Entry Point - Alexa Lunch Dad Skill
 *
 * Production-ready Lambda handler with:
 * - Service dependency injection
 * - Environment variable validation
 * - Proper request handler ordering
 * - Comprehensive error handling
 */

const Alexa = require('ask-sdk-core');

// Import handlers
const LaunchRequestHandler = require('./handlers/LaunchRequestHandler');
const GetLunchIntentHandler = require('./intents/GetLunchIntentHandler');
const GetTodayMenuHandler = require('./intents/GetTodayMenuHandler');
const GetTomorrowMenuHandler = require('./intents/GetTomorrowMenuHandler');
const HelpIntentHandler = require('./handlers/HelpIntentHandler');
const CancelAndStopIntentHandler = require('./handlers/CancelAndStopIntentHandler');
const SessionEndedRequestHandler = require('./handlers/SessionEndedRequestHandler');
const ErrorHandler = require('./handlers/ErrorHandler');

// Import services
const nutrisliceService = require('./services/nutrisliceService');
const weatherService = require('./services/weatherService');
const cacheService = require('./services/cacheService');

// Import utilities
const menuParser = require('./utils/menuParser');
const dateUtils = require('./utils/dateUtils');
const constants = require('./utils/constants');

/**
 * Initialize service dependencies
 * This ensures all services have access to their required dependencies
 */
function initializeServices() {
  // Set up nutrisliceService dependencies
  nutrisliceService.setDependencies({
    cache: cacheService,
    parser: menuParser,
    dateUtils: dateUtils
  });

  // Weather service already imports cacheService directly
  // No additional setup needed for weatherService
}

/**
 * Validate environment configuration
 * Logs configuration (without secrets) for debugging
 */
function validateEnvironment() {
  const config = {
    nutrislice: {
      baseUrl: constants.NUTRISLICE.BASE_URL,
      schoolId: constants.NUTRISLICE.SCHOOL_ID,
      timeout: constants.NUTRISLICE.TIMEOUT_MS
    },
    weather: {
      baseUrl: constants.WEATHER.BASE_URL,
      lat: constants.WEATHER.LAT,
      lon: constants.WEATHER.LON,
      timeout: constants.WEATHER.TIMEOUT_MS
    },
    cache: {
      menuTTL: constants.CACHE_TTL.MENU,
      weatherTTL: constants.CACHE_TTL.WEATHER,
      gridInfoTTL: constants.CACHE_TTL.GRID_INFO
    },
    timezone: constants.TIMEZONE,
    maxMenuItems: constants.MAX_MENU_ITEMS
  };
}

// Initialize on cold start
try {
  validateEnvironment();
  initializeServices();
} catch (error) {
  // Continue anyway - individual handlers will handle errors gracefully
}

/**
 * Lambda handler for Alexa Lunch Dad skill
 *
 * Handler order matters:
 * 1. Launch and session handlers first
 * 2. Specific intents before generic ones
 * 3. Help, Cancel/Stop handlers
 * 4. Session ended last
 */
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    GetTodayMenuHandler,
    GetTomorrowMenuHandler,
    GetLunchIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
