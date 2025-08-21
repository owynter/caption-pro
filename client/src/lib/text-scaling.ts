// Text scaling utilities

// Convert font size units to pixels based on canvas width
// Linear mapping: 0.08% of canvas width per unit (5–100 units recommended)
export function getFontSizeInPixels(sizeUnits: number, canvasWidth: number): number {
  const scalePerUnit = 0.0008; // 0.08% per unit; 100 units ≈ 8% of width
  const pixels = canvasWidth * sizeUnits * scalePerUnit;
  return Math.max(10, Math.round(pixels)); // enforce a visible minimum
}

// Calculate proportional stroke width based on font size units
export function getProportionalStrokeWidth(strokeWidth: number, sizeUnits: number): number {
  const baseStroke = strokeWidth;
  const sizeMultiplier = Math.sqrt(Math.max(sizeUnits, 1) / 25); // normalized to size 25
  return Math.max(1, Math.round(baseStroke * sizeMultiplier));
}


