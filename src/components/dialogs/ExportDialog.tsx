import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Download, FileImage, Palette } from 'lucide-react';
import { CanvasState } from '../MemeGenerator';

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

      // Copy the current canvas content
      exportCtx.drawImage(canvasRef.current, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob(resolve, `image/${format}`, format === 'jpeg' ? quality : undefined);
      });

      if (blob) {
        // Download the file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meme.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
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
    { value: 1, label: '100% (Original)', description: 'Standard resolution' },
    { value: 1.5, label: '150% (Large)', description: 'High quality posts' },
    { value: 2, label: '200% (XL)', description: 'Print quality' },
    { value: 3, label: '300% (XXL)', description: 'Maximum quality' }
  ];

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

          {/* Scale Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Resolution</Label>
            <div className="grid grid-cols-1 gap-2">
              {presetScales.map((preset) => (
                <Card
                  key={preset.value}
                  className={`p-3 cursor-pointer transition-all ${
                    scale === preset.value 
                      ? 'border-primary bg-primary/10' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setScale(preset.value)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{preset.label}</div>
                      <div className="text-xs text-muted-foreground">{preset.description}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(canvasState.canvasWidth * preset.value)} × {Math.round(canvasState.canvasHeight * preset.value)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
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