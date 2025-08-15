import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ImagePanel } from './panels/ImagePanel';
import { TextPanel } from './panels/TextPanel';
import { StylePanel } from './panels/StylePanel';
import { LayersPanel } from './panels/LayersPanel';
import { CanvasArea } from './canvas/CanvasArea';
import { Toolbar } from './toolbar/Toolbar';
import { ExportDialog } from './dialogs/ExportDialog';
import { 
  Image, 
  Type, 
  Palette, 
  Layers, 
  Download,
  Undo,
  Redo,
  Copy,
  Trash2
} from 'lucide-react';

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
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export interface CanvasState {
  backgroundImage: string | null;
  textElements: TextElement[];
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
}

export const MemeGenerator = () => {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    backgroundImage: null,
    textElements: [],
    canvasWidth: 800,
    canvasHeight: 600,
    zoom: 1
  });

  const [selectedPanel, setSelectedPanel] = useState<string>('image');
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [history, setHistory] = useState<CanvasState[]>([canvasState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const saveToHistory = useCallback((newState: CanvasState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const updateCanvasState = useCallback((updates: Partial<CanvasState>) => {
    setCanvasState(prev => {
      const newState = { ...prev, ...updates };
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
    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      content: 'Edit this text',
      x: canvasState.canvasWidth / 2 - 100,
      y: canvasState.canvasHeight / 2 - 25,
      width: 200,
      height: 50,
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 2,
      textAlign: 'center',
      rotation: 0,
      opacity: 1,
      zIndex: canvasState.textElements.length + 1,
      selected: false,
      shadowColor: '#000000',
      shadowBlur: 4,
      shadowOffsetX: 2,
      shadowOffsetY: 2
    };

    updateCanvasState({
      textElements: [...canvasState.textElements, newElement]
    });
    setSelectedTextId(newElement.id);
    setSelectedPanel('text');
  }, [canvasState, updateCanvasState]);

  const selectTextElement = useCallback((id: string | null) => {
    setSelectedTextId(id);
    updateCanvasState({
      textElements: canvasState.textElements.map(el => ({
        ...el,
        selected: el.id === id
      }))
    });
  }, [canvasState.textElements, updateCanvasState]);

  const updateTextElement = useCallback((id: string, updates: Partial<TextElement>) => {
    updateCanvasState({
      textElements: canvasState.textElements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      )
    });
  }, [canvasState.textElements, updateCanvasState]);

  const deleteSelectedText = useCallback(() => {
    if (selectedTextId) {
      updateCanvasState({
        textElements: canvasState.textElements.filter(el => el.id !== selectedTextId)
      });
      setSelectedTextId(null);
    }
  }, [selectedTextId, canvasState.textElements, updateCanvasState]);

  const duplicateSelectedText = useCallback(() => {
    if (selectedTextId) {
      const element = canvasState.textElements.find(el => el.id === selectedTextId);
      if (element) {
        const newElement = {
          ...element,
          id: `text-${Date.now()}`,
          x: element.x + 20,
          y: element.y + 20,
          zIndex: Math.max(...canvasState.textElements.map(el => el.zIndex)) + 1
        };
        updateCanvasState({
          textElements: [...canvasState.textElements, newElement]
        });
        setSelectedTextId(newElement.id);
      }
    }
  }, [selectedTextId, canvasState.textElements, updateCanvasState]);

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

  const panels = [
    { id: 'image', icon: Image, label: 'Image' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'style', icon: Palette, label: 'Style' },
    { id: 'layers', icon: Layers, label: 'Layers' }
  ];

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
            <Button
              variant="ghost"
              size="sm"
              onClick={duplicateSelectedText}
              disabled={!selectedTextId}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteSelectedText}
              disabled={!selectedTextId}
            >
              <Trash2 className="h-4 w-4" />
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

      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <aside className="w-80 bg-panel-bg border-r border-border flex flex-col">
          {/* Panel Selector */}
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-4 gap-1 bg-secondary rounded-lg p-1">
              {panels.map(({ id, icon: Icon, label }) => (
                <Button
                  key={id}
                  variant={selectedPanel === id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedPanel(id)}
                  className="flex flex-col gap-1 h-auto py-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto">
            {selectedPanel === 'image' && (
              <ImagePanel
                canvasState={canvasState}
                updateCanvasState={updateCanvasState}
              />
            )}
            {selectedPanel === 'text' && (
              <TextPanel
                selectedElement={selectedElement}
                onAddText={addTextElement}
                onUpdateText={updateTextElement}
              />
            )}
            {selectedPanel === 'style' && (
              <StylePanel
                selectedElement={selectedElement}
                onUpdateText={updateTextElement}
              />
            )}
            {selectedPanel === 'layers' && (
              <LayersPanel
                textElements={canvasState.textElements}
                selectedTextId={selectedTextId}
                onSelectText={selectTextElement}
                onUpdateText={updateTextElement}
                onDeleteText={deleteSelectedText}
              />
            )}
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 bg-canvas-bg">
          <CanvasArea
            ref={canvasRef}
            canvasState={canvasState}
            onSelectText={selectTextElement}
            onUpdateText={updateTextElement}
            onUpdateCanvas={updateCanvasState}
          />
        </main>
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