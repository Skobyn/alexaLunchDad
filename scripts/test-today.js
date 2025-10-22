/**
 * Test script to diagnose "today" menu + weather issues
 */

const nutrisliceService = require('../src/services/nutrisliceService');
const weatherService = require('../src/services/weatherService');
const menuParser = require('../src/utils/menuParser');
const cacheService = require('../src/services/cacheService');

// Initialize dependencies
nutrisliceService.setDependencies({
  cache: cacheService,
  parser: null, // Use built-in parsing
  dateUtils: null // Use built-in date utils
});

async function testTodayMenu() {
  console.log('\n=== Testing Today\'s Menu ===');
  try {
    const menuData = await nutrisliceService.getMenuForToday();
    console.log('✓ Menu fetch successful');
    console.log(`  Date: ${menuData.date}`);
    console.log(`  Items found: ${menuData.items?.length || 0}`);

    if (menuData.items && menuData.items.length > 0) {
      console.log('  Sample items:');
      menuData.items.slice(0, 3).forEach(item => {
        console.log(`    - ${item.name} (${item.category || 'No category'})`);
      });

      // Test menu parser
      const mainItems = menuParser.extractMainItems(menuData);
      console.log(`  Main items after filtering: ${mainItems.length}`);

      if (mainItems.length > 0) {
        const formatted = menuParser.formatMenuItems(mainItems);
        console.log(`  Formatted speech: "${formatted}"`);
      } else {
        console.log('  ⚠ Warning: No main items after filtering');
      }
    } else {
      console.log('  ⚠ Warning: No menu items found');
    }

    return menuData;
  } catch (error) {
    console.error('✗ Menu fetch failed:', error.message);
    return null;
  }
}

async function testTodayWeather() {
  console.log('\n=== Testing Today\'s Weather ===');
  try {
    const weatherData = await weatherService.getTodayWeather();
    console.log('✓ Weather fetch successful');

    if (weatherData.isFallback) {
      console.log('  ⚠ Using fallback weather (API unavailable)');
    } else {
      console.log('  Current conditions:');
      console.log(`    Temperature: ${weatherData.current?.temperature}°${weatherData.current?.temperatureUnit}`);
      console.log(`    Conditions: ${weatherData.current?.conditions}`);
      console.log(`  Today's forecast:`);
      console.log(`    High: ${weatherData.today?.high}°${weatherData.today?.temperatureUnit}`);
      console.log(`    Forecast: ${weatherData.today?.detailedForecast?.substring(0, 100)}...`);
    }

    return weatherData;
  } catch (error) {
    console.error('✗ Weather fetch failed:', error.message);
    return null;
  }
}

async function testCombinedResponse() {
  console.log('\n=== Testing Combined Response (as handler would build it) ===');

  try {
    // Fetch both in parallel (as the handler does)
    const [menuData, weatherData] = await Promise.all([
      nutrisliceService.getMenuForToday(),
      weatherService.getTodayWeather().catch(() => null)
    ]);

    // Check menu
    if (!menuData || !menuData.items || menuData.items.length === 0) {
      console.log('✗ Would return: "I couldn\'t find the lunch menu for that day."');
      return;
    }

    const mainItems = menuParser.extractMainItems(menuData);
    if (mainItems.length === 0) {
      console.log('✗ Would return: "I couldn\'t find the lunch menu for that day." (no main items)');
      return;
    }

    const menuText = menuParser.formatMenuItems(mainItems);
    let speakOutput = `Today's lunch menu includes ${menuText}.`;

    // Add weather if available
    if (weatherData && !weatherData.isFallback && weatherData.current) {
      const currentTemp = weatherData.current.temperature;
      const currentConditions = weatherData.current.conditions.toLowerCase();
      const todayHigh = weatherData.today.high;
      const forecast = weatherData.today.detailedForecast;

      let weatherMsg = `Currently it is ${currentTemp} degrees and ${currentConditions}. `;
      weatherMsg += `Today's high will be ${todayHigh} degrees. `;
      weatherMsg += `${forecast}. `;

      speakOutput = weatherMsg + speakOutput;
    }

    console.log('✓ Final speech output:');
    console.log(`  "${speakOutput}"`);
    console.log(`\n  Length: ${speakOutput.length} characters`);

    // Check for SSML issues
    if (speakOutput.includes("'") || speakOutput.includes('"')) {
      console.log('  ⚠ Warning: Contains quotes that might cause SSML issues');
    }

  } catch (error) {
    console.error('✗ Combined test failed:', error.message);
    console.error(error.stack);
  }
}

async function runAllTests() {
  console.log('Starting diagnostic tests...');
  console.log('Current date/time:', new Date().toISOString());

  await testTodayMenu();
  await testTodayWeather();
  await testCombinedResponse();

  console.log('\n=== Tests Complete ===\n');
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
