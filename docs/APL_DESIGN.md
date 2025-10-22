# APL Design Documentation - Lunch Dad Menu Calendar

## Overview

The Lunch Dad APL templates provide a responsive, kid-friendly visual display of the school lunch menu calendar for Echo Show devices. The design prioritizes readability from a distance during busy morning routines.

## Design Philosophy

### 1. **Kid-Friendly Visual Language**
- Bright, engaging colors that capture attention
- High contrast for easy reading across the room
- Large text sizes for quick scanning
- Emoji icon in header for visual branding (🍽️)

### 2. **Morning Routine Optimization**
- Information hierarchy: Today's menu most prominent
- Weather integration for getting-ready context
- 5-day forward view for planning
- Minimal cognitive load design

### 3. **Responsive Design**
- Single layout that adapts to all Echo Show sizes
- Breakpoint-based responsive behavior
- Touch-friendly spacing for interaction
- Optimized for portrait and landscape orientations

## Color Palette

### Primary Colors
```json
{
  "colorPrimary": "#FFB900",      // Warm yellow for main branding
  "colorSecondary": "#FF6B35",    // Coral orange for accents
  "colorAccent": "#00D9FF",       // Bright cyan for highlights
  "colorBackground": "#1A1A2E",   // Dark navy background
  "colorSurface": "#252541",      // Elevated surface color
  "colorHighlight": "#4CAF50",    // Green for positive indicators
  "colorToday": "#FF4081",        // Bright pink for current day
  "colorBorder": "#3D3D5C"        // Subtle border color
}
```

### Accessibility
- **Contrast Ratio**: All text meets WCAG AA standards (4.5:1 minimum)
- **Color Independence**: No information conveyed by color alone
- **Dark Theme**: Optimized for morning and evening viewing

## Layout Architecture

### Header Section (80dp height)
```
┌────────────────────────────────────────────────┐
│ 🍽️ Lunch Dad              [Weather Overlay]   │
│                                                │
└────────────────────────────────────────────────┘
```

**Components:**
- Title: "🍽️ Lunch Dad" (48dp, bold, primary color)
- Weather overlay: Temperature + conditions + icon
- Background: Surface color for elevation

### Calendar Grid

#### Large Screens (≥1280px) - 5 Column Layout
```
┌──────┬──────┬──────┬──────┬──────┐
│ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │
│ Oct22│ Oct23│ Oct24│ Oct25│ Oct26│
│ ───  │ ───  │ ───  │ ───  │ ───  │
│ • 🍗 │ • 🍕 │ • 🥗 │ • 🍔 │ • 🌮 │
│ • 🍕 │ • 🥪 │ • 🥪 │ • 🍕 │ • 🍕 │
│ • 🥪 │ • 🍎 │ • 🍎 │ • 🥪 │ • 🥪 │
└──────┴──────┴──────┴──────┴──────┘
```

#### Medium Screens (800-1279px) - 3-2 Grid
```
┌──────┬──────┬──────┐
│ Mon  │ Tue  │ Wed  │
└──────┴──────┴──────┘
┌──────┬──────┐
│ Thu  │ Fri  │
└──────┴──────┘
```

#### Small Screens (<800px) - Single Column
```
┌────────────┐
│   Monday   │
│   Oct 22   │
│    ───     │
│  • Menu 1  │
│  • Menu 2  │
│  • Menu 3  │
└────────────┘
     ↓
  (scrolls)
```

## Component Design

### DayCard Component

**Visual Hierarchy:**
1. **Day Name** (28dp, bold) - Primary identifier
2. **Date** (20dp, secondary color) - Context
3. **Divider** (2dp line) - Visual separation
4. **Menu Items** (18dp, scrollable) - Content

**Today Highlighting:**
- Border: 4dp thick in pink (`colorToday`)
- Background: Pink tint for immediate recognition
- Text: White for maximum contrast
- Border radius: 12dp for friendly appearance

**Regular Days:**
- Border: 2dp in subtle gray
- Background: Surface color
- Text: White/secondary colors
- Bullets: Accent color (cyan)

### Weather Overlay

**Layout:**
```
┌─────────────────┐
│ [Icon] 72°F     │
│        Sunny    │
└─────────────────┘
```

**Features:**
- Semi-transparent background (90% opacity)
- Weather icon: 40x40dp
- Temperature: Bold, accent color
- Conditions: Smaller, secondary color
- Rounded corners: 8dp

## Typography System

### Font Sizes
```json
{
  "textSizeTitle": "48dp",        // Main header
  "textSizeSubtitle": "24dp",     // "School Lunch Menu"
  "textSizeDayName": "28dp",      // Day names in cards
  "textSizeDate": "20dp",         // Dates in cards
  "textSizeMenuItem": "18dp",     // Menu item text
  "textSizeWeather": "20dp"       // Weather temperature
}
```

### Font Weights
- **Bold**: Titles, day names, today's card
- **Regular**: Body text, menu items
- **Font Family**: Amazon Ember (default Alexa font)

## Spacing System

### Margins & Padding
```json
{
  "spacingSmall": "8dp",          // Tight spacing
  "spacingMedium": "16dp",        // Default spacing
  "spacingLarge": "24dp",         // Section spacing
  "spacingXLarge": "32dp"         // Major sections
}
```

