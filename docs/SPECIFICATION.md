# Lunch Dad Alexa Skill - System Requirements Specification

**Version:** 1.0.0
**Date:** 2025-10-22
**Project:** Alexa Lunch Dad - School Lunch Menu Voice Assistant

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and non-functional requirements for the Lunch Dad Alexa skill, a voice-enabled assistant that provides daily school lunch menu information from Westmore Elementary School via the Nutrislice platform, enhanced with weather integration and visual displays.

### 1.2 Scope

**In Scope:**
- Voice interaction for today/tomorrow lunch menu queries
- Nutrislice API integration for menu data retrieval
- APL (Alexa Presentation Language) visual widget with 5-day calendar
- Weather overlay integration for morning routine optimization
- School day calendar logic (weekday/weekend/holiday handling)
- AWS Lambda serverless architecture
- Automated CI/CD pipeline

**Out of Scope:**
- Multiple school support (single school only: Westmore Elementary)
- User preference storage
- Meal planning or dietary restriction filtering
- Nutritional information details
- Breakfast menu queries
- Multi-language support

### 1.3 Definitions

| Term | Definition |
|------|------------|
| **APL** | Alexa Presentation Language - visual display framework |
| **Nutrislice** | School meal menu management and display platform |
| **Main Item** | Primary entree menu items (not sides/beverages) |
| **School Day** | Monday-Friday excluding holidays |
| **Session** | Active Alexa skill interaction state |
| **Intent** | User's spoken request mapped to skill functionality |

---

## 2. Functional Requirements

### 2.1 Voice Interaction Model

#### FR-2.1.1: Skill Invocation
**Priority:** HIGH
**Description:** Users shall invoke the skill with natural language phrases.

**Acceptance Criteria:**
- ✅ User can say: "Alexa, ask Lunch Dad what's for lunch today"
- ✅ User can say: "Alexa, open Lunch Dad"
- ✅ Invocation name is "lunch dad"
- ✅ Skill activates within 1 second of invocation

**Sample Utterances:**
```
"Alexa, ask lunch dad what's for lunch today"
"Alexa, ask lunch dad what's for lunch tomorrow"
"Alexa, open lunch dad"
"Alexa, launch lunch dad"
```

#### FR-2.1.2: GetTodayMenuIntent
**Priority:** HIGH
**Description:** Retrieve and speak today's lunch menu main items.

**Acceptance Criteria:**
- ✅ Returns menu items for current date (Pacific Time)
- ✅ Speaks only main entree items (excludes sides, beverages, condiments)
- ✅ Formats response as natural speech (comma-separated list)
- ✅ Handles weekend queries by providing next school day
- ✅ Maximum response time: 3 seconds

**Sample Utterances:**
```
"what's for lunch today"
"what are they serving today"
"what's on the menu"
"what can I eat today"
```

**Expected Response Format:**
```
"Today's lunch is Spicy Chicken Sandwich, Individual Cheese Pizza, and Sun Butter and Jelly Sandwich."
```

#### FR-2.1.3: GetTomorrowMenuIntent
**Priority:** HIGH
**Description:** Retrieve and speak tomorrow's lunch menu main items.

**Acceptance Criteria:**
- ✅ Returns menu items for next calendar day
- ✅ Skips to Monday if tomorrow is Saturday
- ✅ Skips to next school day if tomorrow is holiday
- ✅ Speaks only main items
- ✅ Maximum response time: 3 seconds

**Sample Utterances:**
```
"what's for lunch tomorrow"
"what are they serving tomorrow"
"what's tomorrow's menu"
```

**Expected Response Format:**
```
"Tomorrow's lunch will be Chicken Tenders, Cheese Quesadilla, and Turkey and Cheese Sandwich."
```

#### FR-2.1.4: LaunchRequest Handler
**Priority:** MEDIUM
**Description:** Welcome message when skill opens without specific intent.

**Acceptance Criteria:**
- ✅ Provides friendly greeting
- ✅ Explains available commands
- ✅ Keeps session open for follow-up queries
- ✅ Uses dad-style humor/personality

**Expected Response:**
```
"Hey there! I'm Lunch Dad, your go-to source for what's cooking at Westmore Elementary.
You can ask me what's for lunch today or tomorrow. So, what'll it be?"
```

#### FR-2.1.5: Help Intent
**Priority:** MEDIUM
**Description:** Provide usage instructions.

**Acceptance Criteria:**
- ✅ Lists example queries
- ✅ Explains skill capabilities
- ✅ Keeps session open

**Expected Response:**
```
"I can tell you what's for lunch at Westmore Elementary today or tomorrow.
Try asking, 'What's for lunch today?' or 'What's for lunch tomorrow?'"
```

#### FR-2.1.6: Error Handling
**Priority:** HIGH
**Description:** Gracefully handle errors and unavailable data.

