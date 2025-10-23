/**
 * Menu Parser - Extract and filter main lunch items
 * London School TDD Implementation
 */

const cheerio = require('cheerio');
const constants = require('./constants');

/**
 * Extract main entree items from menu data
 * @param {Object} menuData - Full menu with all items
 * @param {number} maxItems - Maximum items to return (default: MAX_MENU_ITEMS)
 * @returns {Array<Object>} Filtered list of main entrees
 */
function extractMainItems(menuData, maxItems = constants.MAX_MENU_ITEMS) {
    // Validate input
    if (!menuData || !menuData.items || !Array.isArray(menuData.items)) {
        return [];
    }

    const allItems = menuData.items;
    const filteredItems = [];

    // Phase 1: Filter by category and keywords
    for (const item of allItems) {
    // Category-based filtering
        if (item.category && isMainCategory(item.category)) {
            filteredItems.push(item);
            continue;
        }

        // Keyword-based filtering for uncategorized items
        if (!item.category || item.category === 'Other') {
            if (checkIfMainItem(item)) {
                filteredItems.push(item);
            }
        }
    }

    // Phase 2: Remove duplicates
    const uniqueItems = removeDuplicates(filteredItems);

    // Phase 3: Sort by relevance
    const sortedItems = sortByRelevance(uniqueItems);

    // Phase 4: Limit to maxItems
    return sortedItems.slice(0, maxItems);
}

/**
 * Check if category is a main category (case-insensitive)
 * @param {string} category - Food category
 * @returns {boolean}
 */
function isMainCategory(category) {
    if (!category) return false;

    const mainCategories = ['entree', 'main dish', 'pizza', 'sandwich', 'burger'];
    return mainCategories.includes(category.toLowerCase());
}

/**
 * Check if item is a main item based on keywords and nutrition
 * @param {Object} item - Menu item
 * @returns {boolean}
 */
function checkIfMainItem(item) {
    const excludeKeywords = [
        'side', 'drink', 'beverage', 'milk', 'juice',
        'dessert', 'fruit cup', 'vegetable'
    ];

    const itemName = (item.name || '').toLowerCase();
    const itemDesc = (item.description || '').toLowerCase();
    const combinedText = `${itemName} ${itemDesc}`;

    // Check for exclude keywords
    for (const keyword of excludeKeywords) {
        if (combinedText.includes(keyword)) {
            return false;
        }
    }

    // Check nutritional content
    if (item.nutrients) {
        const calories = item.nutrients.calories || 0;
        const protein = item.nutrients.protein || 0;

        // Main items typically have 250+ calories and 10+ g protein
        if (calories >= 250 && protein >= 10) {
            return true;
        }
    }

    // Default to false if uncertain
    return false;
}

/**
 * Remove duplicate items (case-insensitive)
 * @param {Array<Object>} items - Menu items
 * @returns {Array<Object>}
 */
function removeDuplicates(items) {
    const seen = new Set();
    const unique = [];

    for (const item of items) {
        const normalizedName = (item.name || '').toLowerCase().trim();

        if (!seen.has(normalizedName)) {
            seen.add(normalizedName);
            unique.push(item);
        }
    }

    return unique;
}

/**
 * Sort items by relevance score
 * @param {Array<Object>} items - Menu items
 * @returns {Array<Object>}
 */
function sortByRelevance(items) {
    // Calculate relevance score for each item
    const itemsWithScores = items.map(item => {
        let score = 0;

        // Higher priority categories (case-insensitive)
        const category = (item.category || '').toLowerCase();

        if (category === 'entree') {
            score += 100;
        } else if (category === 'pizza' || category === 'burger') {
            score += 80;
        } else if (category === 'sandwich' || category === 'main dish') {
            score += 70;
        }

        // Boost items with complete nutritional info
        if (item.nutrients && item.nutrients.calories > 0) {
            score += 20;
        }

        // Boost items with allergen info (indicates detailed data)
        if (item.allergens && item.allergens.length > 0) {
            score += 10;
        }

        return {
            ...item,
            relevanceScore: score
        };
    });

    // Sort descending by score
    return itemsWithScores.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Parse Nutrislice HTML response
 * @param {string} htmlContent - HTML content from Nutrislice
 * @returns {Object} Parsed menu data with items array
 */
function parseNutrisliceHTML(htmlContent) {
    // Handle null/undefined input
    if (!htmlContent) {
        return { items: [] };
    }

    try {
        const $ = cheerio.load(htmlContent);
        const items = [];

        // Find all food items in the HTML
        $('.food-item').each((index, element) => {
            const $item = $(element);

            // Extract food name
            const name = $item.find('.food-name').text().trim();

            if (!name) {
                return; // Skip items without names
            }

            // Extract category
            const category = $item.find('.category').text().trim() || 'Other';

            // Extract nutrition information
            let nutrients = null;
            const $nutrition = $item.find('.nutrition');
            if ($nutrition.length > 0) {
                const calories = parseInt($nutrition.find('.calories').text()) || 0;
                const protein = parseInt($nutrition.find('.protein').text()) || 0;

                if (calories > 0 || protein > 0) {
                    nutrients = { calories, protein };
                }
            }

            // Build item object
            const item = {
                name,
                category
            };

            if (nutrients) {
                item.nutrients = nutrients;
            }

            items.push(item);
        });

        return { items };
    } catch (error) {
    // Handle malformed HTML gracefully
        return { items: [] };
    }
}

/**
 * Format menu items for Alexa speech output
 * @param {Array<Object>} items - Menu items
 * @returns {string} Formatted speech text
 */
function formatMenuItems(items) {
    // Handle null/undefined input
    if (!items || !Array.isArray(items)) {
        return '';
    }

    if (items.length === 0) {
        return '';
    }

    if (items.length === 1) {
        return items[0].name;
    }

    if (items.length === 2) {
        return `${items[0].name} and ${items[1].name}`;
    }

    // Multiple items: "A, B, and C"
    const names = items.map(item => item.name);
    const lastItem = names.pop();
    return `${names.join(', ')}, and ${lastItem}`;
}

module.exports = {
    extractMainItems,
    parseNutrisliceHTML,
    formatMenuItems,
    // Export helper functions for testing
    checkIfMainItem,
    removeDuplicates,
    sortByRelevance
};
