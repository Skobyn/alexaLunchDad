# Testing Guide - Alexa Lunch Dad Skill

Comprehensive testing guide for the Alexa Lunch Dad skill, covering unit tests, integration tests, and manual testing procedures.

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [Manual Testing](#manual-testing)
7. [Test Coverage](#test-coverage)
8. [Testing Checklist](#testing-checklist)
9. [Troubleshooting Tests](#troubleshooting-tests)
10. [CI/CD Testing](#cicd-testing)

---

## Overview

### Testing Philosophy

- **Test-Driven Development (TDD)**: Write tests before implementation
- **Comprehensive Coverage**: Target 80%+ code coverage
- **Fast Feedback**: Tests should run quickly (under 10 seconds)
- **Isolated Tests**: Each test should be independent
- **Realistic Scenarios**: Test real-world use cases

### Testing Tools

- **Jest**: Test framework and assertion library
- **Nock**: HTTP mocking for API calls
- **AWS SDK Mock**: Mock AWS services (future use)
- **Alexa Test Framework**: Custom test utilities for Alexa requests

---

## Test Structure

### Directory Layout

```
tests/
├── unit/                    # Unit tests (isolated component tests)
│   ├── handlers/           # Handler unit tests
│   ├── intents/            # Intent handler unit tests
│   ├── services/           # Service unit tests
│   └── utils/              # Utility function unit tests
├── integration/            # Integration tests (end-to-end)
│   ├── alexa-requests/    # Full Alexa request/response tests
│   └── api-integration/   # External API integration tests
├── fixtures/               # Test data and mock responses
│   ├── nutrislice/        # Mock Nutrislice menu data
│   ├── weather/           # Mock Weather.gov responses
│   └── alexa-events/      # Sample Alexa request events
└── helpers/                # Test utility functions
    ├── alexaTestHelper.js # Alexa request builders
    └── mockData.js        # Shared mock data
```

### Test File Naming

- Unit tests: `<module>.test.js` (e.g., `menuParser.test.js`)
- Integration tests: `<feature>.integration.test.js`
- Test files should mirror source file structure

---

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch
```

### Jest Commands

```bash
# Run specific test file
npx jest tests/unit/services/nutrisliceService.test.js

# Run tests matching pattern
npx jest --testNamePattern="should fetch menu"

# Run tests for changed files only
npx jest --onlyChanged

# Run tests with verbose output
npx jest --verbose

# Update snapshots
npx jest --updateSnapshot
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Coverage report location
open coverage/lcov-report/index.html

# Coverage summary in terminal
npm test -- --coverage --coverageReporters=text
```

---

## Unit Testing

### Testing Handlers

Example: Testing Launch Request Handler

```javascript
// tests/unit/handlers/LaunchRequestHandler.test.js
const LaunchRequestHandler = require('../../../src/handlers/LaunchRequestHandler');

describe('LaunchRequestHandler', () => {
  let handlerInput;

  beforeEach(() => {
    handlerInput = {
      requestEnvelope: {
        request: {
          type: 'LaunchRequest'
        }
      },
      responseBuilder: {
        speak: jest.fn().mockReturnThis(),
        reprompt: jest.fn().mockReturnThis(),
        getResponse: jest.fn().mockReturnValue({})
      }
    };
  });

  test('should handle LaunchRequest', () => {
    expect(LaunchRequestHandler.canHandle(handlerInput)).toBe(true);
  });

  test('should return welcome message', async () => {
    await LaunchRequestHandler.handle(handlerInput);

    expect(handlerInput.responseBuilder.speak).toHaveBeenCalledWith(
      expect.stringContaining('Welcome to Lunch Dad')
    );
  });
});
```

### Testing Services

Example: Testing Nutrislice Service

```javascript
// tests/unit/services/nutrisliceService.test.js
const nutrisliceService = require('../../../src/services/nutrisliceService');
const nock = require('nock');

describe('nutrisliceService', () => {
  beforeEach(() => {
    // Clear cache before each test
    jest.clearAllMocks();
    nock.cleanAll();
  });

  test('should fetch menu for valid date', async () => {
    const mockMenuHtml = '<div class="food-item">Pizza</div>';

    nock('https://d45.nutrislice.com')
      .get('/menu/westmore-elementary-school-2/menu/2025-10-22')
      .reply(200, mockMenuHtml);

    const menu = await nutrisliceService.getMenu('2025-10-22');

    expect(menu).toBeDefined();
    expect(menu.items).toContain('Pizza');
  });

  test('should handle API timeout', async () => {
    nock('https://d45.nutrislice.com')
      .get(/.*/)
      .delayConnection(6000)
      .reply(200);

    await expect(
      nutrisliceService.getMenu('2025-10-22')
    ).rejects.toThrow('timeout');
  });

  test('should use cached menu data', async () => {
    // First call - fetches from API
    nock('https://d45.nutrislice.com')
      .get(/.*/)
      .reply(200, '<div>Pizza</div>');

    await nutrisliceService.getMenu('2025-10-22');

    // Second call - should use cache (no new nock intercept)
    const cachedMenu = await nutrisliceService.getMenu('2025-10-22');

    expect(cachedMenu).toBeDefined();
  });
});
```

### Testing Utilities

Example: Testing Date Utilities

```javascript
// tests/unit/utils/dateUtils.test.js
const dateUtils = require('../../../src/utils/dateUtils');

describe('dateUtils', () => {
  test('should get today in school timezone', () => {
    const today = dateUtils.getTodayInSchoolTime();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('should detect weekends', () => {
    expect(dateUtils.isWeekend('2025-10-25')).toBe(true); // Saturday
    expect(dateUtils.isWeekend('2025-10-23')).toBe(false); // Thursday
  });

  test('should detect school holidays', () => {
    expect(dateUtils.isSchoolHoliday('2025-12-25')).toBe(true); // Christmas
    expect(dateUtils.isSchoolHoliday('2025-10-23')).toBe(false);
  });

  test('should get next school day', () => {
    // Friday -> Monday
    expect(dateUtils.getNextSchoolDay('2025-10-24')).toBe('2025-10-27');

    // Thursday -> Friday
    expect(dateUtils.getNextSchoolDay('2025-10-23')).toBe('2025-10-24');
  });
});
```

---

## Integration Testing

### Testing Complete Alexa Requests

Example: End-to-end intent testing

```javascript
// tests/integration/alexa-requests/getLunchIntent.integration.test.js
const handler = require('../../../src/index').handler;
const nock = require('nock');

describe('GetLunchIntent Integration', () => {
  beforeEach(() => {
    nock.cleanAll();

    // Mock Nutrislice API
    nock('https://d45.nutrislice.com')
      .get(/.*/)
      .reply(200, require('../../fixtures/nutrislice/menu-response.html'));

    // Mock Weather.gov API
    nock('https://api.weather.gov')
      .get(/.*/)
      .reply(200, require('../../fixtures/weather/forecast-response.json'));
  });

  test('should provide lunch recommendation', async () => {
    const event = {
      version: '1.0',
      session: {
        new: true,
        sessionId: 'test-session-id',
        application: { applicationId: 'amzn1.ask.skill.test' }
      },
      request: {
        type: 'IntentRequest',
        requestId: 'test-request-id',
        intent: {
          name: 'GetLunchIntent',
          slots: {}
        }
      }
    };

    const response = await handler(event);

    expect(response.response.outputSpeech.ssml).toContain('lunch');
    expect(response.response.shouldEndSession).toBe(true);
  });
});
```

### Testing API Integrations

```javascript
// tests/integration/api-integration/weatherService.integration.test.js
const weatherService = require('../../../src/services/weatherService');

describe('Weather Service Integration', () => {
  // These tests hit the real Weather.gov API
  // Only run when INTEGRATION_TESTS=true

  const runIntegration = process.env.INTEGRATION_TESTS === 'true';

  (runIntegration ? test : test.skip)('should fetch real weather data', async () => {
    const weather = await weatherService.getCurrentWeather();

    expect(weather).toBeDefined();
    expect(weather.temperature).toBeGreaterThan(-50);
    expect(weather.temperature).toBeLessThan(150);
  }, 10000); // 10 second timeout for network requests
});
```

---

## Manual Testing

### 1. Local Testing with SAM

```bash
# Start local Lambda emulator
npm run local

# Invoke with sample event
npm run local:invoke

# Custom event
sam local invoke AlexaLunchDadFunction \
  --event tests/fixtures/alexa-events/launch-request.json
```

### 2. Alexa Developer Console Testing

1. **Navigate to Test Tab**
   - Go to https://developer.amazon.com/alexa/console/ask
   - Select your skill
   - Click "Test" tab

2. **Enable Testing**
   - Set "Skill testing is enabled in:" to "Development"

3. **Test Launch**
   - Type or speak: "Open lunch dad"
   - Expected response: Welcome message with today's menu

4. **Test Intents**

   **GetTodayMenuIntent**:
   - Input: "What's for lunch today?"
   - Expected: Today's menu items

   **GetTomorrowMenuIntent**:
   - Input: "What's for lunch tomorrow?"
   - Expected: Tomorrow's menu items

   **GetLunchIntent**:
   - Input: "Should I bring lunch?"
   - Expected: Recommendation based on menu and weather

5. **Test Error Scenarios**
   - Ask for menu on weekend
   - Ask for menu on holiday
   - Test with no network (should gracefully handle)

### 3. Testing with Physical Alexa Device

1. **Register Device**
   - Ensure Alexa device is registered to your Amazon account
   - Same account as Alexa Developer Console

2. **Enable Skill**
   - Skill is automatically available on your device
   - No need to publish to use in development

3. **Voice Testing**
   - "Alexa, open lunch dad"
   - Test natural variations:
     - "Alexa, ask lunch dad what's for lunch"
     - "Alexa, ask lunch dad about tomorrow's menu"
     - "Alexa, ask lunch dad if I should pack lunch"

### 4. Testing Deployed Lambda

```bash
# Test dev environment
aws lambda invoke \
  --function-name AlexaLunchDad-dev \
  --payload file://tests/fixtures/alexa-events/launch-request.json \
  response.json

# View response
cat response.json | jq '.'

# Test production environment
aws lambda invoke \
  --function-name AlexaLunchDad-prod \
  --payload file://tests/fixtures/alexa-events/get-lunch-intent.json \
  response.json
```

---

## Test Coverage

### Coverage Requirements

- **Overall Coverage**: Minimum 80%
- **Critical Paths**: 100% (handlers, core services)
- **Utilities**: 90%+
- **Error Handling**: All error paths tested

### Viewing Coverage

```bash
# Generate HTML coverage report
npm run test:coverage

# Open in browser
open coverage/lcov-report/index.html

# Text summary
npm test -- --coverage --coverageReporters=text-summary
```

### Coverage Report Example

```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|-------------------
All files           |   85.23 |    78.45 |   88.12 |   86.15 |
 handlers/          |   92.15 |    85.32 |   95.00 |   93.24 |
  LaunchRequest...  |  100.00 |   100.00 |  100.00 |  100.00 |
  ErrorHandler.js   |   88.24 |    75.00 |   85.71 |   89.47 | 23-25,45
 services/          |   81.42 |    72.15 |   84.21 |   82.35 |
  nutrislice...     |   85.71 |    78.26 |   87.50 |   86.36 | 67-72,108
  weatherService.js |   77.14 |    66.04 |   81.25 |   78.57 | 45-52,89-95
 utils/             |   90.24 |    88.16 |   92.31 |   91.15 |
  dateUtils.js      |   94.12 |    91.67 |  100.00 |   95.24 | 78,112
  menuParser.js     |   86.36 |    84.62 |   85.71 |   87.50 | 34-38
--------------------|---------|----------|---------|---------|-------------------
```

### Improving Coverage

```bash
# Identify uncovered lines
npm test -- --coverage --collectCoverageFrom='src/**/*.js'

# Run coverage for specific file
npx jest --coverage --collectCoverageFrom='src/services/nutrisliceService.js'
```

---

## Testing Checklist

### Pre-Deployment Testing

- [ ] All unit tests pass (`npm run test:unit`)
- [ ] All integration tests pass (`npm run test:integration`)
- [ ] Code coverage meets threshold (80%+)
- [ ] Linting passes (`npm run lint`)
- [ ] No console errors or warnings
- [ ] Manual testing in Alexa Developer Console
- [ ] Local Lambda invocation successful

### Intent Testing Checklist

For each intent, verify:

- [ ] **Intent recognition**: Alexa correctly identifies intent
- [ ] **Slot values**: Slots are correctly extracted
- [ ] **Success response**: Valid response for happy path
- [ ] **Error handling**: Graceful failure for errors
- [ ] **Edge cases**: Weekends, holidays, missing data
- [ ] **SSML output**: Proper speech formatting
- [ ] **Card display**: Visual card content (if applicable)
- [ ] **Session management**: Proper session ending

### API Integration Testing

- [ ] **Nutrislice API**:
  - [ ] Successful menu fetch
  - [ ] HTML parsing correctness
  - [ ] Timeout handling
  - [ ] Cache functionality
  - [ ] Date parameter handling

- [ ] **Weather.gov API**:
  - [ ] Grid point lookup
  - [ ] Forecast retrieval
  - [ ] Temperature parsing
  - [ ] Condition extraction
  - [ ] Cache functionality

### Device Testing

- [ ] Echo Dot
- [ ] Echo Show (visual display)
- [ ] Alexa App (mobile)
- [ ] Browser simulator (developer console)

---

## Troubleshooting Tests

### Common Issues

#### 1. Tests Fail - "Cannot find module"

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Jest cache
npx jest --clearCache
```

#### 2. Nock Interceptor Not Found

```javascript
// Ensure nock is properly cleaned
beforeEach(() => {
  nock.cleanAll();
});

afterEach(() => {
  nock.cleanAll();
});

// Enable nock debugging
nock.recorder.rec();
```

#### 3. Async Tests Timeout

```javascript
// Increase timeout for specific test
test('should fetch data', async () => {
  // test code
}, 10000); // 10 second timeout

// Or configure in jest.config.js
module.exports = {
  testTimeout: 10000
};
```

#### 4. Cache Interferes with Tests

```javascript
// Clear cache in beforeEach
const cacheService = require('../../../src/services/cacheService');

beforeEach(() => {
  cacheService.clear(); // If available
  jest.clearAllMocks();
});
```

#### 5. Date/Time Tests Fail

```javascript
// Mock date for consistent testing
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2025-10-22T12:00:00Z'));
});

afterAll(() => {
  jest.useRealTimers();
});
```

### Debug Tests

```bash
# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test with verbose output
npx jest tests/unit/services/nutrisliceService.test.js --verbose

# Show console.log output
npx jest --verbose --silent=false
```

---

## CI/CD Testing

### GitHub Actions Testing

The CI/CD pipeline automatically runs tests on:
- Pull requests
- Pushes to `develop` branch
- Pushes to `main` branch

### Workflow Steps

1. **Install Dependencies**: `npm ci`
2. **Lint Code**: `npm run lint`
3. **Run Tests**: `npm test`
4. **Generate Coverage**: `npm run test:coverage`
5. **Upload Coverage**: Coverage report uploaded to artifacts

### Local CI Simulation

```bash
# Simulate full CI process
npm ci
npm run lint
npm run test:coverage

# CI-specific build
npm run ci:build
```

### Coverage in CI

```yaml
# .github/workflows/test.yml
- name: Run Tests with Coverage
  run: npm run test:coverage

- name: Upload Coverage Report
  uses: actions/upload-artifact@v3
  with:
    name: coverage-report
    path: coverage/
```

---

## Best Practices

### 1. Test Naming

```javascript
// Good: Descriptive test names
test('should return menu items for valid date', () => {});
test('should throw error when API timeout occurs', () => {});

// Bad: Vague test names
test('menu test', () => {});
test('error', () => {});
```

### 2. Arrange-Act-Assert Pattern

```javascript
test('should format menu items correctly', () => {
  // Arrange
  const rawMenu = { items: ['Pizza', 'Salad', 'Milk'] };

  // Act
  const formatted = menuParser.format(rawMenu);

  // Assert
  expect(formatted).toContain('Pizza');
  expect(formatted).toHaveLength(3);
});
```

### 3. Test Independence

```javascript
// Each test should be independent
beforeEach(() => {
  // Reset state before each test
  jest.clearAllMocks();
  nock.cleanAll();
});
```

### 4. Mock External Dependencies

```javascript
// Mock external APIs, don't hit real endpoints
nock('https://api.example.com')
  .get('/data')
  .reply(200, { data: 'mock' });
```

### 5. Test Error Paths

```javascript
test('should handle API error gracefully', async () => {
  nock('https://api.example.com')
    .get('/data')
    .reply(500);

  await expect(service.getData()).rejects.toThrow();
});
```

---

## Additional Resources

### Jest Documentation
- [Jest Getting Started](https://jestjs.io/docs/getting-started)
- [Jest API Reference](https://jestjs.io/docs/api)
- [Jest Matchers](https://jestjs.io/docs/expect)

### Nock Documentation
- [Nock GitHub](https://github.com/nock/nock)
- [Nock API](https://github.com/nock/nock#usage)

### Alexa Testing
- [Alexa Testing Guide](https://developer.amazon.com/en-US/docs/alexa/custom-skills/test-your-skill.html)
- [ASK SDK Test Utils](https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/test-skills.html)

### Project Documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [README.md](../README.md) - Project overview

---

**Last Updated**: 2025-10-22
**Version**: 1.0.0
