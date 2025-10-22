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
const menuParser = require('../utils/menuParser');
const dateUtils = require('../utils/dateUtils');
const constants = require('../utils/constants');

const GetTomorrowMenuHandler = {
    canHandle(handlerInput) {
        return (
            handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'GetTomorrowMenuIntent'
        );
    },

    async handle(handlerInput) {
        try {
            // Get tomorrow's menu (automatically skips weekends/holidays)
            const menuData = await nutrisliceService.getMenuForTomorrow();

            // Calculate which day we're showing (for better UX)
            const today = new Date();
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

            // Format menu items for speech
            const menuText = menuParser.formatMenuItems(mainItems);

            // Build speech output with appropriate day reference
            let speakOutput;
            if (isActuallyTomorrow) {
                speakOutput = `Tomorrow's lunch menu includes ${menuText}.`;
            } else {
                // Weekend/holiday case - specify the actual day
                const dayName = nextSchoolDay.toLocaleDateString('en-US', { weekday: 'long' });
                speakOutput = `The next school lunch is on ${dayName}, featuring ${menuText}.`;
            }

            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Would you like to know about today\'s menu?')
                .getResponse();
        } catch (error) {
            console.error('Error in GetTomorrowMenuHandler:', error);

            const speakOutput = constants.ERRORS.API_ERROR;
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('Please try again.')
                .getResponse();
        }
    }
};

module.exports = GetTomorrowMenuHandler;
