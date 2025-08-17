import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Plus, AlignLeft, AlignCenter, AlignRight, RotateCcw } from 'lucide-react';
import { TextElement } from '../MemeGenerator';

interface TextPanelProps {
  selectedElement: TextElement | undefined;
  onAddText: () => void;
  onUpdateText: (id: string, updates: Partial<TextElement>) => void;
}

const fonts = [
  'Helvetica',
  'Trebuchet MS',
  'Courier New',
  'Impact'
];

const fontWeights = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
  { value: '100', label: 'Thin' },
  { value: '300', label: 'Light' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
  { value: '900', label: 'Black' }
];

export const TextPanel = ({ selectedElement, onAddText, onUpdateText }: TextPanelProps) => {
  const [textContent, setTextContent] = useState(selectedElement?.content || '');

  const handleContentChange = (value: string) => {
    setTextContent(value);
    if (selectedElement) {
      onUpdateText(selectedElement.id, { content: value });
    }
  };

  const handleAlignmentChange = (alignment: 'left' | 'center' | 'right') => {
    if (selectedElement) {
      onUpdateText(selectedElement.id, { textAlign: alignment });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm" style={{fontFamily: 'Sora, sans-serif'}}>Text</h3>
          <Button onClick={onAddText} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Text
          </Button>
        </div>

        {selectedElement ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="text-content" className="text-sm font-medium">
                Content
              </Label>
              <Textarea
                id="text-content"
                value={selectedElement.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Enter your text..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Font Family</Label>
                <Select
                  value={selectedElement.fontFamily}
                  onValueChange={(value) => onUpdateText(selectedElement.id, { fontFamily: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fonts.map((font) => (
                      <SelectItem key={font} value={font}>
                        <span style={{ fontFamily: font }}>{font}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Font Weight</Label>
                <Select
                  value={selectedElement.fontWeight}
                  onValueChange={(value) => onUpdateText(selectedElement.id, { fontWeight: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontWeights.map((weight) => (
                      <SelectItem key={weight.value} value={weight.value}>
                        {weight.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">
                Font Size: {selectedElement.fontSize}px
              </Label>
              <Slider
                value={[selectedElement.fontSize]}
                onValueChange={([value]) => onUpdateText(selectedElement.id, { fontSize: value })}
                min={8}
                max={200}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Text Alignment</Label>
              <div className="flex gap-1">
                <Button
                  variant={selectedElement.textAlign === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAlignmentChange('left')}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedElement.textAlign === 'center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAlignmentChange('center')}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedElement.textAlign === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAlignmentChange('right')}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">
                Opacity: {Math.round(selectedElement.opacity * 100)}%
              </Label>
              <Slider
                value={[selectedElement.opacity]}
                onValueChange={([value]) => onUpdateText(selectedElement.id, { opacity: value })}
                min={0}
                max={1}
                step={0.1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">
                Line Height: {selectedElement.lineHeight?.toFixed(1) || '1.2'}
              </Label>
              <Slider
                value={[selectedElement.lineHeight || 1.2]}
                onValueChange={([value]) => onUpdateText(selectedElement.id, { lineHeight: value })}
                min={0.5}
                max={3}
                step={0.1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">
                Letter Spacing: {selectedElement.letterSpacing || 0}px
              </Label>
              <Slider
                value={[selectedElement.letterSpacing || 0]}
                onValueChange={([value]) => onUpdateText(selectedElement.id, { letterSpacing: value })}
                min={-10}
                max={50}
                step={0.5}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">
                Rotation: {selectedElement.rotation}°
              </Label>
              <Slider
                value={[selectedElement.rotation]}
                onValueChange={([value]) => onUpdateText(selectedElement.id, { rotation: value })}
                min={0}
                max={360}
                step={1}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">
                  Skew X: {selectedElement.skewX || 0}°
                </Label>
                <Slider
                  value={[selectedElement.skewX || 0]}
                  onValueChange={([value]) => onUpdateText(selectedElement.id, { skewX: value })}
                  min={-45}
                  max={45}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">
                  Skew Y: {selectedElement.skewY || 0}°
                </Label>
                <Slider
                  value={[selectedElement.skewY || 0]}
                  onValueChange={([value]) => onUpdateText(selectedElement.id, { skewY: value })}
                  min={-45}
                  max={45}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No text element selected</p>
            <p className="text-sm">Add or select a text element to edit</p>
          </div>
        )}
      </Card>
    </div>
  );
};