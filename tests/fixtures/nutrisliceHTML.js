/**
 * Nutrislice HTML Fixtures
 *
 * Sample HTML responses from Nutrislice for testing integration.
 * Based on actual Nutrislice website structure.
 */

/**
 * Full menu with multiple items
 * Matches the actual HTML structure expected by menuParser
 */
const fullMenuHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Westmore Elementary School - Lunch Menu</title>
</head>
<body>
  <div class="menu-container">
    <div class="menu-date">Wednesday, October 22, 2025</div>

    <div class="food-item" data-menu-item-id="12345">
      <h3 class="food-name">Chicken Nuggets</h3>
      <span class="category">Entree</span>
      <div class="nutrition">
        <span class="calories">380</span>
        <span class="protein">20</span>
      </div>
    </div>

    <div class="food-item" data-menu-item-id="12346">
      <h3 class="food-name">Pizza Slice</h3>
      <span class="category">Pizza</span>
      <div class="nutrition">
        <span class="calories">350</span>
        <span class="protein">15</span>
      </div>
    </div>

    <div class="food-item" data-menu-item-id="12347">
      <h3 class="food-name">Garden Salad</h3>
      <span class="category">Side</span>
      <div class="nutrition">
        <span class="calories">80</span>
        <span class="protein">3</span>
      </div>
    </div>

    <div class="food-item" data-menu-item-id="12348">
      <h3 class="food-name">French Fries</h3>
      <span class="category">Side</span>
      <div class="nutrition">
        <span class="calories">180</span>
        <span class="protein">2</span>
      </div>
    </div>

    <div class="food-item" data-menu-item-id="12349">
      <h3 class="food-name">Apple Slices</h3>
      <span class="category">Fruit</span>
      <div class="nutrition">
        <span class="calories">60</span>
        <span class="protein">1</span>
      </div>
    </div>

    <div class="food-item" data-menu-item-id="12350">
      <h3 class="food-name">Milk</h3>
      <span class="category">Beverage</span>
      <div class="nutrition">
        <span class="calories">120</span>
        <span class="protein">8</span>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Menu with only a few items
 */
const simpleMenuHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Westmore Elementary School - Lunch Menu</title>
</head>
<body>
  <div class="menu-container">
    <div class="menu-date">Thursday, October 23, 2025</div>

    <div class="food-item" data-menu-item-id="22345">
      <h3 class="food-name">Hamburger</h3>
      <span class="category">Burger</span>
      <div class="nutrition">
        <span class="calories">480</span>
        <span class="protein">28</span>
      </div>
    </div>

    <div class="food-item" data-menu-item-id="22346">
      <h3 class="food-name">Tater Tots</h3>
      <span class="category">Side</span>
      <div class="nutrition">
        <span class="calories">160</span>
        <span class="protein">2</span>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Empty menu (no items available)
 */
const emptyMenuHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Westmore Elementary School - Lunch Menu</title>
</head>
<body>
  <div class="menu-container">
    <div class="menu-date">Friday, October 24, 2025</div>
    <p class="no-menu">No menu available for this date.</p>
  </div>
</body>
</html>
`;

/**
 * Malformed HTML (parsing challenge)
 */
const malformedHTML = `
<!DOCTYPE html>
<html>
<head><title>Menu</title>
<body>
  <div class="food-item">
    <h3 class="food-name">Broken Item
    <div>Missing closing tags
  </div>
`;

/**
 * Menu with special characters and HTML entities
 */
const specialCharactersHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Menu</title>
</head>
<body>
  <div class="menu-container">
    <div class="food-item">
      <h3 class="food-name">Mac &amp; Cheese</h3>
      <span class="category">Entree</span>
      <div class="nutrition">
        <span class="calories">320</span>
        <span class="protein">12</span>
      </div>
    </div>

    <div class="food-item">
      <h3 class="food-name">PB&amp;J Sandwich</h3>
      <span class="category">Sandwich</span>
      <div class="nutrition">
        <span class="calories">380</span>
        <span class="protein">15</span>
      </div>
    </div>

    <div class="food-item">
      <h3 class="food-name">Fruit Cup (Peaches &amp; Pears)</h3>
      <span class="category">Fruit</span>
      <div class="nutrition">
        <span class="calories">80</span>
        <span class="protein">1</span>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Weekend/holiday menu (typically empty or special message)
 */
const weekendHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Westmore Elementary School - Lunch Menu</title>
</head>
<body>
  <div class="menu-container">
    <div class="menu-date">Saturday, October 25, 2025</div>
    <p class="no-school">No school on weekends</p>
  </div>
</body>
</html>
`;

/**
 * Expected parsed results for testing
 */
const parsedResults = {
  fullMenu: {
    date: '2025-10-22',
    items: [
      { name: 'Chicken Nuggets', category: 'Entree', description: 'Crispy breaded chicken nuggets' },
      { name: 'Pizza Slice', category: 'Entree', description: 'Cheese pizza slice' },
      { name: 'Garden Salad', category: 'Side', description: 'Fresh mixed greens' },
      { name: 'French Fries', category: 'Side', description: 'Golden crispy fries' },
      { name: 'Apple Slices', category: 'Fruit', description: 'Fresh apple slices' },
      { name: 'Milk', category: 'Beverage', description: '1% white milk' }
    ]
  },

  simpleMenu: {
    date: '2025-10-23',
    items: [
      { name: 'Hamburger', category: 'Entree' },
      { name: 'Tater Tots', category: 'Side' }
    ]
  },

  emptyMenu: {
    date: '2025-10-24',
    items: []
  },

  specialCharacters: {
    date: '2025-10-22',
    items: [
      { name: 'Mac & Cheese', category: 'Entree' },
      { name: 'PB&J Sandwich', category: 'Entree' },
      { name: 'Fruit Cup (Peaches & Pears)', category: 'Fruit' }
    ]
  }
};

/**
 * HTTP status codes for different scenarios
 */
const httpScenarios = {
  success: { status: 200, html: fullMenuHTML },
  notFound: { status: 404, html: '' },
  serverError: { status: 500, html: 'Internal Server Error' },
  timeout: { status: null, error: 'ETIMEDOUT' },
  networkError: { status: null, error: 'ECONNREFUSED' },
  emptyResponse: { status: 200, html: '' },
  malformed: { status: 200, html: malformedHTML }
};

module.exports = {
  // HTML responses
  fullMenuHTML,
  simpleMenuHTML,
  emptyMenuHTML,
  malformedHTML,
  specialCharactersHTML,
  weekendHTML,

  // Parsed results
  parsedResults,

  // HTTP scenarios
  httpScenarios
};
