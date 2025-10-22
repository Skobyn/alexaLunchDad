/**
 * Date utility functions for school day calculations
 * Implements TDD London School pattern with clear contracts
 */

const constants = require('./constants');

/**
 * Format a Date object as YYYY-MM-DD for Nutrislice API
 *
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string (YYYY-MM-DD)
 * @throws {Error} If date is invalid
 *
 * @example
 * formatDateForNutrislice(new Date('2025-10-20')) // '2025-10-20'
 */
function formatDateForNutrislice(date) {
  // Validate input
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Check if a date is a school day (weekday and not a holiday)
 *
 * @param {Date} date - Date to check
 * @returns {boolean} True if it's a school day
 * @throws {Error} If date is invalid
 *
 * @example
 * isSchoolDay(new Date('2025-10-20')) // true (Monday)
 * isSchoolDay(new Date('2025-10-25')) // false (Saturday)
 */
function isSchoolDay(date) {
  // Validate input
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  // Check if weekend (0 = Sunday, 6 = Saturday)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Check if holiday
  const dateString = formatDateForNutrislice(date);
  if (constants.HOLIDAYS.includes(dateString)) {
    return false;
  }

  return true;
}

/**
 * Get current date in specified timezone with time set to midnight
 *
 * @param {string} [timezone] - IANA timezone string (defaults to TIMEZONE constant)
 * @returns {Date} Date object at midnight in specified timezone
 * @throws {Error} If timezone is invalid
 *
 * @example
 * getTodayInTimezone('America/New_York') // Date object for today at 00:00:00
 */
function getTodayInTimezone(timezone = constants.TIMEZONE) {
  // Validate timezone by attempting to use it
  try {
    const now = new Date();

    // Get date string in the target timezone
    const dateString = now.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    });

    // Parse the date string to extract components
    const [datePart] = dateString.split(', ');
    const [month, day, year] = datePart.split('/');

    // Create date at midnight in local time
    // This represents the start of the day in the target timezone
    const result = new Date(year, month - 1, day, 0, 0, 0, 0);

    return result;
  } catch (error) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}

/**
 * Get the next school day, skipping weekends and holidays
 * Implements Algorithm 1 from PSEUDOCODE.md
 *
 * @param {Date} currentDate - Starting date
 * @param {number} daysAhead - Number of school days to advance (default: 1)
 * @returns {Date} The calculated school day
 * @throws {Error} If inputs are invalid or calculation exceeds safety limit
 *
 * @example
 * getNextSchoolDay(new Date('2025-10-24'), 1) // Monday (skips weekend)
 * getNextSchoolDay(new Date('2025-10-20'), 0) // Same day if already school day
 */
function getNextSchoolDay(currentDate, daysAhead = 1) {
  // Constants
  const MAX_ITERATIONS = 365;

  // Validate inputs
  if (!currentDate || !(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
    throw new Error('Invalid date provided');
  }

  if (daysAhead < 0) {
    throw new Error('daysAhead must be non-negative');
  }

  // Special case: 0 days ahead returns current date
  if (daysAhead === 0) {
    return new Date(currentDate);
  }

  // Initialize working date
  let workingDate = new Date(currentDate);
  let schoolDaysFound = 0;
  let iterationCount = 0;

  // Advance until we find required school days
  while (schoolDaysFound < daysAhead && iterationCount < MAX_ITERATIONS) {
    // Move to next calendar day
    workingDate = new Date(workingDate);
    workingDate.setDate(workingDate.getDate() + 1);
    iterationCount++;

    // Check if it's a school day (not weekend, not holiday)
    if (isSchoolDay(workingDate)) {
      schoolDaysFound++;
    }
  }

  // Safety check
  if (iterationCount >= MAX_ITERATIONS) {
    throw new Error('Could not find school day within reasonable time');
  }

  return workingDate;
}

module.exports = {
  formatDateForNutrislice,
  isSchoolDay,
  getTodayInTimezone,
  getNextSchoolDay
};
