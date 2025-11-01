/**
 * GetTodayMenuHandler - Handle requests for today's lunch menu
 *
 * Intent: GetTodayMenuIntent
 * Example utterances:
 *   - "What's for lunch today?"
 *   - "What's on the menu today?"
 *   - "Tell me today's lunch menu"
 */

const nutrisliceService = require('../services/nutrisliceService');
const weatherService = require('../services/weatherService');
const menuCalendarService = require('../services/menuCalendarService');
const menuParser = require('../utils/menuParser');
const constants = require('../utils/constants');
const aplUtils = require('../utils/aplUtils');
const { buildMenuDataSource } = require('../apl/menuDataSource');
const menuCalendarDocument = require('../apl/menuCalendarDocument.json');

/**
 * Escape XML special characters for SSML
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text safe for SSML
 */
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Format weather data into concise speech output
 * @param {Object} weatherData - Weather data from weatherService
 * @returns {string} - Formatted weather speech
 */
function formatWeatherSpeech(weatherData) {
    if (!weatherData || weatherData.isFallback || !weatherData.current) {
        return '';
    }

    const temp = weatherData.current.temperature;
    const conditions = weatherData.current.conditions.toLowerCase();
    const high = weatherData.today.high;
    const forecast = weatherData.today.detailedForecast.toLowerCase();

    // Build concise weather message
    let weatherMsg = `In ${constants.WEATHER.LOCATION_NAME}, current temp is ${temp} with ${conditions}. `;

    // Extract rain/precipitation info if present
    const rainMatch = forecast.match(/(heavy|light|moderate)?\s*(rain|showers|precipitation|drizzle)/i);
    const timeMatch = forecast.match(/(morning|afternoon|evening|overnight|around \d{1,2}\s*(am|pm)?)/i);

    if (rainMatch) {
        const intensity = rainMatch[1] ? rainMatch[1].toLowerCase() + ' ' : '';
        const precipType = rainMatch[2].toLowerCase();
        const timing = timeMatch ? ` ${timeMatch[1]}` : ' today';
        weatherMsg += `${intensity.charAt(0).toUpperCase() + intensity.slice(1)}${precipType}${timing}. `;
    }

    // Add high temperature with timing if available
    const highTimeMatch = forecast.match(/high\s+(?:near|around)?\s*\d+.*?(afternoon|morning|around \d{1,2}\s*(am|pm)?)/i);
    if (highTimeMatch) {
        weatherMsg += `High of ${high} ${highTimeMatch[1]}. `;
    } else {
        weatherMsg += `High of ${high}. `;
    }

    return weatherMsg;
}

const GetTodayMenuHandler = {
    canHandle(handlerInput) {
        return (
            handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'GetTodayMenuIntent'
        );
    },

    async handle(handlerInput) {
        try {
            // Fetch today's menu, weather, and 5-day calendar in parallel
            const [menuData, weatherData, menuCalendar] = await Promise.all([
                nutrisliceService.getMenuForToday(),
                weatherService.getTodayWeather().catch(() => null), // Weather is optional
                menuCalendarService.getMenuCalendar().catch(() => null) // Calendar is optional for APL
            ]);

            // Check if menu is available
            if (!menuData || !menuData.items || menuData.items.length === 0) {
                const speakOutput = constants.ERRORS.NO_MENU;
                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .reprompt('Is there anything else I can help you with?')
                    .getResponse();
            }

            // Extract main items from menu
            const mainItems = menuParser.extractMainItems(menuData);

            if (mainItems.length === 0) {
                const speakOutput = constants.ERRORS.NO_MENU;
                return handlerInput.responseBuilder
                    .speak(speakOutput)
                    .reprompt('Is there anything else I can help you with?')
                    .getResponse();
            }

            // Format menu items for speech and escape XML special characters
            const menuText = menuParser.formatMenuItems(mainItems);
            const safeMenuText = escapeXml(menuText);

            // Build speech output
            let speakOutput = `Today's lunch menu includes ${safeMenuText}.`;

            // Add weather context if available
            const weatherMsg = formatWeatherSpeech(weatherData);
            if (weatherMsg) {
                speakOutput = weatherMsg + speakOutput;
            }

            // Build response
            const responseBuilder = handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Would you like to know about tomorrow menu?');

            // Add APL directive if device supports it and we have calendar data
            if (aplUtils.supportsAPL(handlerInput) && menuCalendar && menuCalendar.days) {
                try {
                    // Transform weather data for APL
                    const aplWeatherData = weatherData && !weatherData.isFallback ? {
                        temperature: weatherData.current.temperature,
                        conditions: weatherData.current.conditions,
                        icon: null // Weather.gov doesn't provide icon URLs
                    } : null;

                    // Build APL data source
                    const aplDataSource = buildMenuDataSource(menuCalendar, aplWeatherData);

                    // Add APL directive
                    const aplDirective = aplUtils.buildRenderDocumentDirective(
                        menuCalendarDocument,
                        aplDataSource
                    );

                    responseBuilder.addDirective(aplDirective);
                } catch (aplError) {
                    // APL error shouldn't break the response - log and continue
                    // Voice response will still work
                }
            }

            return responseBuilder.getResponse();
        } catch (error) {
            const speakOutput = constants.ERRORS.API_ERROR;
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Please try again.')
                .getResponse();
        }
    }
};

module.exports = GetTodayMenuHandler;
