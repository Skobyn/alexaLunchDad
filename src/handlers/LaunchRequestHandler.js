const menuCalendarService = require('../services/menuCalendarService');
const weatherService = require('../services/weatherService');
const aplUtils = require('../utils/aplUtils');
const { buildMenuDataSource } = require('../apl/menuDataSource');
const menuCalendarDocument = require('../apl/menuCalendarDocument.json');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const speakOutput = 'Welcome to Lunch Dad! Ask me whats for lunch today or tomorrow, and I\'ll help you decide what to eat. Brayden.. we already know.. home lunch';

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
