const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to Lunch Dad! Ask me for a lunch recommendation, and I\'ll help you decide what to eat.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('What would you like to know about lunch today?')
            .getResponse();
    }
};

module.exports = LaunchRequestHandler;
