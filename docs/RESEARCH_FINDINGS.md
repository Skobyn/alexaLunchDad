# Research Findings: Nutrislice and Weather APIs

## Executive Summary

This document contains research findings for integrating menu data from Nutrislice and weather information for the Lunch Dad Alexa skill.

### Key Findings

1. **Nutrislice**: No public JSON API available - requires HTML scraping
2. **Weather API**: Weather.gov provides free, unrestricted API access (RECOMMENDED)
3. **Alternative Weather**: OpenWeatherMap offers free tier with 60 calls/min limit

---

## 1. Nutrislice Platform Analysis

### 1.1 Data Access Method

**Finding**: Nutrislice does not provide a documented public JSON API.

**Evidence**:
- Tested multiple API endpoint patterns (all returned 404 or HTML):
  - `https://d45.nutrislice.com/menu/api/digest/school/.../date/...`
  - `https://d45.nutrislice.com/menu/api/weeks/school/.../...`
  - `https://westmore-elementary-school-2.d45.nutrislice.com/menu-api/...`
  - `https://d45-api.nutrislice.com/...`
  - `https://api.nutrislice.com/v1/...`

- All endpoints return gzipped HTML instead of JSON
- No developer documentation found on nutrislice.com

**Recommendation**: **HTML web scraping** is required to extract menu data.

### 1.2 URL Pattern

**Web Page URL Format**:
```
https://d45.nutrislice.com/menu/{school-slug}/{meal-type}/{date}
```

**Example**:
```
https://d45.nutrislice.com/menu/westmore-elementary-school-2/lunch/2025-10-22
```

**Parameters**:
- `school-slug`: `westmore-elementary-school-2`
- `meal-type`: `lunch` (could also be `breakfast`, `dinner`)
- `date`: `YYYY-MM-DD` format (e.g., `2025-10-22`)

### 1.3 Data Structure (HTML Scraping Required)

The Nutrislice web page loads menu data dynamically via JavaScript. The HTML structure includes:

**HTML Elements to Parse**:
- Menu categories: `<h3 class="menu-category-name">...</h3>`
- Food items: `<div class="food-name">...</div>`
- Item descriptions: May be in adjacent elements
- Potential embedded JSON: `window.__INITIAL_STATE__` JavaScript variable

**Scraping Strategy**:
1. Fetch HTML page with proper User-Agent header
2. Parse HTML using libraries like `cheerio` (Node.js) or `BeautifulSoup` (Python)
3. Extract menu categories and items from DOM structure
4. Optionally: Extract embedded JSON from `window.__INITIAL_STATE__` if available

### 1.4 Menu Item Categories

Based on typical school lunch menus, expected categories include:
- **Entrees/Main Dishes** (e.g., Pizza, Chicken Tenders, Sandwiches)
- **Sides** (e.g., Vegetables, Fruit, Salad)
- **Beverages** (e.g., Milk, Juice)
- **Condiments/Extras**

**Identifying Main Items**:
- Usually the first category or labeled as "Entree" or "Main"
- Typically 1-3 main entree options per day
- Filter by excluding categories like "Sides", "Beverages", "Condiments"

### 1.5 Date Handling

**Format**: ISO 8601 date format `YYYY-MM-DD`
**Timezone**: Eastern Time (school is in Maryland - Aspen Hill area)
**Example**:
- October 22, 2025 → `2025-10-22`
- October 23, 2025 → `2025-10-23`

**URL Construction for Different Dates**:
```javascript
const date = new Date(); // or specific date
const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
const url = `https://d45.nutrislice.com/menu/westmore-elementary-school-2/lunch/${dateStr}`;
```

### 1.6 Access Restrictions & Rate Limiting

**Observed Restrictions**:
- No API key required (public web page)
- Standard HTTP requests work
- Gzip compression enabled (must handle in requests)
- User-Agent header recommended to avoid bot detection

**Rate Limiting**:
- Not explicitly documented
- Recommended: Cache menu data daily
- Avoid excessive requests (1 request per day per menu should be sufficient)

### 1.7 Example Scraping Implementation

**Recommended Approach** (Node.js with Alexa Lambda):
```javascript
const https = require('https');
const cheerio = require('cheerio'); // May need to bundle for Lambda

