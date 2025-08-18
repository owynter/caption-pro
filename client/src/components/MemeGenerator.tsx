import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { TextAndLayersPanel } from './panels/TextAndLayersPanel';
import { StylePanel } from './panels/StylePanel';
import { FabricCanvas } from './canvas/FabricCanvas';
import { Toolbar } from './toolbar/Toolbar';
import { ExportDialog } from './dialogs/ExportDialog';
import { 
  Image, 
  Palette, 
  Layers, 
  Download,
  Undo,
  Redo,
  Copy,
  Trash2
} from 'lucide-react';
import { GENERATED_STYLES } from '../styles.generated';

export interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  textAlign: 'left' | 'center' | 'right';
  rotation: number;
  opacity: number;
  zIndex: number;
  selected: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowSize: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  lineHeight: number;
  letterSpacing: number;
  skewX: number;
  skewY: number;
  curvature: number;
}

export interface SavedTextStyle {
  id: string;
  name: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  textAlign: 'left' | 'center' | 'right';
  shadowColor: string;
  shadowBlur: number;
  shadowSize: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  lineHeight: number;
  letterSpacing: number;
  skewX: number;
  skewY: number;
  curvature: number;
  createdAt: string;
}

export interface CanvasState {
  backgroundImage: string | null;
  backgroundImageFileName: string | null;
  textElements: TextElement[];
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  snapToGrid: boolean;
  gridVisible: boolean;
  gridSize: number;
}

