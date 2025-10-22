#!/usr/bin/env node

/**
 * Test script to verify Nutrislice API access and HTML parsing
 */

const axios = require('axios');
const cheerio = require('cheerio');

const SCHOOL_ID = 'westmore-elementary-school-2';
const BASE_URL = 'https://d45.nutrislice.com/menu';

async function testNutrislice() {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Get tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log('Testing Nutrislice API...\n');
    console.log(`Today: ${dateStr} (${today.toDateString()})`);
    console.log(`Tomorrow: ${tomorrowStr} (${tomorrow.toDateString()})\n`);

    for (const date of [dateStr, tomorrowStr]) {
        const url = `${BASE_URL}/${SCHOOL_ID}/${date}`;
        console.log(`\nFetching: ${url}`);

        try {
            const response = await axios.get(url, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; AlexaLunchDad/1.0)'
                }
            });

            console.log(`✓ HTTP ${response.status}`);

            // Parse HTML
            const $ = cheerio.load(response.data);
            const menuItems = [];

            // Try multiple selectors to find menu items
            const selectors = [
                '.menu-item',
                '.food-item',
                '.menu-cell',
                '[class*="menu"]',
                '[class*="item"]'
            ];

            for (const selector of selectors) {
                const items = $(selector);
                if (items.length > 0) {
                    console.log(`  Found ${items.length} elements with selector: ${selector}`);

                    items.each((i, elem) => {
                        const text = $(elem).text().trim();
                        if (text && text.length > 0 && !menuItems.includes(text)) {
                            menuItems.push(text);
                        }
                    });
                }
            }

            if (menuItems.length > 0) {
                console.log(`\n✓ Found ${menuItems.length} menu items:`);
                menuItems.slice(0, 10).forEach((item, i) => {
                    console.log(`  ${i + 1}. ${item.substring(0, 60)}${item.length > 60 ? '...' : ''}`);
                });
            } else {
                console.log('\n✗ No menu items found');
                console.log('  Saving HTML to debug.html for inspection...');
                require('fs').writeFileSync('debug.html', response.data);
            }

        } catch (error) {
            console.error(`✗ Error: ${error.message}`);
            if (error.response) {
                console.error(`  HTTP ${error.response.status}: ${error.response.statusText}`);
            }
        }
    }
}

testNutrislice().catch(console.error);
