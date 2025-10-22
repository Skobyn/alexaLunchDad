const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, _error) {
        const speakOutput = 'Sorry, I had trouble processing your request. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

module.exports = ErrorHandler;
