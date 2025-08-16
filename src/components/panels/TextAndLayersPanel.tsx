import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Plus, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
  RotateCcw,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  GripVertical
} from 'lucide-react';
import { TextElement } from '../MemeGenerator';
import { GENERATED_FONTS } from '../../fonts.generated';

interface TextAndLayersPanelProps {
  textElements: TextElement[];
  selectedElement: TextElement | undefined;
  selectedTextId: string | null;
  onAddText: () => void;
  onSelectText: (id: string | null) => void;
  onUpdateText: (id: string, updates: Partial<TextElement>) => void;
  onDeleteText: () => void;
  onDuplicateText: () => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  onAlignText: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
}

// Use generated fonts list, fallback to base fonts if generation hasn't run yet
const fonts = GENERATED_FONTS.length > 0 ? GENERATED_FONTS : [
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

// Sortable layer item component
const SortableLayerItem = ({
  element,
  index,
  isSelected,
  onSelect,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  moveLayer,
  totalLayers
}: {
  element: TextElement;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  totalLayers: number;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Arrow controls (backup) */}
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={(e) => {
            e.stopPropagation();
            moveLayer(element.id, 'up');
          }}
          disabled={index === 0}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={(e) => {
            e.stopPropagation();
            moveLayer(element.id, 'down');
          }}
          disabled={index === totalLayers - 1}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {element.content || 'Empty Text'}
        </div>
        <div className="text-xs text-muted-foreground">
          {element.fontFamily} • {element.fontSize}px
        </div>
      </div>

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
        >
          {element.opacity > 0 ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export const TextAndLayersPanel = ({ 
  textElements,
  selectedElement, 
  selectedTextId,
  onAddText, 
  onSelectText,
  onUpdateText,
  onDeleteText,
  onDuplicateText,
  onReorderLayers,
  onAlignText
}: TextAndLayersPanelProps) => {
  // Snapshot of selected element for Reset
  const [initialSnapshot, setInitialSnapshot] = useState<TextElement | null>(null);
  useEffect(() => {
    if (selectedElement && (!initialSnapshot || initialSnapshot.id !== selectedElement.id)) {
      // Only set snapshot when selecting a new element, not when updating existing one
      setInitialSnapshot({ ...selectedElement });
    }
  }, [selectedElement?.id, initialSnapshot]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleContentChange = (value: string) => {
    if (selectedElement) {
      onUpdateText(selectedElement.id, { content: value });
    }
  };

  const handleAlignmentChange = (alignment: 'left' | 'center' | 'right') => {
    if (selectedElement) {
      onUpdateText(selectedElement.id, { textAlign: alignment });
    }
  };

  const toggleVisibility = (id: string) => {
    const element = textElements.find(el => el.id === id);
    if (element) {
      onUpdateText(id, { opacity: element.opacity > 0 ? 0 : 1 });
    }
  };

  const duplicateElement = (element: TextElement) => {
    onSelectText(element.id);
    onDuplicateText();
  };

  const moveLayer = (id: string, direction: 'up' | 'down') => {
    // Work with the same order used in the canvas: zIndex desc (top first)
    const sorted = [...textElements].sort((a, b) => b.zIndex - a.zIndex);
    const currentIndex = sorted.findIndex(el => el.id === id);
    if (currentIndex === -1) return;
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= sorted.length) return;
    onReorderLayers(currentIndex, nextIndex);
  };

  const sortedElements = [...textElements].sort((a, b) => b.zIndex - a.zIndex);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedElements.findIndex((el) => el.id === active.id);
    const newIndex = sortedElements.findIndex((el) => el.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderLayers(oldIndex, newIndex);
    }
  };

  // Helpers for number inputs paired with sliders
  const commitNumber = (val: string | number, fallback: number, clamp?: { min?: number; max?: number }) => {
    let n = typeof val === 'number' ? val : parseFloat(val);
    if (Number.isNaN(n)) n = fallback;
    if (clamp?.min !== undefined) n = Math.max(clamp.min, n);
    if (clamp?.max !== undefined) n = Math.min(clamp.max, n);
    return n;
  };

  return (
    <div className="space-y-4">
      {/* Text Content Section */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm" style={{fontFamily: 'Sora, sans-serif'}}>Text & Layers</h3>
          <Button onClick={onAddText} size="sm" style={{fontFamily: 'Figtree, sans-serif'}}>
            <Plus className="h-4 w-4 mr-2" />
            Add Text
          </Button>
        </div>

        {selectedElement ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!selectedElement || !initialSnapshot) return;
                  const id = selectedElement.id;
                  const s = initialSnapshot;
                  onUpdateText(id, {
                    content: s.content,
                    fontFamily: s.fontFamily,
                    fontSize: s.fontSize,
                    fontWeight: s.fontWeight,
                    color: s.color,
                    strokeColor: s.strokeColor,
                    strokeWidth: s.strokeWidth,
                    textAlign: s.textAlign,
                    rotation: s.rotation,
                    opacity: s.opacity,
                    shadowColor: s.shadowColor,
                    shadowBlur: s.shadowBlur,
                    shadowSize: s.shadowSize,
                    shadowOffsetX: s.shadowOffsetX,
                    shadowOffsetY: s.shadowOffsetY,
                    lineHeight: s.lineHeight,
                    letterSpacing: s.letterSpacing,
                    skewX: s.skewX,
                    skewY: s.skewY,
                    curvature: s.curvature,
                  });
                }}
                disabled={!initialSnapshot}
                title="Reset selected text to prior values"
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Reset
              </Button>
            </div>
            <div>
              <Label htmlFor="text-content" className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>
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

            {/* Alignment Tools */}
            <div>
              <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>Position Alignment</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground text-center" style={{fontFamily: 'Figtree, sans-serif'}}>Horizontal</Label>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 flex-1"
                      onClick={() => onAlignText('left')}
                      title="Align Left"
                    >
                      <AlignHorizontalJustifyStart className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 flex-1"
                      onClick={() => onAlignText('center')}
                      title="Align Center"
                    >
                      <AlignHorizontalJustifyCenter className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 flex-1"
                      onClick={() => onAlignText('right')}
                      title="Align Right"
                    >
                      <AlignHorizontalJustifyEnd className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground text-center" style={{fontFamily: 'Figtree, sans-serif'}}>Vertical</Label>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 flex-1"
                      onClick={() => onAlignText('top')}
                      title="Align Top"
                    >
                      <AlignVerticalJustifyStart className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 flex-1"
                      onClick={() => onAlignText('middle')}
                      title="Align Middle"
                    >
                      <AlignVerticalJustifyCenter className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 flex-1"
                      onClick={() => onAlignText('bottom')}
                      title="Align Bottom"
                    >
                      <AlignVerticalJustifyEnd className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>Font Family</Label>
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
                <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>Font Weight</Label>
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
              <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>Font Size</Label>
              <div className="flex items-center gap-2 mt-2">
                <Slider
                  value={[selectedElement.fontSize]}
                  onValueChange={([value]) => onUpdateText(selectedElement.id, { fontSize: value })}
                  min={8}
                  max={200}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  className="w-20"
                  value={selectedElement.fontSize}
                  onChange={(e) => {
                    const n = commitNumber(e.target.value, selectedElement.fontSize, { min: 1, max: 500 });
                    onUpdateText(selectedElement.id, { fontSize: n });
                  }}
                />
              </div>
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

            {/* Typography Controls */}
            <div>
              <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>Line Height</Label>
              <div className="flex items-center gap-2 mt-2">
                <Slider
                  value={[selectedElement.lineHeight || 1.2]}
                  onValueChange={([value]) => onUpdateText(selectedElement.id, { lineHeight: value })}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step={0.1}
                  className="w-20"
                  value={selectedElement.lineHeight ?? 1.2}
                  onChange={(e) => {
                    const n = commitNumber(e.target.value, selectedElement.lineHeight ?? 1.2, { min: 0.1, max: 5 });
                    onUpdateText(selectedElement.id, { lineHeight: n });
                  }}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>Letter Spacing</Label>
              <Input
                type="number"
                step={0.5}
                className="w-20 mt-2"
                value={selectedElement.letterSpacing ?? 0}
                onChange={(e) => {
                  const n = commitNumber(e.target.value, selectedElement.letterSpacing ?? 0, { min: -100, max: 200 });
                  onUpdateText(selectedElement.id, { letterSpacing: n });
                }}
                placeholder="0"
              />
            </div>

            {/* Advanced Transform Tools - Accordion */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="transforms">
                <AccordionTrigger className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>
                  More Tools (Rotation, Skew, Curvature)
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  {/* Rotation */}
                  <div>
                    <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>Rotation</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Slider
                        value={[selectedElement.rotation]}
                        onValueChange={([value]) => onUpdateText(selectedElement.id, { rotation: value })}
                        min={0}
                        max={360}
                        step={1}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        className="w-20"
                        value={selectedElement.rotation}
                        onChange={(e) => {
                          const n = commitNumber(e.target.value, selectedElement.rotation, { min: 0, max: 360 });
                          onUpdateText(selectedElement.id, { rotation: n });
                        }}
                      />
                    </div>
                  </div>

                  {/* Skew Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>
                        Skew X: {selectedElement.skewX || 0}°
                      </Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Slider
                          value={[selectedElement.skewX || 0]}
                          onValueChange={([value]) => onUpdateText(selectedElement.id, { skewX: value })}
                          min={-45}
                          max={45}
                          step={1}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          className="w-20"
                          value={selectedElement.skewX ?? 0}
                          onChange={(e) => {
                            const n = commitNumber(e.target.value, selectedElement.skewX ?? 0, { min: -90, max: 90 });
                            onUpdateText(selectedElement.id, { skewX: n });
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>
                        Skew Y: {selectedElement.skewY || 0}°
                      </Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Slider
                          value={[selectedElement.skewY || 0]}
                          onValueChange={([value]) => onUpdateText(selectedElement.id, { skewY: value })}
                          min={-45}
                          max={45}
                          step={1}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          className="w-20"
                          value={selectedElement.skewY ?? 0}
                          onChange={(e) => {
                            const n = commitNumber(e.target.value, selectedElement.skewY ?? 0, { min: -90, max: 90 });
                            onUpdateText(selectedElement.id, { skewY: n });
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Curvature Control */}
                  <div>
                    <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>Curvature (Warp)</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Slider
                        value={[selectedElement.curvature || 0]}
                        onValueChange={([value]) => onUpdateText(selectedElement.id, { curvature: value })}
                        min={-100}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        className="w-20"
                        value={selectedElement.curvature ?? 0}
                        onChange={(e) => {
                          const n = commitNumber(e.target.value, selectedElement.curvature ?? 0, { min: -200, max: 200 });
                          onUpdateText(selectedElement.id, { curvature: n });
                        }}
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Creates wave/curve effects on text
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p>No text element selected</p>
            <p className="text-sm">Add or select a text element to edit</p>
          </div>
        )}
      </Card>

      <Separator />

      {/* Layers Section */}
      <Card className="p-4">
        <h4 className="font-semibold text-sm mb-3" style={{fontFamily: 'Sora, sans-serif'}}>Layers ({textElements.length})</h4>
        <ScrollArea className="h-64">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedElements.map(el => el.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sortedElements.map((element, index) => (
                  <SortableLayerItem
                    key={element.id}
                    element={element}
                    index={index}
                    isSelected={selectedTextId === element.id}
                    onSelect={() => onSelectText(element.id)}
                    onToggleVisibility={() => toggleVisibility(element.id)}
                    onDuplicate={() => duplicateElement(element)}
                    onDelete={() => {
                      onSelectText(element.id);
                      onDeleteText();
                    }}
                    moveLayer={moveLayer}
                    totalLayers={sortedElements.length}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {textElements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No text layers</p>
              <p className="text-sm">Click "Add Text" to get started</p>
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
};