**Acceptance Criteria:**
- ✅ Menu unavailable: Inform user politely
- ✅ API timeout: Provide fallback message
- ✅ Weekend/holiday: Redirect to next school day
- ✅ Network error: Suggest retry

**Error Scenarios:**

| Scenario | Response |
|----------|----------|
| Weekend query | "It's the weekend! The cafeteria is closed. Would you like to know Monday's menu?" |
| Holiday | "School's out today! The next lunch menu is on [DATE]." |
| API failure | "Hmm, I'm having trouble reaching the kitchen right now. Try asking me again in a moment." |
| No menu data | "The lunch menu for [DATE] isn't available yet. Check back later!" |

### 2.2 Data Retrieval (Nutrislice Integration)

#### FR-2.2.1: Nutrislice API Access
**Priority:** HIGH
**Description:** Fetch menu data from Nutrislice public API.

**API Endpoint Structure:**
```
https://d45.nutrislice.com/menu/api/weeks/school/westmore-elementary-school-2/menu-type/lunch/{YYYY}/{MM}/{DD}/
```

**Acceptance Criteria:**
- ✅ Successfully retrieves JSON menu data
- ✅ Handles HTTP 200, 404, 500 status codes
- ✅ Implements 5-second timeout
- ✅ Uses HTTPS only
- ✅ No authentication required (public API)

**Request Example:**
```bash
GET https://d45.nutrislice.com/menu/api/weeks/school/westmore-elementary-school-2/menu-type/lunch/2025/10/22/
```

**Expected Response Structure:**
```json
{
  "days": [
    {
      "date": "2025-10-22",
      "menu_items": [
        {
          "food": {
            "name": "Spicy Chicken Sandwich",
            "description": "...",
            "is_primary": true
          }
        },
        {
          "food": {
            "name": "Baby Carrots",
            "is_primary": false
          }
        }
      ]
    }
  ]
}
```

#### FR-2.2.2: Main Item Extraction
**Priority:** HIGH
**Description:** Filter menu items to identify primary entrees.

**Acceptance Criteria:**
- ✅ Extract items where `is_primary: true` or equivalent field
- ✅ Exclude sides, beverages, condiments, fruits, vegetables
- ✅ Return array of main item names only
- ✅ Handle missing `is_primary` field with heuristics

**Extraction Logic:**
1. Check for `is_primary: true` flag
2. If unavailable, filter by category keywords:
   - **INCLUDE:** "entree", "main", "sandwich", "pizza", "burger", "chicken", "pasta"
   - **EXCLUDE:** "side", "fruit", "vegetable", "milk", "juice", "condiment"

**Example Output:**
```javascript
[
  "Spicy Chicken Sandwich",
  "Individual Cheese Pizza",
  "Sun Butter and Jelly Sandwich"
]
```

#### FR-2.2.3: Data Caching Strategy
**Priority:** MEDIUM
**Description:** Cache menu data to reduce API calls and improve performance.

**Acceptance Criteria:**
- ✅ Cache menu data for 24 hours
- ✅ Invalidate cache at midnight Pacific Time
- ✅ Respect Nutrislice API rate limits (max 1 call per 10 minutes per date)
- ✅ Use in-memory cache (Lambda execution context)
- ✅ Cache miss: Fetch fresh data from API

**Cache Implementation:**
```javascript
{
  "2025-10-22": {
    "items": ["Spicy Chicken Sandwich", "Cheese Pizza"],
    "timestamp": 1729584000,
    "expiresAt": 1729670400
  }
}
```

### 2.3 School Calendar Logic

#### FR-2.3.1: Next School Day Calculation
**Priority:** HIGH
**Description:** Determine next valid school day when current day has no menu.

**Acceptance Criteria:**
- ✅ Skip Saturday → return Monday
- ✅ Skip Sunday → return Monday
- ✅ Skip holidays → return next weekday with menu
- ✅ Handle Friday → Monday transition
- ✅ Use Pacific Time zone for date calculations

**Algorithm:**
```javascript
function getNextSchoolDay(currentDate) {
  let nextDay = addDays(currentDate, 1);

  while (true) {
    // Skip weekends
    if (isWeekend(nextDay)) {
      nextDay = getNextMonday(nextDay);
      continue;
    }

    // Check if holiday
    if (isHoliday(nextDay)) {
      nextDay = addDays(nextDay, 1);
      continue;
    }

    // Check if menu exists
    if (menuExists(nextDay)) {
      return nextDay;
    }

    nextDay = addDays(nextDay, 1);
  }
}
```

#### FR-2.3.2: Holiday Handling
**Priority:** MEDIUM
**Description:** Maintain list of school holidays and closures.

**Acceptance Criteria:**
- ✅ Store holidays in environment variable or config
- ✅ Check date against holiday list
- ✅ Update annually (manual process acceptable)
- ✅ Format: ISO 8601 date strings

