import fs from 'fs';
import path from 'path';

const fontsDir = path.resolve('public/fonts');
const cssOutFile = path.resolve('src/fonts.generated.css');
const jsOutFile = path.resolve('src/fonts.generated.ts');

const formatFromExt = (ext) => {
  const e = ext.toLowerCase();
  if (e === '.ttf') return 'truetype';
  if (e === '.otf') return 'opentype';
  return null;
};

const weightFromName = (name) => {
  const n = name.toLowerCase();
  if (/thin/.test(n)) return 100;
  if (/(extralight|ultralight)/.test(n)) return 200;
  if (/light/.test(n)) return 300;
  if (/(regular|book|normal)/.test(n)) return 400;
  if (/medium/.test(n)) return 500;
  if (/(semibold|demibold)/.test(n)) return 600;
  if (/bold/.test(n)) return 700;
  if (/(extrabold|ultrabold|heavy)/.test(n)) return 800;
  if (/(black|heavyblack)/.test(n)) return 900;
  return 400;
};

const styleFromName = (name) => (/(italic|oblique)/i.test(name) ? 'italic' : 'normal');

const familyFromFile = (base) => {
  // Extract family name from filename (before first dash/underscore)
  const parts = base.split(/[-_]/);
  const family = parts[0] || base;
  return family.replace(/[^A-Za-z0-9 ]+/g, ' ').trim();
};

// Create public/fonts directory if it doesn't exist
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir);
  console.log('Created public/fonts directory - add your .ttf/.otf files there');
}

const files = fs.readdirSync(fontsDir).filter(f => /\.(ttf|otf)$/i.test(f));
if (files.length === 0) {
  console.log('No .ttf or .otf files found in public/fonts - add some fonts and run again');
  // Create empty files
  fs.writeFileSync(cssOutFile, '/* No fonts found - add .ttf/.otf files to public/fonts and run npm run generate:fonts */\n');
  fs.writeFileSync(jsOutFile, 'export const GENERATED_FONTS: string[] = [];\n');
  process.exit(0);
}

// Generate CSS
let css = `/* AUTO-GENERATED from public/fonts - Do not edit by hand */\n/* Run 'npm run generate:fonts' to regenerate */\n\n`;

// Track unique families
const families = new Set(['Helvetica', 'Trebuchet MS', 'Courier New', 'Impact']); // Base fonts

for (const file of files) {
  const ext = path.extname(file);
  const fmt = formatFromExt(ext);
  if (!fmt) continue;

  const base = path.basename(file, ext);
  const family = familyFromFile(base);
  const weight = weightFromName(base);
  const style = styleFromName(base);

  families.add(family);

  css += `@font-face {
  font-family: "${family}";
  src: url("/fonts/${file}") format("${fmt}");
  font-weight: ${weight};
  font-style: ${style};
  font-display: swap;
}

`;
}

// Generate TypeScript file with font list
const sortedFamilies = Array.from(families).sort();
const tsContent = `// AUTO-GENERATED from public/fonts - Do not edit by hand
// Run 'npm run generate:fonts' to regenerate

export const GENERATED_FONTS: string[] = ${JSON.stringify(sortedFamilies, null, 2)};
`;

fs.writeFileSync(cssOutFile, css);
fs.writeFileSync(jsOutFile, tsContent);

console.log(`✅ Generated ${cssOutFile} with ${files.length} font files`);
console.log(`✅ Generated ${jsOutFile} with ${sortedFamilies.length} font families`);
console.log(`📝 Font families: ${sortedFamilies.join(', ')}`);

