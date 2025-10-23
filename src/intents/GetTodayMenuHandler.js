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

            // Build response
            const responseBuilder = handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Would you like to know about tomorrow menu?');

            // Add APL directive if device supports it and we have calendar data
            if (aplUtils.supportsAPL(handlerInput) && menuCalendar && menuCalendar.days) {
                try {
                    // Build APL data source
                    const aplDataSource = buildMenuDataSource(menuCalendar, weatherData);

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
