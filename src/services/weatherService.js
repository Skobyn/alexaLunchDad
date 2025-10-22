/**
 * Weather Service - Weather.gov API Integration
 *
 * Provides morning weather forecasts with caching:
 * - Grid info cached for 30 days
 * - Hourly forecasts cached for 10 minutes
 * - Filters for morning hours (7-9 AM)
 * - Graceful fallback on errors
 */

const axios = require('axios');
const cacheService = require('./cacheService');
const constants = require('../utils/constants');

/**
 * Get grid coordinates for lat/lon (cached 30 days)
 * @param {string} lat - Latitude
 * @param {string} lon - Longitude
 * @returns {Promise<{gridId: string, gridX: number, gridY: number}>}
 */
async function getGridInfo(lat, lon) {
    // Validate inputs
    if (!lat || !lon) {
        throw new Error('Invalid coordinates');
    }

    // Check cache first
    const cacheKey = _generateGridCacheKey(lat, lon);
    const cached = cacheService.get(cacheKey);

    if (cached) {
        return cached;
    }

    // Fetch from Weather.gov
    try {
        const url = `${constants.WEATHER.BASE_URL}/points/${lat},${lon}`;
        const response = await axios.get(url, {
            timeout: constants.WEATHER.TIMEOUT_MS,
            headers: {
                'User-Agent': 'AlexaLunchDad/1.0',
                'Accept': 'application/json'
            }
        });

        // Validate response structure
        if (!response.data || !response.data.properties) {
            throw new Error('Invalid grid info response structure');
        }

        const { gridId, gridX, gridY } = response.data.properties;

        if (!gridId || gridX === undefined || gridY === undefined) {
            throw new Error('Missing required grid properties');
        }

        const gridInfo = { gridId, gridX, gridY };

        // Cache for 30 days
        cacheService.set(cacheKey, gridInfo, constants.CACHE_TTL.GRID_INFO);

        return gridInfo;
    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw new Error('Grid info request timeout');
        }
        throw new Error(`Failed to fetch grid info: ${error.message}`);
    }
}

/**
 * Get hourly forecast for grid location (cached 10 minutes)
 * @param {string} gridId - Grid ID (e.g., "LWX")
 * @param {number} gridX - Grid X coordinate
 * @param {number} gridY - Grid Y coordinate
 * @returns {Promise<Object>} Hourly forecast data
 */
async function getHourlyForecast(gridId, gridX, gridY) {
    // Check cache first
    const cacheKey = _generateForecastCacheKey(gridId, gridX, gridY);
    const cached = cacheService.get(cacheKey);

    if (cached) {
        return cached;
    }

    // Fetch from Weather.gov
    try {
        const url = `${constants.WEATHER.BASE_URL}/gridpoints/${gridId}/${gridX},${gridY}/forecast/hourly`;
        const response = await axios.get(url, {
            timeout: constants.WEATHER.TIMEOUT_MS,
            headers: {
                'User-Agent': 'AlexaLunchDad/1.0',
                'Accept': 'application/json'
            }
        });

        if (!response.data) {
            throw new Error('Invalid forecast response');
        }

        // Cache for 10 minutes
        cacheService.set(cacheKey, response.data, constants.CACHE_TTL.WEATHER);

        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            throw new Error('Failed to fetch hourly forecast: Not Found');
        }
        throw new Error(`Failed to fetch hourly forecast: ${error.message}`);
    }
}

/**
 * Filter forecast for morning hours (7-9 AM, isDaytime: true)
 * @param {Object} forecast - Hourly forecast data
 * @returns {Array<Object>} Morning periods
 */
function filterMorningHours(forecast) {
    if (!forecast || !forecast.properties || !forecast.properties.periods) {
        return [];
    }

    const periods = forecast.properties.periods;
    const morningPeriods = [];

    for (const period of periods) {
    // Extract hour from ISO string to avoid timezone issues
    // Format: "2025-10-22T07:00:00-04:00"
        const hourMatch = period.startTime.match(/T(\d{2}):/);
        if (!hourMatch) continue;

        const hour = parseInt(hourMatch[1], 10);

        // Check if morning hour (7-8 AM, within the 7-9 range) and daytime
        if (hour >= 7 && hour <= 8 && period.isDaytime === true) {
            morningPeriods.push(period);
        }
    }

    return morningPeriods;
}

/**
 * Get daily forecast
 * @param {string} gridId - Grid ID
 * @param {number} gridX - Grid X coordinate
 * @param {number} gridY - Grid Y coordinate
 * @returns {Promise<Object>} Daily forecast data
 */
