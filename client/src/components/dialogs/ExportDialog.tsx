import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Download, FileImage, Palette } from 'lucide-react';
import { CanvasState, getFontSizeInPixels, getProportionalStrokeWidth } from '../MemeGenerator';

interface ExportDialogProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  canvasState: CanvasState;
  onClose: () => void;
}

export const ExportDialog = ({ canvasRef, canvasState, onClose }: ExportDialogProps) => {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState(0.9);
  const [scale, setScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [filename, setFilename] = useState('');

  // Generate default filename based on original image name
  useEffect(() => {
    if (canvasState.backgroundImageFileName) {
      // Remove extension from original filename and add _meme suffix
      const nameWithoutExt = canvasState.backgroundImageFileName.replace(/\.[^/.]+$/, '');
      setFilename(`${nameWithoutExt}_meme`);
    } else {
      setFilename('meme');
    }
  }, [canvasState.backgroundImageFileName]);

  // Helper function to compute line width with letter spacing
  const computeLineWidth = (ctx: CanvasRenderingContext2D, text: string, letterSpacing: number) => {
    if (letterSpacing === 0) return ctx.measureText(text).width;
    let width = 0;
    for (let i = 0; i < text.length; i++) {
      width += ctx.measureText(text[i]).width + letterSpacing;
    }
    return width;
  };

  // Helper function to wrap text to fit within width
  const wrapTextToWidth = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, letterSpacing: number) => {
    const paragraphs = text.split('\n');
    const lines: string[] = [];
    for (const para of paragraphs) {
      const words = para.split(' ');
      let current = '';
      for (let i = 0; i < words.length; i++) {
        const attempt = current ? current + ' ' + words[i] : words[i];
        const attemptWidth = computeLineWidth(ctx, attempt, letterSpacing);
        if (attemptWidth <= maxWidth || current.length === 0) {
          current = attempt;
        } else {
          lines.push(current);
          current = words[i];
        }
      }
      lines.push(current);
    }
    return lines;
  };

  // Helper function to draw text elements without selection indicators
  const drawCleanTextElements = (ctx: CanvasRenderingContext2D) => {
    const sortedElements = [...canvasState.textElements].sort((a, b) => a.zIndex - b.zIndex);

    sortedElements.forEach((element) => {
      if (element.opacity === 0) return;

      ctx.save();
      ctx.globalAlpha = element.opacity;

      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);

      if (element.skewX || element.skewY) {
        const skewXRad = (element.skewX || 0) * Math.PI / 180;
        const skewYRad = (element.skewY || 0) * Math.PI / 180;
        ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0);
      }

      const fontSizeInPixels = getFontSizeInPixels(element.fontSize, canvasState.canvasWidth);
      ctx.font = `${element.fontWeight} ${fontSizeInPixels}px ${element.fontFamily}`;
      ctx.textAlign = element.textAlign;
      ctx.textBaseline = 'middle';
      
      let textX = element.x;
      if (element.textAlign === 'center') {
        textX = element.x + element.width / 2;
      } else if (element.textAlign === 'right') {
        textX = element.x + element.width;
      }
      const textY = element.y + element.height / 2;

      // Proper text wrapping using the same logic as CanvasArea
      const letterSpacing = element.letterSpacing || 0;
      const lines = wrapTextToWidth(ctx, element.content, element.width, letterSpacing);
      const lineHeight = (element.lineHeight || 1.2) * fontSizeInPixels;
      
      const renderTextLine = (line: string, x: number, y: number, renderFn: (text: string, x: number, y: number) => void) => {
        if (letterSpacing !== 0) {
          let currentX = x;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            renderFn(char, currentX, y);
            currentX += ctx.measureText(char).width + letterSpacing;
          }
        } else {
          renderFn(line, x, y);
        }
      };
      
      lines.forEach((line, index) => {
        const lineY = textY + (index - (lines.length - 1) / 2) * lineHeight;
        
        // Render shadow first (behind everything)
        if (element.shadowBlur > 0 || element.shadowOffsetX !== 0 || element.shadowOffsetY !== 0 || (element.shadowSize && element.shadowSize > 0)) {
          ctx.save();
          ctx.shadowColor = element.shadowColor;
          ctx.shadowBlur = element.shadowBlur;
          ctx.shadowOffsetX = element.shadowOffsetX;
          ctx.shadowOffsetY = element.shadowOffsetY;
          
          // Apply shadow size scaling
          const shadowSize = element.shadowSize || 1;
          if (shadowSize !== 1) {
            ctx.scale(shadowSize, shadowSize);
            const scaledX = textX / shadowSize;
            const scaledY = lineY / shadowSize;
            
            // Draw shadow with stroke if stroke exists
            if (element.strokeWidth > 0) {
              ctx.strokeStyle = element.shadowColor;
              ctx.lineWidth = getProportionalStrokeWidth(element.strokeWidth, element.fontSize) / shadowSize;
              ctx.lineJoin = 'round';
              ctx.miterLimit = 2;
              renderTextLine(line, scaledX, scaledY, (text, x, y) => ctx.strokeText(text, x, y));
            }
            
            // Draw shadow fill
            ctx.fillStyle = element.shadowColor;
            renderTextLine(line, scaledX, scaledY, (text, x, y) => ctx.fillText(text, x, y));
          } else {
            // Draw shadow with stroke if stroke exists
            if (element.strokeWidth > 0) {
              ctx.strokeStyle = element.shadowColor;
              ctx.lineWidth = element.strokeWidth;
              ctx.lineJoin = 'round';
              ctx.miterLimit = 2;
              renderTextLine(line, textX, lineY, (text, x, y) => ctx.strokeText(text, x, y));
            }
            
            // Draw shadow fill
            ctx.fillStyle = element.shadowColor;
            renderTextLine(line, textX, lineY, (text, x, y) => ctx.fillText(text, x, y));
          }
          ctx.restore();
        }
        
        // Render main text stroke
                    if (element.strokeWidth > 0) {
              ctx.strokeStyle = element.strokeColor;
              ctx.lineWidth = getProportionalStrokeWidth(element.strokeWidth, element.fontSize);
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          renderTextLine(line, textX, lineY, (text, x, y) => ctx.strokeText(text, x, y));
        }
        
        // Draw fill
        ctx.fillStyle = element.color;
        renderTextLine(line, textX, lineY, (text, x, y) => ctx.fillText(text, x, y));
      });

      // NOTE: We intentionally skip drawing selection indicators here

      ctx.restore();
    });
  };

  const exportCanvas = async () => {
    if (!canvasRef.current) return;

    setIsExporting(true);

    try {
      // Create a new canvas for export with the desired scale
      const exportCanvas = document.createElement('canvas');
      const exportCtx = exportCanvas.getContext('2d');
      
      if (!exportCtx) return;

      exportCanvas.width = canvasState.canvasWidth * scale;
      exportCanvas.height = canvasState.canvasHeight * scale;

      // Scale the context
      exportCtx.scale(scale, scale);

      // Render clean canvas without selection indicators
      if (canvasState.backgroundImage) {
        const img = new Image();
        img.onload = () => {
          exportCtx.drawImage(img, 0, 0, canvasState.canvasWidth, canvasState.canvasHeight);
          drawCleanTextElements(exportCtx);
          downloadCanvas(exportCanvas);
        };
        img.src = canvasState.backgroundImage;
      } else {
        exportCtx.fillStyle = '#f8f9fa';
        exportCtx.fillRect(0, 0, canvasState.canvasWidth, canvasState.canvasHeight);
        drawCleanTextElements(exportCtx);
        downloadCanvas(exportCanvas);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
    }
  };

  const downloadCanvas = async (exportCanvas: HTMLCanvasElement) => {
    try {
      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob(resolve, `image/${format}`, format === 'jpeg' ? quality : undefined);
      });

      if (blob) {
        // Download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const getFileSize = () => {
    const baseSize = canvasState.canvasWidth * canvasState.canvasHeight * scale * scale;
    const multiplier = format === 'png' ? 4 : format === 'webp' ? 0.5 : 1;
    const sizeInMB = (baseSize * multiplier) / (1024 * 1024);
    return `~${sizeInMB.toFixed(1)}MB`;
  };

  const presetScales = [
    { value: 0.5, label: '50% (Small)', description: 'Social media stories' },
    { value: 1, label: '100% (Original)', description: 'Source image resolution' },
    { value: 1.5, label: '150% (Large)', description: 'High quality posts' },
    { value: 2, label: '200% (XL)', description: 'Print quality' },
    { value: 3, label: '300% (XXL)', description: 'Maximum quality' }
  ];

  const selectedPreset = presetScales.find(preset => preset.value === scale) || presetScales[1];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Export Meme
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filename Input */}
          <div className="space-y-2">
            <Label htmlFor="filename" className="text-sm font-medium">Filename</Label>
            <div className="flex items-center gap-2">
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename..."
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">.{format}</span>
            </div>
            {canvasState.backgroundImageFileName && (
              <p className="text-xs text-muted-foreground">
                Original: {canvasState.backgroundImageFileName}
              </p>
            )}
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Format</Label>
            <Select value={format} onValueChange={(value: any) => setFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG (Lossless, supports transparency)</SelectItem>
                <SelectItem value="jpeg">JPEG (Smaller file size)</SelectItem>
                <SelectItem value="webp">WebP (Modern, best compression)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quality Setting (for JPEG/WebP) */}
          {(format === 'jpeg' || format === 'webp') && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Quality: {Math.round(quality * 100)}%
              </Label>
              <Slider
                value={[quality]}
                onValueChange={([value]) => setQuality(value)}
                min={0.1}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
          )}

          {/* Resolution Selection Dropdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Resolution</Label>
            <Select value={scale.toString()} onValueChange={(value) => setScale(parseFloat(value))}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center justify-between w-full">
                    <span>{selectedPreset.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {Math.round(canvasState.canvasWidth * scale)} × {Math.round(canvasState.canvasHeight * scale)}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {presetScales.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value.toString()}>
                    <div className="flex flex-col">
                      <div className="font-medium">{preset.label}</div>
                      <div className="text-xs text-muted-foreground">{preset.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(canvasState.canvasWidth * preset.value)} × {Math.round(canvasState.canvasHeight * preset.value)}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Info */}
          <Card className="p-3 bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Estimated size: {getFileSize()}
              </span>
            </div>
          </Card>

          {/* Export Button */}
          <Button
            onClick={exportCanvas}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-primary to-accent"
          >
            {isExporting ? (
              'Exporting...'
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};