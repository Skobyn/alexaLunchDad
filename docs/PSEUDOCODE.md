# SPARC Pseudocode Specification - Lunch Dad Alexa Skill

## Overview
This document contains algorithm designs for the Lunch Dad Alexa skill, which provides school lunch menu information with visual calendar displays and weather overlays.

---

## Algorithm 1: School Day Calculator

### Purpose
Calculate the next school day(s) by skipping weekends and holidays.

### Algorithm Specification

```
ALGORITHM: getNextSchoolDay
INPUT:
    currentDate (Date) - Starting date
    daysAhead (Integer) - Number of school days to advance (default: 1)
    holidays (Set<Date>) - Collection of holiday dates
OUTPUT:
    schoolDate (Date) - The calculated school day

CONSTANTS:
    SATURDAY = 6
    SUNDAY = 0
    MAX_ITERATIONS = 365  // Prevent infinite loops

BEGIN
    // Validate inputs
    IF daysAhead < 0 THEN
        RETURN error("daysAhead must be non-negative")
    END IF

    IF daysAhead = 0 THEN
        RETURN currentDate
    END IF

    // Initialize working date
    workingDate ← currentDate
    schoolDaysFound ← 0
    iterationCount ← 0

    // Advance until we find required school days
    WHILE schoolDaysFound < daysAhead AND iterationCount < MAX_ITERATIONS DO
        // Move to next calendar day
        workingDate ← workingDate + 1 day
        iterationCount ← iterationCount + 1

        // Check if it's a weekend
        dayOfWeek ← workingDate.getDayOfWeek()
        IF dayOfWeek = SATURDAY OR dayOfWeek = SUNDAY THEN
            CONTINUE  // Skip to next iteration
        END IF

        // Check if it's a holiday
        dateOnly ← normalizeToDateOnly(workingDate)
        IF holidays.contains(dateOnly) THEN
            CONTINUE  // Skip to next iteration
        END IF

        // Valid school day found
        schoolDaysFound ← schoolDaysFound + 1
    END WHILE

    // Safety check
    IF iterationCount >= MAX_ITERATIONS THEN
        RETURN error("Could not find school day within reasonable time")
    END IF

    RETURN workingDate
END

SUBROUTINE: normalizeToDateOnly
INPUT: datetime (DateTime)
OUTPUT: date (Date)
BEGIN
    // Strip time component for date comparison
    RETURN Date(datetime.year, datetime.month, datetime.day)
END
```

### Complexity Analysis

**Time Complexity:** O(n)
- n = daysAhead * average_days_to_find_school_day
- Worst case: O(daysAhead * 7) if many consecutive holidays
- Best case: O(daysAhead) if no weekends/holidays encountered

**Space Complexity:** O(h)
- h = size of holidays set
- Working variables: O(1)

### Edge Cases & Test Anchors

```javascript
// TDD Test Anchors:

// Test 1: Basic weekday advancement
assert(getNextSchoolDay("2025-10-20", 1) === "2025-10-21")  // Mon -> Tue

// Test 2: Skip weekend
assert(getNextSchoolDay("2025-10-24", 1) === "2025-10-27")  // Fri -> Mon

// Test 3: Skip multiple weekends
assert(getNextSchoolDay("2025-10-24", 5) === "2025-10-31")  // Fri + 5 days

// Test 4: Handle holidays
holidays = ["2025-10-27"]
assert(getNextSchoolDay("2025-10-24", 1, holidays) === "2025-10-28")

// Test 5: Zero days ahead
assert(getNextSchoolDay("2025-10-20", 0) === "2025-10-20")

// Test 6: Negative input validation
assert(getNextSchoolDay("2025-10-20", -1) throws Error)

// Test 7: Long holiday stretch
manyHolidays = ["2025-10-27", "2025-10-28", "2025-10-29"]
assert(getNextSchoolDay("2025-10-24", 1, manyHolidays) === "2025-10-30")
```

---

## Algorithm 2: Nutrislice Menu Fetcher

### Purpose
Fetch lunch menu data from Nutrislice API for a specific date.

### Algorithm Specification

