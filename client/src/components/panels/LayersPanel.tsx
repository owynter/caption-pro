import { useState, DragEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Trash2,
  Type,
  GripVertical
} from 'lucide-react';
import { TextElement } from '../MemeGenerator';

interface LayersPanelProps {
  textElements: TextElement[];
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
  onUpdateText: (id: string, updates: Partial<TextElement>) => void;
  onDeleteText: () => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
}

export const LayersPanel = ({ 
  textElements, 
  selectedTextId, 
  onSelectText, 
  onUpdateText, 
  onDeleteText,
  onReorderLayers
}: LayersPanelProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const sortedElements = [...textElements].sort((a, b) => b.zIndex - a.zIndex);

  const handleDragStart = (e: DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderLayers(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveLayer = (id: string, direction: 'up' | 'down') => {
    const element = textElements.find(el => el.id === id);
    if (!element) return;

    const newZIndex = direction === 'up' 
      ? Math.max(...textElements.map(el => el.zIndex)) + 1
      : Math.min(...textElements.map(el => el.zIndex)) - 1;

    onUpdateText(id, { zIndex: newZIndex });
  };

  const toggleVisibility = (id: string) => {
    const element = textElements.find(el => el.id === id);
    if (element) {
      onUpdateText(id, { opacity: element.opacity > 0 ? 0 : 1 });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm" style={{fontFamily: 'Sora, sans-serif'}}>Layers</h3>
          <Badge variant="secondary">
            {textElements.length} text {textElements.length === 1 ? 'layer' : 'layers'}
          </Badge>
        </div>

        {textElements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Type className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No text layers</p>
            <p className="text-sm">Add text to start creating your meme</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedElements.map((element, index) => (
              <div
                key={element.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectText(element.id)}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all
                  ${selectedTextId === element.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                  }
                  ${draggedIndex === index ? 'opacity-50' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 drag-handle" />
                    <Type className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-sm font-medium">
                      {element.content || 'Empty text'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(element.id);
                      }}
                      className="h-6 w-6 p-0"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(element.id, 'up');
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(element.id, 'down');
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {element.fontSize}px · {element.fontFamily}
                  </span>
                  <span>
                    Z-Index: {element.zIndex}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTextId && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteText}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected Layer
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};