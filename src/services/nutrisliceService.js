/**
 * Nutrislice Service - JSON API Client with Caching
 *
 * Fetches and parses lunch menu data from Nutrislice JSON API
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
 * Build Nutrislice API URL for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {string} Complete Nutrislice API URL
 * @throws {Error} If date is invalid
 */
function buildNutrisliceURL(date) {
    // Validate date parameter
    if (!date || typeof date !== 'string' || date.trim() === '') {
        throw new Error('Invalid date parameter');
    }

    const { SCHOOL_ID } = constants.NUTRISLICE;
    // Parse date to extract year, month, day for API path
    const [year, month, day] = date.split('-');

    // Use the JSON API endpoint discovered from the browser
    return `https://d45.api.nutrislice.com/menu/api/weeks/school/${SCHOOL_ID}/menu-type/lunch/${year}/${month}/${day}/`;
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
            console.log(`[NutrisliceService] Fetching menu for date: ${date}`);
            console.log(`[NutrisliceService] API URL: ${url}`);

            // Make HTTP request with required headers for API
            const response = await axios.get(url, {
                timeout: constants.NUTRISLICE.TIMEOUT_MS,
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'x-nutrislice-origin': 'd45.nutrislice.com'
                },
                validateStatus: (status) => {
                    // Accept 200 and 404 as valid responses
                    return status === 200 || status === 404;
                }
            });

            console.log(`[NutrisliceService] API response status: ${response.status}`);

            // Handle 404 - no menu available
            if (response.status === 404) {
                return {
                    date,
                    items: [],
                    message: 'No menu available for this date'
                };
            }

            // Parse JSON response from API
            const apiData = response.data;
            let menuData;

            // Find the day matching our requested date
            const dayData = apiData.days?.find(day => day.date === date);
            console.log(`[NutrisliceService] Days in response: ${apiData.days?.length || 0}`);
            console.log(`[NutrisliceService] Found day data for ${date}: ${!!dayData}`);

            if (dayData && dayData.menu_items && dayData.menu_items.length > 0) {
                console.log(`[NutrisliceService] Found ${dayData.menu_items.length} menu items`);

                // Extract menu items
                const items = dayData.menu_items
                    .filter(item => item.food && item.food.name)
                    .map(item => ({
                        name: item.food.name,
                        description: item.food.description || '',
                        calories: item.food.rounded_nutrition_info?.calories || null,
                        protein: item.food.rounded_nutrition_info?.g_protein || null,
                        imageUrl: item.food.image_url || null
                    }));

                console.log(`[NutrisliceService] Parsed ${items.length} items: ${items.map(i => i.name).join(', ')}`);

                menuData = {
                    date,
                    items,
                    fetchedAt: new Date().toISOString()
                };
            } else {
                console.log(`[NutrisliceService] No menu items found for ${date}`);

                // No menu items found for this date
                menuData = {
                    date,
                    items: [],
                    message: 'No menu available for this date',
                    fetchedAt: new Date().toISOString()
                };
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

    console.log(`[NutrisliceService] getMenuForToday() - calculated date: ${todayDate}`);
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

    console.log(`[NutrisliceService] getMenuForTomorrow() - calculated date: ${tomorrowDate}`);
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
