import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { CanvasState } from '../MemeGenerator';

interface ImagePanelProps {
  canvasState: CanvasState;
  updateCanvasState: (updates: Partial<CanvasState>) => void;
}

export const ImagePanel = ({ canvasState, updateCanvasState }: ImagePanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          updateCanvasState({
            backgroundImage: e.target?.result as string,
            backgroundImageFileName: file.name,
            canvasWidth: img.width,
            canvasHeight: img.height
          });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    updateCanvasState({
      backgroundImage: null,
      backgroundImageFileName: null,
      canvasWidth: 800,
      canvasHeight: 600
    });
  };

  return (
    <div className="p-4 space-y-4">
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-sm" style={{fontFamily: 'Sora, sans-serif'}}>Background Image</h3>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        
        {!canvasState.backgroundImage ? (
          <div 
            onClick={handleUploadClick}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Click to upload an image
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG, AVIF, JFIF
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-canvas-bg">
              <img
                src={canvasState.backgroundImage}
                alt="Background"
                className="w-full h-32 object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUploadClick}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={removeImage}
              >
                Remove
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-sm" style={{fontFamily: 'Sora, sans-serif'}}>Canvas Size</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="width" className="text-sm font-medium">
              Width: {canvasState.canvasWidth}px
            </Label>
          </div>
          <div>
            <Label htmlFor="height" className="text-sm font-medium">
              Height: {canvasState.canvasHeight}px
            </Label>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-sm" style={{fontFamily: 'Sora, sans-serif'}}>Zoom</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>25%</span>
            <span className="font-medium">{Math.round(canvasState.zoom * 100)}%</span>
            <span>200%</span>
          </div>
          <Slider
            value={[canvasState.zoom]}
            onValueChange={([value]) => updateCanvasState({ zoom: value })}
            min={0.25}
            max={2}
            step={0.25}
            className="w-full"
          />
        </div>
      </Card>
    </div>
  );
};