/**
 * Application constants
 */

module.exports = {
  // Nutrislice configuration
  NUTRISLICE: {
    BASE_URL: process.env.NUTRISLICE_BASE_URL || 'https://d45.nutrislice.com/menu',
    SCHOOL_ID: process.env.NUTRISLICE_SCHOOL_ID || 'westmore-elementary-school-2',
    MEAL_TYPE: 'lunch',
    TIMEOUT_MS: 5000
  },

  // Weather.gov configuration
  WEATHER: {
    BASE_URL: 'https://api.weather.gov',
    LAT: process.env.WEATHER_LAT || '39.0997',
    LON: process.env.WEATHER_LON || '-77.0941',
    TIMEOUT_MS: 3000
  },

  // Cache TTLs (in seconds)
  CACHE_TTL: {
    MENU: parseInt(process.env.CACHE_TTL_MENU) || 86400, // 24 hours
    WEATHER: parseInt(process.env.CACHE_TTL_WEATHER) || 600, // 10 minutes
    GRID_INFO: 2592000 // 30 days (grid coordinates don't change)
  },

  // Timezone
  TIMEZONE: process.env.SCHOOL_TIMEZONE || 'America/New_York',

  // School schedule
  SCHOOL_DAYS: [1, 2, 3, 4, 5], // Monday-Friday
  HOLIDAYS: process.env.SCHOOL_HOLIDAYS ?
    process.env.SCHOOL_HOLIDAYS.split(',') :
    [
      '2025-12-23', '2025-12-24', '2025-12-25', '2025-12-26', '2025-12-27',
      '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02'
    ],

  // Response limits
  MAX_MENU_ITEMS: 5,
  CALENDAR_DAYS: 5,

  // Error messages
  ERRORS: {
    NO_MENU: "I couldn't find the lunch menu for that day.",
    WEEKEND: "There's no school lunch on weekends.",
    HOLIDAY: "There's no school that day.",
    API_ERROR: "I'm having trouble getting the menu right now. Please try again later.",
    WEATHER_ERROR: "I couldn't get the weather information."
  }
};