async function fetchNutrisliceMenu(date) {
  const url = `https://d45.nutrislice.com/menu/westmore-elementary-school-2/lunch/${date}`;

  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Lunch-Dad-Alexa-Skill/1.0'
      }
    }, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        const $ = cheerio.load(html);
        const menuItems = [];

        // Extract main entrees (adjust selectors based on actual HTML)
        $('.food-name').each((i, elem) => {
          menuItems.push($(elem).text().trim());
        });

        resolve(menuItems);
      });
    }).on('error', reject);
  });
}
```

---

## 2. Weather API Comparison

### 2.1 Weather.gov (National Weather Service) - RECOMMENDED

**Verdict**: **Best choice for this project**

**Pros**:
- ✅ Completely free, no API key required
- ✅ No rate limits for reasonable use (generous threshold)
- ✅ Official US Government data source (reliable)
- ✅ Comprehensive data including hourly forecasts
- ✅ Covers entire United States
- ✅ No registration required

**Cons**:
- ❌ Only covers United States (not an issue for this project)
- ❌ Requires two API calls (lat/lon → grid point → forecast)

**API Details**:
- **Base URL**: `https://api.weather.gov`
- **API Key**: None required
- **Rate Limits**: None officially stated (generous for typical use)
- **Required Headers**: `User-Agent: (your-app-name, contact@email.com)`

**Endpoints**:

1. **Get Grid Coordinates**:
   ```
   GET https://api.weather.gov/points/{latitude},{longitude}
   ```
   Example: `https://api.weather.gov/points/39.0997,-77.0941`

   Returns:
   ```json
   {
     "properties": {
       "gridId": "LWX",
       "gridX": 93,
       "gridY": 80,
       "forecast": "https://api.weather.gov/gridpoints/LWX/93,80/forecast",
       "forecastHourly": "https://api.weather.gov/gridpoints/LWX/93,80/forecast/hourly"
     }
   }
   ```

2. **Get Forecast**:
   ```
   GET https://api.weather.gov/gridpoints/{office}/{gridX},{gridY}/forecast
   ```
   Example: `https://api.weather.gov/gridpoints/LWX/93,80/forecast`

   Returns 12-hour periods:
   ```json
   {
     "properties": {
       "periods": [
         {
           "number": 1,
           "name": "Today",
           "temperature": 62,
           "temperatureUnit": "F",
           "windSpeed": "6 to 13 mph",
           "windDirection": "W",
           "shortForecast": "Sunny",
           "detailedForecast": "Sunny, with a high near 62..."
         }
       ]
     }
   }
   ```

3. **Get Hourly Forecast** (for morning weather):
   ```
   GET https://api.weather.gov/gridpoints/{office}/{gridX},{gridY}/forecast/hourly
   ```
   Example: `https://api.weather.gov/gridpoints/LWX/93,80/forecast/hourly`

   Returns hourly data:
   ```json
   {
     "properties": {
       "periods": [
         {
           "number": 1,
           "startTime": "2025-10-22T08:00:00-04:00",
           "temperature": 49,
           "temperatureUnit": "F",
           "windSpeed": "10 mph",
           "shortForecast": "Sunny"
         }
       ]
     }
   }
   ```

**For Lunch Dad**:
- Use hourly forecast to get morning (7-9 AM) weather
- Filter periods where `isDaytime: true` and startTime is between 7-9 AM
- Extract: temperature, shortForecast (e.g., "Sunny", "Cloudy", "Rainy")

**School Location** (Westmore Elementary):
- Latitude: 39.0997
- Longitude: -77.0941
- Grid: LWX 93/80

### 2.2 OpenWeatherMap - ALTERNATIVE

**Pros**:
- ✅ Well-documented API
- ✅ Free tier available
- ✅ Global coverage
- ✅ Simple single endpoint

**Cons**:
- ❌ Requires API key (registration)
- ❌ Rate limited (60 calls/min, 1M calls/month free)
- ❌ Free tier has limited forecast granularity

