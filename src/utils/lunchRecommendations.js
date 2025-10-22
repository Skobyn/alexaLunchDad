const lunchOptions = [
    'a fresh Caesar salad with grilled chicken',
    'a delicious burger and fries',
    'some tasty tacos',
    'a hearty pasta dish',
    'a healthy poke bowl',
    'a warm bowl of ramen',
    'a classic sandwich and soup combo',
    'some sushi rolls',
    'a flavorful curry with rice',
    'a Mediterranean wrap with hummus'
];

/**
 * Get a random lunch recommendation
 * @returns {string} A lunch recommendation
 */
function getLunchRecommendation() {
    const randomIndex = Math.floor(Math.random() * lunchOptions.length);
    return lunchOptions[randomIndex];
}

module.exports = {
    getLunchRecommendation,
    lunchOptions
};