```
ALGORITHM: fetchMenuForDate
INPUT:
    targetDate (Date) - Date to fetch menu for
    schoolId (String) - Nutrislice school identifier
    cacheManager (Cache) - Optional cache for API responses
OUTPUT:
    menuData (Object) - Parsed menu with items and metadata

CONSTANTS:
    BASE_URL = "https://api.nutrislice.com/menu/api/weeks/school"
    CACHE_TTL = 3600  // 1 hour in seconds
    REQUEST_TIMEOUT = 5000  // 5 seconds

BEGIN
    // Validate inputs
    IF targetDate is null OR schoolId is empty THEN
        RETURN error("Invalid input parameters")
    END IF

    // Format date for API
    formattedDate ← formatDate(targetDate, "YYYY-MM-DD")

    // Check cache first
    cacheKey ← "menu:" + schoolId + ":" + formattedDate
    IF cacheManager is not null THEN
        cachedData ← cacheManager.get(cacheKey)
        IF cachedData is not null THEN
            RETURN cachedData
        END IF
    END IF

    // Construct API URL
    url ← BASE_URL + "/" + schoolId + "/" + formattedDate

    // Make HTTP request with retry logic
    maxRetries ← 3
    retryCount ← 0

    WHILE retryCount < maxRetries DO
        TRY
            response ← HTTP_GET(url, {
                timeout: REQUEST_TIMEOUT,
                headers: {
                    "Accept": "application/json"
                }
            })

            // Check response status
            IF response.status = 200 THEN
                rawData ← response.body
                parsedMenu ← parseNutrisliceResponse(rawData)

                // Cache successful response
                IF cacheManager is not null THEN
                    cacheManager.set(cacheKey, parsedMenu, CACHE_TTL)
                END IF

                RETURN parsedMenu
            ELSE IF response.status = 404 THEN
                // No menu available for this date
                RETURN {
                    date: formattedDate,
                    items: [],
                    message: "No menu available"
                }
            ELSE
                THROW error("HTTP " + response.status)
            END IF

        CATCH networkError
            retryCount ← retryCount + 1
            IF retryCount < maxRetries THEN
                // Exponential backoff
                waitTime ← (2 ^ retryCount) * 100  // ms
                SLEEP(waitTime)
            ELSE
                RETURN error("Failed to fetch menu after retries: " + networkError)
            END IF
        END TRY
    END WHILE
END

SUBROUTINE: parseNutrisliceResponse
INPUT: rawData (String/JSON)
OUTPUT: menuObject (Object)

BEGIN
    data ← JSON.parse(rawData)

    menuItems ← []

    // Navigate Nutrislice response structure
    IF data.days is not null AND data.days.length > 0 THEN
        dayData ← data.days[0]  // First day in response

        IF dayData.menu_items is not null THEN
            FOR EACH item IN dayData.menu_items DO
                menuItems.append({
                    name: item.food.name,
                    category: item.food.food_category,
                    description: item.food.description OR "",
                    nutrients: extractNutrients(item.food),
                    allergens: item.food.allergens OR []
                })
            END FOR
        END IF
    END IF

    RETURN {
        date: data.date,
        items: menuItems,
        schoolName: data.school_name OR "",
        fetchedAt: getCurrentTimestamp()
    }
END

SUBROUTINE: extractNutrients
INPUT: foodItem (Object)
OUTPUT: nutrients (Object)

BEGIN
    IF foodItem.rounded_nutrition_info is null THEN
        RETURN {}
    END IF

    nutrition ← foodItem.rounded_nutrition_info

    RETURN {
        calories: nutrition.calories OR 0,
        protein: nutrition.protein OR 0,
        carbs: nutrition.carbs OR 0,
        fat: nutrition.fat OR 0
    }
END
```

### Complexity Analysis

**Time Complexity:** O(1) amortized
- HTTP request: O(1) network time
- JSON parsing: O(m) where m = response size (typically < 10KB)
- Cache lookup: O(1)

**Space Complexity:** O(m)
- m = size of menu response
- Cache storage: O(k * m) where k = number of cached dates

### Test Anchors

```javascript
// TDD Test Anchors:

// Test 1: Successful API call
mockResponse = {status: 200, body: validMenuJSON}
result = fetchMenuForDate("2025-10-20", "schoolId123")
assert(result.items.length > 0)
assert(result.date === "2025-10-20")

// Test 2: Cache hit
cache.set("menu:school:2025-10-20", cachedMenu)
result = fetchMenuForDate("2025-10-20", "school")
assert(result === cachedMenu)  // No API call made

// Test 3: No menu available (404)
mockResponse = {status: 404}
result = fetchMenuForDate("2025-12-25", "school")
assert(result.items.length === 0)
assert(result.message === "No menu available")

// Test 4: Network retry logic
mockFailThenSuccess()  // Fail 2x, succeed on 3rd
result = fetchMenuForDate("2025-10-20", "school")
assert(result.items.length > 0)

// Test 5: Invalid input validation
assert(fetchMenuForDate(null, "school") throws Error)
assert(fetchMenuForDate("2025-10-20", "") throws Error)

// Test 6: Parse complex menu structure
complexJSON = loadFixture("complex-menu.json")
result = parseNutrisliceResponse(complexJSON)
assert(result.items[0].nutrients.calories > 0)
```

---

## Algorithm 3: Main Item Extractor

### Purpose
Filter menu items to extract only main entrees, excluding sides and beverages.

### Algorithm Specification