### Card Dimensions
```json
{
  "dayCardHeight": "280dp",       // Standard card height
  "dayCardHeightSmall": "200dp",  // Small screen card
  "borderRadius": "12dp",         // Friendly rounded corners
  "borderWidth": "2dp"            // Default border
}
```

## Responsive Breakpoints

### Device Mapping
| Device | Screen Size | Breakpoint | Layout |
|--------|-------------|------------|--------|
| Echo Show 5 | 960x480 | <800px | Single column |
| Echo Show 8 | 1280x800 | 800-1279px | 3-2 grid |
| Echo Show 10 | 1280x800 | 800-1279px | 3-2 grid |
| Echo Show 15 | 1920x1080 | ≥1280px | 5 columns |

### Adaptive Behaviors
- **Text**: Never scales below 16dp for readability
- **Touch targets**: Minimum 48dp for accessibility
- **Scrolling**: Enabled on small screens, disabled on large
- **Spacing**: Proportional reduction on smaller screens

## Data Binding

### Menu Data Structure
```javascript
{
  "menuData": {
    "days": [
      {
        "dayName": "Mon",
        "date": "Oct 22",
        "menuItems": ["Item 1", "Item 2", "Item 3"],
        "isToday": true,
        "fullDate": "2025-10-22"
      }
      // ... 4 more days
    ]
  },
  "weatherData": {
    "temperature": "72°F",
    "conditions": "Sunny",
    "icon": "https://example.com/sunny.png"
  }
}
```

### Dynamic Data Handling
- **Empty menus**: Show "No menu available" message
- **Missing weather**: Display "N/A" with no icon
- **Long menu items**: Truncate with ellipsis (maxLines: 2)
- **Today detection**: Automatic based on device date/time

## Interaction Design

### Touch Targets
- **Minimum size**: 48x48dp for accessibility
- **Spacing**: 8dp between interactive elements
- **Feedback**: Visual state changes on press

### Scroll Behavior
- **Small screens**: Vertical scroll through all 5 days
- **Medium screens**: Vertical scroll if content exceeds viewport
- **Large screens**: No scrolling, all content visible

### Loading States
- **Initial load**: Placeholder with loading indicator
- **Data updates**: Smooth transitions without flash

## Performance Considerations

### Rendering Optimization
- **Component reuse**: DayCard layout reused 5 times
- **Lazy loading**: Images loaded on demand
- **Conditional rendering**: Only active viewport shown

### Memory Management
- **Image caching**: Weather icons cached by APL runtime
- **Data pagination**: Only 5 days loaded at once
- **Resource cleanup**: Proper disposal on view exit

## Testing Guidelines

### Visual Testing Checklist
- [ ] All text readable at 6 feet distance
- [ ] Today's date properly highlighted
- [ ] Weather data displays correctly
- [ ] Responsive breakpoints work smoothly
- [ ] No text truncation on normal menus (3-5 items)
- [ ] Colors meet accessibility standards
- [ ] Touch targets are 48dp minimum

### Device Testing
- [ ] Echo Show 5 (portrait)
- [ ] Echo Show 8 (landscape)
- [ ] Echo Show 10 (landscape)
- [ ] Echo Show 15 (portrait/landscape)

### Edge Cases
- [ ] No menu items for a day
- [ ] Very long menu item names
- [ ] Missing weather data
- [ ] Weekend dates (Saturday/Sunday)
- [ ] Single day vs full week

## Implementation Notes

### APL Version
- **Target version**: 2024.2
- **Import**: alexa-layouts 1.7.0
- **Backward compatibility**: Graceful degradation to 2023.3

### Browser Testing
- Use APL Authoring Tool: https://developer.amazon.com/alexa/console/ask/displays
- Test on actual Echo Show devices before release
- Validate with APL validator CLI tool

### Accessibility Features
- **Voice interaction**: All data accessible via voice
- **Screen reader**: Proper text ordering for readability
- **High contrast**: Meets WCAG AA standards
- **Focus indicators**: Clear visual focus for navigation

## Future Enhancements

### Phase 2
- [ ] Animated transitions between days
- [ ] Touch to expand menu item details
- [ ] Nutritional information overlay
- [ ] Allergen warning icons
- [ ] Favorite/dislike indicators

### Phase 3
- [ ] Personalization based on student preferences
- [ ] Lunch account balance display
- [ ] Calendar event integration
- [ ] Multi-school support for families

## References

- [APL Documentation](https://developer.amazon.com/docs/alexa/alexa-presentation-language/apl-latest-version.html)
- [Alexa Design Guide](https://developer.amazon.com/docs/alexa/alexa-design/get-started.html)
- [APL Responsive Components](https://developer.amazon.com/docs/alexa/alexa-presentation-language/apl-layout.html)
- [APL Authoring Tool](https://developer.amazon.com/alexa/console/ask/displays)

## Change Log

### v1.0.0 (2025-10-22)
- Initial APL template design
- Responsive 5-day calendar layout
- Weather overlay integration
- Kid-friendly color scheme
- Comprehensive data source builder