**Holiday Configuration:**
```javascript
// Environment variable: SCHOOL_HOLIDAYS
const SCHOOL_HOLIDAYS = [
  "2025-11-27", // Thanksgiving
  "2025-11-28", // Thanksgiving Break
  "2025-12-23", // Winter Break Start
  "2025-12-24",
  "2025-12-25", // Christmas
  "2025-12-26",
  "2025-12-27",
  "2025-12-28",
  "2025-12-29",
  "2025-12-30",
  "2025-12-31",
  "2026-01-01", // New Year
  "2026-01-02"  // Winter Break End
];
```

#### FR-2.3.3: Weekend Detection
**Priority:** HIGH
**Description:** Identify Saturday and Sunday.

**Acceptance Criteria:**
- ✅ Use JavaScript Date.getDay() method
- ✅ Return `true` for Saturday (6) and Sunday (0)
- ✅ Use Pacific Time zone

**Implementation:**
```javascript
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}
```

### 2.4 Weather Integration

#### FR-2.4.1: Weather API Selection
**Priority:** MEDIUM
**Description:** Integrate weather data for APL widget overlay.

**Recommendation:** OpenWeatherMap API (Free Tier)

**Acceptance Criteria:**
- ✅ Free tier supports 1,000 calls/day
- ✅ Provides current weather and forecast
- ✅ Returns temperature, conditions, icon
- ✅ API key stored in environment variables
- ✅ Implements rate limiting (1 call per 10 minutes)

**API Endpoint:**
```
https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=imperial
```

**Location (Westmore Elementary):**
- Latitude: `47.5678` (placeholder - verify actual)
- Longitude: `-122.1234` (placeholder - verify actual)

**Expected Response:**
```json
{
  "main": {
    "temp": 58.3,
    "feels_like": 56.8
  },
  "weather": [
    {
      "main": "Clouds",
      "description": "overcast clouds",
      "icon": "04d"
    }
  ]
}
```

#### FR-2.4.2: Weather Data Caching
**Priority:** MEDIUM
**Description:** Cache weather data to respect API limits.

**Acceptance Criteria:**
- ✅ Cache weather for 10 minutes
- ✅ Use in-memory cache
- ✅ Invalidate on cache expiration
- ✅ Maximum 144 API calls per day (10-min intervals)

### 2.5 Visual Display (APL Widget)

#### FR-2.5.1: APL Document Structure
**Priority:** HIGH
**Description:** Create visual widget for Echo Show and other screen-enabled devices.

**Acceptance Criteria:**
- ✅ Displays current day's menu prominently
- ✅ Shows 5-day forward calendar view
- ✅ Includes weather overlay (temp + icon)
- ✅ Responsive design (adapts to screen sizes)
- ✅ Optimized for morning routine (quick glance)

**Layout Components:**
1. **Header:** "Westmore Elementary - Lunch Menu"
2. **Today Section:** Large, prominent display of today's items
3. **5-Day Calendar:** Compact week view
4. **Weather Widget:** Temperature and conditions icon
5. **Footer:** Last updated timestamp

**APL Viewport Support:**
- Hub Round Small (480 x 480)
- Hub Landscape Small (960 x 480)
- Hub Landscape Medium (1280 x 800)
- Hub Landscape Large (1920 x 1080)

#### FR-2.5.2: 5-Day Calendar Display
**Priority:** MEDIUM
**Description:** Show next 5 school days with menu items.

**Acceptance Criteria:**
- ✅ Display date and day of week
- ✅ Show main items for each day
- ✅ Skip weekends automatically
- ✅ Highlight current day
- ✅ Truncate long item names

**Example Layout:**
```
┌─────────────────────────────────────────────┐
│  WESTMORE ELEMENTARY - LUNCH MENU           │
├─────────────────────────────────────────────┤
│                                         ☁️ 58°F│
│  TODAY (Wednesday, Oct 22)                  │
│  • Spicy Chicken Sandwich                   │
│  • Individual Cheese Pizza                  │
│  • Sun Butter & Jelly Sandwich              │
│                                             │
│  THIS WEEK:                                 │
│  Thu 10/23  Chicken Tenders, Quesadilla    │
│  Fri 10/24  Fish Sticks, Mac & Cheese      │
│  Mon 10/27  Hamburger, Veggie Burger       │
│  Tue 10/28  Spaghetti, Breadsticks         │
│                                             │
│  Updated: 7:00 AM PDT                       │
└─────────────────────────────────────────────┘
```

#### FR-2.5.3: Weather Overlay
**Priority:** MEDIUM
**Description:** Display current weather conditions.

**Acceptance Criteria:**
- ✅ Show temperature in Fahrenheit
- ✅ Display weather icon (sunny, cloudy, rainy, etc.)
- ✅ Position in top-right corner
- ✅ Update every 10 minutes
- ✅ Graceful degradation if weather unavailable

