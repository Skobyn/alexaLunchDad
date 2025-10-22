/**
 * Response Builder Utility
 * Handles Alexa response construction with APL support
 * Following London School TDD - behavior-focused implementation
 */

const constants = require('./constants');

// Speech message templates
const SPEECH_MESSAGES = {
  LAUNCH: "Welcome to Lunch Dad! You can ask what's for lunch today or tomorrow. What would you like to know?",
  HELP: "You can ask me what's for lunch today or tomorrow. For example, say 'what's for lunch today?' What would you like to know?",
  HELP_REPROMPT: "What would you like to know?"
};

/**
 * Builds a simple voice response
 * @param {Object} handlerInput - Alexa HandlerInput object
 * @param {string} speechText - Text to speak
 * @param {boolean} shouldEndSession - Whether to end the session (default: false)
 * @returns {Object} Alexa response
 */
function buildVoiceResponse(handlerInput, speechText, shouldEndSession = false) {
  return handlerInput.responseBuilder
    .speak(speechText)
    .withShouldEndSession(shouldEndSession)
    .getResponse();
}

/**
 * Formats menu items array into natural speech
 * @param {Array<string>} menuItems - Array of menu item names
 * @returns {string} Formatted speech string (e.g., "A, B, and C")
 */
function formatMenuForSpeech(menuItems) {
  if (!menuItems || menuItems.length === 0) {
    return '';
  }

  // Trim whitespace from all items
  const trimmedItems = menuItems.map(item => item.trim());

  if (trimmedItems.length === 1) {
    return trimmedItems[0];
  }

  if (trimmedItems.length === 2) {
    return `${trimmedItems[0]} and ${trimmedItems[1]}`;
  }

  // For 3 or more items: "A, B, C, and D" (Oxford comma)
  const allButLast = trimmedItems.slice(0, -1).join(', ');
  const lastItem = trimmedItems[trimmedItems.length - 1];
  return `${allButLast}, and ${lastItem}`;
}

/**
 * Builds a menu response with optional APL visual
 * @param {Object} handlerInput - Alexa HandlerInput object
 * @param {Array<string>} menuItems - Menu items to display
 * @param {string} dateContext - 'today' or 'tomorrow'
 * @param {boolean} includeAPL - Whether to include APL visual
 * @param {Object} weatherData - Weather information for APL overlay
 * @returns {Object} Alexa response
 */
function buildMenuResponse(handlerInput, menuItems, dateContext, includeAPL, weatherData) {
  // Format menu items for speech
  const formattedMenu = formatMenuForSpeech(menuItems);

  // Capitalize date context for speech
  const datePrefix = dateContext.charAt(0).toUpperCase() + dateContext.slice(1);
  const speechText = `${datePrefix}'s lunch includes ${formattedMenu}.`;

  // Build base response
  const responseBuilder = handlerInput.responseBuilder
    .speak(speechText)
    .withShouldEndSession(false);

  // Add APL directive if supported and requested
  if (includeAPL) {
    const aplDirective = {
      type: 'Alexa.Presentation.APL.RenderDocument',
      document: require('../apl/menuCalendarDocument.json'),
      datasources: {
        menuData: {
          items: menuItems,
          dateContext: dateContext,
          weather: weatherData
        }
      }
    };

    responseBuilder.addDirective(aplDirective);
  }

  return responseBuilder.getResponse();
}

/**
 * Builds the launch/welcome response
 * @param {Object} handlerInput - Alexa HandlerInput object
 * @returns {Object} Alexa response
 */
function buildLaunchResponse(handlerInput) {
  return handlerInput.responseBuilder
    .speak(SPEECH_MESSAGES.LAUNCH)
    .reprompt(SPEECH_MESSAGES.LAUNCH)
    .withShouldEndSession(false)
    .getResponse();
}

/**
 * Builds the help response
 * @param {Object} handlerInput - Alexa HandlerInput object
 * @returns {Object} Alexa response
 */
function buildHelpResponse(handlerInput) {
  return handlerInput.responseBuilder
    .speak(SPEECH_MESSAGES.HELP)
    .reprompt(SPEECH_MESSAGES.HELP_REPROMPT)
    .withShouldEndSession(false)
    .getResponse();
}

/**
 * Builds an error response
 * @param {Object} handlerInput - Alexa HandlerInput object
 * @param {string} errorMessage - Custom error message (optional)
 * @returns {Object} Alexa response
 */
function buildErrorResponse(handlerInput, errorMessage) {
  const speechText = errorMessage || constants.ERRORS.API_ERROR;

  return handlerInput.responseBuilder
    .speak(speechText)
    .withShouldEndSession(true)
    .getResponse();
}

/**
 * Checks if the device supports APL
 * @param {Object} handlerInput - Alexa HandlerInput object
 * @returns {boolean} True if APL is supported
 */
function supportsAPL(handlerInput) {
  try {
    if (!handlerInput || !handlerInput.requestEnvelope || !handlerInput.requestEnvelope.context) {
      return false;
    }

    const device = handlerInput.requestEnvelope.context.System?.device;
    if (!device || !device.supportedInterfaces) {
      return false;
    }

    const supportedInterfaces = device.supportedInterfaces;
    return 'Alexa.Presentation.APL' in supportedInterfaces;
  } catch (error) {
    return false;
  }
}

module.exports = {
  buildVoiceResponse,
  formatMenuForSpeech,
  buildMenuResponse,
  buildLaunchResponse,
  buildHelpResponse,
  buildErrorResponse,
  supportsAPL
};
