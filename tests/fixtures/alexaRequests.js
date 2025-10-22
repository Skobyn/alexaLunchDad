/**
 * Alexa Request Builders
 *
 * Helper functions to build valid Alexa request envelopes for testing.
 * Supports all request types and device capabilities.
 */

/**
 * Build a complete Alexa request envelope
 * @param {Object} options - Request options
 * @param {string} options.requestType - Type of request (IntentRequest, LaunchRequest, SessionEndedRequest)
 * @param {string} options.intentName - Intent name (for IntentRequest)
 * @param {Object} options.slots - Intent slots (for IntentRequest)
 * @param {boolean} options.newSession - Whether this is a new session
 * @param {Object} options.sessionAttributes - Session attributes
 * @param {boolean} options.supportsAPL - Whether device supports APL
 * @param {string} options.locale - Request locale
 * @returns {Object} Complete Alexa request envelope
 */
function buildRequest({
  requestType = 'IntentRequest',
  intentName = null,
  slots = {},
  newSession = false,
  sessionAttributes = {},
  supportsAPL = true,
  locale = 'en-US'
} = {}) {
  const timestamp = new Date().toISOString();

  const baseRequest = {
    version: '1.0',
    session: {
      new: newSession,
      sessionId: `amzn1.echo-api.session.${generateId()}`,
      application: {
        applicationId: 'amzn1.ask.skill.test-skill-id'
      },
      attributes: sessionAttributes,
      user: {
        userId: `amzn1.ask.account.${generateId()}`
      }
    },
    context: {
      System: {
        application: {
          applicationId: 'amzn1.ask.skill.test-skill-id'
        },
        user: {
          userId: `amzn1.ask.account.${generateId()}`
        },
        device: {
          deviceId: `amzn1.ask.device.${generateId()}`,
          supportedInterfaces: {}
        },
        apiEndpoint: 'https://api.amazonalexa.com',
        apiAccessToken: `test-token-${generateId()}`
      },
      Viewport: supportsAPL ? {
        experiences: [
          {
            arcMinuteWidth: 246,
            arcMinuteHeight: 144,
            canRotate: false,
            canResize: false
          }
        ],
        shape: 'RECTANGLE',
        pixelWidth: 1024,
        pixelHeight: 600,
        dpi: 160,
        currentPixelWidth: 1024,
        currentPixelHeight: 600,
        touch: ['SINGLE']
      } : undefined
    },
    request: {
      type: requestType,
      requestId: `amzn1.echo-api.request.${generateId()}`,
      timestamp: timestamp,
      locale: locale
    }
  };

  // Add APL interface if supported
  if (supportsAPL) {
    baseRequest.context.System.device.supportedInterfaces['Alexa.Presentation.APL'] = {
      runtime: {
        maxVersion: '2024.2'
      }
    };
  }

  // Add intent details for IntentRequest
  if (requestType === 'IntentRequest' && intentName) {
    baseRequest.request.intent = {
      name: intentName,
      confirmationStatus: 'NONE',
      slots: slots
    };
  }

  // Add reason for SessionEndedRequest
  if (requestType === 'SessionEndedRequest') {
    baseRequest.request.reason = 'USER_INITIATED';
  }

  return baseRequest;
}

/**
 * Build a LaunchRequest
 * @param {Object} options - Request options
 * @returns {Object} LaunchRequest envelope
 */
function buildLaunchRequest(options = {}) {
  return buildRequest({
    ...options,
    requestType: 'LaunchRequest',
    newSession: true
  });
}

/**
 * Build an IntentRequest
 * @param {string} intentName - Name of the intent
 * @param {Object} slots - Intent slots
 * @param {Object} options - Additional request options
 * @returns {Object} IntentRequest envelope
 */
function buildIntentRequest(intentName, slots = {}, options = {}) {
  return buildRequest({
    ...options,
    requestType: 'IntentRequest',
    intentName,
    slots
  });
}

/**
 * Build GetTodayMenuIntent request
 * @param {Object} options - Request options
 * @returns {Object} GetTodayMenuIntent request
 */
function buildGetTodayMenuIntent(options = {}) {
  return buildIntentRequest('GetTodayMenuIntent', {}, options);
}

/**
 * Build GetTomorrowMenuIntent request
 * @param {Object} options - Request options
 * @returns {Object} GetTomorrowMenuIntent request
 */