**Weather Icons:**
- ☀️ Sunny/Clear
- ⛅ Partly Cloudy
- ☁️ Cloudy
- 🌧️ Rainy
- ❄️ Snowy
- ⛈️ Thunderstorm

---

## 3. Non-Functional Requirements

### 3.1 Performance

#### NFR-3.1.1: Response Time
**Priority:** HIGH
**Measurement:** 95th percentile latency

**Acceptance Criteria:**
- ✅ Voice response within 3 seconds (p95)
- ✅ APL rendering within 2 seconds (p95)
- ✅ API calls timeout after 5 seconds
- ✅ Lambda cold start under 5 seconds

#### NFR-3.1.2: Availability
**Priority:** HIGH
**Measurement:** Uptime percentage

**Acceptance Criteria:**
- ✅ 99% uptime SLA
- ✅ Graceful degradation if Nutrislice unavailable
- ✅ Fallback responses for API failures
- ✅ CloudWatch monitoring enabled

#### NFR-3.1.3: Scalability
**Priority:** MEDIUM
**Measurement:** Concurrent requests

**Acceptance Criteria:**
- ✅ Support 100 concurrent requests
- ✅ Lambda auto-scaling enabled
- ✅ No hardcoded capacity limits
- ✅ Caching reduces API load

### 3.2 Security

#### NFR-3.2.1: Secrets Management
**Priority:** HIGH
**Validation:** Security audit

**Acceptance Criteria:**
- ✅ No hardcoded API keys in code
- ✅ Environment variables for all secrets
- ✅ AWS Secrets Manager integration (optional)
- ✅ API keys not logged or exposed

**Environment Variables Required:**
```bash
OPENWEATHER_API_KEY=<key>
SCHOOL_HOLIDAYS=["2025-11-27","2025-12-25",...]
NUTRISLICE_SCHOOL_SLUG=westmore-elementary-school-2
NUTRISLICE_DISTRICT_SLUG=d45
LOG_LEVEL=info
```

#### NFR-3.2.2: Data Privacy
**Priority:** HIGH
**Validation:** Privacy compliance checklist

**Acceptance Criteria:**
- ✅ No personally identifiable information (PII) stored
- ✅ No user data persistence
- ✅ CloudWatch logs sanitized
- ✅ Alexa session data not retained

#### NFR-3.2.3: HTTPS Only
**Priority:** HIGH
**Validation:** All API calls use TLS

**Acceptance Criteria:**
- ✅ All external API calls use HTTPS
- ✅ No HTTP fallback
- ✅ Certificate validation enabled
- ✅ TLS 1.2 or higher

### 3.3 Reliability

#### NFR-3.3.1: Error Recovery
**Priority:** HIGH
**Validation:** Chaos engineering tests

**Acceptance Criteria:**
- ✅ Retry failed API calls (max 3 attempts)
- ✅ Exponential backoff strategy
- ✅ Circuit breaker for downstream failures
- ✅ Fallback to cached data when possible

**Retry Logic:**
```javascript
const retryConfig = {
  maxAttempts: 3,
  backoffMultiplier: 2,
  initialDelay: 1000, // 1 second
  maxDelay: 10000     // 10 seconds
};
```

#### NFR-3.3.2: Monitoring
**Priority:** HIGH
**Validation:** Dashboard with key metrics

**Acceptance Criteria:**
- ✅ CloudWatch Logs enabled
- ✅ Custom metrics for API success/failure rates
- ✅ Alerts for error rate > 5%
- ✅ Lambda duration tracking

**Key Metrics:**
- `NutrisliceAPISuccess`
- `NutrisliceAPIFailure`
- `WeatherAPISuccess`
- `ResponseTime`
- `CacheHitRate`

### 3.4 Maintainability

#### NFR-3.4.1: Code Modularity
**Priority:** MEDIUM
**Validation:** Code review checklist

**Acceptance Criteria:**
- ✅ Files under 500 lines
- ✅ Single Responsibility Principle
- ✅ Separation of concerns (handlers, services, utils)
- ✅ No duplicate code

**Module Structure:**
```
src/
├── handlers/          # Alexa request handlers
├── intents/           # Intent-specific logic
├── services/          # External API integrations
│   ├── nutrislice.js
│   └── weather.js
├── utils/             # Helper functions
│   ├── dateUtils.js
│   ├── cache.js
│   └── schoolCalendar.js
└── constants/         # Configuration constants
```

#### NFR-3.4.2: Testing
**Priority:** HIGH
**Validation:** Coverage reports

**Acceptance Criteria:**
- ✅ Unit test coverage > 80%
- ✅ Integration tests for all intents
- ✅ Mock external API calls
- ✅ Jest testing framework

**Test Structure:**
```
tests/
├── unit/
│   ├── handlers/
│   ├── services/
│   └── utils/
└── integration/
    └── intents/
```

