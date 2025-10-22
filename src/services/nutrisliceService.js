/**
 * Nutrislice Service - HTML Scraper with Caching
 *
 * Fetches and parses lunch menu data from Nutrislice website
 * with retry logic, caching, and error handling.
 */

const axios = require('axios');
const constants = require('../utils/constants');

// Default dependencies (can be overridden for testing)
let cache = null;
let parser = null;
let dateUtils = null;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100; // Base delay, will use exponential backoff

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Build Nutrislice URL for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {string} Complete Nutrislice URL
 * @throws {Error} If date is invalid
 */
function buildNutrisliceURL(date) {
  // Validate date parameter
  if (!date || typeof date !== 'string' || date.trim() === '') {
    throw new Error('Invalid date parameter');
  }

  const { BASE_URL, SCHOOL_ID, MEAL_TYPE } = constants.NUTRISLICE;
  return `${BASE_URL}/${SCHOOL_ID}/${MEAL_TYPE}/${date}`;
}

/**
 * Fetch menu for a specific date with caching and retry logic
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Parsed menu data
 * @throws {Error} After retry attempts exhausted
 */
async function getMenuForDate(date) {
  // Validate date parameter
  if (!date || typeof date !== 'string' || date.trim() === '') {
    throw new Error('Invalid date parameter');
  }

  const { SCHOOL_ID } = constants.NUTRISLICE;
  const cacheKey = `menu:${SCHOOL_ID}:${date}`;

  // Check cache first
  if (cache) {
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }

  // Cache miss - fetch from API with retry logic
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = buildNutrisliceURL(date);

      // Make HTTP request with timeout
      const response = await axios.get(url, {
        timeout: constants.NUTRISLICE.TIMEOUT_MS,
        validateStatus: (status) => {
          // Accept 200 and 404 as valid responses
          return status === 200 || status === 404;
        }
      });

      // Handle 404 - no menu available
      if (response.status === 404) {
        return {
          date,
          items: [],
          message: 'No menu available for this date'
        };
      }

      // Parse HTML response
      const html = response.data;
      let menuData;

      try {
        if (parser) {
          menuData = parser.parseNutrisliceHTML(html);
        } else {
          // Fallback if parser not available
          menuData = {
            date,
            items: [],
            fetchedAt: new Date().toISOString()
          };
        }
      } catch (parseError) {
        // Parser errors are not retryable - throw immediately
        throw parseError;
      }

      // Cache successful response
      if (cache) {
        const ttl = 3600; // 1 hour (from requirements)
        await cache.set(cacheKey, menuData, ttl);
      }

      return menuData;

    } catch (error) {
      lastError = error;

      // If it's the last attempt, break and throw error
      if (attempt >= MAX_RETRIES) {
        break;
      }

      // Check if error is retryable (network errors, server errors, timeouts)
      const isNetworkError = !error.response; // No response = network issue
      const isServerError = error.response?.status >= 500;
      const isTimeout = error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED';

      const isRetryable = isNetworkError || isServerError || isTimeout;

      if (!isRetryable) {
        throw error;
      }

      // Exponential backoff
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw new Error(`Failed to fetch menu after ${MAX_RETRIES} attempts: ${lastError.message}`);
}

/**
 * Get menu for today
 * @returns {Promise<Object>} Today's menu data
 */
async function getMenuForToday() {
  let todayDate;

  if (dateUtils && dateUtils.formatDate) {
    todayDate = dateUtils.formatDate(new Date(), 'YYYY-MM-DD');
  } else {
    // Fallback date formatting
    const now = new Date();
    todayDate = now.toISOString().split('T')[0];
  }

  return getMenuForDate(todayDate);
}

/**
 * Get menu for tomorrow (next school day)
 * @returns {Promise<Object>} Tomorrow's menu data
 */
async function getMenuForTomorrow() {
  const today = new Date();
  let tomorrowDate;

  if (dateUtils && dateUtils.getNextSchoolDay) {
    // Use dateUtils to calculate next school day (skips weekends/holidays)
    const holidays = constants.HOLIDAYS || [];
    const nextSchoolDay = dateUtils.getNextSchoolDay(today, 1, holidays);

    if (dateUtils.formatDate) {
      tomorrowDate = dateUtils.formatDate(nextSchoolDay, 'YYYY-MM-DD');
    } else {
      tomorrowDate = nextSchoolDay.toISOString().split('T')[0];
    }
  } else {
    // Fallback - just add one day
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrowDate = tomorrow.toISOString().split('T')[0];
  }

  return getMenuForDate(tomorrowDate);
}

/**
 * Mock injection for testing (London School pattern)
 * Allows tests to inject mock dependencies
 * @param {Object} mocks - Mock dependencies
 * @returns {Object} Service with mocked dependencies
 */
function __withMocks(mocks) {
  return {
    getMenuForDate: async (date) => {
      // Temporarily set mocks
      const originalCache = cache;
      const originalParser = parser;
      const originalDateUtils = dateUtils;

      try {
        if (mocks.cache) cache = mocks.cache;
        if (mocks.parser) parser = mocks.parser;
        if (mocks.dateUtils) dateUtils = mocks.dateUtils;

        return await getMenuForDate(date);
      } finally {
        // Restore original dependencies
        cache = originalCache;
        parser = originalParser;
        dateUtils = originalDateUtils;
      }
    },

    getMenuForToday: async () => {
      const originalCache = cache;
      const originalParser = parser;
      const originalDateUtils = dateUtils;

      try {
        if (mocks.cache) cache = mocks.cache;
        if (mocks.parser) parser = mocks.parser;
        if (mocks.dateUtils) dateUtils = mocks.dateUtils;

        return await getMenuForToday();
      } finally {
        cache = originalCache;
        parser = originalParser;
        dateUtils = originalDateUtils;
      }
    },

    getMenuForTomorrow: async () => {
      const originalCache = cache;
      const originalParser = parser;
      const originalDateUtils = dateUtils;

      try {
        if (mocks.cache) cache = mocks.cache;
        if (mocks.parser) parser = mocks.parser;
        if (mocks.dateUtils) dateUtils = mocks.dateUtils;

        return await getMenuForTomorrow();
      } finally {
        cache = originalCache;
        parser = originalParser;
        dateUtils = originalDateUtils;
      }
    },

    buildNutrisliceURL
  };
}

/**
 * Set dependencies (for production use)
 * @param {Object} dependencies - Service dependencies
 */
function setDependencies(dependencies) {
  if (dependencies.cache) cache = dependencies.cache;
  if (dependencies.parser) parser = dependencies.parser;
  if (dependencies.dateUtils) dateUtils = dependencies.dateUtils;
}

/**
 * Reset service state (for testing)
 */
function __resetForTesting() {
  cache = null;
  parser = null;
  dateUtils = null;
}

module.exports = {
  buildNutrisliceURL,
  getMenuForDate,
  getMenuForToday,
  getMenuForTomorrow,
  setDependencies,
  __withMocks,
  __resetForTesting
};
