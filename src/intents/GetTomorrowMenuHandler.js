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
const menuParser = require('../utils/menuParser');
const dateUtils = require('../utils/dateUtils');
const constants = require('../utils/constants');

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

const GetTomorrowMenuHandler = {
    canHandle(handlerInput) {
        return (
            handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'GetTomorrowMenuIntent'
        );
    },

    async handle(handlerInput) {
        try {
            // Fetch tomorrow's menu and weather in parallel
            const [menuData, weatherData] = await Promise.all([
                nutrisliceService.getMenuForTomorrow(),
                weatherService.getTomorrowWeather().catch(() => null) // Weather is optional
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
            if (weatherData && !weatherData.isFallback && weatherData.tomorrow) {
                const dayName = weatherData.tomorrow.dayName;
                const temp = weatherData.tomorrow.temperature;
                const conditions = weatherData.tomorrow.shortForecast.toLowerCase();
                const forecast = weatherData.tomorrow.detailedForecast;

                // Build weather message for tomorrow's forecast
                let weatherMsg = `${dayName}'s forecast calls for ${conditions} with a high of ${temp} degrees. `;
                // Remove trailing period from forecast if present to avoid double periods
                const cleanForecast = forecast.endsWith('.') ? forecast.slice(0, -1) : forecast;
                weatherMsg += `${cleanForecast}. `;

                speakOutput = weatherMsg + speakOutput;
            }

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Would you like to know about today\'s menu?')
                .getResponse();
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
