/**
 * GetTomorrowMenuHandler
 *
 * Handles GetTomorrowMenuIntent by fetching tomorrow's school lunch menu
 * (or next school day, skipping weekends and holidays)
 */

const nutrisliceService = require('../services/nutrisliceService');
const constants = require('../utils/constants');

const GetTomorrowMenuHandler = {
    canHandle(handlerInput) {
        if (handlerInput.requestEnvelope.request.type !== 'IntentRequest') {
            return false;
        }
        if (!handlerInput.requestEnvelope.request.intent) {
            return false;
        }
        return handlerInput.requestEnvelope.request.intent.name === 'GetTomorrowMenuIntent';
    },

    async handle(handlerInput) {
        try {
            // Fetch tomorrow's menu (next school day)
            const menuData = await nutrisliceService.getMenuForTomorrow();

            // Build response based on menu availability
            let speakOutput = '';

            if (!menuData || !menuData.items || menuData.items.length === 0) {
                // Check if it's a weekend or holiday
                if (menuData && menuData.message) {
                    speakOutput = menuData.message;
                } else {
                    speakOutput = constants.ERRORS.NO_MENU;
                }
            } else {
                // Format menu items
                const menuItems = menuData.items
                    .slice(0, constants.MAX_MENU_ITEMS)
                    .map(item => item.name)
                    .join(', ');

                speakOutput = `Tomorrow's lunch includes ${menuItems}.`;
            }

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Would you like to hear today\'s menu?')
                .getResponse();

        } catch (error) {
            const errorMessage = constants.ERRORS.API_ERROR;
            return handlerInput.responseBuilder
                .speak(errorMessage)
                .reprompt('Please try again later.')
                .getResponse();
        }
    }
};

module.exports = GetTomorrowMenuHandler;
