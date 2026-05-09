import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const opentype = require('opentype.js') as typeof import('opentype.js');

const fontPath = path.resolve(__dirname, '..', '..', 'Times New Roman.ttf');
const outDir   = path.resolve(__dirname, '..', 'data');
const outPath  = path.join(outDir, 'times-roman-widths.json');

if (!fs.existsSync(fontPath)) {
  console.error(`Font file not found: ${fontPath}`);
  console.error('Place Times New Roman.ttf at the repo root and re-run.');
  process.exit(1);
}

const font = opentype.parse(fs.readFileSync(fontPath).buffer);
const glyphs: Record<string, number> = {};

// Scan the full Basic Multilingual Plane (covers all Vietnamese and most world scripts)
for (let cp = 0x0020; cp <= 0xFFFF; cp++) {
  const char = String.fromCodePoint(cp);
  const glyph = font.charToGlyph(char);
  if (glyph.index !== 0) { // index 0 = .notdef — character not in font
    glyphs[char] = Math.round(((glyph.advanceWidth ?? 0) / font.unitsPerEm) * 1000);
  }
}

const entryCount = Object.keys(glyphs).length;
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ version: 1, source: 'Times New Roman.ttf', entries: entryCount, glyphs }, null, 2), 'utf8');
console.log(`Wrote ${entryCount} glyph widths → ${outPath}`);