```
ALGORITHM: extractMainItems
INPUT:
    menuData (Object) - Full menu with all items
    maxItems (Integer) - Maximum main items to return (default: 5)
OUTPUT:
    mainItems (Array<Object>) - Filtered list of main entrees

CONSTANTS:
    MAIN_CATEGORIES = ["Entree", "Main Dish", "Pizza", "Sandwich", "Burger"]
    EXCLUDE_KEYWORDS = ["side", "drink", "beverage", "milk", "juice",
                        "dessert", "fruit cup", "vegetable"]

BEGIN
    // Validate input
    IF menuData is null OR menuData.items is null THEN
        RETURN []
    END IF

    allItems ← menuData.items
    filteredItems ← []

    // Phase 1: Filter by category
    FOR EACH item IN allItems DO
        // Category-based filtering
        IF item.category IN MAIN_CATEGORIES THEN
            filteredItems.append(item)
            CONTINUE
        END IF

        // Keyword-based filtering for items without clear category
        IF item.category is null OR item.category = "Other" THEN
            isMainItem ← checkIfMainItem(item)
            IF isMainItem THEN
                filteredItems.append(item)
            END IF
        END IF
    END FOR

    // Phase 2: Remove duplicates
    uniqueItems ← removeDuplicates(filteredItems)

    // Phase 3: Sort by priority/relevance
    sortedItems ← sortByRelevance(uniqueItems)

    // Phase 4: Limit to maxItems
    resultItems ← sortedItems.slice(0, maxItems)

    RETURN resultItems
END

SUBROUTINE: checkIfMainItem
INPUT: item (Object)
OUTPUT: isMain (Boolean)

BEGIN
    itemName ← item.name.toLowerCase()
    itemDesc ← (item.description OR "").toLowerCase()
    combinedText ← itemName + " " + itemDesc

    // Check for exclude keywords
    FOR EACH keyword IN EXCLUDE_KEYWORDS DO
        IF combinedText.contains(keyword) THEN
            RETURN false
        END IF
    END FOR

    // Check nutritional content (main items typically have more calories)
    IF item.nutrients is not null THEN
        calories ← item.nutrients.calories
        protein ← item.nutrients.protein

        // Main items typically have 250+ calories and 10+ g protein
        IF calories >= 250 AND protein >= 10 THEN
            RETURN true
        END IF
    END IF

    // Default to false if uncertain
    RETURN false
END

SUBROUTINE: removeDuplicates
INPUT: items (Array<Object>)
OUTPUT: unique (Array<Object>)

BEGIN
    seen ← Set()
    unique ← []

    FOR EACH item IN items DO
        // Normalize name for comparison
        normalizedName ← item.name.toLowerCase().trim()

        IF NOT seen.contains(normalizedName) THEN
            seen.add(normalizedName)
            unique.append(item)
        END IF
    END FOR

    RETURN unique
END

SUBROUTINE: sortByRelevance
INPUT: items (Array<Object>)
OUTPUT: sorted (Array<Object>)

BEGIN
    // Define relevance score
    FOR EACH item IN items DO
        score ← 0

        // Higher priority categories
        IF item.category = "Entree" THEN
            score ← score + 100
        ELSE IF item.category IN ["Pizza", "Burger"] THEN
            score ← score + 80
        END IF

        // Boost items with complete nutritional info
        IF item.nutrients is not null AND item.nutrients.calories > 0 THEN
            score ← score + 20
        END IF

        // Boost items with allergen info (indicates detailed data)
        IF item.allergens is not null AND item.allergens.length > 0 THEN
            score ← score + 10
        END IF

        item.relevanceScore ← score
    END FOR

    // Sort descending by score
    sorted ← items.sortByDescending(relevanceScore)

    RETURN sorted
END
```

### Complexity Analysis

**Time Complexity:** O(n log n)
- Category filtering: O(n)
- Duplicate removal: O(n)
- Sorting: O(n log n) dominates
- n = number of menu items (typically 10-30)

**Space Complexity:** O(n)
- Filtered arrays: O(n)
- Set for duplicates: O(n)

### Test Anchors

```javascript
// TDD Test Anchors:

// Test 1: Filter by category
menuData = {items: [
    {name: "Chicken", category: "Entree"},
    {name: "Green Beans", category: "Vegetable"},
    {name: "Milk", category: "Beverage"}
]}
result = extractMainItems(menuData)
assert(result.length === 1)
assert(result[0].name === "Chicken")

// Test 2: Exclude by keyword
menuData = {items: [
    {name: "Chicken Sandwich", category: "Other"},
    {name: "Side Salad", category: "Other"}
]}
result = extractMainItems(menuData)
assert(result.length === 1)
assert(result[0].name === "Chicken Sandwich")

// Test 3: Filter by nutrition
menuData = {items: [
    {name: "Main", nutrients: {calories: 400, protein: 20}},
    {name: "Snack", nutrients: {calories: 50, protein: 2}}
]}
result = extractMainItems(menuData)
assert(result.length === 1)
assert(result[0].name === "Main")

// Test 4: Remove duplicates
menuData = {items: [
    {name: "Pizza", category: "Entree"},
    {name: "PIZZA", category: "Entree"},
    {name: "pizza", category: "Entree"}
]}
result = extractMainItems(menuData)
assert(result.length === 1)

// Test 5: Respect maxItems limit
menuData = {items: createNItems(10, "Entree")}
result = extractMainItems(menuData, 3)
assert(result.length === 3)

// Test 6: Handle empty input
result = extractMainItems({items: []})
assert(result.length === 0)

// Test 7: Sort by relevance
menuData = {items: [
    {name: "A", category: "Other", nutrients: null},
    {name: "B", category: "Entree", nutrients: {calories: 400}},
    {name: "C", category: "Pizza"}
]}
result = extractMainItems(menuData)
assert(result[0].name === "B")  // Highest relevance score
```