**API Details**:
- **Base URL**: `https://api.openweathermap.org/data/2.5`
- **API Key**: Required (sign up at openweathermap.org)
- **Rate Limits**: 60 calls/minute, 1,000,000 calls/month (free tier)

**Free Tier Includes**:
- Current weather
- 5-day forecast (3-hour intervals)
- Air pollution data
- Geocoding

**Example Endpoint**:
```
GET https://api.openweathermap.org/data/2.5/weather?lat=39.0997&lon=-77.0941&appid={API_KEY}&units=imperial
```

**Not Needed For This Project** - Weather.gov is simpler and free.

### 2.3 WeatherAPI.com - NOT EVALUATED

**Reason**: Unable to retrieve free tier details via WebFetch tool. The website returned only CSS/styling code. Would require API key and registration.

**Not Recommended**: Weather.gov already meets all requirements without API key.

---

## 3. Implementation Recommendations

### 3.1 Architecture

**Recommended Flow**:
```
1. User invokes Alexa skill
2. Lambda function executes:
   a. Get current date (Eastern Time)
   b. Fetch menu from Nutrislice (HTML scraping)
   c. Fetch weather from Weather.gov (JSON API)
   d. Parse and combine data
   e. Generate speech response
3. Alexa speaks response
```

### 3.2 Caching Strategy

