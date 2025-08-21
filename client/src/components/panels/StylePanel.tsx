import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette, Droplets, Save, Trash2, Edit3, Check, X } from 'lucide-react';
import { TextElement, SavedTextStyle } from '../MemeGenerator';

interface StylePanelProps {
  selectedElement: TextElement | undefined;
  onUpdateText: (id: string, updates: Partial<TextElement>) => void;
  savedStyles: SavedTextStyle[];
  onSaveStyle: (name: string) => void;
  onApplyStyle: (style: SavedTextStyle) => void;
  onDeleteStyle: (styleId: string) => void;
  onRenameStyle: (styleId: string, newName: string) => void;
}

const predefinedColors = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
];

export const StylePanel = ({ 
  selectedElement, 
  onUpdateText, 
  savedStyles, 
  onSaveStyle, 
  onApplyStyle, 
  onDeleteStyle, 
  onRenameStyle 
}: StylePanelProps) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [styleName, setStyleName] = useState('');
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const exportStylesToFile = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `my-styles-${timestamp}.ts`;
    
    const fileContent = `// Exported Meme Generator Styles - ${new Date().toISOString()}
// Place this file in src/styles/ and run 'npm run generate:styles' to load into app

import { SavedTextStyle } from '../components/MemeGenerator';

export const GENERATED_STYLES: SavedTextStyle[] = ${JSON.stringify(savedStyles, null, 2)};
`;

    const blob = new Blob([fileContent], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
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
        <h3 className="font-semibold text-sm flex items-center gap-2" style={{fontFamily: 'Sora, sans-serif'}}>
          <Palette className="h-3 w-3" />
          Fill Color
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={selectedElement.color.startsWith('#') ? selectedElement.color : '#000000'}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-8 p-1 border rounded"
            />
            <Input
              type="text"
              value={selectedElement.color}
              onChange={(e) => handleColorChange(e.target.value)}
              placeholder="#000000 or rgba(0,0,0,1)"
              className="flex-1 font-mono text-sm"
              style={{fontFamily: 'Figtree, sans-serif'}}
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
        <h3 className="font-semibold text-sm" style={{fontFamily: 'Sora, sans-serif'}}>Stroke</h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={selectedElement.strokeColor.startsWith('#') ? selectedElement.strokeColor : '#000000'}
              onChange={(e) => handleStrokeColorChange(e.target.value)}
              className="w-12 h-8 p-1 border rounded"
            />
            <Input
              type="text"
              value={selectedElement.strokeColor}
              onChange={(e) => handleStrokeColorChange(e.target.value)}
              placeholder="#000000 or rgba(0,0,0,1)"
              className="flex-1 font-mono text-sm"
              style={{fontFamily: 'Figtree, sans-serif'}}
            />
          </div>

            <div>
              <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>
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
        <h3 className="font-semibold text-sm flex items-center gap-2" style={{fontFamily: 'Sora, sans-serif'}}>
          <Droplets className="h-3 w-3" />
          Shadow
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={selectedElement.shadowColor.startsWith('#') ? selectedElement.shadowColor : '#000000'}
              onChange={(e) => onUpdateText(selectedElement.id, { shadowColor: e.target.value })}
              className="w-12 h-8 p-1 border rounded"
            />
            <Input
              type="text"
              value={selectedElement.shadowColor}
              onChange={(e) => onUpdateText(selectedElement.id, { shadowColor: e.target.value })}
              placeholder="#000000 or rgba(0,0,0,0.5)"
              className="flex-1 font-mono text-sm"
              style={{fontFamily: 'Figtree, sans-serif'}}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>
                Shadow Blur: {selectedElement.shadowBlur}px
              </Label>
              <Slider
                value={[selectedElement.shadowBlur]}
                onValueChange={([value]) => onUpdateText(selectedElement.id, { shadowBlur: value })}
                min={0}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>
                Shadow Size: {selectedElement.shadowSize?.toFixed(1) || '1.0'}x
              </Label>
              <Slider
                value={[selectedElement.shadowSize || 1]}
                onValueChange={([value]) => onUpdateText(selectedElement.id, { shadowSize: value })}
                min={0.1}
                max={3}
                step={0.1}
                className="mt-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>
                Offset X: {selectedElement.shadowOffsetX}px
              </Label>
              <Slider
                value={[selectedElement.shadowOffsetX]}
                onValueChange={([value]) => onUpdateText(selectedElement.id, { shadowOffsetX: value })}
                min={-100}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs font-medium" style={{fontFamily: 'Figtree, sans-serif'}}>
                Offset Y: {selectedElement.shadowOffsetY}px
              </Label>
              <Slider
                value={[selectedElement.shadowOffsetY]}
                onValueChange={([value]) => onUpdateText(selectedElement.id, { shadowOffsetY: value })}
                min={-100}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Saved Styles Section */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-sm" style={{fontFamily: 'Sora, sans-serif'}}>Saved Styles</h3>
        <div className="flex gap-2">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 px-4" style={{fontFamily: 'Figtree, sans-serif'}}>
                  <Save className="h-3 w-3 mr-1" />
                  Save Style
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Save Current Style</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="style-name">Style Name</Label>
                    <Input
                      id="style-name"
                      value={styleName}
                      onChange={(e) => setStyleName(e.target.value)}
                      placeholder="Enter style name..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSaveDialogOpen(false);
                        setStyleName('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (styleName.trim()) {
                          onSaveStyle(styleName.trim());
                          setSaveDialogOpen(false);
                          setStyleName('');
                        }
                      }}
                      disabled={!styleName.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 px-4"
              onClick={exportStylesToFile}
              disabled={savedStyles.length === 0}
              style={{fontFamily: 'Figtree, sans-serif'}}
            >
              Export to File
            </Button>
        </div>

        <ScrollArea className="h-64">
          <div className="space-y-1">
            {savedStyles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved styles</p>
                <p className="text-xs">Save your current style to get started</p>
              </div>
            ) : (
              savedStyles.map((style) => (
                <div key={style.id} className="relative group">
                  {editingStyleId === style.id ? (
                    <div className="flex items-center gap-1 p-2 border rounded bg-accent">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-6 text-sm flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onRenameStyle(style.id, editingName.trim());
                            setEditingStyleId(null);
                            setEditingName('');
                          } else if (e.key === 'Escape') {
                            setEditingStyleId(null);
                            setEditingName('');
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => {
                          onRenameStyle(style.id, editingName.trim());
                          setEditingStyleId(null);
                          setEditingName('');
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => {
                          setEditingStyleId(null);
                          setEditingName('');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Main clickable area */}
                      <button
                        className="w-full p-2 border rounded hover:bg-accent text-left transition-colors"
                        onClick={() => onApplyStyle(style)}
                        title={`Apply style: ${style.name}`}
                      >
                        <div className="font-medium text-sm break-words leading-tight">
                          {style.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 break-words">
                          {style.fontFamily} • {style.fontSize}%
                        </div>
                      </button>
                      
                      {/* Action buttons - visible on hover */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 bg-background/80 hover:bg-background"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingStyleId(style.id);
                            setEditingName(style.name);
                          }}
                          title="Rename style"
                        >
                          <Edit3 className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteStyle(style.id);
                          }}
                          title="Delete style"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};