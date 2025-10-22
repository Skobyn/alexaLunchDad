const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to Lunch Dad! Ask me whats for lunch today or tomorrow, and I\'ll help you decide what to eat. Brayden.. we already know.. home lunch';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('What would you like to know about lunch today?')
            .getResponse();
    }
};

module.exports = LaunchRequestHandler;
