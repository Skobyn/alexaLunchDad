const LaunchRequestHandler = require('../../src/handlers/LaunchRequestHandler');
const HelpIntentHandler = require('../../src/handlers/HelpIntentHandler');

describe('Request Handlers', () => {
    let mockHandlerInput;

    beforeEach(() => {
        mockHandlerInput = {
            requestEnvelope: {
                request: {},
                context: {
                    System: {
                        device: {
                            supportedInterfaces: {}
                        }
                    }
                }
            },
            responseBuilder: {
                speak: jest.fn().mockReturnThis(),
                reprompt: jest.fn().mockReturnThis(),
                getResponse: jest.fn().mockReturnValue({})
            }
        };
    });

    describe('LaunchRequestHandler', () => {
        it('should handle LaunchRequest', () => {
            mockHandlerInput.requestEnvelope.request.type = 'LaunchRequest';
            expect(LaunchRequestHandler.canHandle(mockHandlerInput)).toBe(true);
        });

        it('should return welcome message', async () => {
            mockHandlerInput.requestEnvelope.request.type = 'LaunchRequest';
            await LaunchRequestHandler.handle(mockHandlerInput);

            expect(mockHandlerInput.responseBuilder.speak).toHaveBeenCalled();
            expect(mockHandlerInput.responseBuilder.reprompt).toHaveBeenCalled();
        });
    });

    describe('HelpIntentHandler', () => {
        it('should handle HelpIntent', () => {
            mockHandlerInput.requestEnvelope.request.type = 'IntentRequest';
            mockHandlerInput.requestEnvelope.request.intent = { name: 'AMAZON.HelpIntent' };

            expect(HelpIntentHandler.canHandle(mockHandlerInput)).toBe(true);
        });

        it('should return help message', () => {
            mockHandlerInput.requestEnvelope.request.type = 'IntentRequest';
            mockHandlerInput.requestEnvelope.request.intent = { name: 'AMAZON.HelpIntent' };

            HelpIntentHandler.handle(mockHandlerInput);

            expect(mockHandlerInput.responseBuilder.speak).toHaveBeenCalled();
            expect(mockHandlerInput.responseBuilder.reprompt).toHaveBeenCalled();
        });
    });
});
