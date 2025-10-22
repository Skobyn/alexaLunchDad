# Lunch Dad - Skill Assets

This directory contains the icon assets required for the Lunch Dad Alexa skill.

## Required Assets

### Small Icon (108x108 pixels)
- **Filename**: `icon_108.png`
- **Dimensions**: 108 x 108 pixels
- **Format**: PNG
- **Purpose**: Used in the Alexa app and skill store listings

### Large Icon (512x512 pixels)
- **Filename**: `icon_512.png`
- **Dimensions**: 512 x 512 pixels
- **Format**: PNG
- **Purpose**: Used in the Alexa app and skill store listings

## Icon Requirements

### Design Guidelines
1. **Transparency**: Icons must NOT have transparent backgrounds
2. **Format**: PNG format only
3. **Colors**: Use solid background colors
4. **Content**: Should represent the skill's purpose (lunch/food/school related)
5. **Text**: Avoid including text in the icon when possible
6. **Branding**: Should be recognizable and professional

### Recommended Design Elements
For Lunch Dad, consider including:
- Food-related imagery (lunch tray, sandwich, apple)
- School-related elements (cafeteria, lunch box)
- Parent/family-friendly design
- Bright, appealing colors that work well for children
- Simple, clear imagery that scales well

### Technical Specifications
- **File Type**: PNG
- **Color Mode**: RGB
- **Resolution**: 72 DPI minimum
- **Max File Size**: 500 KB per icon
- **Aspect Ratio**: 1:1 (square)

## Placeholder Icons

Currently, the skill manifest references these icons. You will need to create and place them in this directory before deploying the skill to production.

### Creating Icons

You can create icons using:
1. **Graphic Design Tools**: Adobe Illustrator, Photoshop, Figma, Sketch
2. **Online Tools**: Canva, Icon generators
3. **AI Tools**: DALL-E, Midjourney for concept generation
4. **Professional Designer**: For production-quality assets

### Example Prompts for AI Generation
- "A simple, friendly icon of a lunch tray with colorful food, square format, no transparency"
- "A cheerful dad character holding a lunch box, icon style, solid background"
- "A school cafeteria lunch theme icon, bright colors, child-friendly, square"

## File Locations

Place the generated icons in this directory:
```
/mnt/c/Users/sbens/Cursor/alexaLunchDad/skill-package/assets/
├── icon_108.png
└── icon_512.png
```

## Validation

Before deployment, verify:
- [ ] Both icons are present in the assets directory
- [ ] Icons meet size requirements (108x108 and 512x512)
- [ ] Icons are in PNG format
- [ ] Icons have solid (non-transparent) backgrounds
- [ ] Icons are clear and recognizable at both sizes
- [ ] File sizes are under 500 KB

## Deployment Note

The skill will not deploy successfully without valid icon files. Ensure these assets are created and placed in this directory before running `npm run deploy`.
