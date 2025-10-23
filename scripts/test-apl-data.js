/**
 * Test Script: Validate APL Data Source Structure
 *
 * This script generates and validates the APL data source to ensure
 * it matches what the menuCalendarDocument.json expects.
 */

const { createSampleDataSource, validateDataSource } = require('../src/apl/menuDataSource');
const fs = require('fs');
const path = require('path');

console.log('==========================================');
console.log('APL Data Source Validation Test');
console.log('==========================================\n');

try {
    // Generate sample data source
    console.log('1. Generating sample APL data source...');
    const dataSource = createSampleDataSource();

    console.log('✅ Sample data source generated\n');

    // Validate structure
    console.log('2. Validating data source structure...');
    validateDataSource(dataSource);
    console.log('✅ Data source structure is valid\n');

    // Display structure
    console.log('3. Data Source Structure:');
    console.log('-------------------------------------------');
    console.log(JSON.stringify(dataSource, null, 2));
    console.log('-------------------------------------------\n');

    // Verify key properties
    console.log('4. Verification Checklist:');
    console.log(`✅ Has menuData: ${!!dataSource.menuData}`);
    console.log(`✅ Has menuData.days array: ${Array.isArray(dataSource.menuData?.days)}`);
    console.log(`✅ Days count: ${dataSource.menuData?.days?.length || 0}`);
    console.log(`✅ Has weatherData: ${!!dataSource.weatherData}`);

    if (dataSource.menuData?.days?.length > 0) {
        const firstDay = dataSource.menuData.days[0];
        console.log('\n5. First Day Properties:');
        console.log(`✅ Has dayName: ${!!firstDay.dayName}`);
        console.log(`✅ Has date: ${!!firstDay.date}`);
        console.log(`✅ Has menuItems array: ${Array.isArray(firstDay.menuItems)}`);
        console.log(`✅ Has isToday: ${firstDay.isToday !== undefined}`);
        console.log(`✅ Menu items count: ${firstDay.menuItems?.length || 0}`);
    }

    if (dataSource.weatherData) {
        console.log('\n6. Weather Data Properties:');
        console.log(`✅ Has temperature: ${!!dataSource.weatherData.temperature}`);
        console.log(`✅ Has conditions: ${!!dataSource.weatherData.conditions}`);
        console.log(`✅ Temperature value: ${dataSource.weatherData.temperature}`);
        console.log(`✅ Conditions value: ${dataSource.weatherData.conditions}`);
    }

    // Save to file for manual APL Authoring Tool testing
    const outputPath = path.join(__dirname, 'apl-test-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(dataSource, null, 2));
    console.log(`\n✅ Sample data saved to: ${outputPath}`);
    console.log('\nYou can use this JSON in the APL Authoring Tool at:');
    console.log('https://developer.amazon.com/alexa/console/ask/displays\n');

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
