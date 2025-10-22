# Lunch Dad - Alexa Skill for School Lunch Menus

> "Alexa, ask Lunch Dad what's for lunch today!"

A production-ready Alexa skill that tells you what's on the school lunch menu for today and tomorrow, with visual calendar displays on Echo Show devices.

## Features

- 🗣️ **Voice Queries**: Ask about today's or tomorrow's lunch menu
- 📅 **5-Day Calendar**: Visual display of the week's lunch menu on Echo Show
- 🌤️ **Weather Integration**: Morning weather overlay for your routine
- 🏫 **School-Aware**: Automatically skips weekends and holidays
- ⚡ **Fast Performance**: In-memory caching for <100ms responses
- 🧪 **Fully Tested**: 334 tests with 90%+ coverage

## Quick Start

### Prerequisites

- Node.js 18.x or later
- AWS CLI configured with credentials
- AWS SAM CLI installed
- Alexa Developer Account

### Installation

```bash
# Clone the repository
cd alexaLunchDad

# Install dependencies
npm install

# Run tests
npm test

# Deploy to development
npm run deploy:dev:guided
```

### First-Time Setup

1. **Deploy the Lambda function:**
   ```bash
   npm run deploy:dev:guided
   ```
   Note the Lambda ARN from the output.

2. **Configure Alexa Skill:**
   - Go to [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
   - Create new skill using files in `/skill-package/`
   - Set endpoint to your Lambda ARN

3. **Test the skill:**
   ```bash
   # In Alexa Developer Console
   "Open lunch dad"
   "What's for lunch today?"
   ```

## Usage Examples

```
User: "Alexa, open Lunch Dad"
Alexa: "Welcome to Lunch Dad! You can ask what's for lunch today or tomorrow."

User: "What's for lunch today?"
Alexa: "It's 72 degrees and sunny. Today's lunch includes Spicy Chicken Sandwich,
        Individual Cheese Pizza, and Sun Butter and Jelly Sandwich."

User: "What about tomorrow?"
Alexa: "Tomorrow's lunch includes Chicken Tenders, Mac and Cheese, and Turkey Wrap."
```

## Project Structure

```
alexaLunchDad/
├── src/
│   ├── handlers/           # Alexa intent handlers
│   ├── services/           # External API integrations
│   │   ├── nutrisliceService.js   # Menu data fetching
│   │   ├── weatherService.js      # Weather.gov API
│   │   └── cacheService.js        # In-memory caching
│   ├── utils/              # Utility functions
│   │   ├── dateUtils.js           # School day calculator
│   │   ├── menuParser.js          # HTML parsing
│   │   └── responseBuilder.js     # Alexa responses
│   ├── apl/                # Visual templates
│   │   ├── menuCalendarDocument.json
│   │   └── menuDataSource.js
│   └── index.js            # Lambda entry point
├── tests/
│   ├── unit/               # Unit tests (318 tests)
│   ├── integration/        # Integration tests (16 tests)
│   └── fixtures/           # Test data
├── skill-package/
│   ├── skill.json          # Skill manifest
│   └── interactionModels/  # Voice interaction
├── docs/                   # Documentation
│   ├── SPECIFICATION.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── TESTING.md
├── template.yaml           # AWS SAM template
└── samconfig.toml          # Deployment config
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration

# Watch mode
npm run test:watch
```

**Test Coverage: 90%+ across all metrics**
- Unit tests: 318 passing
- Integration tests: 16 passing
- Total: 334 tests

## Configuration

The skill is configured via environment variables in `template.yaml`:

```yaml
NUTRISLICE_SCHOOL_ID: "westmore-elementary-school-2"  # Change to your school
WEATHER_LAT: "39.0997"  # Your school's latitude
WEATHER_LON: "-77.0941" # Your school's longitude
CACHE_TTL_MENU: "86400"      # 24 hours
CACHE_TTL_WEATHER: "600"     # 10 minutes
SCHOOL_TIMEZONE: "America/New_York"
```

## Deployment

```bash
# Development
npm run deploy:dev
npm run logs:dev  # Monitor logs

# Production
npm run deploy:prod:guided  # First time
npm run deploy:prod         # Updates
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

## Development Methodology

Built using **SPARC** with **Test-Driven Development (TDD - London School)**:

1. Specification → Requirements analysis
2. Research → API investigation  
3. Pseudocode → Algorithm design
4. Architecture → System design
5. Refinement (TDD) → Test-first implementation
6. Completion → Integration & deployment

## Technologies

- Node.js 18.x
- Alexa Skills Kit SDK v2
- Jest (testing)
- AWS SAM (deployment)
- Nutrislice (HTML scraping)
- Weather.gov API (free)
- APL 2024.2 (visuals)

## Performance

- Cache Hit: 50-100ms
- Cache Miss: 2-3 seconds
- Monthly Cost: ~$0.50 (AWS free tier)

## Documentation

- [SPECIFICATION.md](docs/SPECIFICATION.md) - Requirements
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment guide
- [TESTING.md](docs/TESTING.md) - Testing guide

## License

MIT License

---

**Made with ❤️ for families who want to know what's for lunch!**
