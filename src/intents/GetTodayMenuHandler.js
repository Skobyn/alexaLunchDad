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
const menuParser = require('../utils/menuParser');
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

const GetTodayMenuHandler = {
    canHandle(handlerInput) {
        return (
            handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'GetTodayMenuIntent'
        );
    },

    async handle(handlerInput) {
        try {
            // Fetch today's menu and weather in parallel
            const [menuData, weatherData] = await Promise.all([
                nutrisliceService.getMenuForToday(),
                weatherService.getTodayWeather().catch(() => null) // Weather is optional
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
            if (weatherData && !weatherData.isFallback && weatherData.current) {
                const currentTemp = weatherData.current.temperature;
                const currentConditions = weatherData.current.conditions.toLowerCase();
                const todayHigh = weatherData.today.high;
                const forecast = weatherData.today.detailedForecast;

                // Build weather message with current + forecast
                let weatherMsg = `Currently it is ${currentTemp} degrees and ${currentConditions}. `;
                weatherMsg += `Today's high will be ${todayHigh} degrees. `;
                // Remove trailing period from forecast if present to avoid double periods
                const cleanForecast = forecast.endsWith('.') ? forecast.slice(0, -1) : forecast;
                weatherMsg += `${cleanForecast}. `;

                speakOutput = weatherMsg + speakOutput;
            }

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Would you like to know about tomorrow menu?')
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

module.exports = GetTodayMenuHandler;