#### NFR-3.4.3: Documentation
**Priority:** MEDIUM
**Validation:** Documentation completeness

**Acceptance Criteria:**
- ✅ README with setup instructions
- ✅ API documentation (JSDoc)
- ✅ Deployment guide
- ✅ Architecture diagrams

---

## 4. System Architecture

### 4.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    ALEXA ECOSYSTEM                      │
│  ┌──────────────┐        ┌──────────────┐             │
│  │  Echo Device │───────▶│ Alexa Service│             │
│  │  (User)      │◀───────│  (Voice AI)  │             │
│  └──────────────┘        └──────┬───────┘             │
│                                  │                      │
└──────────────────────────────────┼──────────────────────┘
                                   │ HTTPS
                                   ▼
┌─────────────────────────────────────────────────────────┐
│                      AWS CLOUD                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         AWS Lambda (Node.js 18)                │    │
│  │  ┌──────────────────────────────────────┐     │    │
│  │  │  Alexa Skill Handler (index.js)      │     │    │
│  │  │  ┌────────────────────────────────┐  │     │    │
│  │  │  │ Intent Handlers                │  │     │    │
│  │  │  │ - GetTodayMenuIntent          │  │     │    │
│  │  │  │ - GetTomorrowMenuIntent       │  │     │    │
│  │  │  │ - LaunchRequest               │  │     │    │
│  │  │  └────────────────────────────────┘  │     │    │
│  │  │  ┌────────────────────────────────┐  │     │    │
│  │  │  │ Services                       │  │     │    │
│  │  │  │ - NutrisliceService           │  │     │    │
│  │  │  │ - WeatherService              │  │     │    │
│  │  │  │ - CacheService                │  │     │    │
│  │  │  └────────────────────────────────┘  │     │    │
│  │  └──────────────────────────────────────┘     │    │
│  └────────────────────────────────────────────────┘    │
│         │                              │                │
│         ▼                              ▼                │
│  ┌─────────────┐              ┌─────────────┐          │
│  │ CloudWatch  │              │ Environment │          │
│  │    Logs     │              │  Variables  │          │
│  └─────────────┘              └─────────────┘          │
└─────────────────────────────────────────────────────────┘
         │                              │
         │ HTTPS                        │ HTTPS
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  Nutrislice API  │          │ OpenWeather API  │
│  (Public)        │          │  (Free Tier)     │
└──────────────────┘          └──────────────────┘
```

### 4.2 Data Flow Sequence

```
User: "Alexa, ask Lunch Dad what's for lunch today"
  │
  ├─▶ Alexa Service (Voice Recognition)
  │     │
  │     ├─▶ Lambda: GetTodayMenuIntent
  │           │
  │           ├─▶ Check Cache (in-memory)
  │           │     └─▶ Cache HIT? Return cached menu
  │           │
  │           ├─▶ Cache MISS? Call NutrisliceService
  │           │     │
  │           │     ├─▶ GET https://d45.nutrislice.com/.../2025/10/22/
  │           │     │
  │           │     ├─▶ Parse JSON response
  │           │     │
  │           │     ├─▶ Extract main items
  │           │     │
  │           │     └─▶ Store in cache (24hr TTL)
  │           │
  │           ├─▶ Format speech response
  │           │
  │           ├─▶ (Optional) Fetch weather for APL
  │           │     │
  │           │     └─▶ GET OpenWeather API
  │           │
  │           ├─▶ Render APL document (if screen device)
  │           │
  │           └─▶ Return response to Alexa
  │
  └─▶ Alexa Service speaks: "Today's lunch is..."
        │
        └─▶ Echo Device outputs voice + visual