async function getDailyForecast(gridId, gridX, gridY) {
    try {
        const url = `${constants.WEATHER.BASE_URL}/gridpoints/${gridId}/${gridX},${gridY}/forecast`;
        const response = await axios.get(url, {
            timeout: constants.WEATHER.TIMEOUT_MS,
            headers: {
                'User-Agent': 'AlexaLunchDad/1.0',
                'Accept': 'application/json'
            }
        });

        if (!response.data || !response.data.properties || !response.data.properties.periods) {
            throw new Error('Invalid daily forecast response');
        }

        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch daily forecast: ${error.message}`);
    }
}

/**
 * Get comprehensive weather (current + forecast for the day)
 * @returns {Promise<Object>} Complete weather data
 */
async function getTodayWeather() {
    try {
        const lat = constants.WEATHER.LAT;
        const lon = constants.WEATHER.LON;

        // Step 1: Get grid info (with retry on timeout)
        let gridInfo;
        try {
            gridInfo = await getGridInfo(lat, lon);
        } catch (error) {
            // Retry once on timeout
            if (error.message.includes('timeout')) {
                gridInfo = await getGridInfo(lat, lon);
            } else {
                throw error;
            }
        }

        // Step 2: Get both hourly and daily forecasts in parallel
        const [hourlyForecast, dailyForecast] = await Promise.all([
            getHourlyForecast(gridInfo.gridId, gridInfo.gridX, gridInfo.gridY),
            getDailyForecast(gridInfo.gridId, gridInfo.gridX, gridInfo.gridY)
        ]);

        // Step 3: Get current conditions (first hourly period)
        const currentConditions = hourlyForecast.properties.periods[0];

        // Step 4: Get today's daily forecast (find "Today" period, not "Tonight")
        const dailyPeriods = dailyForecast.properties.periods;
        const todayForecast = dailyPeriods.find(period =>
            period.name === 'Today' || period.isDaytime === true
        ) || dailyPeriods[0];

        // Strip quotes from forecast text to prevent SSML errors
        const cleanForecast = todayForecast.detailedForecast
            .replace(/"/g, '')  // Remove double quotes
            .replace(/'/g, ''); // Remove single quotes

        return {
            current: {
                temperature: currentConditions.temperature,
                temperatureUnit: currentConditions.temperatureUnit,
                conditions: currentConditions.shortForecast,
                isDaytime: currentConditions.isDaytime
            },
            today: {
                high: todayForecast.temperature,
                temperatureUnit: todayForecast.temperatureUnit,
                detailedForecast: cleanForecast,
                shortForecast: todayForecast.shortForecast
            },
            isFallback: false
        };
    } catch (error) {
        console.error('Weather service error:', error.message);
        return _getFallbackWeather();
    }
}

/**
 * Get morning weather (7 AM preferred) - DEPRECATED, use getTodayWeather
 * @returns {Promise<Object>} Morning weather data
 */
async function getMorningWeather() {
    try {
        const lat = constants.WEATHER.LAT;
        const lon = constants.WEATHER.LON;

        // Step 1: Get grid info (with retry on timeout)
        let gridInfo;
        try {
            gridInfo = await getGridInfo(lat, lon);
        } catch (error) {
            // Retry once on timeout
            if (error.message.includes('timeout')) {
                gridInfo = await getGridInfo(lat, lon);
            } else {
                throw error;
            }
        }

        // Step 2: Get hourly forecast
        const forecast = await getHourlyForecast(
            gridInfo.gridId,
            gridInfo.gridX,
            gridInfo.gridY
        );

        // Step 3: Filter for morning hours
        const morningPeriods = filterMorningHours(forecast);

        // Step 4: Extract 7 AM data (or first morning period)
        if (morningPeriods.length === 0) {
            return _getFallbackWeather();
        }

        const morningData = morningPeriods[0];

        return {
            temperature: morningData.temperature,
            temperatureUnit: morningData.temperatureUnit,
            conditions: morningData.shortForecast,
            icon: morningData.icon,
            windSpeed: morningData.windSpeed,
            windDirection: morningData.windDirection
        };
    } catch (error) {
    // Log error in development/testing, silent in production
        if (process.env.NODE_ENV !== 'production') {
            console.error('Weather service error:', error.message);
        }
        return _getFallbackWeather();
    }
}

/**
 * Format weather data for APL display
 * @param {Object} weatherData - Weather data
 * @returns {Object} APL-formatted weather
 */
function formatWeatherForAPL(weatherData) {
    const formatted = { ...weatherData };

    // Add display text
    if (weatherData.temperature !== null && weatherData.temperature !== undefined) {
        formatted.displayText = `${weatherData.temperature}°${weatherData.temperatureUnit} - ${weatherData.conditions}`;
    } else {
        formatted.displayText = weatherData.conditions || 'Weather unavailable';
    }

    return formatted;
}

/**
 * Generate cache key for grid info
 * @private
 */
function _generateGridCacheKey(lat, lon) {
    return `weather:grid:${lat}:${lon}`;
}

/**
 * Generate cache key for hourly forecast
 * @private
 */
function _generateForecastCacheKey(gridId, gridX, gridY) {
    return `weather:hourly:${gridId}:${gridX}:${gridY}`;
}

/**
 * Get fallback weather when API fails
 * @private
 */
function _getFallbackWeather() {
    return {
        temperature: null,
        temperatureUnit: 'F',
        conditions: 'Weather unavailable',
        icon: null,
        windSpeed: null,
        windDirection: null,
        isFallback: true
    };
}

module.exports = {
    getGridInfo,
    getHourlyForecast,
    getDailyForecast,
    filterMorningHours,
    getTodayWeather,
    getMorningWeather,
    formatWeatherForAPL,
    // Export for testing
    _generateGridCacheKey,
    _generateForecastCacheKey
};