function buildGetTomorrowMenuIntent(options = {}) {
  return buildIntentRequest('GetTomorrowMenuIntent', {}, options);
}

/**
 * Build AMAZON.HelpIntent request
 * @param {Object} options - Request options
 * @returns {Object} HelpIntent request
 */
function buildHelpIntent(options = {}) {
  return buildIntentRequest('AMAZON.HelpIntent', {}, options);
}

/**
 * Build AMAZON.StopIntent request
 * @param {Object} options - Request options
 * @returns {Object} StopIntent request
 */
function buildStopIntent(options = {}) {
  return buildIntentRequest('AMAZON.StopIntent', {}, options);
}

/**
 * Build AMAZON.CancelIntent request
 * @param {Object} options - Request options
 * @returns {Object} CancelIntent request
 */
function buildCancelIntent(options = {}) {
  return buildIntentRequest('AMAZON.CancelIntent', {}, options);
}

/**
 * Build SessionEndedRequest
 * @param {Object} options - Request options
 * @returns {Object} SessionEndedRequest envelope
 */
function buildSessionEndedRequest(options = {}) {
  return buildRequest({
    ...options,
    requestType: 'SessionEndedRequest'
  });
}

/**
 * Build slot object
 * @param {string} name - Slot name
 * @param {string} value - Slot value
 * @param {string} confirmationStatus - Confirmation status
 * @returns {Object} Slot object
 */
function buildSlot(name, value, confirmationStatus = 'NONE') {
  return {
    [name]: {
      name,
      value,
      confirmationStatus,
      source: 'USER'
    }
  };
}

/**
 * Generate random ID for testing
 * @returns {string} Random ID
 */
function generateId() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Create a mock handler input for testing handlers directly
 * @param {Object} requestEnvelope - Request envelope
 * @param {Object} attributesManager - Mock attributes manager
 * @param {Object} responseBuilder - Mock response builder
 * @returns {Object} Mock handler input
 */
function createMockHandlerInput(requestEnvelope, attributesManager = null, responseBuilder = null) {
  return {
    requestEnvelope,
    attributesManager: attributesManager || createMockAttributesManager(),
    responseBuilder: responseBuilder || createMockResponseBuilder(),
    context: {},
    serviceClientFactory: null
  };
}

/**
 * Create mock attributes manager
 * @returns {Object} Mock attributes manager
 */
function createMockAttributesManager() {
  const attributes = {};

  return {
    getSessionAttributes: jest.fn(() => attributes),
    setSessionAttributes: jest.fn((attrs) => Object.assign(attributes, attrs)),
    getPersistentAttributes: jest.fn(() => ({})),
    setPersistentAttributes: jest.fn(),
    savePersistentAttributes: jest.fn(),
    deletePersistentAttributes: jest.fn()
  };
}

/**
 * Create mock response builder
 * @returns {Object} Mock response builder
 */
function createMockResponseBuilder() {
  const response = {
    outputSpeech: null,
    reprompt: null,
    shouldEndSession: undefined,
    directives: []
  };

  const builder = {
    speak: jest.fn(function(speechOutput) {
      response.outputSpeech = {
        type: 'SSML',
        ssml: `<speak>${speechOutput}</speak>`
      };
      return this;
    }),
    reprompt: jest.fn(function(repromptSpeech) {
      response.reprompt = {
        outputSpeech: {
          type: 'SSML',
          ssml: `<speak>${repromptSpeech}</speak>`
        }
      };
      return this;
    }),
    withShouldEndSession: jest.fn(function(shouldEnd) {
      response.shouldEndSession = shouldEnd;
      return this;
    }),
    addDirective: jest.fn(function(directive) {
      response.directives.push(directive);
      return this;
    }),
    getResponse: jest.fn(() => ({ ...response }))
  };

  return builder;
}

module.exports = {
  buildRequest,
  buildLaunchRequest,
  buildIntentRequest,
  buildGetTodayMenuIntent,
  buildGetTomorrowMenuIntent,
  buildHelpIntent,
  buildStopIntent,
  buildCancelIntent,
  buildSessionEndedRequest,
  buildSlot,
  generateId,
  createMockHandlerInput,
  createMockAttributesManager,
  createMockResponseBuilder
};
