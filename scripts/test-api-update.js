#!/usr/bin/env node

/**
 * Test script to verify the updated Nutrislice API integration
 */

const axios = require('axios');

async function testAPI() {
    const dates = ['2025-10-22', '2025-10-23'];

    for (const date of dates) {
        const [year, month, day] = date.split('-');
        const url = `https://d45.api.nutrislice.com/menu/api/weeks/school/westmore-elementary-school-2/menu-type/lunch/${year}/${month}/${day}/`;

        console.log(`\nTesting: ${date}`);
        console.log(`URL: ${url}\n`);

        try {
            const response = await axios.get(url, {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'x-nutrislice-origin': 'd45.nutrislice.com'
                },
                timeout: 5000
            });

            const dayData = response.data.days?.find(day => day.date === date);

            if (dayData && dayData.menu_items && dayData.menu_items.length > 0) {
                console.log(`✓ Found ${dayData.menu_items.length} menu items:`);

                dayData.menu_items.slice(0, 5).forEach((item, i) => {
                    if (item.food) {
                        const cal = item.food.rounded_nutrition_info?.calories || 'N/A';
                        console.log(`  ${i + 1}. ${item.food.name} (${cal} cal)`);
                    }
                });
            } else {
                console.log(`✗ No menu items found for ${date}`);
            }

        } catch (error) {
            console.error(`✗ Error: ${error.message}`);
        }
    }
}

testAPI().catch(console.error);