**Menu Data**:
- Cache menu data for 24 hours
- Use DynamoDB or Lambda environment variables
- Refresh once per day (menus don't change frequently)

**Weather Data**:
- Cache for 1-3 hours
- Weather changes more frequently than menu
- Acceptable staleness: 1 hour

### 3.3 Error Handling

**Nutrislice Failures**:
- No menu data available
- HTML structure changed (scraping breaks)
- Network timeout
- Fallback: "Menu information is unavailable today"

**Weather.gov Failures**:
- API down (rare for government service)
- Network timeout
- Fallback: Skip weather in response or "Weather unavailable"

### 3.4 Example Parsed Output

**Input**: October 22, 2025

**Nutrislice Parsed Data**:
```json
{
  "date": "2025-10-22",
  "mealType": "lunch",
  "categories": [
    {
      "name": "Entrees",
      "items": [
        "Cheese Pizza",
        "Chicken Tenders",
        "Turkey Sandwich"
      ]
    },
    {
      "name": "Sides",
      "items": [
        "Green Beans",
        "Fresh Apple",
        "Carrot Sticks"
      ]
    },
    {
      "name": "Beverages",
      "items": [
        "1% White Milk",
        "Fat Free Chocolate Milk"
      ]
    }
  ],
  "mainItems": ["Cheese Pizza", "Chicken Tenders", "Turkey Sandwich"]
}
```

**Weather.gov Parsed Data**:
```json
{
  "date": "2025-10-22",
  "timeOfDay": "morning",
  "temperature": 49,
  "temperatureUnit": "F",
  "condition": "Sunny",
  "windSpeed": "10 mph"
}
```

**Combined Alexa Response**:
```
"Good morning! Today's lunch at Westmore Elementary includes Cheese Pizza,
Chicken Tenders, and Turkey Sandwich. The weather this morning is sunny
and 49 degrees Fahrenheit."
```

---

## 4. Testing & Validation

### 4.1 Test URLs

**Nutrislice Menu (Today)**:
```
https://d45.nutrislice.com/menu/westmore-elementary-school-2/lunch/2025-10-22
```

**Nutrislice Menu (Tomorrow)**:
```
https://d45.nutrislice.com/menu/westmore-elementary-school-2/lunch/2025-10-23
```

**Weather.gov (Grid Coordinates)**:
```
https://api.weather.gov/points/39.0997,-77.0941
```

**Weather.gov (Hourly Forecast)**:
```
https://api.weather.gov/gridpoints/LWX/93,80/forecast/hourly
```

### 4.2 Validation Checklist

- [ ] Menu scraping extracts main entrees correctly
- [ ] Menu scraping handles missing menu gracefully
- [ ] Date formatting works for different timezones
- [ ] Weather API returns morning hours (7-9 AM)
- [ ] Combined response sounds natural in Alexa voice
- [ ] Caching reduces API calls appropriately
- [ ] Error handling provides fallback responses

---

## 5. Dependencies & Tools

### 5.1 Node.js Libraries (for Lambda)

**Required**:
- `https` (built-in) - HTTP requests
- `cheerio` or `jsdom` - HTML parsing for Nutrislice

**Optional**:
- `axios` - Simpler HTTP client (alternative to `https`)
- `aws-sdk` - DynamoDB caching

**Installation**:
```bash
npm install cheerio
```

**Lambda Deployment**:
- Bundle dependencies with deployment package
- Use Lambda layers for shared dependencies

---

## 6. Conclusion

### Final Recommendations

1. **Menu Data Source**: Nutrislice (HTML scraping)
   - No API available, scraping is required
   - Cache daily to minimize requests
   - Monitor for HTML structure changes

2. **Weather Data Source**: Weather.gov API (RECOMMENDED)
   - Free, reliable, no API key
   - Use hourly forecast for morning weather
   - Simple two-step process: lat/lon → grid → forecast

3. **Implementation Priority**:
   - High: Menu scraping with error handling
   - High: Weather.gov integration
   - Medium: Caching layer (DynamoDB or in-memory)
   - Low: Advanced features (nutrition info, images)

### Next Steps

1. Implement Nutrislice HTML scraper
2. Test scraper with various dates
3. Integrate Weather.gov API calls
4. Build Alexa response formatter
5. Add caching and error handling
6. Deploy to AWS Lambda
7. Test with Alexa simulator

---

## Appendix: Sample Data

### A.1 Weather.gov Full Response Example

**Endpoint**: `https://api.weather.gov/gridpoints/LWX/93,80/forecast`

**Response** (abbreviated):
```json
{
  "@context": [
    "https://geojson.org/geojson-ld/geojson-context.jsonld",
    {
      "@version": "1.1",
      "wx": "https://api.weather.gov/ontology#",
      "@vocab": "https://api.weather.gov/ontology#"
    }
  ],
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-77.0916, 39.0851], [-77.0879, 39.107], ...]]
  },
  "properties": {
    "units": "us",
    "forecastGenerator": "BaselineForecastGenerator",
    "generatedAt": "2025-10-22T12:41:11+00:00",
    "updateTime": "2025-10-22T11:29:25+00:00",
    "elevation": {
      "unitCode": "wmoUnit:m",
      "value": 116.1288
    },
    "periods": [
      {
        "number": 1,
        "name": "Today",
        "startTime": "2025-10-22T08:00:00-04:00",
        "endTime": "2025-10-22T18:00:00-04:00",
        "isDaytime": true,
        "temperature": 62,
        "temperatureUnit": "F",
        "temperatureTrend": "",
        "probabilityOfPrecipitation": {
          "unitCode": "wmoUnit:percent",
          "value": 2
        },
        "windSpeed": "6 to 13 mph",
        "windDirection": "W",
        "icon": "https://api.weather.gov/icons/land/day/few?size=medium",
        "shortForecast": "Sunny",
        "detailedForecast": "Sunny, with a high near 62. West wind 6 to 13 mph, with gusts as high as 23 mph."
      },
      {
        "number": 2,
        "name": "Tonight",
        "startTime": "2025-10-22T18:00:00-04:00",
        "endTime": "2025-10-23T06:00:00-04:00",
        "isDaytime": false,
        "temperature": 41,
        "temperatureUnit": "F",
        "shortForecast": "Mostly Clear"
      }
    ]
  }
}
```

### A.2 Hourly Forecast Morning Extract

**Endpoint**: `https://api.weather.gov/gridpoints/LWX/93,80/forecast/hourly`

**Morning Hours** (7-9 AM):
```json
{
  "properties": {
    "periods": [
      {
        "number": 1,
        "startTime": "2025-10-22T08:00:00-04:00",
        "endTime": "2025-10-22T09:00:00-04:00",
        "isDaytime": true,
        "temperature": 49,
        "temperatureUnit": "F",
        "windSpeed": "10 mph",
        "windDirection": "W",
        "shortForecast": "Sunny"
      }
    ]
  }
}
```

---

**Research Completed**: 2025-10-22
**Researcher**: Research Agent (Claude Code)
**Status**: Ready for implementation