```

### 4.3 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | 18.x | Lambda execution environment |
| Framework | ASK SDK for Node.js | 2.13.0+ | Alexa skill development |
| Testing | Jest | 29.7.0+ | Unit and integration testing |
| IaC | AWS SAM | Latest | Infrastructure deployment |
| CI/CD | GitHub Actions | Latest | Automated deployment |
| API Client | node-fetch | 2.x | HTTP requests (Nutrislice, Weather) |
| Date Library | date-fns | 2.x | Date manipulation |
| Logging | Winston | 3.x | Structured logging |

---

## 5. Edge Cases and Error Scenarios

### 5.1 Edge Case Matrix

| Scenario | Expected Behavior | Response |
|----------|------------------|----------|
| Query on Saturday | Return Monday's menu | "It's the weekend! Here's Monday's menu: ..." |
| Query on Sunday | Return Monday's menu | "It's the weekend! Here's Monday's menu: ..." |
| Friday tomorrow query | Return Monday menu | "Tomorrow's the weekend, so here's Monday's lunch: ..." |
| Holiday query | Return next school day menu | "School's closed for [HOLIDAY]. The next menu is on [DATE]: ..." |
| No menu available | Inform user | "The menu for [DATE] isn't available yet. Check back later!" |
| Nutrislice API down | Use cached data or error | "I'm having trouble reaching the kitchen. Try again in a moment." |
| API timeout (>5s) | Return error message | "The lunch menu is taking too long to load. Please try again." |
| Empty menu response | Return no menu message | "There's no lunch menu posted for [DATE] yet." |
| Weather API failure | Render APL without weather | (Widget displays without weather overlay) |
| Invalid date in query | Clarify with user | "I didn't catch that date. Try asking for today or tomorrow." |
| Multiple consecutive errors | Log error, return generic | "Something's not right. Please try again later." |
| Lambda cold start | Acceptable delay <5s | (User experiences slight delay on first invocation) |
| Cache corruption | Invalidate, fetch fresh | (Transparent to user, logged for monitoring) |

### 5.2 Nutrislice API Error Handling

```javascript
// HTTP Status Code Handling
switch (response.status) {
  case 200:
    // Success - parse menu
    break;
  case 404:
    // Menu not found for date
    return "The menu for [DATE] isn't available yet.";
  case 429:
    // Rate limit exceeded - use cache
    return cachedMenu || "I'm getting too many requests. Try again in a minute.";
  case 500:
  case 502:
  case 503:
    // Server error - use cache or fail gracefully
    return cachedMenu || "The lunch menu service is down. Try again later.";
  default:
    // Unexpected error
    return "I'm having trouble getting the menu right now.";
}
```

### 5.3 School Calendar Edge Cases

| Scenario | Logic |
|----------|-------|
| Thanksgiving week | Skip Thu-Fri, return following Monday |
| Winter break (2 weeks) | Skip all days, return first day back |
| Spring break (1 week) | Skip week, return following Monday |
| Teacher in-service day | Skip day if no lunch served |
| Early dismissal | Serve menu normally (lunch still provided) |
| Snow day (unexpected) | Return menu for date (can't predict closures) |

---

## 6. External Dependencies

### 6.1 Third-Party APIs

#### Nutrislice API
- **URL:** `https://d45.nutrislice.com`
- **Type:** Public read-only REST API
- **Authentication:** None required
- **Rate Limit:** Recommended 1 call per 10 minutes per endpoint
- **Documentation:** Reverse-engineered (no official docs)
- **SLA:** None (third-party risk)
- **Fallback:** Cached data or error message

#### OpenWeatherMap API
- **URL:** `https://api.openweathermap.org`
- **Type:** Public REST API (free tier)
- **Authentication:** API key (query parameter)
- **Rate Limit:** 1,000 calls/day (free tier)
- **Documentation:** https://openweathermap.org/api
- **SLA:** None (best effort)
- **Fallback:** Omit weather from APL display

### 6.2 AWS Services

| Service | Purpose | Configuration |
|---------|---------|--------------|
| Lambda | Skill backend | Node.js 18, 256MB RAM, 10s timeout |
| CloudWatch Logs | Logging | 7-day retention |
| CloudWatch Metrics | Monitoring | Custom metrics enabled |
| IAM | Permissions | Least privilege execution role |
| API Gateway | (Implicit - Alexa) | Managed by Alexa service |

### 6.3 Development Dependencies

```json
{
  "dependencies": {
    "ask-sdk-core": "^2.13.0",
    "ask-sdk-model": "^1.38.0",
    "node-fetch": "^2.7.0",
    "date-fns": "^2.30.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "eslint": "^8.57.0",
    "@types/jest": "^29.5.0",
    "nock": "^13.5.0"
  }
}
```

---

## 7. Environment Configuration

### 7.1 Environment Variables Schema

```javascript
{
  // Required
  "NUTRISLICE_DISTRICT_SLUG": {
    "type": "string",
    "required": true,
    "default": "d45",
    "description": "Nutrislice district identifier"
  },
  "NUTRISLICE_SCHOOL_SLUG": {
    "type": "string",
    "required": true,
    "default": "westmore-elementary-school-2",
    "description": "Nutrislice school identifier"
  },
  "OPENWEATHER_API_KEY": {
    "type": "string",
    "required": true,
    "description": "OpenWeatherMap API key",
    "secret": true
  },

  // Optional
  "SCHOOL_HOLIDAYS": {
    "type": "string",
    "required": false,
    "default": "[]",
    "description": "JSON array of ISO date strings for school holidays",
    "example": "[\"2025-11-27\",\"2025-12-25\"]"
  },
  "WESTMORE_LATITUDE": {
    "type": "number",
    "required": false,
    "default": 47.5678,
    "description": "School latitude for weather API"
  },
  "WESTMORE_LONGITUDE": {
    "type": "number",
    "required": false,
    "default": -122.1234,
    "description": "School longitude for weather API"
  },
  "CACHE_TTL_MENU": {
    "type": "number",
    "required": false,
    "default": 86400,
    "description": "Menu cache TTL in seconds (24 hours)"
  },
  "CACHE_TTL_WEATHER": {
    "type": "number",
    "required": false,
    "default": 600,
    "description": "Weather cache TTL in seconds (10 minutes)"
  },
  "LOG_LEVEL": {
    "type": "string",
    "required": false,
    "default": "info",
    "enum": ["error", "warn", "info", "debug"],
    "description": "Logging verbosity level"
  },
  "API_TIMEOUT": {
    "type": "number",
    "required": false,
    "default": 5000,
    "description": "API request timeout in milliseconds"
  },
  "ENABLE_WEATHER": {
    "type": "boolean",
    "required": false,
    "default": true,
    "description": "Enable weather overlay in APL"
  }
}
```

