/**
 * APL Utilities - Helper functions for Alexa Presentation Language
 */

/**
 * Check if the device supports APL
 * @param {Object} handlerInput - Alexa handler input
 * @returns {boolean} True if device supports APL
 */
function supportsAPL(handlerInput) {
    const supportedInterfaces = handlerInput.requestEnvelope.context
        .System.device.supportedInterfaces;
    return supportedInterfaces['Alexa.Presentation.APL'] !== undefined;
}

/**
 * Get viewport profile for responsive design
 * @param {Object} handlerInput - Alexa handler input
 * @returns {string} Viewport profile (hub-round-small, hub-landscape-medium, hub-landscape-large, etc.)
 */
function getViewportProfile(handlerInput) {
    if (!supportsAPL(handlerInput)) {
        return null;
    }

    const viewport = handlerInput.requestEnvelope.context.Viewport;
    if (!viewport) {
        return null;
    }

    // Determine profile based on shape and size
    const shape = viewport.shape; // "ROUND" or "RECTANGLE"
    const width = viewport.pixelWidth;

    // Echo Spot (round)
    if (shape === 'ROUND') {
        return 'hub-round-small';
    }

    // Echo Show devices (rectangle)
    if (width < 800) {
        // Echo Show 5 (960x480)
        return 'hub-landscape-small';
    } else if (width < 1280) {
        // Echo Show 8 (1280x800), Echo Show 10 (1280x800)
        return 'hub-landscape-medium';
    } else {
        // Echo Show 15 (1920x1080)
        return 'hub-landscape-large';
    }
}

/**
 * Build APL RenderDocument directive
 * @param {Object} document - APL document
 * @param {Object} datasources - APL data sources
 * @returns {Object} APL directive object
 */
function buildRenderDocumentDirective(document, datasources) {
    return {
        type: 'Alexa.Presentation.APL.RenderDocument',
        version: '2024.2',
        document: document,
        datasources: datasources
    };
}

module.exports = {
    supportsAPL,
    getViewportProfile,
    buildRenderDocumentDirective
};
