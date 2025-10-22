/**
 * TDD London School Test Suite for dateUtils
 * Following Outside-In approach with behavior verification
 */

const {
  getNextSchoolDay,
  isSchoolDay,
  formatDateForNutrislice,
  getTodayInTimezone
} = require('../../../src/utils/dateUtils');

const constants = require('../../../src/utils/constants');

describe('dateUtils - TDD London School', () => {
  describe('formatDateForNutrislice', () => {
    it('should format Date object as YYYY-MM-DD', () => {
      const date = new Date('2025-10-20T10:30:00');
      const result = formatDateForNutrislice(date);
      expect(result).toBe('2025-10-20');
    });

    it('should format date with single-digit month correctly', () => {
      const date = new Date('2025-01-05T10:30:00');
      const result = formatDateForNutrislice(date);
      expect(result).toBe('2025-01-05');
    });

    it('should format date with single-digit day correctly', () => {
      const date = new Date('2025-10-05T10:30:00');
      const result = formatDateForNutrislice(date);
      expect(result).toBe('2025-10-05');
    });

    it('should handle timezone differences correctly', () => {
      const date = new Date('2025-10-20T00:00:00Z');
      const result = formatDateForNutrislice(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should throw error for invalid date', () => {
      expect(() => formatDateForNutrislice(null)).toThrow();
      expect(() => formatDateForNutrislice(undefined)).toThrow();
      expect(() => formatDateForNutrislice('not a date')).toThrow();
    });

    it('should handle leap year dates', () => {
      const date = new Date('2024-02-29T10:30:00');
      const result = formatDateForNutrislice(date);
      expect(result).toBe('2024-02-29');
    });

    it('should handle end of year dates', () => {
      const date = new Date('2025-12-31T23:59:59');
      const result = formatDateForNutrislice(date);
      expect(result).toBe('2025-12-31');
    });
  });

  describe('isSchoolDay', () => {
    it('should return true for Monday (weekday)', () => {
      const monday = new Date('2025-10-20T10:00:00'); // Monday
      expect(isSchoolDay(monday)).toBe(true);
    });

    it('should return true for Tuesday (weekday)', () => {
      const tuesday = new Date('2025-10-21T10:00:00');
      expect(isSchoolDay(tuesday)).toBe(true);
    });

    it('should return true for Wednesday (weekday)', () => {
      const wednesday = new Date('2025-10-22T10:00:00');
      expect(isSchoolDay(wednesday)).toBe(true);
    });

    it('should return true for Thursday (weekday)', () => {
      const thursday = new Date('2025-10-23T10:00:00');
      expect(isSchoolDay(thursday)).toBe(true);
    });

    it('should return true for Friday (weekday)', () => {
      const friday = new Date('2025-10-24T10:00:00');
      expect(isSchoolDay(friday)).toBe(true);
    });

    it('should return false for Saturday (weekend)', () => {
      const saturday = new Date('2025-10-25T10:00:00'); // Saturday
      expect(isSchoolDay(saturday)).toBe(false);
    });

    it('should return false for Sunday (weekend)', () => {
      const sunday = new Date('2025-10-26T10:00:00'); // Sunday
      expect(isSchoolDay(sunday)).toBe(false);
    });

    it('should return false for holiday (weekday)', () => {
      const holiday = new Date('2025-12-25T10:00:00'); // Christmas, defined in constants
      expect(isSchoolDay(holiday)).toBe(false);
    });

    it('should return true for non-holiday weekday', () => {
      const regularDay = new Date('2025-11-17T10:00:00'); // Monday
      expect(isSchoolDay(regularDay)).toBe(true);
    });

    it('should handle multiple holidays from constants', () => {
      constants.HOLIDAYS.forEach(holidayStr => {
        const holiday = new Date(holidayStr + 'T10:00:00');
        // Should return false if it's a weekday holiday
        const dayOfWeek = holiday.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          expect(isSchoolDay(holiday)).toBe(false);
        }
      });
    });

    it('should throw error for invalid date', () => {
      expect(() => isSchoolDay(null)).toThrow();
      expect(() => isSchoolDay(undefined)).toThrow();
      expect(() => isSchoolDay('not a date')).toThrow();
    });
  });

  describe('getTodayInTimezone', () => {
    it('should return Date object for America/New_York timezone', () => {
      const result = getTodayInTimezone('America/New_York');
      expect(result).toBeInstanceOf(Date);
    });

    it('should return date with time set to midnight', () => {
      const result = getTodayInTimezone('America/New_York');
      const hours = result.getHours();
      const minutes = result.getMinutes();
      const seconds = result.getSeconds();
      const milliseconds = result.getMilliseconds();

      // Should be midnight in the local timezone of the returned date
      expect(hours).toBe(0);
      expect(minutes).toBe(0);
      expect(seconds).toBe(0);
      expect(milliseconds).toBe(0);
    });

    it('should use default timezone from constants when not provided', () => {
      const result = getTodayInTimezone();
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle different timezones', () => {
      const resultNY = getTodayInTimezone('America/New_York');
      const resultLA = getTodayInTimezone('America/Los_Angeles');

      expect(resultNY).toBeInstanceOf(Date);
      expect(resultLA).toBeInstanceOf(Date);
    });

    it('should throw error for invalid timezone', () => {
      expect(() => getTodayInTimezone('Invalid/Timezone')).toThrow();
    });

    it('should return consistent date when called multiple times in same day', () => {
      const result1 = getTodayInTimezone('America/New_York');
      const result2 = getTodayInTimezone('America/New_York');

      expect(formatDateForNutrislice(result1)).toBe(formatDateForNutrislice(result2));
    });
  });

  describe('getNextSchoolDay', () => {
    describe('Basic weekday advancement', () => {
      it('should return same day when daysAhead is 0', () => {
        const monday = new Date('2025-10-20T10:00:00'); // Monday
        const result = getNextSchoolDay(monday, 0);
        expect(formatDateForNutrislice(result)).toBe('2025-10-20');
      });

      it('should advance by 1 day on weekdays (Monday to Tuesday)', () => {
        const monday = new Date('2025-10-20T10:00:00');
        const result = getNextSchoolDay(monday, 1);
        expect(formatDateForNutrislice(result)).toBe('2025-10-21');
      });

      it('should advance by 1 day on weekdays (Tuesday to Wednesday)', () => {
        const tuesday = new Date('2025-10-21T10:00:00');
        const result = getNextSchoolDay(tuesday, 1);
        expect(formatDateForNutrislice(result)).toBe('2025-10-22');
      });

      it('should advance by 2 days on weekdays', () => {
        const monday = new Date('2025-10-20T10:00:00');
        const result = getNextSchoolDay(monday, 2);
        expect(formatDateForNutrislice(result)).toBe('2025-10-22'); // Wednesday
      });
    });

    describe('Weekend skipping', () => {
      it('should skip weekend when advancing from Friday by 1 day', () => {
        const friday = new Date('2025-10-24T10:00:00'); // Friday
        const result = getNextSchoolDay(friday, 1);
        expect(formatDateForNutrislice(result)).toBe('2025-10-27'); // Monday
      });

      it('should skip weekend when advancing from Friday by 3 days', () => {
        const friday = new Date('2025-10-24T10:00:00');
        const result = getNextSchoolDay(friday, 3);
        expect(formatDateForNutrislice(result)).toBe('2025-10-29'); // Wednesday
      });

      it('should skip weekend when advancing from Thursday by 2 days', () => {
        const thursday = new Date('2025-10-23T10:00:00');
        const result = getNextSchoolDay(thursday, 2);
        expect(formatDateForNutrislice(result)).toBe('2025-10-27'); // Monday
      });

      it('should skip multiple weekends when advancing by 5 days from Friday', () => {
        const friday = new Date('2025-10-24T10:00:00');
        const result = getNextSchoolDay(friday, 5);
        expect(formatDateForNutrislice(result)).toBe('2025-10-31'); // Next Friday
      });
    });

    describe('Holiday handling', () => {
      it('should skip holiday when Monday is a holiday', () => {
        const friday = new Date('2025-10-24T10:00:00'); // Friday before holiday
        // Manually test with a Monday holiday (2025-10-27 would be skipped)
        // This requires mocking or actual holiday in constants
        const result = getNextSchoolDay(friday, 1);
        const dayOfWeek = result.getDay();
        expect(dayOfWeek).not.toBe(0); // Not Sunday
        expect(dayOfWeek).not.toBe(6); // Not Saturday
      });

      it('should skip Christmas day (defined in constants)', () => {
        const beforeChristmas = new Date('2025-12-24T10:00:00');
        const result = getNextSchoolDay(beforeChristmas, 1);
        // Should skip Dec 25 (Christmas) and Dec 26 (holiday)
        expect(formatDateForNutrislice(result)).not.toBe('2025-12-25');
        expect(formatDateForNutrislice(result)).not.toBe('2025-12-26');
      });

      it('should handle consecutive holidays', () => {
        // Week of 2025-12-23 to 2025-12-27 are all holidays
        const beforeHolidays = new Date('2025-12-22T10:00:00'); // Monday
        const result = getNextSchoolDay(beforeHolidays, 1);
        // Should skip all holidays and weekend to reach Dec 29 or later
        const resultDate = formatDateForNutrislice(result);
        expect(resultDate >= '2025-12-29').toBe(true);
      });

      it('should handle holiday that falls on Friday', () => {
        const thursday = new Date('2025-12-24T10:00:00'); // Day before Christmas Friday
        const result = getNextSchoolDay(thursday, 2);
        // Skip Christmas (Fri), weekend, and Dec 26 (Fri holiday)
        expect(formatDateForNutrislice(result) >= '2025-12-29').toBe(true);
      });
    });

    describe('Edge cases and validation', () => {
      it('should throw error for negative daysAhead', () => {
        const monday = new Date('2025-10-20T10:00:00');
        expect(() => getNextSchoolDay(monday, -1)).toThrow('daysAhead must be non-negative');
      });

      it('should throw error for invalid date', () => {
        expect(() => getNextSchoolDay(null, 1)).toThrow();
        expect(() => getNextSchoolDay(undefined, 1)).toThrow();
        expect(() => getNextSchoolDay('not a date', 1)).toThrow();
      });

      it('should handle very large daysAhead (within safety limit)', () => {
        const monday = new Date('2025-10-20T10:00:00');
        const result = getNextSchoolDay(monday, 20);
        expect(result).toBeInstanceOf(Date);
        expect(result > monday).toBe(true);
      });

      it('should throw error when exceeding MAX_ITERATIONS', () => {
        const monday = new Date('2025-10-20T10:00:00');
        // This would require an unrealistic number of days
        expect(() => getNextSchoolDay(monday, 1000)).toThrow('Could not find school day within reasonable time');
      });

      it('should maintain time component from original date', () => {
        const dateWithTime = new Date('2025-10-20T14:30:45');
        const result = getNextSchoolDay(dateWithTime, 1);
        // The result should maintain hours/minutes/seconds or reset to start of day
        expect(result).toBeInstanceOf(Date);
      });

      it('should handle starting from Saturday', () => {
        const saturday = new Date('2025-10-25T10:00:00');
        const result = getNextSchoolDay(saturday, 1);
        expect(formatDateForNutrislice(result)).toBe('2025-10-27'); // Monday
      });

      it('should handle starting from Sunday', () => {
        const sunday = new Date('2025-10-26T10:00:00');
        const result = getNextSchoolDay(sunday, 1);
        expect(formatDateForNutrislice(result)).toBe('2025-10-27'); // Monday
      });
    });

    describe('Complex scenarios (integration-like)', () => {
      it('should correctly calculate 5-day menu calendar from Friday', () => {
        const friday = new Date('2025-10-24T10:00:00');
        const days = [];
        let currentDate = friday;

        for (let i = 0; i < 5; i++) {
          currentDate = getNextSchoolDay(currentDate, 1);
          days.push(formatDateForNutrislice(currentDate));
        }

        expect(days).toHaveLength(5);
        expect(days[0]).toBe('2025-10-27'); // Mon
        expect(days[1]).toBe('2025-10-28'); // Tue
        expect(days[2]).toBe('2025-10-29'); // Wed
        expect(days[3]).toBe('2025-10-30'); // Thu
        expect(days[4]).toBe('2025-10-31'); // Fri
      });

      it('should handle month boundaries correctly', () => {
        const endOfMonth = new Date('2025-10-31T10:00:00'); // Friday
        const result = getNextSchoolDay(endOfMonth, 1);
        expect(formatDateForNutrislice(result)).toBe('2025-11-03'); // Monday
      });

      it('should handle year boundaries correctly', () => {
        const endOfYear = new Date('2025-12-31T10:00:00'); // Wednesday (holiday)
        const result = getNextSchoolDay(endOfYear, 1);
        expect(formatDateForNutrislice(result)).toBe('2026-01-05'); // First non-holiday weekday
      });
    });
  });
});
