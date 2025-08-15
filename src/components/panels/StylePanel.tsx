import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Palette, Droplets } from 'lucide-react';
import { TextElement } from '../MemeGenerator';

interface StylePanelProps {
  selectedElement: TextElement | undefined;
  onUpdateText: (id: string, updates: Partial<TextElement>) => void;
}

const predefinedColors = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
];

export const StylePanel = ({ selectedElement, onUpdateText }: StylePanelProps) => {
  if (!selectedElement) {
    return (
      <div className="p-4">
        <Card className="p-8 text-center">
          <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Select a text element to customize its style
          </p>
        </Card>
      </div>
    );
  }

  const handleColorChange = (color: string) => {
    onUpdateText(selectedElement.id, { color });
  };

  const handleStrokeColorChange = (strokeColor: string) => {
    onUpdateText(selectedElement.id, { strokeColor });
  };

  return (
    <div className="p-4 space-y-4">
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Fill Color
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={selectedElement.color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-8 p-1 border rounded"
            />
            <Input
              type="text"
              value={selectedElement.color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="flex-1 font-mono text-sm"
            />
          </div>
          
          <div className="grid grid-cols-5 gap-2">
            {predefinedColors.map((color) => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className="w-8 h-8 rounded border-2 border-border hover:border-primary transition-colors"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-lg">Stroke</h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={selectedElement.strokeColor}
              onChange={(e) => handleStrokeColorChange(e.target.value)}
              className="w-12 h-8 p-1 border rounded"
            />
            <Input
              type="text"
              value={selectedElement.strokeColor}
              onChange={(e) => handleStrokeColorChange(e.target.value)}
              className="flex-1 font-mono text-sm"
            />
          </div>

            <div>
              <Label className="text-sm font-medium">
                Stroke Width: {selectedElement.strokeWidth}px
              </Label>
              <Slider
                value={[selectedElement.strokeWidth]}
                onValueChange={([value]) => onUpdateText(selectedElement.id, { strokeWidth: value })}
                min={0}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Shadow
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={selectedElement.shadowColor}
              onChange={(e) => onUpdateText(selectedElement.id, { shadowColor: e.target.value })}
              className="w-12 h-8 p-1 border rounded"
            />
            <Input
              type="text"
              value={selectedElement.shadowColor}
              onChange={(e) => onUpdateText(selectedElement.id, { shadowColor: e.target.value })}
              className="flex-1 font-mono text-sm"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">
              Shadow Blur: {selectedElement.shadowBlur}px
            </Label>
            <Slider
              value={[selectedElement.shadowBlur]}
              onValueChange={([value]) => onUpdateText(selectedElement.id, { shadowBlur: value })}
              min={0}
              max={20}
              step={1}
              className="mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">
                Offset X: {selectedElement.shadowOffsetX}px
              </Label>
              <Slider
                value={[selectedElement.shadowOffsetX]}
                onValueChange={([value]) => onUpdateText(selectedElement.id, { shadowOffsetX: value })}
                min={-20}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">
                Offset Y: {selectedElement.shadowOffsetY}px
              </Label>
              <Slider
                value={[selectedElement.shadowOffsetY]}
                onValueChange={([value]) => onUpdateText(selectedElement.id, { shadowOffsetY: value })}
                min={-20}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Quick Styles</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateText(selectedElement.id, {
              color: '#ffffff',
              strokeColor: '#000000',
              strokeWidth: 3,
              fontWeight: 'bold'
            })}
          >
            Classic Meme
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateText(selectedElement.id, {
              color: '#000000',
              strokeColor: '#ffffff',
              strokeWidth: 2,
              fontWeight: 'normal'
            })}
          >
            Elegant
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateText(selectedElement.id, {
              color: '#ffff00',
              strokeColor: '#000000',
              strokeWidth: 4,
              fontWeight: 'bold'
            })}
          >
            Bold Yellow
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdateText(selectedElement.id, {
              color: '#ff0000',
              strokeColor: '#ffffff',
              strokeWidth: 2,
              shadowBlur: 4,
              shadowOffsetX: 2,
              shadowOffsetY: 2
            })}
          >
            Red Alert
          </Button>
        </div>
      </Card>
    </div>
  );
};