### 7.2 AWS SAM Configuration

```yaml
# template.yaml additions
Environment:
  Variables:
    NUTRISLICE_DISTRICT_SLUG: !Ref NutrisliceDistrictSlug
    NUTRISLICE_SCHOOL_SLUG: !Ref NutrisliceSchoolSlug
    OPENWEATHER_API_KEY: !Ref OpenWeatherApiKey
    SCHOOL_HOLIDAYS: !Ref SchoolHolidays
    LOG_LEVEL: !Ref LogLevel
    WESTMORE_LATITUDE: "47.5678"
    WESTMORE_LONGITUDE: "-122.1234"
```

---

## 8. Success Metrics

### 8.1 Key Performance Indicators (KPIs)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Voice response time (p95) | < 3 seconds | CloudWatch metrics |
| API success rate | > 95% | Custom metric: NutrisliceAPISuccess / Total |
| Cache hit rate | > 70% | Custom metric: CacheHits / Total requests |
| Error rate | < 5% | CloudWatch error logs |
| User retention (weekly) | > 60% | Alexa Developer Console analytics |
| Average session duration | 15-30 seconds | Alexa analytics |

### 8.2 Quality Metrics

| Metric | Target | Validation |
|--------|--------|------------|
| Unit test coverage | > 80% | Jest coverage report |
| Integration test pass rate | 100% | CI/CD pipeline |
| Linting errors | 0 | ESLint checks |
| Code duplication | < 5% | SonarQube analysis |
| File size limit | < 500 lines | Pre-commit hook |

### 8.3 User Experience Metrics

| Metric | Target | Source |
|--------|--------|--------|
| Voice recognition accuracy | > 95% | Alexa service metrics |
| Intent fulfillment rate | > 90% | Custom tracking |
| User satisfaction (star rating) | > 4.0 / 5.0 | Alexa skill reviews |
| APL render time | < 2 seconds | CloudWatch custom metric |

---

## 9. Validation and Testing Strategy

### 9.1 Unit Testing

**Scope:** Individual functions and modules in isolation

**Test Cases:**
- ✅ `dateUtils.getNextSchoolDay()` - weekend handling
- ✅ `dateUtils.isHoliday()` - holiday detection
- ✅ `nutrisliceService.extractMainItems()` - data parsing
- ✅ `cacheService.get()` - cache hit/miss
- ✅ `weatherService.fetchWeather()` - API mocking
- ✅ All intent handlers - response validation

**Tools:** Jest, Nock (HTTP mocking)

### 9.2 Integration Testing

**Scope:** End-to-end intent flows

**Test Cases:**
- ✅ GetTodayMenuIntent → Nutrislice API → Response
- ✅ GetTomorrowMenuIntent → Weekend handling → Monday menu
- ✅ LaunchRequest → Welcome message
- ✅ Error scenarios → Graceful degradation
- ✅ APL rendering → Visual validation

**Tools:** Jest, Ask SDK Test

### 9.3 User Acceptance Testing (UAT)

**Scenarios:**
1. Morning routine: "Alexa, ask Lunch Dad what's for lunch today"
2. Evening planning: "Alexa, ask Lunch Dad what's for lunch tomorrow"
3. Weekend query: "Alexa, ask Lunch Dad what's for lunch today" (Saturday)
4. Error recovery: Test with Nutrislice API offline
5. Multi-turn: "Alexa, open Lunch Dad" → "What's for lunch tomorrow?"

**Pass Criteria:**
- Natural, dad-style voice responses
- Correct menu items retrieved
- Appropriate error messages
- APL renders correctly on Echo Show
- Response time feels instant (<3s)

### 9.4 Load Testing

**Scenarios:**
- 100 concurrent requests (simulated)
- Sustained 10 requests/second for 5 minutes
- Cold start performance

**Acceptance:**
- No timeouts
- Error rate < 1%
- p95 latency < 3 seconds

---

## 10. Deployment and Release Strategy

### 10.1 Environments

| Environment | Purpose | Branch | Auto-Deploy |
|-------------|---------|--------|-------------|
| Development | Testing new features | `develop` | Yes |
| Production | Live users | `main` | Yes (with approval) |

