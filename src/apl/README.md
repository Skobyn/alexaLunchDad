# APL Templates - Lunch Dad

This directory contains APL (Alexa Presentation Language) templates for displaying the school lunch menu calendar on Echo Show devices.

## Files

### 1. `menuCalendarDocument.json`
The main APL document defining the visual layout for the 5-day lunch menu calendar.

**Features:**
- Responsive design for all Echo Show devices (5, 8, 10, 15)
- Kid-friendly color scheme with high contrast
- Current day highlighting in bright pink
- Weather overlay in top-right corner
- Scrollable menu items for each day
- Adaptive layouts:
  - Large screens (≥1280px): 5-column horizontal layout
  - Medium screens (800-1279px): 3-2 grid layout
  - Small screens (<800px): Single column scrollable layout

### 2. `menuDataSource.js`
JavaScript module for transforming menu calendar data into APL-compatible data sources.

**Key Functions:**
- `buildMenuDataSource(menuCalendar, weatherData)` - Main builder function
- `formatDisplayDate(date)` - Formats dates for display (e.g., "Oct 22")
- `getShortDayName(fullDayName)` - Converts day names (e.g., "Monday" → "Mon")
- `buildWeatherData(weatherData)` - Formats weather information
- `validateDataSource(dataSource)` - Validates APL data structure
- `createSampleDataSource()` - Generates sample data for testing

### 3. `sampleData.json`
Sample data for testing APL rendering in the APL Authoring Tool.

## Usage

### In Lambda Handler

```javascript
const { buildMenuDataSource } = require('./apl/menuDataSource');
const menuDocument = require('./apl/menuCalendarDocument.json');

// Get menu calendar from service
const menuCalendar = await lunchMenuService.getMenuCalendar(schoolId);
const weatherData = await weatherService.getCurrentWeather(zipCode);

// Build APL data source
const aplDataSource = buildMenuDataSource(menuCalendar, weatherData);

// Return APL response
return handlerInput.responseBuilder
  .addDirective({
    type: 'Alexa.Presentation.APL.RenderDocument',
    version: '2024.2',
    document: menuDocument,
    datasources: aplDataSource
  })
  .speak('Here is this week\'s lunch menu.')
  .getResponse();
```

### Testing in APL Authoring Tool

1. Visit: https://developer.amazon.com/alexa/console/ask/displays
2. Load `menuCalendarDocument.json` as the APL document
3. Load `sampleData.json` as the data source
4. Preview on different viewport sizes (small, medium, large)

## Design Specifications

### Color Palette
- **Primary**: #FFB900 (Warm Yellow)
- **Secondary**: #FF6B35 (Coral Orange)
- **Accent**: #00D9FF (Bright Cyan)
- **Today Highlight**: #FF4081 (Bright Pink)
- **Background**: #1A1A2E (Dark Navy)

### Typography
- **Title**: 48dp Amazon Ember Bold
- **Day Names**: 28dp Amazon Ember Bold
- **Menu Items**: 18dp Amazon Ember Regular
- **Weather**: 20dp Amazon Ember Bold

### Responsive Breakpoints
- **Small**: <800px (Echo Show 5)
- **Medium**: 800-1279px (Echo Show 8, 10)
- **Large**: ≥1280px (Echo Show 15)

## Development

### Adding New Components

1. Define layout in the `layouts` section of `menuCalendarDocument.json`
2. Add parameters for data binding
3. Update `menuDataSource.js` to provide required data
4. Test in APL Authoring Tool

### Modifying Styles

All design tokens are in the `resources` section:
- Colors: `resources[0].colors`
- Dimensions: `resources[1].dimensions`
- Typography: `resources[2].dimensions`

### Testing Checklist

- [ ] Visual rendering on all Echo Show sizes
- [ ] Today's date correctly highlighted
- [ ] Weather data displays properly
- [ ] Menu items scroll correctly on overflow
- [ ] Responsive breakpoints work smoothly
- [ ] Text readable at 6 feet distance
- [ ] Accessibility: WCAG AA contrast ratios
- [ ] Touch targets minimum 48dp

## Documentation

See `/docs/APL_DESIGN.md` for comprehensive design documentation including:
- Design philosophy and principles
- Complete color and typography systems
- Responsive layout architecture
- Component specifications
- Accessibility guidelines
- Performance considerations
- Future enhancement roadmap

## References

- [APL Documentation](https://developer.amazon.com/docs/alexa/alexa-presentation-language/apl-latest-version.html)
- [APL Authoring Tool](https://developer.amazon.com/alexa/console/ask/displays)
- [Alexa Design Guide](https://developer.amazon.com/docs/alexa/alexa-design/get-started.html)
- [APL Components](https://developer.amazon.com/docs/alexa/alexa-presentation-language/apl-standard-components.html)

## Version

- APL Version: 2024.2
- Alexa Layouts: 1.7.0
- Created: 2025-10-22