---

## Algorithm 4: 5-Day Calendar Builder

### Purpose
Build a 5-day school lunch menu calendar starting from a given date.

### Algorithm Specification

```
ALGORITHM: buildMenuCalendar
INPUT:
    startDate (Date) - Starting date (typically today)
    schoolId (String) - School identifier
    holidays (Set<Date>) - Holiday dates
    cacheManager (Cache) - Cache instance
OUTPUT:
    calendar (Array<Object>) - 5-day menu calendar

CONSTANTS:
    CALENDAR_DAYS = 5

BEGIN
    // Validate inputs
    IF startDate is null OR schoolId is empty THEN
        RETURN error("Invalid parameters")
    END IF

    calendar ← []
    currentDate ← startDate
    daysProcessed ← 0

    // Build calendar for next 5 school days
    WHILE daysProcessed < CALENDAR_DAYS DO
        // Get next school day
        schoolDay ← getNextSchoolDay(currentDate, 1, holidays)

        // Fetch menu for this day
        TRY
            menuData ← fetchMenuForDate(schoolDay, schoolId, cacheManager)
            mainItems ← extractMainItems(menuData, 3)

            // Create calendar entry
            calendarEntry ← {
                date: schoolDay,
                dayOfWeek: getDayOfWeekName(schoolDay),
                formattedDate: formatDate(schoolDay, "MMM D"),
                items: mainItems,
                hasMenu: mainItems.length > 0,
                error: null
            }

            calendar.append(calendarEntry)

        CATCH fetchError
            // Handle individual day failure gracefully
            calendarEntry ← {
                date: schoolDay,
                dayOfWeek: getDayOfWeekName(schoolDay),
                formattedDate: formatDate(schoolDay, "MMM D"),
                items: [],
                hasMenu: false,
                error: "Unable to fetch menu"
            }

            calendar.append(calendarEntry)
        END TRY

        // Move to next day
        currentDate ← schoolDay
        daysProcessed ← daysProcessed + 1
    END WHILE

    RETURN calendar
END

SUBROUTINE: getDayOfWeekName
INPUT: date (Date)
OUTPUT: dayName (String)

BEGIN
    dayIndex ← date.getDayOfWeek()
    dayNames ← ["Sunday", "Monday", "Tuesday", "Wednesday",
                "Thursday", "Friday", "Saturday"]

    RETURN dayNames[dayIndex]
END
```

### Complexity Analysis

**Time Complexity:** O(d * (s + f))
- d = number of calendar days (5)
- s = school day calculation O(1) average
- f = menu fetch O(1) amortized with cache
- Overall: O(1) constant for fixed 5 days

**Space Complexity:** O(d * m)
- d = 5 days
- m = menu items per day
- Total: O(15-25) items typically

### Test Anchors

```javascript
// TDD Test Anchors:

// Test 1: Build complete 5-day calendar
calendar = buildMenuCalendar("2025-10-20", "school123", holidays)
assert(calendar.length === 5)
assert(calendar[0].date === "2025-10-20")
assert(calendar[4].date === "2025-10-24")

// Test 2: Skip weekend correctly
calendar = buildMenuCalendar("2025-10-23", "school123", holidays)  // Thursday
assert(calendar[1].dayOfWeek === "Friday")
assert(calendar[2].dayOfWeek === "Monday")  // Skips weekend

// Test 3: Handle holidays
holidays = ["2025-10-22"]
calendar = buildMenuCalendar("2025-10-21", "school123", holidays)
assert(!calendar.some(day => day.date === "2025-10-22"))

// Test 4: Graceful error handling
mockFetchError("2025-10-22")
calendar = buildMenuCalendar("2025-10-20", "school123", holidays)
assert(calendar.length === 5)  // Still returns 5 days
assert(calendar[2].error !== null)  // Error for failed day
assert(calendar[2].hasMenu === false)

// Test 5: Date formatting
calendar = buildMenuCalendar("2025-10-20", "school123", holidays)
assert(calendar[0].formattedDate === "Oct 20")
assert(calendar[0].dayOfWeek === "Monday")

// Test 6: Items limited to 3 per day
mockMenuWith10Items()
calendar = buildMenuCalendar("2025-10-20", "school123", holidays)
calendar.forEach(day => {
    if (day.hasMenu) assert(day.items.length <= 3)
})
```

---

## Algorithm 5: Weather Overlay Data

### Purpose
Fetch morning weather forecast for a given location to overlay on calendar display.

### Algorithm Specification