### 10.2 Rollback Plan

**Trigger Conditions:**
- Error rate > 10% for 5 minutes
- P95 latency > 10 seconds
- Critical bug reported

**Rollback Process:**
1. Revert last commit on `main`
2. Trigger GitHub Actions deployment
3. Verify metrics return to baseline
4. Notify team of rollback

### 10.3 Feature Flags

**Optional Enhancement:** Use environment variables for feature toggles

```javascript
const FEATURES = {
  ENABLE_WEATHER: process.env.ENABLE_WEATHER === 'true',
  ENABLE_APL: process.env.ENABLE_APL === 'true',
  ENABLE_CACHING: process.env.ENABLE_CACHING === 'true'
};
```

---

## 11. Future Enhancements (Out of Scope for v1.0)

### 11.1 Potential Features

- ✨ Multi-school support (district-wide)
- ✨ Breakfast menu queries
- ✨ Nutritional information (calories, allergens)
- ✨ User preferences and favorites
- ✨ Push notifications for menu changes
- ✨ Integration with school calendar API (automated holidays)
- ✨ Recipe details and cooking methods
- ✨ Dietary restriction filtering (vegetarian, gluten-free)
- ✨ Spanish language support
- ✨ Parent/student profile management

### 11.2 Technical Debt to Address

- Automated Nutrislice API endpoint discovery
- DynamoDB for persistent caching (cross-session)
- GraphQL API for flexible queries
- Microservices architecture (separate menu/weather services)
- Advanced APL animations and interactivity

---

## 12. Constraints and Assumptions

### 12.1 Technical Constraints

1. **Lambda Cold Start:** First invocation may take 3-5 seconds
2. **Nutrislice API:** No official documentation; reverse-engineered
3. **No Authentication:** Nutrislice is public; could change without notice
4. **Cache Limitations:** In-memory cache clears on Lambda shutdown
5. **Single School:** Hardcoded to Westmore Elementary School

### 12.2 Business Constraints

1. **Budget:** Free tier AWS services only
2. **Timeline:** MVP in 2 weeks
3. **Team Size:** Single developer (assisted by Claude Code)
4. **Support:** No 24/7 on-call support

### 12.3 Assumptions

1. Nutrislice API remains publicly accessible
2. Menu data structure stays consistent
3. School calendar follows standard academic year
4. Users have Echo devices (or Alexa app)
5. Westmore Elementary continues using Nutrislice
6. Weather API remains free for usage level
7. Users query in English only
8. School serves lunch Monday-Friday (excluding holidays)

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **APL** | Alexa Presentation Language - framework for visual displays |
| **ASK SDK** | Alexa Skills Kit Software Development Kit |
| **Cold Start** | Initial Lambda invocation with container initialization |
| **Echo Show** | Amazon smart display with screen |
| **Intent** | User's goal mapped to skill functionality (e.g., GetLunchIntent) |
| **Lambda** | AWS serverless compute service |
| **Nutrislice** | Third-party school meal menu platform |
| **p95 Latency** | 95th percentile response time |
| **SAM** | AWS Serverless Application Model (IaC framework) |
| **Slot** | Variable in Alexa utterance (e.g., date, meal type) |
| **TTS** | Text-to-Speech (Alexa's voice output) |
| **Utterance** | Spoken phrase that triggers an intent |

---

## 14. Approval and Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | (TBD) | _________ | ______ |
| Technical Lead | Claude Code SPARC | ✓ | 2025-10-22 |
| QA Lead | (TBD) | _________ | ______ |
| DevOps | (TBD) | _________ | ______ |

---

## 15. Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-22 | Claude Code SPARC | Initial specification document |

---

## 16. References and Resources

### 16.1 Documentation

- [Alexa Skills Kit Documentation](https://developer.amazon.com/en-US/docs/alexa/ask-overviews/what-is-the-alexa-skills-kit.html)
- [ASK SDK for Node.js](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs)
- [APL Documentation](https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/understand-apl.html)
- [AWS Lambda Node.js Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [OpenWeatherMap API](https://openweathermap.org/api)

### 16.2 Tools and Libraries

- [Jest Testing Framework](https://jestjs.io/)
- [ESLint](https://eslint.org/)
- [date-fns](https://date-fns.org/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Nock HTTP Mocking](https://github.com/nock/nock)

### 16.3 Community Resources

- [Nutrislice Web Scraper Example](https://github.com/followthefourleafedclover/Nutrislice-Web-Scraper)
- [Magic Mirror Nutrislice Module](https://github.com/vees/MMM-Nutrislice)
- [Home Assistant Nutrislice Integration](https://community.home-assistant.io/t/rest-nutrislice-json-values/609250)

---

**END OF SPECIFICATION DOCUMENT**

*This specification is a living document and may be updated as requirements evolve.*
