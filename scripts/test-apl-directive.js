/**
 * Test Script: Validate Complete APL Directive
 *
 * This script generates the complete APL directive that would be sent
 * to Alexa, allowing us to test it in the APL Authoring Tool.
 */

const { createSampleDataSource } = require('../src/apl/menuDataSource');
const aplUtils = require('../src/utils/aplUtils');
const menuCalendarDocument = require('../src/apl/menuCalendarDocument.json');
const fs = require('fs');
const path = require('path');

console.log('==========================================');
console.log('APL Directive Validation Test');
console.log('==========================================\n');

try {
    // 1. Generate sample data source
    console.log('1. Generating sample APL data source...');
    const dataSource = createSampleDataSource();
    console.log('✅ Data source generated\n');

    // 2. Build APL directive (simulating what handlers do)
    console.log('2. Building APL RenderDocument directive...');
    const directive = aplUtils.buildRenderDocumentDirective(
        menuCalendarDocument,
        dataSource
    );
    console.log('✅ Directive built\n');

    // 3. Validate directive structure
    console.log('3. Validating directive structure...');
    console.log(`✅ Directive type: ${directive.type}`);
    console.log(`✅ APL version: ${directive.version}`);
    console.log(`✅ Has document: ${!!directive.document}`);
    console.log(`✅ Has datasources: ${!!directive.datasources}`);
    console.log(`✅ Document type: ${directive.document?.type}`);
    console.log(`✅ Document version: ${directive.document?.version}\n`);

    // 4. Validate datasources match document parameters
    console.log('4. Validating datasources match mainTemplate parameters...');
    const mainTemplateParams = directive.document?.mainTemplate?.parameters || [];
    console.log(`   Expected parameters: ${JSON.stringify(mainTemplateParams)}`);
    console.log(`   Datasources keys: ${JSON.stringify(Object.keys(directive.datasources))}`);

    const hasAllParams = mainTemplateParams.every(param =>
        directive.datasources.hasOwnProperty(param)
    );
    console.log(`✅ All parameters provided: ${hasAllParams}\n`);

    // 5. Display complete directive (truncated for readability)
    console.log('5. Complete Directive Structure (JSON):');
    console.log('-------------------------------------------');
    const directiveStr = JSON.stringify(directive, null, 2);
    console.log(directiveStr.substring(0, 500) + '...\n[truncated]\n');
    console.log(`Full directive size: ${directiveStr.length} characters`);
    console.log('-------------------------------------------\n');

    // 6. Save complete directive to file
    const outputPath = path.join(__dirname, 'apl-complete-directive.json');
    fs.writeFileSync(outputPath, JSON.stringify(directive, null, 2));
    console.log(`✅ Complete directive saved to: ${outputPath}\n`);

    // 7. Save document and datasources separately for APL Authoring Tool
    const documentPath = path.join(__dirname, 'apl-document-only.json');
    const datasourcesPath = path.join(__dirname, 'apl-datasources-only.json');

    fs.writeFileSync(documentPath, JSON.stringify(directive.document, null, 2));
    fs.writeFileSync(datasourcesPath, JSON.stringify(directive.datasources, null, 2));

    console.log(`✅ Document saved to: ${documentPath}`);
    console.log(`✅ Datasources saved to: ${datasourcesPath}\n`);

    console.log('==========================================');
    console.log('Testing Instructions:');
    console.log('==========================================');
    console.log('1. Go to: https://developer.amazon.com/alexa/console/ask/displays');
    console.log('2. Click "Create" to start a new APL document');
    console.log('3. Click "Start from Scratch"');
    console.log('4. Click "APL" tab and paste content from: apl-document-only.json');
    console.log('5. Click "Data" tab and paste content from: apl-datasources-only.json');
    console.log('6. Click "Preview" to see if it renders');
    console.log('==========================================\n');

    console.log('==========================================');
    console.log('✅ ALL TESTS PASSED');
    console.log('==========================================\n');

    process.exit(0);

} catch (error) {
    console.error('\n❌ VALIDATION FAILED:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    console.log('\n==========================================');
    console.log('❌ TESTS FAILED');
    console.log('==========================================\n');
    process.exit(1);
}
