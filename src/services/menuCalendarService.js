/**
 * Menu Calendar Service - Fetch 5-day school lunch menu
 *
 * Provides multi-day menu calendar for APL visual display
 */

const nutrisliceService = require('./nutrisliceService');
const dateUtils = require('../utils/dateUtils');
const menuParser = require('../utils/menuParser');
const constants = require('../utils/constants');

/**
 * Get 5-day menu calendar starting from today
 * @returns {Promise<Object>} Calendar with 5 days of menu data
 */
async function getMenuCalendar() {
    const today = dateUtils.getTodayInTimezone();
    const calendar = {
        days: []
    };

    // Fetch menus for next 5 school days
    for (let i = 0; i < 5; i++) {
        const targetDate = dateUtils.getNextSchoolDay(today, i, constants.HOLIDAYS);
        const dateStr = dateUtils.formatDateForNutrislice(targetDate);

        try {
            // Fetch menu for this date
            const menuData = await nutrisliceService.getMenuForDate(dateStr);

            // Extract main items
            const mainItems = menuData.items && menuData.items.length > 0
                ? menuParser.extractMainItems(menuData)
                : [];

            // Format for calendar
            const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

            calendar.days.push({
                date: dateStr,
                dayOfWeek: dayOfWeek,
                menuItems: mainItems.map(item => item.name),
                fullDate: targetDate.toISOString()
            });
        } catch (error) {
            // If menu fetch fails, add placeholder
            const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
            calendar.days.push({
                date: dateStr,
                dayOfWeek: dayOfWeek,
                menuItems: ['Menu unavailable'],
                fullDate: targetDate.toISOString()
            });
        }
    }

    return calendar;
}

/**
 * Get single day menu (for backwards compatibility)
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Menu data for specified date
 */
async function getMenuForDate(dateStr) {
    const menuData = await nutrisliceService.getMenuForDate(dateStr);
    const mainItems = menuData.items && menuData.items.length > 0
        ? menuParser.extractMainItems(menuData)
        : [];

    return {
        date: dateStr,
        items: mainItems
    };
}

module.exports = {
    getMenuCalendar,
    getMenuForDate
};