```
ALGORITHM: fetchMorningWeather
INPUT:
    zipCode (String) - US ZIP code
    targetDate (Date) - Date for forecast (default: today)
    weatherAPI (String) - Weather service API key
OUTPUT:
    weatherData (Object) - Morning weather forecast

CONSTANTS:
    WEATHER_API_URL = "https://api.weather.gov/points"
    MORNING_HOUR_START = 6
    MORNING_HOUR_END = 9
    CACHE_TTL = 1800  // 30 minutes

BEGIN
    // Validate inputs
    IF NOT isValidZipCode(zipCode) THEN
        RETURN error("Invalid ZIP code")
    END IF

    // Check cache
    cacheKey ← "weather:" + zipCode + ":" + formatDate(targetDate, "YYYY-MM-DD")
    cachedWeather ← cache.get(cacheKey)
    IF cachedWeather is not null THEN
        RETURN cachedWeather
    END IF

    // Convert ZIP to coordinates
    coordinates ← zipToCoordinates(zipCode)
    IF coordinates is null THEN
        RETURN getFallbackWeather()
    END IF

    // Fetch weather data
    TRY
        // Get grid point data
        gridUrl ← WEATHER_API_URL + "/" + coordinates.lat + "," + coordinates.lon
        gridResponse ← HTTP_GET(gridUrl, {timeout: 5000})

        IF gridResponse.status ≠ 200 THEN
            THROW error("Grid lookup failed")
        END IF

        gridData ← JSON.parse(gridResponse.body)
        forecastUrl ← gridData.properties.forecast

        // Get hourly forecast
        hourlyResponse ← HTTP_GET(forecastUrl + "/hourly", {timeout: 5000})

        IF hourlyResponse.status ≠ 200 THEN
            THROW error("Forecast fetch failed")
        END IF

        forecastData ← JSON.parse(hourlyResponse.body)

        // Extract morning period
        morningForecast ← extractMorningPeriod(forecastData, targetDate)

        weatherResult ← {
            temperature: morningForecast.temperature,
            temperatureUnit: morningForecast.temperatureUnit,
            conditions: morningForecast.shortForecast,
            icon: morningForecast.icon,
            windSpeed: morningForecast.windSpeed,
            humidity: morningForecast.relativeHumidity,
            zipCode: zipCode,
            fetchedAt: getCurrentTimestamp()
        }

        // Cache result
        cache.set(cacheKey, weatherResult, CACHE_TTL)

        RETURN weatherResult

    CATCH weatherError
        // Return fallback on error
        RETURN getFallbackWeather()
    END TRY
END

SUBROUTINE: extractMorningPeriod
INPUT:
    forecastData (Object) - Hourly forecast data
    targetDate (Date)
OUTPUT:
    morningPeriod (Object)

BEGIN
    periods ← forecastData.properties.periods
    targetDateStr ← formatDate(targetDate, "YYYY-MM-DD")

    morningPeriods ← []

    FOR EACH period IN periods DO
        periodTime ← parseDateTime(period.startTime)
        periodDate ← formatDate(periodTime, "YYYY-MM-DD")
        periodHour ← periodTime.getHours()

        // Check if this is morning on target date
        IF periodDate = targetDateStr AND
           periodHour >= MORNING_HOUR_START AND
           periodHour < MORNING_HOUR_END THEN
            morningPeriods.append(period)
        END IF
    END FOR

    // Return 7 AM forecast if available, otherwise first morning period
    FOR EACH period IN morningPeriods DO
        periodHour ← parseDateTime(period.startTime).getHours()
        IF periodHour = 7 THEN
            RETURN period
        END IF
    END FOR

    IF morningPeriods.length > 0 THEN
        RETURN morningPeriods[0]
    END IF

    // Fallback to first available period for the day
    FOR EACH period IN periods DO
        periodTime ← parseDateTime(period.startTime)
        periodDate ← formatDate(periodTime, "YYYY-MM-DD")
        IF periodDate = targetDateStr THEN
            RETURN period
        END IF
    END FOR

    RETURN null
END

SUBROUTINE: zipToCoordinates
INPUT: zipCode (String)
OUTPUT: coordinates (Object) or null

BEGIN
    // This would use a ZIP code database or geocoding service
    // Simplified for pseudocode

    TRY
        geocodeUrl ← "https://geocoding-api/zip/" + zipCode
        response ← HTTP_GET(geocodeUrl, {timeout: 3000})

        IF response.status = 200 THEN
            data ← JSON.parse(response.body)
            RETURN {
                lat: data.latitude,
                lon: data.longitude
            }
        END IF

    CATCH error
        RETURN null
    END TRY

    RETURN null
END

SUBROUTINE: getFallbackWeather
OUTPUT: fallbackData (Object)

BEGIN
    // Return generic weather when actual data unavailable
    RETURN {
        temperature: null,
        temperatureUnit: "F",
        conditions: "Weather data unavailable",
        icon: null,
        windSpeed: null,
        humidity: null,
        isFallback: true
    }
END

SUBROUTINE: isValidZipCode
INPUT: zipCode (String)
OUTPUT: isValid (Boolean)

BEGIN
    // US ZIP code validation
    IF zipCode is null OR zipCode.length ≠ 5 THEN
        RETURN false
    END IF

    // Check all characters are digits
    FOR EACH char IN zipCode DO
        IF NOT isDigit(char) THEN
            RETURN false
        END IF
    END FOR

    RETURN true
END
```

### Complexity Analysis

