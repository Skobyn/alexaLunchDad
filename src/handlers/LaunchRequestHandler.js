const menuCalendarService = require('../services/menuCalendarService');
const weatherService = require('../services/weatherService');
const nutrisliceService = require('../services/nutrisliceService');
const menuParser = require('../utils/menuParser');
const aplUtils = require('../utils/aplUtils');
const { buildMenuDataSource } = require('../apl/menuDataSource');
const menuCalendarDocument = require('../apl/menuCalendarDocument.json');

/**
 * Check if menu contains pancakes
 * @param {Object} menuData - Menu data from nutrislice service
 * @returns {boolean} True if pancakes are found
 */
function hasPancakes(menuData) {
    if (!menuData || !menuData.items || !Array.isArray(menuData.items)) {
        return false;
    }

    return menuData.items.some(item =>
        item.name && item.name.toLowerCase().includes('pancake')
    );
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {
        // Fetch today's menu to check for pancakes
        let braydenMessage = 'Brayden.. we already know.. home lunch';
        try {
            const todayMenu = await nutrisliceService.getMenuForToday();
            if (hasPancakes(todayMenu)) {
                braydenMessage = 'Brayden.. maybe school lunch today?';
            }
        } catch (error) {
            // If menu fetch fails, use default message
        }

        const speakOutput = `Ask me whats for lunch today or tomorrow, and I'll help you decide what to eat. ${braydenMessage}`;

        const responseBuilder = handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('What would you like to know about lunch today?');

        // Add APL visual if device supports it
        if (aplUtils.supportsAPL(handlerInput)) {
            try {
                // Fetch calendar and weather in parallel
                const [menuCalendar, weatherData] = await Promise.all([
                    menuCalendarService.getMenuCalendar().catch(() => null),
                    weatherService.getTodayWeather().catch(() => null)
                ]);

                if (menuCalendar && menuCalendar.days) {
                    // Transform weather data for APL
                    const aplWeatherData = weatherData && !weatherData.isFallback ? {
                        temperature: weatherData.current.temperature,
                        conditions: weatherData.current.conditions,
                        icon: null
                    } : null;

                    // Build APL data source
                    const aplDataSource = buildMenuDataSource(menuCalendar, aplWeatherData);

                    // Add APL directive
                    const aplDirective = aplUtils.buildRenderDocumentDirective(
                        menuCalendarDocument,
                        aplDataSource
                    );

                    responseBuilder.addDirective(aplDirective);
                }
            } catch (aplError) {
                // APL error shouldn't break the response
            }
        }

        return responseBuilder.getResponse();
    }
};

module.exports = LaunchRequestHandler;
