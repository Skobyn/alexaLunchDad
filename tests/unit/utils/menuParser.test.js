/**
 * TDD London School Tests for Menu Parser
 * RED Phase - All tests should fail initially
 */

const menuParser = require('../../../src/utils/menuParser');
const fs = require('fs');
const path = require('path');

// Mock dependencies
jest.mock('../../../src/utils/constants', () => ({
  MAX_MENU_ITEMS: 5,
  MAIN_CATEGORIES: ['Entree', 'Main Dish', 'Pizza', 'Sandwich', 'Burger'],
  EXCLUDE_KEYWORDS: ['side', 'drink', 'beverage', 'milk', 'juice', 'dessert', 'fruit cup', 'vegetable']
}));

describe('MenuParser - TDD London School', () => {
  let sampleHTML;
  let mockMenuData;

  beforeAll(() => {
    // Load test fixture
    const fixturePath = path.join(__dirname, '../../fixtures/nutrislice-sample.html');
    sampleHTML = fs.readFileSync(fixturePath, 'utf-8');
  });

  beforeEach(() => {
    // Reset mock menu data before each test
    mockMenuData = {
      items: [
        {
          name: 'Spicy Chicken Sandwich',
          category: 'Entree',
          nutrients: { calories: 420, protein: 25 }
        },
        {
          name: 'Pepperoni Pizza',
          category: 'Pizza',
          nutrients: { calories: 350, protein: 15 }
        },
        {
          name: 'Side Salad',
          category: 'Side',
          nutrients: { calories: 80, protein: 3 }
        },
        {
          name: 'Milk',
          category: 'Beverage',
          nutrients: { calories: 120, protein: 8 }
        }
      ]
    };
  });

  describe('extractMainItems()', () => {
    it('should extract items with main categories (Entree, Pizza, Burger)', () => {
      const result = menuParser.extractMainItems(mockMenuData);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Spicy Chicken Sandwich');
      expect(result[1].name).toBe('Pepperoni Pizza');
    });

    it('should filter out sides, beverages, and desserts by category', () => {
      const result = menuParser.extractMainItems(mockMenuData);

      const categories = result.map(item => item.category);
      expect(categories).not.toContain('Side');
      expect(categories).not.toContain('Beverage');
      expect(categories).not.toContain('Dessert');
    });

    it('should filter by keyword exclusions for uncategorized items', () => {
      const menuWithKeywords = {
        items: [
          { name: 'Chicken Sandwich', category: 'Other', nutrients: { calories: 400, protein: 20 } },
          { name: 'Side Salad', category: 'Other', nutrients: { calories: 80, protein: 3 } },
          { name: 'Orange Juice', category: 'Other', nutrients: { calories: 110, protein: 0 } }
        ]
      };

      const result = menuParser.extractMainItems(menuWithKeywords);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Chicken Sandwich');
    });

    it('should filter by nutrition values (250+ calories, 10+ protein)', () => {
      const menuWithNutrition = {
        items: [
          { name: 'Main Dish', category: 'Other', nutrients: { calories: 400, protein: 20 } },
          { name: 'Light Snack', category: 'Other', nutrients: { calories: 150, protein: 5 } },
          { name: 'Substantial Meal', category: 'Other', nutrients: { calories: 350, protein: 18 } }
        ]
      };

      const result = menuParser.extractMainItems(menuWithNutrition);

      expect(result.length).toBeGreaterThanOrEqual(2);
      result.forEach(item => {
        if (item.nutrients) {
          expect(item.nutrients.calories >= 250 || item.category !== 'Other').toBe(true);
        }
      });
    });

    it('should remove duplicate items (case-insensitive)', () => {
      const menuWithDuplicates = {
        items: [
          { name: 'Pizza', category: 'Entree' },
          { name: 'PIZZA', category: 'Entree' },
          { name: 'pizza', category: 'Entree' },
          { name: 'Burger', category: 'Entree' }
        ]
      };

      const result = menuParser.extractMainItems(menuWithDuplicates);

      expect(result).toHaveLength(2);
      const names = result.map(item => item.name.toLowerCase());
      expect(new Set(names).size).toBe(2);
    });

    it('should limit results to MAX_MENU_ITEMS (5)', () => {
      const largeMenu = {
        items: Array.from({ length: 10 }, (_, i) => ({
          name: `Entree ${i + 1}`,
          category: 'Entree',
          nutrients: { calories: 300, protein: 15 }
        }))
      };

      const result = menuParser.extractMainItems(largeMenu);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty menu data gracefully', () => {
      const emptyMenu = { items: [] };
      const result = menuParser.extractMainItems(emptyMenu);

      expect(result).toEqual([]);
    });

    it('should handle null/undefined input gracefully', () => {
      expect(menuParser.extractMainItems(null)).toEqual([]);
      expect(menuParser.extractMainItems(undefined)).toEqual([]);
      expect(menuParser.extractMainItems({ items: null })).toEqual([]);
    });

    it('should sort items by relevance score (Entree > Pizza/Burger > Other)', () => {
      const unsortedMenu = {
        items: [
          { name: 'Unknown Item', category: 'Other', nutrients: { calories: 300, protein: 15 } },
          { name: 'Pizza Slice', category: 'Pizza', nutrients: { calories: 350, protein: 12 } },
          { name: 'Chicken Entree', category: 'Entree', nutrients: { calories: 400, protein: 25 } }
        ]
      };

      const result = menuParser.extractMainItems(unsortedMenu);

      // Entree should be first due to highest relevance score
      expect(result[0].category).toBe('Entree');
    });
  });

  describe('parseNutrisliceHTML()', () => {
    it('should parse HTML and extract food items', () => {
      const result = menuParser.parseNutrisliceHTML(sampleHTML);

      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should extract food names from HTML structure', () => {
      const result = menuParser.parseNutrisliceHTML(sampleHTML);

      const names = result.items.map(item => item.name);
      expect(names).toContain('Spicy Chicken Sandwich');
      expect(names).toContain('Pepperoni Pizza');
    });

    it('should extract category information', () => {
      const result = menuParser.parseNutrisliceHTML(sampleHTML);

      const itemWithCategory = result.items.find(item => item.name === 'Spicy Chicken Sandwich');
      expect(itemWithCategory).toHaveProperty('category');
      expect(itemWithCategory.category).toBe('Entree');
    });

    it('should extract nutrition information when available', () => {
      const result = menuParser.parseNutrisliceHTML(sampleHTML);

      const nutritionItem = result.items.find(item => item.name === 'Spicy Chicken Sandwich');
      expect(nutritionItem).toHaveProperty('nutrients');
      expect(nutritionItem.nutrients).toHaveProperty('calories');
      expect(nutritionItem.nutrients).toHaveProperty('protein');
    });

    it('should handle malformed HTML gracefully', () => {
      const malformedHTML = '<div><h3>Incomplete';

      const result = menuParser.parseNutrisliceHTML(malformedHTML);

      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should handle empty HTML', () => {
      const emptyHTML = '<html><body></body></html>';

      const result = menuParser.parseNutrisliceHTML(emptyHTML);

      expect(result.items).toEqual([]);
    });

    it('should handle null/undefined HTML input', () => {
      expect(() => menuParser.parseNutrisliceHTML(null)).not.toThrow();
      expect(() => menuParser.parseNutrisliceHTML(undefined)).not.toThrow();
      expect(menuParser.parseNutrisliceHTML(null).items).toEqual([]);
    });
  });

  describe('formatMenuItems()', () => {
    it('should format items for Alexa speech output', () => {
      const items = [
        { name: 'Chicken Sandwich', category: 'Entree' },
        { name: 'Pizza', category: 'Pizza' }
      ];

      const result = menuParser.formatMenuItems(items);

      expect(result).toBe('Chicken Sandwich and Pizza');
    });

    it('should join single item without "and"', () => {
      const items = [{ name: 'Chicken Sandwich', category: 'Entree' }];

      const result = menuParser.formatMenuItems(items);

      expect(result).toBe('Chicken Sandwich');
    });

    it('should join two items with "and"', () => {
      const items = [
        { name: 'Chicken', category: 'Entree' },
        { name: 'Pizza', category: 'Pizza' }
      ];

      const result = menuParser.formatMenuItems(items);

      expect(result).toBe('Chicken and Pizza');
    });

    it('should join multiple items with commas and "and"', () => {
      const items = [
        { name: 'Chicken', category: 'Entree' },
        { name: 'Pizza', category: 'Pizza' },
        { name: 'Burger', category: 'Burger' }
      ];

      const result = menuParser.formatMenuItems(items);

      expect(result).toBe('Chicken, Pizza, and Burger');
    });

    it('should handle empty items array', () => {
      const result = menuParser.formatMenuItems([]);

      expect(result).toBe('');
    });

    it('should handle null/undefined input', () => {
      expect(menuParser.formatMenuItems(null)).toBe('');
      expect(menuParser.formatMenuItems(undefined)).toBe('');
    });
  });

  describe('Integration: parseNutrisliceHTML + extractMainItems + formatMenuItems', () => {
    it('should process HTML fixture through complete pipeline', () => {
      // Parse HTML
      const parsedData = menuParser.parseNutrisliceHTML(sampleHTML);

      // Extract main items
      const mainItems = menuParser.extractMainItems(parsedData);

      // Format for Alexa
      const speechText = menuParser.formatMenuItems(mainItems);

      expect(mainItems.length).toBeGreaterThan(0);
      expect(mainItems.length).toBeLessThanOrEqual(5);
      expect(speechText).toBeTruthy();
      expect(speechText.length).toBeGreaterThan(0);
    });

    it('should exclude sides and beverages from final output', () => {
      const parsedData = menuParser.parseNutrisliceHTML(sampleHTML);
      const mainItems = menuParser.extractMainItems(parsedData);
      const speechText = menuParser.formatMenuItems(mainItems);

      expect(speechText.toLowerCase()).not.toContain('side salad');
      expect(speechText.toLowerCase()).not.toContain('milk');
      expect(speechText.toLowerCase()).not.toContain('cookie');
    });

    it('should prioritize high-relevance items in output', () => {
      const parsedData = menuParser.parseNutrisliceHTML(sampleHTML);
      const mainItems = menuParser.extractMainItems(parsedData);

      // First items should be categorized entrees, not "Other"
      const topCategories = mainItems.slice(0, 3).map(item => item.category);
      const mainCategoryCount = topCategories.filter(cat =>
        ['Entree', 'Pizza', 'Burger', 'Main Dish', 'Sandwich'].includes(cat)
      ).length;

      expect(mainCategoryCount).toBeGreaterThan(0);
    });
  });
});