**Time Complexity:** O(1) amortized
- HTTP requests: O(1) network time
- Forecast parsing: O(p) where p = periods (typically 24-48)
- Cache lookup: O(1)

**Space Complexity:** O(1)
- Weather data: Fixed size object
- Cache storage: O(z) where z = unique ZIP codes

### Test Anchors

```javascript
// TDD Test Anchors:

// Test 1: Valid ZIP code with morning forecast
weather = fetchMorningWeather("10001", "2025-10-20")
assert(weather.temperature !== null)
assert(weather.conditions !== null)
assert(weather.temperatureUnit === "F")

// Test 2: Cache hit
cache.set("weather:10001:2025-10-20", cachedData)
weather = fetchMorningWeather("10001", "2025-10-20")
assert(weather === cachedData)  // No API call

// Test 3: Invalid ZIP code
weather = fetchMorningWeather("invalid", "2025-10-20")
assert(weather.isFallback === true)

// Test 4: Extract 7 AM forecast
mockForecastWithHourly(6, 7, 8, 9)
weather = fetchMorningWeather("10001", "2025-10-20")
assert(extractedHour(weather) === 7)

// Test 5: API error fallback
mockWeatherAPIError()
weather = fetchMorningWeather("10001", "2025-10-20")
assert(weather.isFallback === true)
assert(weather.conditions === "Weather data unavailable")

// Test 6: ZIP code validation
assert(isValidZipCode("12345") === true)
assert(isValidZipCode("1234") === false)
assert(isValidZipCode("abcde") === false)
assert(isValidZipCode(null) === false)

// Test 7: Morning period extraction
forecastData = loadFixture("weather-hourly.json")
morning = extractMorningPeriod(forecastData, "2025-10-20")
assert(morning !== null)
assert(morning.startTime.includes("T06:") || morning.startTime.includes("T07:"))
```

---

## Algorithm 6: Alexa Response Builder

### Purpose
Build Alexa response with speech output and optional APL visual display.

### Algorithm Specification

