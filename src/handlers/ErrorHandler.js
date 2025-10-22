const ErrorHandler = {
    canHandle() {
        return true;
    },
    // eslint-disable-next-line no-unused-vars
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble processing your request. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

module.exports = ErrorHandler;
