import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Undo, 
  Redo, 
  Copy, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Grid3X3,
  Download
} from 'lucide-react';

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onToggleGrid: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  zoom: number;
  showGrid: boolean;
}

export const Toolbar = ({
  onUndo,
  onRedo,
  onDuplicate,
  onDelete,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onToggleGrid,
  onExport,
  canUndo,
  canRedo,
  hasSelection,
  zoom,
  showGrid
}: ToolbarProps) => {
  return (
    <div className="bg-toolbar-bg border-b border-border px-4 py-2">
      <div className="flex items-center gap-2">
        {/* History */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Selection Tools */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDuplicate}
          disabled={!hasSelection}
          title="Duplicate (Ctrl+D)"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={!hasSelection}
          title="Delete (Del)"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Zoom Controls */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[4rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitToScreen}
          title="Fit to Screen"
        >
          Fit
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* View Tools */}
        <Button
          variant={showGrid ? "default" : "ghost"}
          size="sm"
          onClick={onToggleGrid}
          title="Toggle Grid"
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        {/* Export */}
        <Button
          onClick={onExport}
          className="bg-gradient-to-r from-primary to-accent"
          title="Export (Ctrl+E)"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </div>
  );
};