```
ALGORITHM: buildMenuResponse
INPUT:
    calendar (Array<Object>) - 5-day menu calendar
    weather (Object) - Weather data
    deviceCapabilities (Object) - Device support info
    requestType (String) - "today" | "tomorrow" | "week"
OUTPUT:
    alexaResponse (Object) - Complete Alexa response

BEGIN
    // Determine response scope
    IF requestType = "today" THEN
        relevantDays ← [calendar[0]]
        speechPrefix ← "Today's lunch is "
    ELSE IF requestType = "tomorrow" THEN
        relevantDays ← [calendar[1]]
        speechPrefix ← "Tomorrow's lunch is "
    ELSE  // "week"
        relevantDays ← calendar
        speechPrefix ← "Here's this week's lunch menu. "
    END IF

    // Build speech output
    speechText ← buildSpeechText(relevantDays, speechPrefix)

    // Check if device supports APL
    supportsAPL ← deviceCapabilities.supportedInterfaces.contains("Alexa.Presentation.APL")

    // Build base response
    response ← {
        version: "1.0",
        response: {
            outputSpeech: {
                type: "SSML",
                ssml: "<speak>" + speechText + "</speak>"
            },
            card: {
                type: "Simple",
                title: "Lunch Dad",
                content: speechText
            },
            shouldEndSession: true
        }
    }

    // Add APL visual if supported
    IF supportsAPL THEN
        aplDocument ← buildAPLDocument(relevantDays, weather, requestType)

        response.response.directives ← [{
            type: "Alexa.Presentation.APL.RenderDocument",
            token: "menuDisplay",
            document: aplDocument.document,
            datasources: aplDocument.datasources
        }]
    END IF

    RETURN response
END

SUBROUTINE: buildSpeechText
INPUT:
    days (Array<Object>) - Calendar days
    prefix (String)
OUTPUT:
    speechText (String)

BEGIN
    text ← prefix

    IF days.length = 1 THEN
        // Single day response
        day ← days[0]

        IF NOT day.hasMenu OR day.items.length = 0 THEN
            text ← text + "No menu information is available."
        ELSE
            itemNames ← []
            FOR EACH item IN day.items DO
                itemNames.append(item.name)
            END FOR

            text ← text + joinWithAnd(itemNames) + "."
        END IF

    ELSE
        // Multi-day response
        FOR i ← 0 TO days.length - 1 DO
            day ← days[i]

            text ← text + day.dayOfWeek + ": "

            IF day.hasMenu AND day.items.length > 0 THEN
                // Use first 2 items for speech brevity
                itemNames ← [day.items[0].name]
                IF day.items.length > 1 THEN
                    itemNames.append(day.items[1].name)
                END IF

                text ← text + joinWithAnd(itemNames)

                IF day.items.length > 2 THEN
                    text ← text + ", and more"
                END IF
            ELSE
                text ← text + "No menu available"
            END IF

            text ← text + ". "
        END FOR
    END IF

    RETURN text
END

SUBROUTINE: buildAPLDocument
INPUT:
    days (Array<Object>) - Calendar days
    weather (Object) - Weather data
    viewType (String) - Display layout type
OUTPUT:
    aplPackage (Object) - APL document + datasources

BEGIN
    // Determine layout template
    IF viewType = "today" OR viewType = "tomorrow" THEN
        templateType ← "singleDay"
    ELSE
        templateType ← "weekView"
    END IF

    // Build APL document structure
    document ← {
        type: "APL",
        version: "2024.2",
        theme: "light",
        mainTemplate: {
            parameters: ["menuData", "weatherData"],
            items: [buildMainLayout(templateType)]
        }
    }

    // Build datasources
    datasources ← {
        menuData: {
            type: "object",
            properties: {
                days: formatDaysForAPL(days),
                viewType: viewType,
                title: getTitleForView(viewType)
            }
        },
        weatherData: {
            type: "object",
            properties: formatWeatherForAPL(weather)
        }
    }

    RETURN {
        document: document,
        datasources: datasources
    }
END

SUBROUTINE: buildMainLayout
INPUT: templateType (String)
OUTPUT: layoutComponent (Object)

BEGIN
    IF templateType = "singleDay" THEN
        RETURN {
            type: "Container",
            width: "100vw",
            height: "100vh",
            items: [
                buildWeatherHeader(),
                buildDayDetailView(),
                buildNutritionInfo()
            ]
        }
    ELSE  // weekView
        RETURN {
            type: "Container",
            width: "100vw",
            height: "100vh",
            items: [
                buildWeatherHeader(),
                buildWeekCalendarGrid(),
                buildFooter()
            ]
        }
    END IF
END

SUBROUTINE: buildWeatherHeader
OUTPUT: headerComponent (Object)

BEGIN
    RETURN {
        type: "Container",
        direction: "row",
        alignItems: "center",
        paddingLeft: "40dp",
        paddingRight: "40dp",
        paddingTop: "20dp",
        items: [
            {
                type: "Text",
                text: "${weatherData.conditions}",
                fontSize: "32dp",
                color: "#FFFFFF"
            },
            {
                type: "Text",
                text: "${weatherData.temperature}°${weatherData.temperatureUnit}",
                fontSize: "48dp",
                color: "#FFFFFF",
                fontWeight: "bold"
            },
            {
                type: "Image",
                source: "${weatherData.icon}",
                width: "80dp",
                height: "80dp"
            }
        ]
    }
END

SUBROUTINE: buildWeekCalendarGrid
OUTPUT: gridComponent (Object)

BEGIN
    RETURN {
        type: "Container",
        direction: "row",
        justifyContent: "spaceAround",
        width: "100%",
        paddingLeft: "20dp",
        paddingRight: "20dp",
        items: {
            type: "Sequence",
            data: "${menuData.days}",
            width: "18%",
            items: [
                {
                    type: "Container",
                    items: [
                        {
                            type: "Text",
                            text: "${data.dayOfWeek}",
                            fontSize: "24dp",
                            fontWeight: "bold",
                            textAlign: "center"
                        },
                        {
                            type: "Text",
                            text: "${data.formattedDate}",
                            fontSize: "18dp",
                            textAlign: "center",
                            color: "#666666"
                        },
                        {
                            type: "Container",
                            items: {
                                type: "Sequence",
                                data: "${data.items}",
                                items: [
                                    {
                                        type: "Text",
                                        text: "${data.name}",
                                        fontSize: "16dp",
                                        textAlign: "center",
                                        maxLines: 2
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
    }
END

SUBROUTINE: joinWithAnd
INPUT: items (Array<String>)
OUTPUT: joined (String)

BEGIN
    IF items.length = 0 THEN
        RETURN ""
    ELSE IF items.length = 1 THEN
        RETURN items[0]
    ELSE IF items.length = 2 THEN
        RETURN items[0] + " and " + items[1]
    ELSE
        result ← ""
        FOR i ← 0 TO items.length - 2 DO
            result ← result + items[i] + ", "
        END FOR
        result ← result + "and " + items[items.length - 1]
        RETURN result
    END IF
END
```

### Complexity Analysis

**Time Complexity:** O(d * i)
- d = number of days (1-5)
- i = items per day (1-5)
- Speech building: O(d * i)
- APL building: O(d * i)
- Overall: O(1) for bounded input

**Space Complexity:** O(d * i)
- Response object: O(d * i)
- APL document: O(d * i)

### Test Anchors

