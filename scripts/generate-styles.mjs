import fs from 'fs';
import path from 'path';

const stylesDir = path.resolve('src/styles');
const jsOutFile = path.resolve('src/styles.generated.ts');

// Create styles directory if it doesn't exist
if (!fs.existsSync(stylesDir)) {
  fs.mkdirSync(stylesDir, { recursive: true });
  console.log('Created src/styles directory - add your exported .ts style files there');
}

// Find all .ts files in styles directory
const files = fs.existsSync(stylesDir) 
  ? fs.readdirSync(stylesDir).filter(f => /\.ts$/i.test(f))
  : [];

if (files.length === 0) {
  console.log('No .ts files found in src/styles - export styles from the app and place them there');
  // Create empty default file
  const defaultContent = `// AUTO-GENERATED from src/styles - Do not edit by hand
// Run 'npm run generate:styles' to regenerate
// Export styles from the app and place .ts files in src/styles/

import { SavedTextStyle } from './components/MemeGenerator';

export const GENERATED_STYLES: SavedTextStyle[] = [];
`;
  
  fs.writeFileSync(jsOutFile, defaultContent);
  console.log(`✅ Created empty ${jsOutFile}`);
  process.exit(0);
}

console.log(`Found ${files.length} style files:`, files.map(f => `  - ${f}`).join('\n'));

// Collect all styles from all files
const allStyles = [];
const fileInfo = [];

for (const file of files) {
  try {
    const filePath = path.join(stylesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract the GENERATED_STYLES array from the file
    const match = content.match(/export const GENERATED_STYLES:\s*SavedTextStyle\[\]\s*=\s*(\[[\s\S]*?\]);/);
    if (match) {
      let stylesJson = match[1];
      
      // Clean up TypeScript to make it valid JSON
      stylesJson = stylesJson
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*$/gm, '') // Remove line comments
        .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
        // Don't quote property names - they should already be quoted
      
      const styles = JSON.parse(stylesJson);
      
      if (Array.isArray(styles)) {
        // Add file prefix to style names to avoid conflicts
        const filePrefix = path.basename(file, '.ts').replace(/[^a-zA-Z0-9]/g, '-');
        const prefixedStyles = styles.map(style => ({
          ...style,
          name: `${filePrefix}: ${style.name}`,
          id: `${filePrefix}-${style.id}`
        }));
        
        allStyles.push(...prefixedStyles);
        fileInfo.push({ file, count: styles.length });
      }
    } else {
      console.warn(`⚠️  Could not find GENERATED_STYLES in ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

// Generate TypeScript file with all combined styles
const tsContent = `// AUTO-GENERATED from src/styles - Do not edit by hand
// Run 'npm run generate:styles' to regenerate
// Generated on ${new Date().toISOString()}

import { SavedTextStyle } from './components/MemeGenerator';

export const GENERATED_STYLES: SavedTextStyle[] = ${JSON.stringify(allStyles, null, 2)};
`;

fs.writeFileSync(jsOutFile, tsContent);

console.log(`✅ Generated ${jsOutFile} with ${allStyles.length} total styles`);
fileInfo.forEach(({ file, count }) => {
  console.log(`   📂 ${file}: ${count} styles`);
});

if (allStyles.length > 0) {
  console.log(`📝 Style categories: ${[...new Set(allStyles.map(s => s.name.split(':')[0]))].join(', ')}`);
}
