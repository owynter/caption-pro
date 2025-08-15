import { forwardRef, useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { CanvasState, TextElement } from '../MemeGenerator';

interface CanvasAreaProps {
  canvasState: CanvasState;
  onSelectText: (id: string | null) => void;
  onUpdateText: (id: string, updates: Partial<TextElement>) => void;
  onUpdateCanvas: (updates: Partial<CanvasState>) => void;
}

export const CanvasArea = forwardRef<HTMLCanvasElement, CanvasAreaProps>(({
  canvasState,
  onSelectText,
  onUpdateText,
  onUpdateCanvas
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragElement, setDragElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Forward the ref
  useEffect(() => {
    if (typeof ref === 'function') {
      ref(canvasRef.current);
    } else if (ref) {
      ref.current = canvasRef.current;
    }
  }, [ref]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    if (canvasState.backgroundImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawTextElements(ctx);
      };
      img.src = canvasState.backgroundImage;
    } else {
      // Draw background
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawTextElements(ctx);
    }
  }, [canvasState]);

  const drawTextElements = (ctx: CanvasRenderingContext2D) => {
    const sortedElements = [...canvasState.textElements].sort((a, b) => a.zIndex - b.zIndex);

    sortedElements.forEach((element) => {
      if (element.opacity === 0) return;

      ctx.save();

      // Apply global alpha
      ctx.globalAlpha = element.opacity;

      // Apply transformations
      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);

      // Set font and alignment
      ctx.font = `${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
      ctx.textAlign = element.textAlign;
      ctx.textBaseline = 'middle';

      // Calculate text position based on alignment
      let textX = element.x;
      if (element.textAlign === 'center') {
        textX = element.x + element.width / 2;
      } else if (element.textAlign === 'right') {
        textX = element.x + element.width;
      }
      const textY = element.y + element.height / 2;

      // Draw shadow
      if (element.shadowBlur > 0 || element.shadowOffsetX !== 0 || element.shadowOffsetY !== 0) {
        ctx.save();
        ctx.shadowColor = element.shadowColor;
        ctx.shadowBlur = element.shadowBlur;
        ctx.shadowOffsetX = element.shadowOffsetX;
        ctx.shadowOffsetY = element.shadowOffsetY;
        ctx.fillStyle = element.shadowColor;
        ctx.fillText(element.content, textX, textY);
        ctx.restore();
      }

      // Draw stroke
      if (element.strokeWidth > 0) {
        ctx.strokeStyle = element.strokeColor;
        ctx.lineWidth = element.strokeWidth;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(element.content, textX, textY);
      }

      // Draw fill
      ctx.fillStyle = element.color;
      ctx.fillText(element.content, textX, textY);

      // Draw selection outline
      if (element.selected) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(element.x - 5, element.y - 5, element.width + 10, element.height + 10);
        ctx.setLineDash([]);
      }

      ctx.restore();
    });
  };

  const getMousePosition = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const getTextElementAt = (x: number, y: number): TextElement | null => {
    // Check in reverse z-order (top to bottom)
    const sortedElements = [...canvasState.textElements].sort((a, b) => b.zIndex - a.zIndex);
    
    for (const element of sortedElements) {
      if (element.opacity === 0) continue;
      
      if (x >= element.x && x <= element.x + element.width &&
          y >= element.y && y <= element.y + element.height) {
        return element;
      }
    }
    return null;
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePosition(event);
    const element = getTextElementAt(pos.x, pos.y);

    if (element) {
      onSelectText(element.id);
      setIsDragging(true);
      setDragElement(element.id);
      setDragOffset({
        x: pos.x - element.x,
        y: pos.y - element.y
      });
    } else {
      onSelectText(null);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragElement) return;

    const pos = getMousePosition(event);
    const newX = pos.x - dragOffset.x;
    const newY = pos.y - dragOffset.y;

    onUpdateText(dragElement, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragElement(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePosition(event);
    const element = getTextElementAt(pos.x, pos.y);

    if (element) {
      const newContent = prompt('Edit text:', element.content);
      if (newContent !== null) {
        onUpdateText(element.id, { content: newContent });
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvasState.canvasWidth;
      canvas.height = canvasState.canvasHeight;
      drawCanvas();
    }
  }, [canvasState, drawCanvas]);

  const containerStyle = {
    transform: `scale(${canvasState.zoom})`,
    transformOrigin: 'top left'
  };

  return (
    <div className="flex-1 overflow-auto p-4 bg-canvas-bg">
      <div className="flex items-center justify-center min-h-full">
        <Card className="p-4 bg-canvas-border">
          <div ref={containerRef} style={containerStyle}>
            <canvas
              ref={canvasRef}
              width={canvasState.canvasWidth}
              height={canvasState.canvasHeight}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              className="border border-canvas-border cursor-crosshair bg-white"
              style={{ 
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
});