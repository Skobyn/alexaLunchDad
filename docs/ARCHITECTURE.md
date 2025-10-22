# Lunch Dad Alexa Skill - System Architecture

**Version:** 1.0.0
**Date:** 2025-10-22
**SPARC Phase:** Architecture
**Status:** Ready for TDD Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architectural Decisions](#architectural-decisions)
3. [System Overview](#system-overview)
4. [Module Architecture](#module-architecture)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Component Design](#component-design)
7. [APL Visual Architecture](#apl-visual-architecture)
8. [AWS Infrastructure](#aws-infrastructure)
9. [Configuration Management](#configuration-management)
10. [Error Handling Architecture](#error-handling-architecture)
11. [Testing Strategy](#testing-strategy)
12. [Deployment Architecture](#deployment-architecture)

---

## Executive Summary

The Lunch Dad Alexa skill is a serverless voice application that provides school lunch menu information with visual calendar displays. The architecture follows clean architecture principles with clear separation of concerns, environment-based configuration, and comprehensive error handling.

**Key Architectural Decisions:**
- **Runtime:** Node.js 18.x (native ASK SDK support, cheerio for HTML scraping)
- **Caching:** In-memory Lambda environment variables (simple, cost-free)
- **APL Version:** 2024.2 (latest stable with responsive layouts)
- **Error Philosophy:** Fail gracefully with user-friendly fallbacks
- **Module Size:** All files < 500 lines (maintainability)
- **Testing:** TDD London School with 90%+ coverage target

---

## Architectural Decisions

### ADR-001: Node.js 18.x Runtime

**Status:** Accepted
**Date:** 2025-10-22

**Context:**
We need to choose a runtime for the AWS Lambda function that hosts our Alexa skill.

**Decision:**
Use Node.js 18.x runtime.

**Rationale:**
- Native support for ASK SDK for Node.js (official Alexa framework)
- Excellent ecosystem for HTML scraping (cheerio, jsdom)
- Async/await support for clean API integration code
- Lambda cold start performance < 1 second
- Native JSON parsing performance
- Long-term AWS support (active until April 2025+)

**Consequences:**
- Must bundle node_modules for deployment
- Need to manage async error handling carefully
- Memory footprint: ~50MB with dependencies

**Alternatives Considered:**
- Python 3.11: Less mature Alexa SDK, slower JSON parsing
- Java 11: Longer cold starts (3-5s), larger memory footprint

---

### ADR-002: In-Memory Caching Strategy

**Status:** Accepted
**Date:** 2025-10-22

**Context:**
Menu and weather data should be cached to reduce API calls and improve response times.

**Decision:**
Use Lambda environment variables (in-memory) for caching, not DynamoDB.

**Rationale:**
- **Simplicity:** No additional AWS services required
- **Cost:** Zero cost (vs. DynamoDB read/write units)
- **Performance:** Sub-millisecond cache lookups
- **Scope:** Single-user skill with low concurrency needs
- **Lambda Lifetime:** Container reuse provides 15-60 min cache persistence

**Cache Implementation:**
```javascript
// Global scope (survives warm starts)
const menuCache = new Map();
const weatherCache = new Map();

// Cache keys: "menu:2025-10-22", "weather:2025-10-22"
// TTL: Checked on retrieval, stale entries discarded
```

**Consequences:**
- Cache clears on Lambda cold start (acceptable trade-off)
- Cache not shared across concurrent invocations (minimal impact)
- Cache size limited by Lambda memory (256MB sufficient)

**Alternatives Considered:**
- DynamoDB: Over-engineered for single-user skill, adds cost
- ElastiCache: Unnecessary complexity and cost
- S3: High latency for frequent reads

---

### ADR-003: APL Version 2024.2

**Status:** Accepted
**Date:** 2025-10-22

**Context:**
Choose APL version for visual displays on Echo Show devices.

**Decision:**
Use APL 2024.2 specification.

**Rationale:**
- Latest stable version (released Q2 2024)
- Full responsive layout support for all screen sizes
- Enhanced Container components with flexbox-like controls
- Better text overflow handling (critical for menu item names)
- Native support for data binding with arrays
- Import statement support for reusable components

**Device Support:**
- Echo Show 5 (960x480): Small round viewport
- Echo Show 8 (1280x800): Medium landscape viewport
- Echo Show 10 (1280x800): Medium landscape viewport
- Echo Show 15 (1920x1080): Large landscape viewport

**Consequences:**
- Must handle viewport sizing responsively
- Requires APL data binding knowledge
- Not compatible with devices running older APL versions (fallback to voice-only)

**Alternatives Considered:**
- APL 1.9: Limited responsive features
- APL 1.8: Missing key layout controls

---

### ADR-004: HTML Scraping for Nutrislice

**Status:** Accepted (No Alternative)
**Date:** 2025-10-22

**Context:**
Nutrislice does not provide a documented public API.

**Decision:**
Scrape HTML pages using cheerio library.

**Rationale:**
- No JSON API available (research phase confirmed)
- HTML structure is consistent across dates
- Cheerio is lightweight (35KB gzipped) and fast
- Proven approach used by similar integrations (Magic Mirror, Home Assistant)

**Scraping Strategy:**
1. Fetch HTML page: `https://d45.nutrislice.com/menu/westmore-elementary-school-2/lunch/YYYY-MM-DD`
2. Parse with cheerio
3. Extract menu items from DOM selectors
4. Cache results for 24 hours

**Consequences:**
- Brittle to HTML structure changes (requires monitoring)
- Must handle gzip-encoded responses
- Needs user-agent header to avoid bot detection
- No API SLA or uptime guarantee

**Monitoring Plan:**
- Log HTML structure changes
- Alert on parse failures
- Fallback to cached data on parse errors

---

### ADR-005: Weather.gov Free API

**Status:** Accepted
**Date:** 2025-10-22

**Context:**
Need weather data for APL overlay without API costs.

**Decision:**
Use Weather.gov API (National Weather Service) - completely free, no API key.

**Rationale:**
- Zero cost (government-provided)
- No API key required (simpler deployment)
- No rate limits for reasonable use
- Official US weather data source
- Covers entire United States
- 2-step process: lat/lon → gridpoints → hourly forecast

**API Flow:**
```
1. GET https://api.weather.gov/points/39.0997,-77.0941
   → Returns grid coordinates (LWX 93/80)

2. GET https://api.weather.gov/gridpoints/LWX/93,80/forecast/hourly
   → Returns hourly forecast with morning weather
```

**Consequences:**
- Two HTTP requests per weather fetch (mitigated by 30-min cache)
- Only works for US locations (acceptable for Westmore Elementary)
- Must handle grid coordinate lookup

**Alternatives Considered:**
- OpenWeatherMap: Requires API key, rate limits (60 calls/min)
- WeatherAPI.com: Requires registration and API key

---

### ADR-006: Error Handling Philosophy

**Status:** Accepted
**Date:** 2025-10-22

**Context:**
External APIs (Nutrislice, Weather.gov) may fail or return incomplete data.

**Decision:**
Implement graceful degradation with user-friendly fallback responses.

**Error Tiers:**

**Tier 1 - Partial Data:**
- Weather API fails → Show menu without weather overlay
- 1 of 5 menu days fails → Show 4 days successfully retrieved

**Tier 2 - Stale Cache:**
- API fails but cached data available → Use cache, inform user it's from earlier

**Tier 3 - No Data:**
- Menu unavailable for future date → "Menu not posted yet"
- Weekend query → "Cafeteria closed on weekends, here's Monday"

**Tier 4 - Critical Failure:**
- All attempts exhausted → "Having trouble right now, try again later"

**Implementation:**
- Retry logic: 3 attempts with exponential backoff (100ms, 200ms, 400ms)
- Circuit breaker: After 5 consecutive failures, skip API for 5 minutes
- Logging: CloudWatch logs for all errors with context
- User messaging: Never expose technical errors to voice responses

**Rationale:**
- Users expect reliability from voice assistants
- Partial information better than complete failure
- Technical errors confuse non-technical users

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ALEXA ECOSYSTEM                             │
│                                                                     │
│  ┌──────────────┐                 ┌──────────────────┐            │
│  │              │   Voice Input   │                  │            │
│  │ Echo Device  │───────────────→ │  Alexa Service   │            │
│  │ (User)       │                 │  (Voice AI)      │            │
│  │              │←─────────────── │                  │            │
│  └──────────────┘   Audio/Visual  └────────┬─────────┘            │
│                                             │                       │
└─────────────────────────────────────────────┼───────────────────────┘
                                              │
                                              │ HTTPS POST
                                              │ (Alexa Request JSON)
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           AWS CLOUD                                 │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              AWS Lambda (Node.js 18.x)                        │ │
│  │              Memory: 256MB | Timeout: 10s                     │ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  HANDLER LAYER (index.js)                               │ │ │
│  │  │  - Request Router                                       │ │ │
│  │  │  - Intent Dispatcher                                    │ │ │
│  │  │  - Response Builder                                     │ │ │
│  │  └────────────────────┬────────────────────────────────────┘ │ │
│  │                       │                                       │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  BUSINESS LOGIC LAYER                                   │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐   │ │ │
│  │  │  │ Intent Handlers                                  │   │ │ │
│  │  │  │ - GetTodayMenuHandler                           │   │ │ │
│  │  │  │ - GetTomorrowMenuHandler                        │   │ │ │
│  │  │  │ - LaunchRequestHandler                          │   │ │ │
│  │  │  │ - HelpIntentHandler                             │   │ │ │
│  │  │  │ - ErrorHandler                                  │   │ │ │
│  │  │  └─────────────────────────────────────────────────┘   │ │ │
│  │  └────────────────────┬────────────────────────────────────┘ │ │
│  │                       │                                       │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  SERVICE LAYER                                          │ │ │
│  │  │  ┌──────────────────┐  ┌──────────────────┐           │ │ │
│  │  │  │ NutrisliceService│  │  WeatherService  │           │ │ │
│  │  │  │ - fetchMenu()    │  │  - getMorning()  │           │ │ │
│  │  │  │ - parseHTML()    │  │  - getGrid()     │           │ │ │
│  │  │  │ - extractItems() │  │  - parseData()   │           │ │ │
│  │  │  └──────────────────┘  └──────────────────┘           │ │ │
│  │  │  ┌──────────────────┐  ┌──────────────────┐           │ │ │
│  │  │  │   CacheService   │  │ ResponseBuilder  │           │ │ │
│  │  │  │ - get()          │  │ - buildSpeech()  │           │ │ │
│  │  │  │ - set()          │  │ - buildAPL()     │           │ │ │
│  │  │  │ - invalidate()   │  │ - buildCard()    │           │ │ │
│  │  │  └──────────────────┘  └──────────────────┘           │ │ │
│  │  └────────────────────┬────────────────────────────────────┘ │ │
│  │                       │                                       │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  UTILITY LAYER                                          │ │ │
│  │  │  - dateUtils.js     (school day calculation)           │ │ │
│  │  │  - menuParser.js    (main item extraction)             │ │ │
│  │  │  - logger.js        (Winston logging)                  │ │ │
│  │  │  - constants.js     (configuration)                    │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  IN-MEMORY CACHE                                        │ │ │
│  │  │  menuCache = Map<dateString, menuObject>               │ │ │
│  │  │  weatherCache = Map<dateString, weatherObject>         │ │ │
│  │  │  TTL: 24hr (menu), 30min (weather)                     │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌────────────────┐      ┌──────────────────┐                     │
│  │  CloudWatch    │      │   Environment    │                     │
│  │     Logs       │      │    Variables     │                     │
│  │  (7-day ret.)  │      │  (Secrets-free)  │                     │
│  └────────────────┘      └──────────────────┘                     │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    │ HTTPS                         │ HTTPS
                    ▼                               ▼
        ┌────────────────────┐          ┌────────────────────┐
        │  Nutrislice Web    │          │  Weather.gov API   │
        │  (HTML Scraping)   │          │  (JSON REST API)   │
        │                    │          │                    │
        │  d45.nutrislice    │          │  api.weather.gov   │
        │  .com/menu/...     │          │  /points/...       │
        └────────────────────┘          └────────────────────┘
```

---

## Module Architecture

### File Structure

```
/mnt/c/Users/sbens/Cursor/alexaLunchDad/
├── src/
│   ├── index.js                      # Lambda entry point (50 lines)
│   │
│   ├── handlers/                     # Alexa request handlers
│   │   ├── LaunchRequestHandler.js   # Welcome message (80 lines)
│   │   ├── GetTodayMenuHandler.js    # Today's menu intent (120 lines)
│   │   ├── GetTomorrowMenuHandler.js # Tomorrow's menu intent (120 lines)
│   │   ├── HelpIntentHandler.js      # Help message (60 lines)
│   │   ├── CancelStopHandler.js      # Cancel/Stop intents (40 lines)
│   │   ├── SessionEndedHandler.js    # Session cleanup (30 lines)
│   │   └── ErrorHandler.js           # Global error handler (100 lines)
│   │
│   ├── services/                     # External integrations
│   │   ├── nutrisliceService.js      # Menu scraping (350 lines)
│   │   │   - fetchMenuHTML()
│   │   │   - parseMenuHTML()
│   │   │   - extractMainItems()
│   │   │   - buildMenuObject()
│   │   │
│   │   ├── weatherService.js         # Weather API (280 lines)
│   │   │   - getGridCoordinates()
│   │   │   - fetchHourlyForecast()
│   │   │   - extractMorningWeather()
│   │   │   - buildWeatherObject()
│   │   │
│   │   └── cacheService.js           # In-memory cache (150 lines)
│   │       - get()
│   │       - set()
│   │       - invalidate()
│   │       - cleanup() [TTL enforcement]
│   │
│   ├── utils/                        # Helper functions
│   │   ├── dateUtils.js              # Date calculations (250 lines)
│   │   │   - getNextSchoolDay()
│   │   │   - isWeekend()
│   │   │   - isHoliday()
│   │   │   - formatDate()
│   │   │   - getCurrentEasternTime()
│   │   │
│   │   ├── menuParser.js             # Item filtering (200 lines)
│   │   │   - extractMainItems()
│   │   │   - filterByCategory()
│   │   │   - filterByNutrition()
│   │   │   - removeDuplicates()
│   │   │   - sortByRelevance()
│   │   │
│   │   ├── responseBuilder.js        # Alexa responses (400 lines)
│   │   │   - buildSpeechResponse()
│   │   │   - buildAPLResponse()
│   │   │   - buildCardResponse()
│   │   │   - buildErrorResponse()
│   │   │   - joinWithAnd() [speech formatting]
│   │   │
│   │   ├── logger.js                 # Winston logger (80 lines)
│   │   │   - info()
│   │   │   - warn()
│   │   │   - error()
│   │   │   - debug()
│   │   │
│   │   └── constants.js              # Configuration (100 lines)
│   │       - NUTRISLICE_CONFIG
│   │       - WEATHER_CONFIG
│   │       - CACHE_CONFIG
│   │       - SCHOOL_HOLIDAYS
│   │
│   ├── apl/                          # APL documents
│   │   ├── templates/
│   │   │   ├── menuCalendar.json     # 5-day calendar layout
│   │   │   ├── singleDayView.json    # Today/tomorrow view
│   │   │   └── errorView.json        # Error display
│   │   │
│   │   ├── components/
│   │   │   ├── weatherWidget.json    # Weather overlay
│   │   │   ├── menuCard.json         # Menu item card
│   │   │   └── dayHeader.json        # Day header component
│   │   │
│   │   └── datasources/
│   │       └── menuDataSource.json   # Data binding schema
│   │
│   └── models/                       # Data models (TypeScript-style JSDoc)
│       ├── MenuItem.js               # Menu item schema
│       ├── WeatherData.js            # Weather data schema
│       └── AlexaResponse.js          # Response schema
│
├── tests/                            # Test suite
│   ├── unit/
│   │   ├── handlers/
│   │   ├── services/
│   │   └── utils/
│   └── integration/
│       ├── menuFlow.test.js
│       └── weatherFlow.test.js
│
├── docs/                             # Documentation
│   ├── SPECIFICATION.md
│   ├── RESEARCH_FINDINGS.md
│   ├── PSEUDOCODE.md
│   └── ARCHITECTURE.md (this file)
│
├── .github/
│   └── workflows/
│       └── deploy.yml                # CI/CD pipeline
│
├── template.yaml                     # SAM template
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

### Module Responsibilities

**Handler Layer:**
- Receive Alexa requests
- Extract intent and slots
- Dispatch to business logic
- Return formatted Alexa response
- **No business logic** in handlers (thin layer)

**Service Layer:**
- External API integration
- Data transformation
- Cache management
- Error handling with retry logic
- **No Alexa-specific code** (portable)

**Utility Layer:**
- Pure functions (no side effects)
- Reusable helpers
- Date/time calculations
- Data filtering and formatting
- **No external dependencies** where possible

---

## Data Flow Diagrams

### Request Flow: GetTodayMenuIntent

```
User: "Alexa, ask Lunch Dad what's for lunch today"
  │
  │ 1. Voice Recognition
  ▼
┌────────────────────────────────────────────────┐
│ Alexa Service                                  │
│ - Converts speech to JSON request             │
│ - Intent: GetTodayMenuIntent                   │
└────────────┬───────────────────────────────────┘
             │
             │ 2. HTTPS POST (Alexa Request JSON)
             ▼
┌────────────────────────────────────────────────┐
│ Lambda: index.js                               │
│ - Validate request signature                  │
│ - Route to GetTodayMenuHandler                │
└────────────┬───────────────────────────────────┘
             │
             │ 3. Handler Invocation
             ▼
┌────────────────────────────────────────────────┐
│ GetTodayMenuHandler.handle()                   │
│ - Get current date (Eastern Time)             │
│ - Call menuService.fetchForDate(today)        │
└────────────┬───────────────────────────────────┘
             │
             │ 4. Service Call
             ▼
┌────────────────────────────────────────────────┐
│ NutrisliceService.fetchMenuForDate()           │
│ ┌──────────────────────────────────────────┐  │
│ │ cacheKey = "menu:2025-10-22"             │  │
│ │ cached = cacheService.get(cacheKey)      │  │
│ │ if (cached && !isExpired(cached)) {      │  │
│ │   return cached  // Cache HIT            │  │
│ │ }                                         │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Cache MISS - Fetch from Nutrislice            │
│ ┌──────────────────────────────────────────┐  │
│ │ url = "https://d45.nutrislice.com/       │  │
│ │        menu/westmore-elementary/         │  │
│ │        lunch/2025-10-22"                 │  │
│ │                                           │  │
│ │ response = fetch(url, {                  │  │
│ │   headers: {                              │  │
│ │     'Accept-Encoding': 'gzip',           │  │
│ │     'User-Agent': 'LunchDad/1.0'        │  │
│ │   },                                      │  │
│ │   timeout: 5000                          │  │
│ │ })                                        │  │
│ └──────────────────────────────────────────┘  │
└────────────┬───────────────────────────────────┘
             │
             │ 5. HTML Response
             ▼
┌────────────────────────────────────────────────┐
│ NutrisliceService.parseMenuHTML(html)          │
│ ┌──────────────────────────────────────────┐  │
│ │ $ = cheerio.load(html)                   │  │
│ │ items = []                                │  │
│ │                                           │  │
│ │ $('.menu-item').each((i, elem) => {      │  │
│ │   name = $(elem).find('.item-name').text()│  │
│ │   category = $(elem).attr('data-category')│  │
│ │   items.push({name, category})           │  │
│ │ })                                        │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ mainItems = menuParser.extractMainItems(items)│
│                                                │
│ menuObject = {                                 │
│   date: "2025-10-22",                         │
│   items: [                                     │
│     {name: "Chicken Sandwich", category: ...},│
│     {name: "Cheese Pizza", category: ...}     │
│   ],                                           │
│   fetchedAt: timestamp                        │
│ }                                              │
│                                                │
│ cacheService.set(cacheKey, menuObject, 24hr)  │
└────────────┬───────────────────────────────────┘
             │
             │ 6. Return Menu Object
             ▼
┌────────────────────────────────────────────────┐
│ GetTodayMenuHandler (continued)                │
│ - weatherData = weatherService.getMorning()   │
│   (parallel fetch, no blocking)               │
│                                                │
│ - Check device capabilities                   │
│   supportsAPL = context.System.device         │
│                 .supportedInterfaces          │
│                 ['Alexa.Presentation.APL']    │
│                                                │
│ - response = responseBuilder.build({          │
│     menu: menuObject,                         │
│     weather: weatherData,                     │
│     type: "today",                            │
│     hasScreen: supportsAPL                    │
│   })                                           │
└────────────┬───────────────────────────────────┘
             │
             │ 7. Alexa Response JSON
             ▼
┌────────────────────────────────────────────────┐
│ ResponseBuilder.build()                        │
│                                                │
│ return {                                       │
│   version: "1.0",                             │
│   response: {                                  │
│     outputSpeech: {                           │
│       type: "SSML",                           │
│       ssml: "<speak>Today's lunch is          │
│             Chicken Sandwich and Cheese       │
│             Pizza.</speak>"                   │
│     },                                         │
│     card: {                                    │
│       type: "Simple",                         │
│       title: "Today's Lunch",                │
│       content: "Chicken Sandwich, Pizza"     │
│     },                                         │
│     directives: [                             │
│       {                                        │
│         type: "Alexa.Presentation.APL.        │
│               RenderDocument",                │
│         document: { ... APL JSON ... },       │
│         datasources: {                        │
│           menuData: menuObject,               │
│           weatherData: weatherData            │
│         }                                      │
│       }                                        │
│     ],                                         │
│     shouldEndSession: true                    │
│   }                                            │
│ }                                              │
└────────────┬───────────────────────────────────┘
             │
             │ 8. Return to Alexa Service
             ▼
┌────────────────────────────────────────────────┐
│ Alexa Service                                  │
│ - Synthesize speech from SSML                 │
│ - Render APL document on Echo Show            │
└────────────┬───────────────────────────────────┘
             │
             │ 9. Output
             ▼
┌────────────────────────────────────────────────┐
│ Echo Show Device                               │
│ - Plays voice: "Today's lunch is..."          │
│ - Displays APL: Menu calendar with weather    │
└────────────────────────────────────────────────┘

Total Time: 800ms (cache hit) | 2.5s (cache miss)
```

### Caching Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    IN-MEMORY CACHE                              │
│                                                                 │
│  menuCache = Map<string, CacheEntry>                           │
│  weatherCache = Map<string, CacheEntry>                        │
│                                                                 │
│  interface CacheEntry {                                         │
│    key: string          // "menu:2025-10-22"                  │
│    data: any            // Menu or weather object              │
│    timestamp: number    // Unix timestamp of cache write       │
│    ttl: number          // Time to live in milliseconds        │
│    expiresAt: number    // timestamp + ttl                     │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘

Cache Retrieval Flow:
┌────────────────────────────────┐
│ cacheService.get(key)          │
└────────────┬───────────────────┘
             │
             ▼
      ┌─────────────┐
      │ Key exists? │
      └──────┬──────┘
             │
       ┌─────┴─────┐
       │ No        │ Yes
       ▼           ▼
    ┌──────┐   ┌─────────────────┐
    │ null │   │ Check expiration│
    └──────┘   └────────┬────────┘
                        │
                  ┌─────┴─────┐
                  │ Expired?  │
                  └─────┬─────┘
                        │
                  ┌─────┴─────┐
                  │ Yes       │ No
                  ▼           ▼
           ┌────────────┐  ┌────────────┐
           │ Delete key │  │ Return data│
           │ Return null│  └────────────┘
           └────────────┘

Cache Write Flow:
┌─────────────────────────────────────┐
│ cacheService.set(key, data, ttl)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ entry = {                            │
│   key,                               │
│   data,                              │
│   timestamp: Date.now(),             │
│   ttl,                               │
│   expiresAt: Date.now() + ttl       │
│ }                                    │
│                                      │
│ cache.set(key, entry)                │
│                                      │
│ // Periodic cleanup                 │
│ if (cache.size > 100) {             │
│   cleanupExpiredEntries()           │
│ }                                    │
└──────────────────────────────────────┘

TTL Values:
- Menu data: 86400000 ms (24 hours)
- Weather data: 1800000 ms (30 minutes)
- Holiday list: 86400000 ms (24 hours)
```

### Error Handling Flow

```
API Call Attempt
  │
  ├─→ Try 1: Immediate request
  │     │
  │     ├─→ Success → Return data
  │     └─→ Failure → Log error
  │           │
  │           ├─→ Try 2: Wait 100ms, retry
  │           │     │
  │           │     ├─→ Success → Return data
  │           │     └─→ Failure → Log error
  │           │           │
  │           │           ├─→ Try 3: Wait 200ms, retry
  │           │           │     │
  │           │           │     ├─→ Success → Return data
  │           │           │     └─→ Failure → Log error
  │           │           │           │
  │           │           │           ▼
  │           │           │     All retries exhausted
  │           │           │           │
  │           │           │           ├─→ Check cache
  │           │           │           │     │
  │           │           │           │     ├─→ Stale cache exists
  │           │           │           │     │     └─→ Return with warning
  │           │           │           │     │
  │           │           │           │     └─→ No cache
  │           │           │           │           └─→ Return fallback
  │           │           │           │
  │           │           │           └─→ Log to CloudWatch
  │           │           │                 │
  │           │           │                 └─→ Increment error counter
  │           │           │                       │
  │           │           │                       └─→ If > 5 errors in 5 min
  │           │           │                             │
  │           │           │                             └─→ Circuit breaker OPEN
  │           │           │                                   (Skip API for 5 min)

Error Response Examples:

1. Menu API Failure + Stale Cache:
   Voice: "I'm showing yesterday's menu since today's isn't loading yet.
          Yesterday's lunch was Chicken Tenders and Pizza."
   APL: Display with "Updated: Yesterday" banner

2. Menu API Failure + No Cache:
   Voice: "I'm having trouble getting the lunch menu right now.
          Please try again in a few moments."
   APL: Error message with retry button

3. Weather API Failure:
   Voice: "Today's lunch is Chicken Sandwich and Pizza."
          (No weather mentioned)
   APL: Display menu without weather widget

4. Weekend Query:
   Voice: "It's the weekend! The cafeteria is closed.
          Would you like Monday's menu?"
   APL: Weekend message with Monday preview
```

---

## Component Design

### Core Components

#### 1. NutrisliceService

**Responsibilities:**
- Fetch menu HTML from Nutrislice
- Parse HTML with cheerio
- Extract menu items with categories
- Handle scraping failures gracefully

**Interface:**
```javascript
class NutrisliceService {
  /**
   * Fetch and parse menu for a specific date
   * @param {Date} date - Target date
   * @returns {Promise<MenuObject>}
   */
  async fetchMenuForDate(date) {
    // 1. Check cache
    // 2. Build URL
    // 3. Fetch HTML with retry logic
    // 4. Parse with cheerio
    // 5. Extract items
    // 6. Cache result
    // 7. Return menu object
  }

  /**
   * Parse HTML to extract menu items
   * @param {string} html - Raw HTML content
   * @returns {Array<MenuItem>}
   */
  parseMenuHTML(html) {
    // 1. Load HTML with cheerio
    // 2. Find menu item elements
    // 3. Extract name, category, description
    // 4. Build item objects
    // 5. Return array
  }

  /**
   * Build Nutrislice URL for date
   * @param {Date} date
   * @returns {string}
   */
  buildURL(date) {
    const dateStr = formatDate(date, 'YYYY-MM-DD');
    return `https://d45.nutrislice.com/menu/${SCHOOL_SLUG}/lunch/${dateStr}`;
  }
}
```

**Error Handling:**
- HTTP failures: Retry 3 times with exponential backoff
- Parse failures: Log HTML structure, return empty menu
- Timeout: 5 seconds, then fail to cache
- Network errors: Use stale cache if available

**DOM Selectors (based on Nutrislice HTML structure):**
```javascript
const SELECTORS = {
  menuContainer: '.menu-container',
  menuItems: '.menu-item',
  itemName: '.item-name',
  itemCategory: '[data-category]',
  itemDescription: '.item-description',
  categoryHeader: '.menu-category-header'
};
```

---

#### 2. WeatherService

**Responsibilities:**
- Fetch weather data from Weather.gov
- Handle 2-step API flow (points → forecast)
- Extract morning weather (6-9 AM)
- Cache weather data for 30 minutes

**Interface:**
```javascript
class WeatherService {
  /**
   * Get morning weather for a specific date
   * @param {Date} date - Target date
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<WeatherObject>}
   */
  async getMorningWeather(date, lat, lon) {
    // 1. Check cache
    // 2. Get grid coordinates (cached long-term)
    // 3. Fetch hourly forecast
    // 4. Extract morning period
    // 5. Build weather object
    // 6. Cache result
    // 7. Return
  }

  /**
   * Get grid coordinates for location
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<GridObject>}
   */
  async getGridCoordinates(lat, lon) {
    // https://api.weather.gov/points/{lat},{lon}
    // Returns: { gridId, gridX, gridY, forecastUrl }
    // Cache indefinitely (coordinates don't change)
  }

  /**
   * Fetch hourly forecast for grid
   * @param {string} gridId - e.g., "LWX"
   * @param {number} gridX
   * @param {number} gridY
   * @returns {Promise<ForecastArray>}
   */
  async getHourlyForecast(gridId, gridX, gridY) {
    // https://api.weather.gov/gridpoints/{gridId}/{gridX},{gridY}/forecast/hourly
    // Returns array of hourly periods
  }

  /**
   * Extract morning weather from hourly forecast
   * @param {Array} periods - Hourly forecast periods
   * @param {Date} targetDate
   * @returns {Object} Morning weather (6-9 AM)
   */
  extractMorningPeriod(periods, targetDate) {
    // Filter for target date, 6-9 AM
    // Prefer 7 AM if available
    // Return first morning period otherwise
  }
}
```

**Weather.gov API Constants:**
```javascript
const WEATHER_CONFIG = {
  baseURL: 'https://api.weather.gov',
  schoolLocation: {
    lat: 39.0997,
    lon: -77.0941,
    gridId: 'LWX',  // Pre-calculated (Washington DC region)
    gridX: 93,
    gridY: 80
  },
  cacheTTL: {
    grid: Infinity,        // Grid coords never change
    forecast: 1800000      // 30 minutes
  },
  timeout: 5000,
  headers: {
    'User-Agent': 'LunchDad-Alexa-Skill contact@example.com'
  }
};
```

---

#### 3. CacheService

**Responsibilities:**
- Store/retrieve data in Lambda memory
- Enforce TTL expiration
- Cleanup stale entries
- Thread-safe operations (single-threaded Lambda)

**Interface:**
```javascript
class CacheService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Retrieve cached data
   * @param {string} key
   * @returns {any|null} Data or null if expired/missing
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store data in cache
   * @param {string} key
   * @param {any} data
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, data, ttl) {
    const entry = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      expiresAt: Date.now() + ttl
    };

    this.cache.set(key, entry);

    // Periodic cleanup if cache grows large
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate specific key or pattern
   * @param {string|RegExp} pattern
   */
  invalidate(pattern) {
    if (typeof pattern === 'string') {
      this.cache.delete(pattern);
    } else {
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalMemory: this.estimateMemoryUsage()
    };
  }
}

// Singleton instance
module.exports = new CacheService();
```

**Cache Key Patterns:**
```javascript
const CACHE_KEYS = {
  menu: (date) => `menu:${formatDate(date, 'YYYY-MM-DD')}`,
  weather: (date) => `weather:${formatDate(date, 'YYYY-MM-DD')}`,
  weatherGrid: (lat, lon) => `grid:${lat},${lon}`,
  holidays: () => 'holidays:list'
};
```

---

#### 4. ResponseBuilder

**Responsibilities:**
- Build Alexa-compliant response JSON
- Format speech with SSML
- Construct APL documents
- Handle device capabilities

**Interface:**
```javascript
class ResponseBuilder {
  /**
   * Build complete Alexa response
   * @param {Object} options
   * @returns {Object} Alexa response JSON
   */
  build({menu, weather, type, hasScreen}) {
    const response = {
      version: '1.0',
      response: {
        outputSpeech: this.buildSpeech(menu, type),
        card: this.buildCard(menu, type),
        shouldEndSession: true
      }
    };

    if (hasScreen && menu.items.length > 0) {
      response.response.directives = [
        this.buildAPLDirective(menu, weather, type)
      ];
    }

    return response;
  }

  /**
   * Build speech output with SSML
   * @param {MenuObject} menu
   * @param {string} type - "today"|"tomorrow"|"week"
   * @returns {Object} Speech object
   */
  buildSpeech(menu, type) {
    let text = '';

    if (type === 'today') {
      text = "Today's lunch is ";
    } else if (type === 'tomorrow') {
      text = "Tomorrow's lunch is ";
    }

    if (menu.items.length === 0) {
      text += "not available yet. Check back later!";
    } else {
      const itemNames = menu.items.map(item => item.name);
      text += this.joinWithAnd(itemNames) + '.';
    }

    return {
      type: 'SSML',
      ssml: `<speak>${text}</speak>`
    };
  }

  /**
   * Build Alexa card
   * @param {MenuObject} menu
   * @param {string} type
   * @returns {Object} Card object
   */
  buildCard(menu, type) {
    const title = type === 'today' ? "Today's Lunch" : "Tomorrow's Lunch";
    const content = menu.items.map(item => item.name).join(', ');

    return {
      type: 'Simple',
      title,
      content
    };
  }

  /**
   * Build APL render directive
   * @param {MenuObject} menu
   * @param {WeatherObject} weather
   * @param {string} type
   * @returns {Object} APL directive
   */
  buildAPLDirective(menu, weather, type) {
    const document = require('../apl/templates/menuCalendar.json');

    return {
      type: 'Alexa.Presentation.APL.RenderDocument',
      token: 'menuDisplay',
      document,
      datasources: {
        menuData: {
          type: 'object',
          properties: {
            date: menu.date,
            items: menu.items,
            viewType: type
          }
        },
        weatherData: {
          type: 'object',
          properties: weather || {}
        }
      }
    };
  }

  /**
   * Join array with commas and "and"
   * @param {Array<string>} items
   * @returns {string}
   */
  joinWithAnd(items) {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;

    const allButLast = items.slice(0, -1).join(', ');
    return `${allButLast}, and ${items[items.length - 1]}`;
  }
}

module.exports = new ResponseBuilder();
```

---

## APL Visual Architecture

### APL Version: 2024.2

**Design Principles:**
1. **Responsive:** Adapts to Echo Show 5, 8, 10, 15
2. **Glanceable:** Key info (today's menu) visible at a glance
3. **Accessible:** High contrast, readable fonts
4. **Morning-optimized:** Quick visual scan before school

### Layout Templates

#### 1. Single Day View (Today/Tomorrow)

**File:** `/src/apl/templates/singleDayView.json`

```json
{
  "type": "APL",
  "version": "2024.2",
  "theme": "light",
  "mainTemplate": {
    "parameters": ["menuData", "weatherData"],
    "items": [
      {
        "type": "Container",
        "width": "100vw",
        "height": "100vh",
        "direction": "column",
        "items": [
          {
            "type": "Container",
            "id": "header",
            "height": "15vh",
            "width": "100%",
            "alignItems": "center",
            "justifyContent": "spaceBetween",
            "direction": "row",
            "paddingLeft": "40dp",
            "paddingRight": "40dp",
            "backgroundColor": "#4A90E2",
            "items": [
              {
                "type": "Text",
                "text": "Westmore Elementary",
                "fontSize": "40dp",
                "fontWeight": "bold",
                "color": "#FFFFFF"
              },
              {
                "type": "Container",
                "direction": "row",
                "alignItems": "center",
                "spacing": "20dp",
                "items": [
                  {
                    "type": "Text",
                    "text": "${weatherData.temperature}°${weatherData.temperatureUnit}",
                    "fontSize": "48dp",
                    "fontWeight": "bold",
                    "color": "#FFFFFF"
                  },
                  {
                    "type": "Text",
                    "text": "${weatherData.conditions}",
                    "fontSize": "32dp",
                    "color": "#FFFFFF"
                  }
                ]
              }
            ]
          },
          {
            "type": "Container",
            "id": "todaySection",
            "height": "70vh",
            "width": "100%",
            "alignItems": "center",
            "justifyContent": "center",
            "items": [
              {
                "type": "Text",
                "text": "${menuData.viewType == 'today' ? 'TODAY' : 'TOMORROW'}",
                "fontSize": "60dp",
                "fontWeight": "300",
                "color": "#666666",
                "textAlign": "center"
              },
              {
                "type": "Text",
                "text": "${menuData.formattedDate}",
                "fontSize": "48dp",
                "color": "#333333",
                "textAlign": "center",
                "paddingTop": "20dp"
              },
              {
                "type": "Container",
                "width": "80%",
                "paddingTop": "60dp",
                "items": {
                  "type": "Sequence",
                  "data": "${menuData.items}",
                  "numbered": true,
                  "items": [
                    {
                      "type": "Container",
                      "paddingBottom": "30dp",
                      "direction": "row",
                      "alignItems": "center",
                      "items": [
                        {
                          "type": "Text",
                          "text": "${index + 1}.",
                          "fontSize": "56dp",
                          "fontWeight": "bold",
                          "color": "#4A90E2",
                          "paddingRight": "20dp"
                        },
                        {
                          "type": "Text",
                          "text": "${data.name}",
                          "fontSize": "56dp",
                          "color": "#333333",
                          "maxLines": 2
                        }
                      ]
                    }
                  ]
                }
              }
            ]
          },
          {
            "type": "Container",
            "id": "footer",
            "height": "10vh",
            "width": "100%",
            "alignItems": "center",
            "justifyContent": "center",
            "items": [
              {
                "type": "Text",
                "text": "Updated: ${menuData.fetchedTime}",
                "fontSize": "24dp",
                "color": "#999999"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Visual Preview:**
```
┌───────────────────────────────────────────────────────┐
│ Westmore Elementary              58°F  Sunny          │
├───────────────────────────────────────────────────────┤
│                                                       │
│                    TODAY                              │
│                Wednesday, Oct 22                      │
│                                                       │
│            1.  Spicy Chicken Sandwich                 │
│            2.  Individual Cheese Pizza                │
│            3.  Sun Butter & Jelly Sandwich            │
│                                                       │
│                                                       │
├───────────────────────────────────────────────────────┤
│              Updated: 7:00 AM EDT                     │
└───────────────────────────────────────────────────────┘
```

---

#### 2. Week Calendar View (5 Days)

**File:** `/src/apl/templates/menuCalendar.json`

```json
{
  "type": "APL",
  "version": "2024.2",
  "theme": "light",
  "mainTemplate": {
    "parameters": ["menuData", "weatherData"],
    "items": [
      {
        "type": "Container",
        "width": "100vw",
        "height": "100vh",
        "direction": "column",
        "items": [
          {
            "type": "Container",
            "id": "header",
            "height": "15vh",
            "backgroundColor": "#4A90E2",
            "alignItems": "center",
            "justifyContent": "center",
            "items": [
              {
                "type": "Text",
                "text": "This Week's Lunch Menu",
                "fontSize": "48dp",
                "fontWeight": "bold",
                "color": "#FFFFFF"
              }
            ]
          },
          {
            "type": "Container",
            "id": "calendarGrid",
            "height": "75vh",
            "direction": "row",
            "justifyContent": "spaceAround",
            "alignItems": "start",
            "paddingLeft": "20dp",
            "paddingRight": "20dp",
            "paddingTop": "40dp",
            "items": {
              "type": "Sequence",
              "scrollDirection": "horizontal",
              "data": "${menuData.days}",
              "width": "18%",
              "items": [
                {
                  "type": "Container",
                  "direction": "column",
                  "alignItems": "center",
                  "spacing": "20dp",
                  "items": [
                    {
                      "type": "Text",
                      "text": "${data.dayOfWeek}",
                      "fontSize": "32dp",
                      "fontWeight": "bold",
                      "color": "${data.isToday ? '#4A90E2' : '#333333'}",
                      "textAlign": "center"
                    },
                    {
                      "type": "Text",
                      "text": "${data.formattedDate}",
                      "fontSize": "24dp",
                      "color": "#666666",
                      "textAlign": "center"
                    },
                    {
                      "type": "Container",
                      "backgroundColor": "${data.isToday ? '#E8F4FF' : '#F5F5F5'}",
                      "borderRadius": "10dp",
                      "padding": "20dp",
                      "width": "100%",
                      "minHeight": "300dp",
                      "items": {
                        "type": "Sequence",
                        "data": "${data.items}",
                        "spacing": "15dp",
                        "items": [
                          {
                            "type": "Text",
                            "text": "• ${data.name}",
                            "fontSize": "20dp",
                            "color": "#333333",
                            "maxLines": 3,
                            "textAlign": "left"
                          }
                        ]
                      }
                    }
                  ]
                }
              ]
            }
          },
          {
            "type": "Container",
            "id": "footer",
            "height": "10vh",
            "alignItems": "center",
            "justifyContent": "center",
            "items": [
              {
                "type": "Text",
                "text": "Updated: ${menuData.fetchedTime}",
                "fontSize": "24dp",
                "color": "#999999"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Visual Preview:**
```
┌────────────────────────────────────────────────────────────────────┐
│                  This Week's Lunch Menu                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Monday    Tuesday   Wednesday  Thursday   Friday                 │
│  Oct 20    Oct 21    Oct 22     Oct 23     Oct 24                 │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐               │
│  │• Chic│  │• Fish│  │• Spicy│  │• Chick│  │• Hamb│               │
│  │  ken │  │  Stic│  │  Chic│  │  en T│  │  urge│               │
│  │  Tend│  │  ks  │  │  ken │  │  ende│  │  r   │               │
│  │  ers │  │• Mac │  │  Sand│  │  rs  │  │• Veg │               │
│  │• Quesa│  │  &  │  │  wich│  │• Quesa│  │  gie│               │
│  │  dilla│  │  Chee│  │• Pizza│  │  dilla│  │  Bur│               │
│  │• Turkey│  │  se │  │• PB&J│  │• Turkey│  │  ger│               │
│  │  Sand│  │• Turk│  │      │  │  Sand│  │     │               │
│  │  wich│  │  ey  │  │      │  │  wich│  │     │               │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘               │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                    Updated: 7:00 AM EDT                            │
└────────────────────────────────────────────────────────────────────┘
```

### Responsive Design

**Viewport Adaptations:**

```javascript
// APL responsive logic
{
  "when": "${viewport.shape == 'round'}",  // Echo Spot
  "items": [/* Circular layout */]
}

{
  "when": "${viewport.pixelWidth < 1000}",  // Small screens (Show 5)
  "fontSize": "24dp",
  "padding": "10dp"
}

{
  "when": "${viewport.pixelWidth >= 1000 && viewport.pixelWidth < 1500}",
  "fontSize": "32dp",  // Medium screens (Show 8, 10)
  "padding": "20dp"
}

{
  "when": "${viewport.pixelWidth >= 1500}",  // Large screens (Show 15)
  "fontSize": "48dp",
  "padding": "40dp"
}
```

---

## AWS Infrastructure

### Lambda Configuration

**File:** `template.yaml` (updated)

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Alexa Lunch Dad Skill - School lunch menu voice assistant

Globals:
  Function:
    Timeout: 10
    Runtime: nodejs18.x
    MemorySize: 256
    Environment:
      Variables:
        LOG_LEVEL: !Ref LogLevel
        NODE_ENV: production

Parameters:
  SkillId:
    Type: String
    Description: Alexa Skill ID
    Default: ""

  LogLevel:
    Type: String
    Description: Logging verbosity
    Default: info
    AllowedValues:
      - error
      - warn
      - info
      - debug

  NutrisliceSchoolSlug:
    Type: String
    Description: Nutrislice school identifier
    Default: westmore-elementary-school-2

  SchoolLatitude:
    Type: String
    Description: School latitude for weather
    Default: "39.0997"

  SchoolLongitude:
    Type: String
    Description: School longitude for weather
    Default: "-77.0941"

  SchoolHolidays:
    Type: String
    Description: JSON array of holiday dates
    Default: '["2025-11-27","2025-11-28","2025-12-23","2025-12-24","2025-12-25","2025-12-26","2025-12-30","2025-12-31","2026-01-01","2026-01-02"]'

Resources:
  AlexaLunchDadFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: AlexaLunchDad
      CodeUri: src/
      Handler: index.handler
      Description: Alexa skill for Westmore Elementary lunch menus
      Environment:
        Variables:
          NUTRISLICE_BASE_URL: https://d45.nutrislice.com/menu
          NUTRISLICE_SCHOOL_SLUG: !Ref NutrisliceSchoolSlug
          SCHOOL_LATITUDE: !Ref SchoolLatitude
          SCHOOL_LONGITUDE: !Ref SchoolLongitude
          SCHOOL_HOLIDAYS: !Ref SchoolHolidays
          SCHOOL_TIMEZONE: America/New_York
          CACHE_TTL_MENU: "86400000"      # 24 hours in ms
          CACHE_TTL_WEATHER: "1800000"    # 30 minutes in ms
          WEATHER_API_BASE: https://api.weather.gov
      Events:
        AlexaSkillEvent:
          Type: AlexaSkill
          Properties:
            SkillId: !Ref SkillId

  AlexaLunchDadLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub /aws/lambda/${AlexaLunchDadFunction}
      RetentionInDays: 7

  # Custom CloudWatch Metrics
  NutrisliceAPISuccessMetric:
    Type: AWS::Logs::MetricFilter
    Properties:
      FilterPattern: '[timestamp, request_id, level=INFO, msg="Nutrislice API success"]'
      LogGroupName: !Ref AlexaLunchDadLogGroup
      MetricTransformations:
        - MetricName: NutrisliceAPISuccess
          MetricNamespace: LunchDad
          MetricValue: "1"

  NutrisliceAPIFailureMetric:
    Type: AWS::Logs::MetricFilter
    Properties:
      FilterPattern: '[timestamp, request_id, level=ERROR, msg="Nutrislice API failure"]'
      LogGroupName: !Ref AlexaLunchDadLogGroup
      MetricTransformations:
        - MetricName: NutrisliceAPIFailure
          MetricNamespace: LunchDad
          MetricValue: "1"

  CacheHitMetric:
    Type: AWS::Logs::MetricFilter
    Properties:
      FilterPattern: '[timestamp, request_id, level=DEBUG, msg="Cache hit"]'
      LogGroupName: !Ref AlexaLunchDadLogGroup
      MetricTransformations:
        - MetricName: CacheHitRate
          MetricNamespace: LunchDad
          MetricValue: "1"

  # CloudWatch Alarm - High Error Rate
  HighErrorRateAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: LunchDad-HighErrorRate
      AlarmDescription: Alert when error rate exceeds 5%
      MetricName: Errors
      Namespace: AWS/Lambda
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref AlexaLunchDadFunction

Outputs:
  AlexaLunchDadFunction:
    Description: Lambda Function ARN
    Value: !GetAtt AlexaLunchDadFunction.Arn
    Export:
      Name: LunchDad-FunctionArn

  AlexaLunchDadFunctionIamRole:
    Description: Implicit IAM Role created for function
    Value: !GetAtt AlexaLunchDadFunctionRole.Arn

  LogGroupName:
    Description: CloudWatch Log Group
    Value: !Ref AlexaLunchDadLogGroup
```

### Resource Limits

**Lambda:**
- Memory: 256 MB (sufficient for cheerio + ASK SDK)
- Timeout: 10 seconds (covers 2x API calls + retry logic)
- Concurrent executions: 100 (Alexa default)
- Cold start: < 2 seconds with optimized bundle

**CloudWatch Logs:**
- Retention: 7 days (cost optimization)
- Estimated monthly logs: 1 GB (500 invocations/day)
- Cost: Free tier covers usage

**Estimated Monthly Costs:**
- Lambda invocations: Free tier (1M requests)
- Lambda compute: Free tier (400,000 GB-seconds)
- CloudWatch Logs: $0.50/month (1 GB ingestion)
- **Total: ~$0.50/month**

---

## Configuration Management

### Environment Variables Schema

```javascript
// src/utils/constants.js

const {
  NUTRISLICE_BASE_URL,
  NUTRISLICE_SCHOOL_SLUG,
  SCHOOL_LATITUDE,
  SCHOOL_LONGITUDE,
  SCHOOL_HOLIDAYS,
  SCHOOL_TIMEZONE,
  CACHE_TTL_MENU,
  CACHE_TTL_WEATHER,
  WEATHER_API_BASE,
  LOG_LEVEL,
  NODE_ENV
} = process.env;

// Validate required variables
const requiredVars = [
  'NUTRISLICE_BASE_URL',
  'NUTRISLICE_SCHOOL_SLUG',
  'SCHOOL_LATITUDE',
  'SCHOOL_LONGITUDE'
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

// Parse and validate
const CONSTANTS = {
  NUTRISLICE: {
    baseURL: NUTRISLICE_BASE_URL,
    schoolSlug: NUTRISLICE_SCHOOL_SLUG,
    districtSlug: 'd45',
    timeout: 5000,
    maxRetries: 3,
    retryDelay: 100,  // Initial delay, doubles each retry
    userAgent: 'LunchDad-Alexa-Skill/1.0'
  },

  SCHOOL: {
    location: {
      lat: parseFloat(SCHOOL_LATITUDE),
      lon: parseFloat(SCHOOL_LONGITUDE)
    },
    timezone: SCHOOL_TIMEZONE || 'America/New_York',
    holidays: JSON.parse(SCHOOL_HOLIDAYS || '[]'),
    name: 'Westmore Elementary School'
  },

  WEATHER: {
    baseURL: WEATHER_API_BASE || 'https://api.weather.gov',
    grid: {
      id: 'LWX',      // Pre-calculated for Westmore location
      x: 93,
      y: 80
    },
    timeout: 5000,
    userAgent: 'LunchDad-Alexa-Skill/1.0 (contact@example.com)'
  },

  CACHE: {
    ttl: {
      menu: parseInt(CACHE_TTL_MENU) || 86400000,     // 24 hours
      weather: parseInt(CACHE_TTL_WEATHER) || 1800000, // 30 minutes
      grid: Infinity,                                   // Never expires
      holidays: 86400000                                // 24 hours
    },
    maxSize: 100  // Maximum cache entries before cleanup
  },

  LOGGING: {
    level: LOG_LEVEL || 'info',
    includeTimestamp: true,
    includeRequestId: true
  },

  APP: {
    name: 'Lunch Dad',
    version: '1.0.0',
    environment: NODE_ENV || 'production'
  }
};

// Freeze to prevent modification
Object.freeze(CONSTANTS);
Object.freeze(CONSTANTS.NUTRISLICE);
Object.freeze(CONSTANTS.SCHOOL);
Object.freeze(CONSTANTS.WEATHER);
Object.freeze(CONSTANTS.CACHE);

module.exports = CONSTANTS;
```

### Configuration Validation

**Startup Checks:**
```javascript
// src/index.js (before handler export)

const CONSTANTS = require('./utils/constants');
const logger = require('./utils/logger');

// Validate configuration on cold start
try {
  // Check latitude/longitude are valid
  if (
    CONSTANTS.SCHOOL.location.lat < -90 ||
    CONSTANTS.SCHOOL.location.lat > 90
  ) {
    throw new Error('Invalid latitude value');
  }

  if (
    CONSTANTS.SCHOOL.location.lon < -180 ||
    CONSTANTS.SCHOOL.location.lon > 180
  ) {
    throw new Error('Invalid longitude value');
  }

  // Validate holiday dates
  for (const holiday of CONSTANTS.SCHOOL.holidays) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday)) {
      throw new Error(`Invalid holiday date format: ${holiday}`);
    }
  }

  logger.info('Configuration validated successfully', {
    school: CONSTANTS.SCHOOL.name,
    environment: CONSTANTS.APP.environment
  });
} catch (error) {
  logger.error('Configuration validation failed', { error });
  throw error;
}
```

---

## Error Handling Architecture

### Error Classification

**Tier 1: User Errors** (4xx-equivalent)
- Invalid input (should not occur with Alexa's NLU)
- Unsupported request type
- Response: User-friendly explanation

**Tier 2: External Service Errors** (5xx-equivalent)
- Nutrislice unavailable
- Weather.gov timeout
- Parse failures
- Response: Fallback to cache or graceful message

**Tier 3: System Errors**
- Lambda timeout
- Out of memory
- Code bugs (unhandled exceptions)
- Response: Generic error message + CloudWatch alert

### Error Handling Pattern

```javascript
// src/handlers/GetTodayMenuHandler.js

const { ErrorHandler } = require('../utils/errorHandler');

class GetTodayMenuHandler {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'GetTodayMenuIntent'
    );
  }

  async handle(handlerInput) {
    try {
      // Get current date in school timezone
      const today = getCurrentDate(CONSTANTS.SCHOOL.timezone);

      // Check if weekend
      if (isWeekend(today)) {
        const nextSchoolDay = getNextSchoolDay(today, 1, CONSTANTS.SCHOOL.holidays);
        return buildWeekendResponse(nextSchoolDay);
      }

      // Fetch menu
      let menu;
      try {
        menu = await nutrisliceService.fetchMenuForDate(today);
      } catch (apiError) {
        // Check for stale cache
        const staleCache = cacheService.get(cacheKey, { allowStale: true });
        if (staleCache) {
          logger.warn('Using stale cache due to API failure', { apiError });
          menu = staleCache;
          menu.isStale = true;
        } else {
          throw apiError;  // No fallback available
        }
      }

      // Fetch weather (non-blocking, optional)
      let weather = null;
      try {
        weather = await weatherService.getMorningWeather(
          today,
          CONSTANTS.SCHOOL.location.lat,
          CONSTANTS.SCHOOL.location.lon
        );
      } catch (weatherError) {
        logger.warn('Weather fetch failed, continuing without weather', {
          error: weatherError
        });
        // Continue without weather (graceful degradation)
      }

      // Extract main items
      const mainItems = menuParser.extractMainItems(menu.items, 5);

      // Build response
      const hasScreen = handlerInput.requestEnvelope.context.System.device
        .supportedInterfaces['Alexa.Presentation.APL'];

      const response = responseBuilder.build({
        menu: { ...menu, items: mainItems },
        weather,
        type: 'today',
        hasScreen
      });

      // Add stale data warning if applicable
      if (menu.isStale) {
        response.response.outputSpeech.ssml = response.response.outputSpeech.ssml.replace(
          '<speak>',
          '<speak>I\'m showing yesterday\'s menu since today\'s isn\'t loading yet. '
        );
      }

      return response;

    } catch (error) {
      // Global error handler
      return ErrorHandler.handle(handlerInput, error);
    }
  }
}

module.exports = GetTodayMenuHandler;
```

### Circuit Breaker Implementation

```javascript
// src/utils/circuitBreaker.js

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 300000;  // 5 minutes
    this.failureCount = 0;
    this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      // Check if reset timeout has passed
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      // Success - reset failure count
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
        logger.info('Circuit breaker reset to CLOSED');
      }

      return result;

    } catch (error) {
      this.failureCount++;
      logger.warn('Circuit breaker failure', {
        failureCount: this.failureCount,
        threshold: this.failureThreshold
      });

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.resetTimeout;
        logger.error('Circuit breaker OPEN', {
          nextAttempt: new Date(this.nextAttempt)
        });
      }

      throw error;
    }
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = null;
  }
}

// Singleton instances
const nutrisliceCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 300000  // 5 minutes
});

const weatherCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 180000  // 3 minutes
});

module.exports = {
  nutrisliceCircuitBreaker,
  weatherCircuitBreaker
};
```

---

## Testing Strategy

### Test Pyramid

```
              ┌──────────────┐
              │  E2E Tests   │  5% (10-15 tests)
              │ (Alexa Sim)  │
              └──────────────┘
             ┌────────────────┐
             │ Integration    │  20% (40-50 tests)
             │   Tests        │
             └────────────────┘
          ┌──────────────────────┐
          │    Unit Tests        │  75% (150-200 tests)
          └──────────────────────┘
```

### Unit Test Coverage (Target: 90%)

**Test Framework:** Jest 29.x

**Structure:**
```
tests/
├── unit/
│   ├── handlers/
│   │   ├── GetTodayMenuHandler.test.js
│   │   ├── GetTomorrowMenuHandler.test.js
│   │   ├── LaunchRequestHandler.test.js
│   │   └── ErrorHandler.test.js
│   │
│   ├── services/
│   │   ├── nutrisliceService.test.js
│   │   ├── weatherService.test.js
│   │   └── cacheService.test.js
│   │
│   └── utils/
│       ├── dateUtils.test.js
│       ├── menuParser.test.js
│       └── responseBuilder.test.js
│
├── integration/
│   ├── menuFlow.test.js
│   ├── weatherFlow.test.js
│   └── aplRendering.test.js
│
├── fixtures/
│   ├── nutrisliceHTML.html
│   ├── weatherAPIResponse.json
│   └── alexaRequests.json
│
└── helpers/
    ├── mockHandlerInput.js
    └── mockAPIResponses.js
```

### Example Unit Test

**File:** `tests/unit/utils/dateUtils.test.js`

```javascript
const {
  getNextSchoolDay,
  isWeekend,
  isHoliday,
  getCurrentEasternTime
} = require('../../../src/utils/dateUtils');

describe('dateUtils', () => {
  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date('2025-10-25');  // Saturday
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date('2025-10-26');  // Sunday
      expect(isWeekend(sunday)).toBe(true);
    });

    it('should return false for weekdays', () => {
      const monday = new Date('2025-10-20');  // Monday
      expect(isWeekend(monday)).toBe(false);
    });
  });

  describe('getNextSchoolDay', () => {
    const holidays = new Set([
      '2025-11-27',  // Thanksgiving
      '2025-12-25'   // Christmas
    ]);

    it('should return next weekday when current is weekday', () => {
      const monday = new Date('2025-10-20');
      const nextDay = getNextSchoolDay(monday, 1, holidays);
      expect(nextDay.getDate()).toBe(21);  // Tuesday
    });

    it('should skip weekend to Monday', () => {
      const friday = new Date('2025-10-24');
      const nextDay = getNextSchoolDay(friday, 1, holidays);
      expect(nextDay.getDate()).toBe(27);  // Monday
    });

    it('should skip holidays', () => {
      const beforeThanksgiving = new Date('2025-11-26');
      const nextDay = getNextSchoolDay(beforeThanksgiving, 1, holidays);
      expect(nextDay.getDate()).toBe(28);  // Skip Nov 27
    });

    it('should handle multiple days ahead', () => {
      const monday = new Date('2025-10-20');
      const fiveDaysLater = getNextSchoolDay(monday, 5, holidays);
      expect(fiveDaysLater.getDate()).toBe(24);  // Friday
    });
  });

  describe('isHoliday', () => {
    const holidays = new Set(['2025-12-25', '2026-01-01']);

    it('should return true for holiday dates', () => {
      const christmas = new Date('2025-12-25');
      expect(isHoliday(christmas, holidays)).toBe(true);
    });

    it('should return false for non-holiday dates', () => {
      const regularDay = new Date('2025-10-20');
      expect(isHoliday(regularDay, holidays)).toBe(false);
    });
  });
});
```

### Integration Test Example

**File:** `tests/integration/menuFlow.test.js`

```javascript
const nock = require('nock');
const handler = require('../../../src/index').handler;
const alexaRequest = require('../../fixtures/alexaRequests.json');
const nutrisliceHTML = require('fs').readFileSync(
  '../../fixtures/nutrisliceHTML.html',
  'utf8'
);

describe('Menu Fetch Flow (Integration)', () => {
  beforeEach(() => {
    // Mock Nutrislice API
    nock('https://d45.nutrislice.com')
      .get(/\/menu\/westmore-elementary-school-2\/lunch\/.*/)
      .reply(200, nutrisliceHTML, {
        'Content-Type': 'text/html',
        'Content-Encoding': 'gzip'
      });

    // Mock Weather.gov API
    nock('https://api.weather.gov')
      .get(/\/points\/.*/)
      .reply(200, {
        properties: {
          gridId: 'LWX',
          gridX: 93,
          gridY: 80,
          forecastHourly: 'https://api.weather.gov/gridpoints/LWX/93,80/forecast/hourly'
        }
      });

    nock('https://api.weather.gov')
      .get(/\/gridpoints\/LWX\/93,80\/forecast\/hourly/)
      .reply(200, {
        properties: {
          periods: [
            {
              startTime: '2025-10-22T07:00:00-04:00',
              temperature: 58,
              temperatureUnit: 'F',
              shortForecast: 'Sunny'
            }
          ]
        }
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should handle GetTodayMenuIntent with full flow', async () => {
    const request = alexaRequest.GetTodayMenuIntent;
    const response = await handler(request);

    expect(response.response.outputSpeech.ssml).toContain("Today's lunch is");
    expect(response.response.card.title).toBe("Today's Lunch");
    expect(response.response.directives).toBeDefined();
    expect(response.response.directives[0].type).toBe(
      'Alexa.Presentation.APL.RenderDocument'
    );
  });

  it('should gracefully handle weather API failure', async () => {
    // Override weather mock to fail
    nock.cleanAll();
    nock('https://api.weather.gov')
      .get(/\/points\/.*/)
      .reply(500);

    const request = alexaRequest.GetTodayMenuIntent;
    const response = await handler(request);

    // Should still return menu without weather
    expect(response.response.outputSpeech.ssml).toContain("Today's lunch is");
    expect(response.response.directives[0].datasources.weatherData).toEqual({});
  });
});
```

---

## Deployment Architecture

### CI/CD Pipeline

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy Alexa Lunch Dad

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main

env:
  AWS_REGION: us-east-1
  SAM_CLI_TELEMETRY: 0

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Check coverage
        run: npm run test:coverage
        env:
          COVERAGE_THRESHOLD: 90

  deploy-dev:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: development
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup AWS SAM
        uses: aws-actions/setup-sam@v2

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Build SAM application
        run: sam build

      - name: Deploy to development
        run: |
          sam deploy \
            --stack-name alexaLunchDad-dev \
            --s3-bucket ${{ secrets.SAM_DEPLOYMENT_BUCKET }} \
            --capabilities CAPABILITY_IAM \
            --no-fail-on-empty-changeset \
            --parameter-overrides \
              SkillId=${{ secrets.ALEXA_SKILL_ID_DEV }} \
              LogLevel=debug

  deploy-prod:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup AWS SAM
        uses: aws-actions/setup-sam@v2

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Build SAM application
        run: sam build

      - name: Deploy to production
        run: |
          sam deploy \
            --stack-name alexaLunchDad-prod \
            --s3-bucket ${{ secrets.SAM_DEPLOYMENT_BUCKET }} \
            --capabilities CAPABILITY_IAM \
            --no-fail-on-empty-changeset \
            --parameter-overrides \
              SkillId=${{ secrets.ALEXA_SKILL_ID_PROD }} \
              LogLevel=info

      - name: Run smoke tests
        run: npm run test:smoke
        env:
          LAMBDA_ARN: ${{ steps.deploy.outputs.lambda_arn }}
```

### Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing (unit + integration)
- [ ] Code coverage > 90%
- [ ] ESLint warnings resolved
- [ ] Environment variables updated in SAM template
- [ ] School holidays list current
- [ ] APL templates validated

**Post-Deployment:**
- [ ] Smoke test: Invoke Lambda manually
- [ ] Alexa simulator test: "Alexa, ask Lunch Dad what's for lunch today"
- [ ] CloudWatch logs show no errors
- [ ] Cache warming (optional): Pre-load today's menu
- [ ] Monitor error rate for 1 hour

### Rollback Procedure

**Automatic Rollback:**
CloudWatch alarm triggers SNS notification if error rate > 5%.

**Manual Rollback:**
```bash
# List recent deployments
aws cloudformation describe-stack-events \
  --stack-name alexaLunchDad-prod \
  --max-items 10

# Rollback to previous version
aws cloudformation rollback-stack \
  --stack-name alexaLunchDad-prod

# Verify rollback
aws lambda get-function \
  --function-name AlexaLunchDad \
  --query 'Configuration.Version'
```

---

## Performance Optimization

### Lambda Cold Start Optimization

**Bundle Size Reduction:**
```javascript
// package.json
{
  "devDependencies": {
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4"
  },
  "scripts": {
    "build": "webpack --mode production",
    "build:dev": "webpack --mode development"
  }
}

// webpack.config.js
module.exports = {
  entry: './src/index.js',
  target: 'node',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2'
  },
  externals: {
    'aws-sdk': 'aws-sdk'  // Provided by Lambda runtime
  },
  optimization: {
    minimize: true
  }
};
```

**Cold Start Metrics:**
- Unoptimized: ~2.5 seconds
- With webpack: ~1.2 seconds
- Target: < 2 seconds (95th percentile)

### Response Time Optimization

**Parallel Execution:**
```javascript
// Fetch menu and weather in parallel
const [menu, weather] = await Promise.all([
  nutrisliceService.fetchMenuForDate(today),
  weatherService.getMorningWeather(today, lat, lon)
]);
```

**Cache-First Strategy:**
```javascript
// Always check cache before API
const cachedMenu = cacheService.get(menuKey);
if (cachedMenu && !isExpired(cachedMenu)) {
  return cachedMenu;  // ~10ms response
}

// Cache miss - fetch from API (~2000ms)
const menu = await fetchFromNutrislice(date);
cacheService.set(menuKey, menu, TTL);
return menu;
```

**Expected Response Times:**
- Cache hit: 50-100ms
- Cache miss (menu only): 1.5-2.5s
- Cache miss (menu + weather): 2.0-3.0s
- Target: < 3s (95th percentile)

---

## Security Considerations

### Input Validation

**Alexa Request Signature Verification:**
```javascript
// ASK SDK handles this automatically
const Alexa = require('ask-sdk-core');

const skillBuilder = Alexa.SkillBuilders.custom()
  .addRequestHandlers(...)
  .addErrorHandlers(...)
  .withSkillId(process.env.SKILL_ID);  // Validates skill ID

exports.handler = skillBuilder.lambda();
```

**Environment Variable Sanitization:**
```javascript
// Prevent injection attacks
function sanitizeEnvVar(value, type = 'string') {
  if (type === 'url') {
    try {
      new URL(value);  // Throws if invalid
      return value;
    } catch {
      throw new Error('Invalid URL');
    }
  }

  if (type === 'number') {
    const num = parseFloat(value);
    if (isNaN(num)) {
      throw new Error('Invalid number');
    }
    return num;
  }

  return String(value);
}
```

### Secret Management

**No secrets in environment variables:**
- Weather.gov requires no API key
- Nutrislice is public (no authentication)
- School location is public information

**Future-proofing:**
If API keys are needed in the future, use AWS Secrets Manager:

```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({
    SecretId: secretName
  }).promise();

  return JSON.parse(data.SecretString);
}
```

### Data Privacy

**No PII stored:**
- No user names
- No email addresses
- No location tracking beyond school zip
- No persistent user data

**CloudWatch Log Sanitization:**
```javascript
// Never log sensitive data
logger.info('Menu fetched', {
  date: menu.date,
  itemCount: menu.items.length
  // Do NOT log: user IDs, device IDs, etc.
});
```

---

## Monitoring and Observability

### CloudWatch Dashboards

**Metrics to Monitor:**
1. Lambda invocations (count)
2. Lambda errors (count, %)
3. Lambda duration (avg, p95, p99)
4. Nutrislice API success rate
5. Weather API success rate
6. Cache hit rate
7. Cold start frequency

**Custom Dashboard JSON:**
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum"}],
          [".", "Errors", {"stat": "Sum"}],
          [".", "Duration", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Lambda Performance"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["LunchDad", "NutrisliceAPISuccess", {"stat": "Sum"}],
          [".", "NutrisliceAPIFailure", {"stat": "Sum"}],
          [".", "CacheHitRate", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "API Health"
      }
    }
  ]
}
```

### Logging Strategy

**Log Levels:**
- **ERROR:** API failures, unhandled exceptions
- **WARN:** Stale cache usage, circuit breaker trips
- **INFO:** Successful operations, cache hits
- **DEBUG:** Request/response details (dev only)

**Structured Logging:**
```javascript
// src/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Usage
logger.info('Menu fetched successfully', {
  date: '2025-10-22',
  itemCount: 3,
  cacheHit: false,
  duration: 1234
});
```

---

## Appendix: Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEPENDENCY GRAPH                         │
└─────────────────────────────────────────────────────────────────┘

index.js
  ├── handlers/
  │   ├── LaunchRequestHandler
  │   │   └── responseBuilder
  │   ├── GetTodayMenuHandler
  │   │   ├── nutrisliceService
  │   │   │   ├── cacheService
  │   │   │   ├── dateUtils
  │   │   │   └── menuParser
  │   │   ├── weatherService
  │   │   │   └── cacheService
  │   │   ├── responseBuilder
  │   │   └── dateUtils
  │   ├── GetTomorrowMenuHandler
  │   │   └── (same as GetTodayMenuHandler)
  │   ├── HelpIntentHandler
  │   │   └── responseBuilder
  │   └── ErrorHandler
  │       ├── logger
  │       └── responseBuilder
  │
  ├── services/
  │   ├── nutrisliceService
  │   │   ├── cheerio (external)
  │   │   ├── https (Node.js)
  │   │   ├── cacheService
  │   │   ├── menuParser
  │   │   ├── logger
  │   │   └── constants
  │   ├── weatherService
  │   │   ├── https (Node.js)
  │   │   ├── cacheService
  │   │   ├── logger
  │   │   └── constants
  │   └── cacheService
  │       ├── logger
  │       └── constants
  │
  ├── utils/
  │   ├── dateUtils
  │   │   ├── date-fns (external)
  │   │   └── constants
  │   ├── menuParser
  │   │   ├── logger
  │   │   └── constants
  │   ├── responseBuilder
  │   │   ├── aplTemplates
  │   │   └── logger
  │   ├── logger (winston)
  │   └── constants
  │
  └── apl/
      ├── templates/
      │   ├── menuCalendar.json
      │   └── singleDayView.json
      └── components/
          └── weatherWidget.json

LEGEND:
  ├── Direct dependency
  └── Utility/helper dependency

CIRCULAR DEPENDENCY CHECK: None detected ✓
```

---

## Next Steps: TDD Implementation Phase

With the architecture complete, the next phase is Test-Driven Development (TDD) implementation:

1. **Test Infrastructure Setup**
   - Configure Jest with coverage thresholds
   - Create mock fixtures (Nutrislice HTML, Weather API responses)
   - Set up integration test environment

2. **Red-Green-Refactor Cycle**
   - Write failing tests based on pseudocode algorithms
   - Implement minimal code to pass tests
   - Refactor for clean architecture

3. **Implementation Order**
   - **Week 1:** Utilities (dateUtils, menuParser, cacheService)
   - **Week 2:** Services (nutrisliceService, weatherService)
   - **Week 3:** Handlers (GetTodayMenuHandler, LaunchRequestHandler)
   - **Week 4:** APL templates, integration tests, deployment

4. **Quality Gates**
   - All tests passing (100% of written tests)
   - Code coverage > 90%
   - ESLint warnings = 0
   - Manual Alexa simulator testing

---

**Architecture Document Approved**
**Ready for Implementation:** 2025-10-22
**Next Phase:** TDD (Test-Driven Development)
**Estimated Implementation Time:** 4 weeks
