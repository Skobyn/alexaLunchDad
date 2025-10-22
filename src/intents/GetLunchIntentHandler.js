const { getLunchRecommendation } = require('../utils/lunchRecommendations');

const GetLunchIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'GetLunchIntent';
    },
    handle(handlerInput) {
        const recommendation = getLunchRecommendation();
        const speakOutput = `How about ${recommendation}? That sounds delicious for lunch!`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('Would you like another suggestion?')
            .getResponse();
    }
};

module.exports = GetLunchIntentHandler;
