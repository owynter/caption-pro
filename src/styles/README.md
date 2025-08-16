# Meme Generator Styles

This directory contains exportable style files for the Meme Generator.

## How It Works

1. **Create styles** while editing text in the app
2. **Save styles** you like using the "Save Style" button  
3. **Export to file** using the "Export to File" button
4. **Drop files here** - place exported `.ts` files in this directory
5. **Run generation** - execute `npm run generate:styles` to compile all styles
6. **Auto-load** - styles automatically load in the app from the generated file

## File Structure

```
src/styles/
├── README.md              # This file
├── default-styles.ts      # Built-in app styles
├── my-work-styles.ts      # Your custom exported styles
└── meme-collection.ts     # More style collections
```

## Workflow Example

1. Create a great text style in the app
2. Click "Save Style" → name it "My Header Style"
3. Click "Export to File" → downloads `my-styles-2024-01-15.ts`
4. Move file to `src/styles/my-styles-2024-01-15.ts`
5. Run `npm run generate:styles`
6. Restart app - your styles are now available everywhere!

## File Format

Exported files must have this structure:

```typescript
import { SavedTextStyle } from '../components/MemeGenerator';

export const GENERATED_STYLES: SavedTextStyle[] = [
  {
    "id": "unique-style-id",
    "name": "Style Name",
    "fontSize": 36,
    "fontFamily": "Impact",
    // ... other properties
  }
];
```

## Benefits

✅ **Persistent** - Styles survive browser data clearing  
✅ **Portable** - Works across different devices/browsers  
✅ **Organized** - Separate files for different purposes  
✅ **Version controlled** - Styles are part of your codebase  
✅ **Shareable** - Easy to share style collections  
