/**
 * GetTodayMenuHandler
 *
 * Handles GetTodayMenuIntent by fetching today's school lunch menu
 * and morning weather information
 */

const nutrisliceService = require('../services/nutrisliceService');
const weatherService = require('../services/weatherService');
const constants = require('../utils/constants');

const GetTodayMenuHandler = {
    canHandle(handlerInput) {
        if (handlerInput.requestEnvelope.request.type !== 'IntentRequest') {
            return false;
        }
        if (!handlerInput.requestEnvelope.request.intent) {
            return false;
        }
        return handlerInput.requestEnvelope.request.intent.name === 'GetTodayMenuIntent';
    },

    async handle(handlerInput) {
        try {
            // Fetch menu and weather in parallel for better performance
            const [menuData, weatherData] = await Promise.allSettled([
                nutrisliceService.getMenuForToday(),
                weatherService.getMorningWeather()
            ]);

            // Check if menu fetch failed (rejected)
            if (menuData.status === 'rejected') {
                // Menu service error - use "trouble" message
                const errorMessage = 'I\'m having trouble getting the menu right now. Please try again later.';
                return handlerInput.responseBuilder
                    .speak(errorMessage)
                    .reprompt('Please try again later.')
                    .getResponse();
            }

            // Extract results
            const menu = menuData.value;
            const weather = weatherData.status === 'fulfilled' ? weatherData.value : null;

            // Build response based on menu availability
            let speakOutput = '';

            if (!menu || !menu.items || menu.items.length === 0) {
                // No menu available (but not an error - just empty)
                speakOutput = 'There\'s no menu available for today.';
            } else {
                // Format menu items
                const menuItems = menu.items
                    .slice(0, constants.MAX_MENU_ITEMS)
                    .map(item => item.name)
                    .join(', ');

                speakOutput = `Today's lunch includes ${menuItems}.`;

                // Add weather information if available
                if (weather && !weather.isFallback) {
                    speakOutput += ` The morning temperature is ${weather.temperature} degrees ${weather.temperatureUnit} with ${weather.conditions}.`;
                }
            }

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Would you like to hear tomorrow\'s menu?')
                .getResponse();

        } catch (error) {
            const errorMessage = 'I\'m having trouble getting the menu right now. Please try again later.';
            return handlerInput.responseBuilder
                .speak(errorMessage)
                .reprompt('Please try again later.')
                .getResponse();
        }
    }
};

module.exports = GetTodayMenuHandler;