export const MemeGenerator = () => {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    backgroundImage: null,
    backgroundImageFileName: null,
    textElements: [],
    canvasWidth: 800,
    canvasHeight: 600,
    zoom: 1,
    snapToGrid: false,
    gridVisible: false,
    gridSize: 60
  });


  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [history, setHistory] = useState<CanvasState[]>([canvasState]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Saved styles state
  const [savedStyles, setSavedStyles] = useState<SavedTextStyle[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const saveToHistory = useCallback((newState: CanvasState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const updateCanvasState = useCallback((updates: Partial<CanvasState> | ((prevState: CanvasState) => CanvasState)) => {
    setCanvasState(prev => {
      const newState = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      saveToHistory(newState);
      return newState;
    });
  }, [saveToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setCanvasState(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setCanvasState(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const addTextElement = useCallback(() => {
    const fontSize = 48;
    const lineHeight = 1.2;
    
    // Create a temporary canvas to measure text dimensions accurately
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    tempCtx.font = `bold ${fontSize}px Arial`;
    const textMetrics = tempCtx.measureText('Edit this text');
    
    // Calculate actual text dimensions with minimal padding
    const textWidth = textMetrics.width;
    const textHeight = fontSize * lineHeight;
    
    // Add minimal padding (just 4px on each side)
    const estimatedWidth = Math.ceil(textWidth + 8);
    const estimatedHeight = Math.ceil(textHeight + 8);
    
    const maxZ = canvasState.textElements.length > 0
      ? Math.max(...canvasState.textElements.map(el => el.zIndex))
      : 0;

    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      content: 'Edit this text',
      x: canvasState.canvasWidth / 2 - estimatedWidth / 2,
      y: canvasState.canvasHeight / 2 - estimatedHeight / 2,
      width: estimatedWidth,
      height: estimatedHeight,
      fontSize: fontSize,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 2,
      textAlign: 'center',
      rotation: 0,
      opacity: 1,
      zIndex: maxZ + 1,
      selected: false,
      shadowColor: '#000000',
      shadowBlur: 4,
      shadowSize: 1,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      lineHeight: lineHeight,
      letterSpacing: 0,
      skewX: 0,
      skewY: 0,
      curvature: 0
    };

    updateCanvasState({
      textElements: [...canvasState.textElements, newElement]
    });
    setSelectedTextId(newElement.id);
  }, [canvasState, updateCanvasState]);

  const selectTextElement = useCallback((id: string | null) => {
    setSelectedTextId(id);
    // Use functional update to avoid stale closure issues
    updateCanvasState(prevState => ({
      ...prevState,
      textElements: prevState.textElements.map(el => ({
        ...el,
        selected: el.id === id
      }))
    }));
  }, [updateCanvasState]);

  const updateTextElement = useCallback((id: string, updates: Partial<TextElement>) => {
    updateCanvasState(prevState => ({
      ...prevState,
      textElements: prevState.textElements.map(el => {
        if (el.id !== id) return el;

        const updatedElement = { ...el, ...updates };

        // Auto-scale the text box when font size or line height changes
        if (updates.fontSize !== undefined || updates.lineHeight !== undefined) {
          const nextFontSize = updates.fontSize ?? el.fontSize;
          const nextLineHeight = updates.lineHeight ?? el.lineHeight;

          // Create a temporary canvas to measure new text dimensions
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.font = `${el.fontWeight} ${nextFontSize}px ${el.fontFamily}`;
            const textMetrics = tempCtx.measureText(el.content);
            
            // Calculate new dimensions with minimal padding
            const newWidth = Math.ceil(textMetrics.width + 8);
            const newHeight = Math.ceil(nextFontSize * nextLineHeight + 8);
            
            updatedElement.width = newWidth;
            updatedElement.height = newHeight;
          }
        }

        return updatedElement;
      })
    }));
  }, [updateCanvasState]);

  const deleteSelectedText = useCallback(() => {
    if (selectedTextId) {
      updateCanvasState(prevState => ({
        ...prevState,
        textElements: prevState.textElements.filter(el => el.id !== selectedTextId)
      }));
      setSelectedTextId(null);
    }
  }, [selectedTextId, updateCanvasState]);

  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    updateCanvasState(prevState => {
      // Sort by zIndex descending to treat index 0 as the top-most layer
      const sorted = [...prevState.textElements].sort((a, b) => b.zIndex - a.zIndex);
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= sorted.length || toIndex >= sorted.length) return prevState;

      // Move the layer in this array
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);

      // Reassign zIndex to maintain strict ordering (top-most gets largest zIndex)
      const topZ = Math.max(0, ...prevState.textElements.map(el => el.zIndex));
      const normalized = sorted.map((el, idx) => ({ ...el, zIndex: topZ - idx }));

      return { ...prevState, textElements: normalized };
    });
  }, [updateCanvasState]);

  const duplicateSelectedText = useCallback(() => {
    if (selectedTextId) {
      updateCanvasState(prevState => {
        const element = prevState.textElements.find(el => el.id === selectedTextId);
        if (element) {
          const newElement = {
            ...element,
            id: `text-${Date.now()}`,
            x: element.x + 20,
            y: element.y + 20,
            zIndex: Math.max(...prevState.textElements.map(el => el.zIndex)) + 1
          };
          setSelectedTextId(newElement.id);
          return {
            ...prevState,
            textElements: [...prevState.textElements, newElement]
          };
        }
        return prevState;
      });
    }
  }, [selectedTextId, updateCanvasState]);

  // Alignment functions
  const alignSelectedText = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedTextId) return;
    
    const element = canvasState.textElements.find(el => el.id === selectedTextId);
    if (!element) return;

    let newX = element.x;
    let newY = element.y;

    switch (alignment) {
      case 'left':
        newX = 20; // 20px margin from left
        break;
      case 'center':
        newX = (canvasState.canvasWidth - element.width) / 2;
        break;
      case 'right':
        newX = canvasState.canvasWidth - element.width - 20; // 20px margin from right
        break;
      case 'top':
        newY = 20; // 20px margin from top
        break;
      case 'middle':
        newY = (canvasState.canvasHeight - element.height) / 2;
        break;
      case 'bottom':
        newY = canvasState.canvasHeight - element.height - 20; // 20px margin from bottom
        break;
    }

    updateTextElement(selectedTextId, { x: newX, y: newY });
  }, [selectedTextId, canvasState.textElements, canvasState.canvasWidth, canvasState.canvasHeight, updateTextElement]);

  // Keep text within canvas bounds when canvas size changes
  const constrainTextToCanvas = useCallback(() => {
    const margin = 0.2; // 20% margin of error for overlap
    const updatedElements = canvasState.textElements.map(element => {
      let newX = element.x;
      let newY = element.y;

      // Allow 20% overlap on each side
      const leftBound = -element.width * margin;
      const rightBound = canvasState.canvasWidth - element.width * (1 - margin);
      const topBound = -element.height * margin;
      const bottomBound = canvasState.canvasHeight - element.height * (1 - margin);

      // Constrain X position
      if (newX < leftBound) {
        newX = leftBound;
      } else if (newX > rightBound) {
        newX = rightBound;
      }

      // Constrain Y position
      if (newY < topBound) {
        newY = topBound;
      } else if (newY > bottomBound) {
        newY = bottomBound;
      }

      return { ...element, x: newX, y: newY };
    });

    updateCanvasState({ textElements: updatedElements });
  }, [canvasState.textElements, canvasState.canvasWidth, canvasState.canvasHeight, updateCanvasState]);

  // Style management functions
  const saveCurrentStyle = useCallback((name: string) => {
    if (!selectedTextId) return;
    
    const element = canvasState.textElements.find(el => el.id === selectedTextId);
    if (!element) return;

    const newStyle: SavedTextStyle = {
      id: `style-${Date.now()}`,
      name,
      fontSize: element.fontSize,
      fontFamily: element.fontFamily,
      fontWeight: element.fontWeight,
      color: element.color,
      strokeColor: element.strokeColor,
      strokeWidth: element.strokeWidth,
      textAlign: element.textAlign,
      shadowColor: element.shadowColor,
      shadowBlur: element.shadowBlur,
      shadowSize: element.shadowSize,
      shadowOffsetX: element.shadowOffsetX,
      shadowOffsetY: element.shadowOffsetY,
      lineHeight: element.lineHeight,
      letterSpacing: element.letterSpacing,
      skewX: element.skewX,
      skewY: element.skewY,
      curvature: element.curvature,
      createdAt: new Date().toISOString()
    };

    const updatedStyles = [...savedStyles, newStyle];
    setSavedStyles(updatedStyles);
    localStorage.setItem('meme-generator-styles', JSON.stringify(updatedStyles));
  }, [selectedTextId, canvasState.textElements, savedStyles]);

  const applyStyle = useCallback((style: SavedTextStyle) => {
    if (!selectedTextId) return;

    updateTextElement(selectedTextId, {
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      color: style.color,
      strokeColor: style.strokeColor,
      strokeWidth: style.strokeWidth,
      textAlign: style.textAlign,
      shadowColor: style.shadowColor,
      shadowBlur: style.shadowBlur,
      shadowSize: style.shadowSize,
      shadowOffsetX: style.shadowOffsetX,
      shadowOffsetY: style.shadowOffsetY,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      skewX: style.skewX,
      skewY: style.skewY,
      curvature: style.curvature
    });
  }, [selectedTextId, updateTextElement]);

  const deleteStyle = useCallback((styleId: string) => {
    const updatedStyles = savedStyles.filter(style => style.id !== styleId);
    setSavedStyles(updatedStyles);
    localStorage.setItem('meme-generator-styles', JSON.stringify(updatedStyles));
  }, [savedStyles]);

  const renameStyle = useCallback((styleId: string, newName: string) => {
    const updatedStyles = savedStyles.map(style => 
      style.id === styleId ? { ...style, name: newName } : style
    );
    setSavedStyles(updatedStyles);
    localStorage.setItem('meme-generator-styles', JSON.stringify(updatedStyles));
  }, [savedStyles]);

  // Load saved styles from both localStorage and generated file on mount
  useEffect(() => {
    const combinedStyles = [...GENERATED_STYLES]; // Start with codebase styles
    
    // Add localStorage styles
    const savedStylesData = localStorage.getItem('meme-generator-styles');
    if (savedStylesData) {
      try {
        const localStyles = JSON.parse(savedStylesData);
        if (Array.isArray(localStyles)) {
          combinedStyles.push(...localStyles);
        }
      } catch (error) {
        console.error('Failed to load localStorage styles:', error);
      }
    }
    
    setSavedStyles(combinedStyles);
  }, []);

  // Constrain text to canvas when canvas size changes
  useEffect(() => {
    if (canvasState.textElements.length > 0) {
      const margin = 0.2; // 20% margin of error for overlap
      
      updateCanvasState(prevState => {
        const updatedElements = prevState.textElements.map(element => {
          let newX = element.x;
          let newY = element.y;

          // Allow 20% overlap on each side
          const leftBound = -element.width * margin;
          const rightBound = prevState.canvasWidth - element.width * (1 - margin);
          const topBound = -element.height * margin;
          const bottomBound = prevState.canvasHeight - element.height * (1 - margin);

          // Constrain X position
          if (newX < leftBound) {
            newX = leftBound;
          } else if (newX > rightBound) {
            newX = rightBound;
          }

          // Constrain Y position
          if (newY < topBound) {
            newY = topBound;
          } else if (newY > bottomBound) {
            newY = bottomBound;
          }

          return { ...element, x: newX, y: newY };
        });

        // Only update if positions actually changed
        const hasChanges = updatedElements.some((updated, index) => {
          const original = prevState.textElements[index];
          return updated.x !== original.x || updated.y !== original.y;
        });

        if (hasChanges) {
          return { ...prevState, textElements: updatedElements };
        }
        return prevState;
      });
    }
  }, [canvasState.canvasWidth, canvasState.canvasHeight, updateCanvasState]); // Only trigger on canvas size changes

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            undo();
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'd':
            e.preventDefault();
            duplicateSelectedText();
            break;
          case 'e':
            e.preventDefault();
            setShowExportDialog(true);
            break;
        }
      } else if (e.key === 'Delete') {
        deleteSelectedText();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, duplicateSelectedText, deleteSelectedText]);



  const selectedElement = canvasState.textElements.find(el => el.id === selectedTextId);

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-toolbar-bg border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Glyph Guru
            </h1>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={historyIndex === 0}
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={historyIndex === history.length - 1}
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Image Upload */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('image-upload')?.click()}
              title="Upload Background Image"
            >
              <Image className="h-4 w-4" />
            </Button>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const result = e.target?.result as string;
                    const img = new window.Image();
                    img.onload = () => {
                      updateCanvasState({
                        backgroundImage: result,
                        backgroundImageFileName: file.name,
                        canvasWidth: img.width,
                        canvasHeight: img.height
                      });
                    };
                    img.src = result;
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
            />
            
            {/* Zoom Controls */}
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateCanvasState({ zoom: Math.max(0.1, canvasState.zoom - 0.1) })}
              title="Zoom Out"
            >
              <span className="text-xs font-medium">-</span>
            </Button>
            <span className="text-xs font-medium px-2 min-w-[3rem] text-center">
              {Math.round(canvasState.zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateCanvasState({ zoom: Math.min(5, canvasState.zoom + 0.1) })}
              title="Zoom In"
            >
              <span className="text-xs font-medium">+</span>
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={duplicateSelectedText}
              disabled={!selectedTextId}
              title="Duplicate (Ctrl+D)"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteSelectedText}
              disabled={!selectedTextId}
              title="Delete (Del)"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              className={`px-4 ${canvasState.gridVisible ? "bg-secondary" : ""}`}
              onClick={() => updateCanvasState({ gridVisible: !canvasState.gridVisible })}
              title="Toggle Grid Overlay"
            >
              <span className="text-xs font-medium">Grid</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`px-4 ${canvasState.snapToGrid ? "bg-secondary" : ""}`}
              onClick={() => updateCanvasState({ snapToGrid: !canvasState.snapToGrid })}
              title="Toggle Snap to Grid"
            >
              <span className="text-xs font-medium">Snap</span>
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              className="px-4 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm('Are you sure you want to clear the entire canvas? This cannot be undone.')) {
                  updateCanvasState({
                    textElements: [],
                    backgroundImage: null,
                    backgroundImageFileName: null
                  });
                  setSelectedTextId(null);
                }
              }}
              title="Clear entire canvas"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Reset All
            </Button>
            
            <Button 
              onClick={() => setShowExportDialog(true)}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-80 bg-panel-bg border-r border-border flex flex-col overflow-auto">
          {/* Panel Header */}
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{fontFamily: 'Sora, sans-serif'}}>
              <Layers className="h-3 w-3" />
              Text & Layers
            </h3>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto">
            <TextAndLayersPanel
              textElements={canvasState.textElements}
              selectedElement={selectedElement}
              selectedTextId={selectedTextId}
              onAddText={addTextElement}
              onSelectText={selectTextElement}
              onUpdateText={updateTextElement}
              onDeleteText={deleteSelectedText}
              onDuplicateText={duplicateSelectedText}
              onReorderLayers={reorderLayers}
              onAlignText={alignSelectedText}
            />
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 bg-canvas-bg overflow-hidden">
          <FabricCanvas
            ref={canvasRef}
            canvasState={canvasState}
            onSelectText={selectTextElement}
            onUpdateText={updateTextElement}
            onUpdateCanvas={updateCanvasState}
          />
        </main>

        {/* Right Sidebar - Style Panel */}
        <aside className="w-80 bg-panel-bg border-l border-border overflow-auto">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{fontFamily: 'Sora, sans-serif'}}>
              <Palette className="h-3 w-3" />
              Style
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            <StylePanel
              selectedElement={selectedElement}
              onUpdateText={updateTextElement}
              savedStyles={savedStyles}
              onSaveStyle={saveCurrentStyle}
              onApplyStyle={applyStyle}
              onDeleteStyle={deleteStyle}
              onRenameStyle={renameStyle}
            />
          </div>
        </aside>
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          canvasRef={canvasRef}
          canvasState={canvasState}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
};