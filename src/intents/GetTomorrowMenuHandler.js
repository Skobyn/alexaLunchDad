/**
 * GetTomorrowMenuHandler - Handle requests for tomorrow's lunch menu
 *
 * Intent: GetTomorrowMenuIntent
 * Example utterances:
 *   - "What's for lunch tomorrow?"
 *   - "What's on the menu tomorrow?"
 *   - "Tell me tomorrow's lunch menu"
 */

const nutrisliceService = require('../services/nutrisliceService');
const weatherService = require('../services/weatherService');
const menuCalendarService = require('../services/menuCalendarService');
const menuParser = require('../utils/menuParser');
const dateUtils = require('../utils/dateUtils');
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
 * Format tomorrow's weather data into concise speech output
 * @param {Object} weatherData - Weather data from weatherService
 * @returns {string} - Formatted weather speech
 */
function formatTomorrowWeatherSpeech(weatherData) {
    if (!weatherData || weatherData.isFallback || !weatherData.tomorrow) {
        return '';
    }

    const dayName = weatherData.tomorrow.dayName;
    const high = weatherData.tomorrow.temperature;
    const conditions = weatherData.tomorrow.shortForecast.toLowerCase();
    const forecast = weatherData.tomorrow.detailedForecast.toLowerCase();

    // Build concise weather message
    let weatherMsg = `In ${constants.WEATHER.LOCATION_NAME}, ${dayName}'s forecast is ${conditions} with a high of ${high}. `;

    // Extract rain/precipitation info if present
    const rainMatch = forecast.match(/(heavy|light|moderate)?\s*(rain|showers|precipitation|drizzle)/i);
    const timeMatch = forecast.match(/(morning|afternoon|evening|overnight|around \d{1,2}\s*(am|pm)?)/i);

    if (rainMatch) {
        const intensity = rainMatch[1] ? rainMatch[1].toLowerCase() + ' ' : '';
        const precipType = rainMatch[2].toLowerCase();
        const timing = timeMatch ? ` ${timeMatch[1]}` : '';
        weatherMsg += `${intensity.charAt(0).toUpperCase() + intensity.slice(1)}${precipType}${timing}. `;
    }

    return weatherMsg;
}

const GetTomorrowMenuHandler = {
    canHandle(handlerInput) {
        return (
            handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'GetTomorrowMenuIntent'
        );
    },

    async handle(handlerInput) {
        try {
            // Fetch tomorrow's menu, weather, and 5-day calendar in parallel
            const [menuData, weatherData, menuCalendar] = await Promise.all([
                nutrisliceService.getMenuForTomorrow(),
                weatherService.getTomorrowWeather().catch(() => null), // Weather is optional
                menuCalendarService.getMenuCalendar().catch(() => null) // Calendar is optional for APL
            ]);

            // Calculate which day we're showing (for better UX)
            // Use timezone-aware date to ensure correct "today" in Villa Park, IL
            const today = dateUtils.getTodayInTimezone();
            const nextSchoolDay = dateUtils.getNextSchoolDay(today, 1);

            // Check if next school day is actually tomorrow (1 calendar day away)
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const isActuallyTomorrow = (
                nextSchoolDay.getFullYear() === tomorrow.getFullYear() &&
        nextSchoolDay.getMonth() === tomorrow.getMonth() &&
        nextSchoolDay.getDate() === tomorrow.getDate()
            );

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

            // Build speech output with appropriate day reference
            let speakOutput;
            if (isActuallyTomorrow) {
                speakOutput = `Tomorrow's lunch menu includes ${safeMenuText}.`;
            } else {
                // Weekend/holiday case - specify the actual day
                const dayName = nextSchoolDay.toLocaleDateString('en-US', { weekday: 'long' });
                speakOutput = `The next school lunch is on ${dayName}, featuring ${safeMenuText}.`;
            }

            // Add weather context if available
            const weatherMsg = formatTomorrowWeatherSpeech(weatherData);
            if (weatherMsg) {
                speakOutput = weatherMsg + speakOutput;
            }

            // Build response
            const responseBuilder = handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Would you like to know about today\'s menu?');

            // Add APL directive if device supports it and we have calendar data
            if (aplUtils.supportsAPL(handlerInput) && menuCalendar && menuCalendar.days) {
                try {
                    // Transform weather data for APL
                    const aplWeatherData = weatherData && !weatherData.isFallback ? {
                        temperature: weatherData.tomorrow.temperature,
                        conditions: weatherData.tomorrow.shortForecast,
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

module.exports = GetTomorrowMenuHandler;
