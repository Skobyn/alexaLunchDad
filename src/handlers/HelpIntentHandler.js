const HelpIntentHandler = {
    canHandle(handlerInput) {
        if (handlerInput.requestEnvelope.request.type !== 'IntentRequest') {
            return false;
        }
        if (!handlerInput.requestEnvelope.request.intent) {
            return false;
        }
        return handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can ask me about the lunch menu! Try saying "what\'s for lunch today" or "what\'s for lunch tomorrow".';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

module.exports = HelpIntentHandler;
