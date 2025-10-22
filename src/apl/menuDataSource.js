/**
 * APL Data Source Builder for Lunch Dad Menu Calendar
 *
 * Transforms menu calendar and weather data into APL-compatible data sources
 * for rendering the 5-day lunch menu display on Echo Show devices.
 *
 * @module menuDataSource
 */

/**
 * Builds APL data source for menu calendar display
 *
 * @param {Object} menuCalendar - Menu calendar object from LunchMenuService
 * @param {Array} menuCalendar.days - Array of daily menu objects
 * @param {string} menuCalendar.days[].date - ISO date string
 * @param {string} menuCalendar.days[].dayOfWeek - Day name (e.g., "Monday")
 * @param {Array} menuCalendar.days[].menuItems - Array of menu item strings
 * @param {Object} weatherData - Weather information object
 * @param {number} weatherData.temperature - Temperature in Fahrenheit
 * @param {string} weatherData.conditions - Weather conditions description
 * @param {string} weatherData.icon - URL to weather icon
 *
 * @returns {Object} APL-compatible data source object
 *
 * @example
 * const menuCalendar = {
 *   days: [
 *     {
 *       date: "2025-10-22",
 *       dayOfWeek: "Monday",
 *       menuItems: ["Spicy Chicken Sandwich", "Cheese Pizza"]
 *     }
 *   ]
 * };
 * const weatherData = {
 *   temperature: 72,
 *   conditions: "Sunny",
 *   icon: "https://example.com/sunny.png"
 * };
 * const dataSource = buildMenuDataSource(menuCalendar, weatherData);
 */
function buildMenuDataSource(menuCalendar, weatherData = null) {
  // Validate input
  if (!menuCalendar || !menuCalendar.days || !Array.isArray(menuCalendar.days)) {
    throw new Error('Invalid menu calendar: must have days array');
  }

  // Get current date for highlighting
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Transform menu days for APL
  const aplDays = menuCalendar.days.map(day => {
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);
    const isToday = dayDate.getTime() === today.getTime();

    // Format date for display (e.g., "Oct 22")
    const displayDate = formatDisplayDate(dayDate);

    // Get short day name (e.g., "Mon", "Tue")
    const shortDayName = getShortDayName(day.dayOfWeek);

    return {
      dayName: shortDayName,
      date: displayDate,
      menuItems: day.menuItems || [],
      isToday: isToday,
      fullDate: day.date
    };
  });

  // Build weather data source
  const aplWeather = buildWeatherData(weatherData);

  return {
    menuData: {
      days: aplDays
    },
    weatherData: aplWeather
  };
}

/**
 * Formats date for APL display
 *
 * @param {Date} date - Date object
 * @returns {string} Formatted date (e.g., "Oct 22")
 */
function formatDisplayDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  return `${month} ${day}`;
}

/**
 * Gets short day name from full day name
 *
 * @param {string} fullDayName - Full day name (e.g., "Monday")
 * @returns {string} Short day name (e.g., "Mon")
 */
function getShortDayName(fullDayName) {
  const dayMap = {
    'Monday': 'Mon',
    'Tuesday': 'Tue',
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun'
  };
  return dayMap[fullDayName] || fullDayName.substring(0, 3);
}

/**
 * Builds weather data for APL display
 *
 * @param {Object} weatherData - Weather information
 * @returns {Object} APL-compatible weather data
 */
function buildWeatherData(weatherData) {
  if (!weatherData) {
    return {
      temperature: '--°F',
      conditions: 'N/A',
      icon: null
    };
  }

  return {
    temperature: formatTemperature(weatherData.temperature),
    conditions: weatherData.conditions || 'N/A',
    icon: weatherData.icon || null
  };
}

/**
 * Formats temperature for display
 *
 * @param {number} temperature - Temperature in Fahrenheit
 * @returns {string} Formatted temperature (e.g., "72°F")
 */
function formatTemperature(temperature) {
  if (temperature === null || temperature === undefined || isNaN(temperature)) {
    return '--°F';
  }
  return `${Math.round(temperature)}°F`;
}

/**
 * Validates APL data source structure
 *
 * @param {Object} dataSource - Data source to validate
 * @returns {boolean} True if valid
 * @throws {Error} If data source is invalid
 */
function validateDataSource(dataSource) {
  if (!dataSource) {
    throw new Error('Data source is null or undefined');
  }

  if (!dataSource.menuData || !dataSource.menuData.days) {
    throw new Error('Data source missing menuData.days');
  }

  if (!Array.isArray(dataSource.menuData.days)) {
    throw new Error('menuData.days must be an array');
  }

  // Validate each day
  dataSource.menuData.days.forEach((day, index) => {
    if (!day.dayName || !day.date) {
      throw new Error(`Day at index ${index} missing dayName or date`);
    }
    if (!Array.isArray(day.menuItems)) {
      throw new Error(`Day at index ${index} menuItems must be an array`);
    }
  });

  if (!dataSource.weatherData) {
    throw new Error('Data source missing weatherData');
  }

  return true;
}

/**
 * Creates sample data source for testing
 *
 * @returns {Object} Sample APL data source
 */
function createSampleDataSource() {
  const today = new Date();
  const sampleDays = [];

  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];

    sampleDays.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: dayName,
      menuItems: [
        'Spicy Chicken Sandwich',
        'Individual Cheese Pizza',
        'Sun Butter and Jelly Sandwich',
        'Fresh Fruit Cup'
      ]
    });
  }

  const sampleCalendar = { days: sampleDays };
  const sampleWeather = {
    temperature: 72,
    conditions: 'Sunny',
    icon: 'https://openweathermap.org/img/wn/01d@2x.png'
  };

  return buildMenuDataSource(sampleCalendar, sampleWeather);
}

// Export functions
module.exports = {
  buildMenuDataSource,
  formatDisplayDate,
  getShortDayName,
  buildWeatherData,
  formatTemperature,
  validateDataSource,
  createSampleDataSource
};