```javascript
// TDD Test Anchors:

// Test 1: Today's menu - voice only
calendar = mockCalendar(1)
response = buildMenuResponse(calendar, weather, {supportedInterfaces: []}, "today")
assert(response.response.outputSpeech.ssml.includes("Today's lunch is"))
assert(!response.response.directives)

// Test 2: Today's menu - with APL
response = buildMenuResponse(calendar, weather, {supportedInterfaces: ["Alexa.Presentation.APL"]}, "today")
assert(response.response.directives.length === 1)
assert(response.response.directives[0].type === "Alexa.Presentation.APL.RenderDocument")

// Test 3: Week view speech
calendar = mockCalendar(5)
response = buildMenuResponse(calendar, weather, {}, "week")
assert(response.response.outputSpeech.ssml.includes("Monday:"))
assert(response.response.outputSpeech.ssml.includes("Friday:"))

// Test 4: No menu available
calendar = [{hasMenu: false, items: [], dayOfWeek: "Monday"}]
response = buildMenuResponse(calendar, weather, {}, "today")
assert(response.response.outputSpeech.ssml.includes("No menu information"))

// Test 5: Speech formatting with multiple items
day = {hasMenu: true, items: [{name: "Pizza"}, {name: "Burger"}, {name: "Salad"}]}
speech = buildSpeechText([day], "Today's lunch is ")
assert(speech.includes("Pizza, Burger, and Salad"))

// Test 6: APL datasource structure
calendar = mockCalendar(5)
apl = buildAPLDocument(calendar, weather, "week")
assert(apl.datasources.menuData.properties.days.length === 5)
assert(apl.datasources.weatherData.properties.temperature !== undefined)

// Test 7: Single vs multi-day layouts
aplSingle = buildAPLDocument([mockDay()], weather, "today")
aplWeek = buildAPLDocument(mockCalendar(5), weather, "week")
assert(aplSingle.document.mainTemplate.items[0].type === "Container")
assert(aplWeek.document.mainTemplate.items[0].type === "Container")
```

---

## Integration & Data Flow

### Complete Request Flow

```
ALGORITHM: handleAlexaRequest
INPUT: alexaRequest (Object)
OUTPUT: alexaResponse (Object)

BEGIN
    // Parse request
    intent ← alexaRequest.request.intent.name
    slots ← alexaRequest.request.intent.slots
    device ← alexaRequest.context.System.device

    // Determine request type
    IF intent = "GetTodaysLunchIntent" THEN
        requestType ← "today"
        daysToFetch ← 1
    ELSE IF intent = "GetTomorrowsLunchIntent" THEN
        requestType ← "tomorrow"
        daysToFetch ← 2
    ELSE IF intent = "GetWeekLunchIntent" THEN
        requestType ← "week"
        daysToFetch ← 5
    ELSE
        RETURN buildErrorResponse("I didn't understand that request.")
    END IF

    // Get configuration
    schoolId ← getSchoolId(alexaRequest.context.System.user.userId)
    zipCode ← getZipCode(alexaRequest.context.System.user.userId)
    holidays ← loadHolidays()

    // Build calendar
    today ← getCurrentDate()
    calendar ← buildMenuCalendar(today, schoolId, holidays, cache)

    // Limit calendar based on request
    calendar ← calendar.slice(0, daysToFetch)

    // Fetch weather
    weather ← fetchMorningWeather(zipCode, today, weatherAPIKey)

    // Build response
    response ← buildMenuResponse(
        calendar,
        weather,
        device.supportedInterfaces,
        requestType
    )

    RETURN response
END
```

### Error Handling Strategy

```
ERROR HANDLING TIERS:

Tier 1: Input Validation
    - Validate all user inputs
    - Return user-friendly error messages
    - Example: "Invalid ZIP code format"

Tier 2: External API Failures
    - Implement retry logic (3 attempts)
    - Fall back to cached data when available
    - Return partial results when possible
    - Example: Show menu without weather overlay

Tier 3: Data Processing Errors
    - Handle missing/malformed data gracefully
    - Use default values where appropriate
    - Log errors for monitoring
    - Example: Empty menu list vs. error message

Tier 4: Critical Failures
    - Return generic Alexa error response
    - Log complete error details
    - Alert monitoring system
    - Example: "Sorry, I'm having trouble right now"
```

---

## Performance Optimization Notes

### Caching Strategy
- Menu data: 1 hour TTL
- Weather data: 30 minutes TTL
- Holiday list: 24 hours TTL
- ZIP code coordinates: Permanent (until cleared)

### Batch Operations
- Fetch all 5 days in parallel where possible
- Pre-warm cache for next school day
- Background refresh for popular schools

### Response Time Targets
- Voice-only response: < 500ms
- APL visual response: < 1000ms
- Cache hit: < 100ms

---

## Test Coverage Requirements

Each algorithm must have:
1. Happy path tests (normal operation)
2. Edge case tests (boundaries, empty inputs)
3. Error condition tests (network failures, invalid data)
4. Integration tests (algorithm combinations)
5. Performance tests (response time validation)

Minimum coverage: 90% for all algorithms

---

## Dependencies & Assumptions

### External Dependencies
- Nutrislice API (school menu data)
- Weather.gov API (weather forecasts)
- ZIP code geocoding service
- Alexa Skills Kit SDK

### Assumptions
- School week is Monday-Friday
- Lunch menu updates daily
- Weather forecasts available 7 days ahead
- APL 2024.2 specification support
- Maximum 30 menu items per day

---

## Next Steps (Architecture Phase)

The following should be designed in the Architecture phase:
1. System component diagram
2. API integration patterns
3. Data storage schema
4. Caching layer architecture
5. Error monitoring setup
6. Lambda function structure
7. APL component library
8. Test infrastructure

---

**Document Version:** 1.0
**Created:** 2025-10-22
**SPARC Phase:** Pseudocode
**Status:** Ready for Architecture Phase
