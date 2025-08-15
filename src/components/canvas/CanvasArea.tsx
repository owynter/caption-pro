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

    // Draw grid if enabled
    if (canvasState.snapToGrid) {
      drawGrid(ctx);
    }

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

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = canvasState.gridSize;
    
    ctx.save();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // Draw vertical lines
    for (let x = 0; x <= canvasState.canvasWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasState.canvasHeight);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= canvasState.canvasHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasState.canvasWidth, y);
      ctx.stroke();
    }
    
    ctx.restore();
  };

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

      // Apply skew transformations
      if (element.skewX || element.skewY) {
        const skewXRad = (element.skewX || 0) * Math.PI / 180;
        const skewYRad = (element.skewY || 0) * Math.PI / 180;
        ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0);
      }

      // Set font and alignment with letter spacing
      ctx.font = `${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
      ctx.textAlign = element.textAlign;
      ctx.textBaseline = 'middle';
      
      // Handle letter spacing
      if (element.letterSpacing && element.letterSpacing !== 0) {
        ctx.letterSpacing = `${element.letterSpacing}px`;
      }

      // Calculate text position based on alignment
      let textX = element.x;
      if (element.textAlign === 'center') {
        textX = element.x + element.width / 2;
      } else if (element.textAlign === 'right') {
        textX = element.x + element.width;
      }
      const textY = element.y + element.height / 2;

      // Handle multi-line text with line height
      const lines = element.content.split('\n');
      const lineHeight = (element.lineHeight || 1.2) * element.fontSize;
      
      // Function to render text with letter spacing
      const renderTextLine = (line: string, x: number, y: number, renderFn: (text: string, x: number, y: number) => void) => {
        if (element.letterSpacing && element.letterSpacing !== 0) {
          // Manual character spacing
          let currentX = x;
          if (element.textAlign === 'center') {
            const totalWidth = [...line].reduce((width, char) => {
              return width + ctx.measureText(char).width + (element.letterSpacing || 0);
            }, 0) - (element.letterSpacing || 0);
            currentX = x - totalWidth / 2;
          } else if (element.textAlign === 'right') {
            const totalWidth = [...line].reduce((width, char) => {
              return width + ctx.measureText(char).width + (element.letterSpacing || 0);
            }, 0) - (element.letterSpacing || 0);
            currentX = x - totalWidth;
          }
          
          for (const char of line) {
            renderFn(char, currentX, y);
            currentX += ctx.measureText(char).width + (element.letterSpacing || 0);
          }
        } else {
          renderFn(line, x, y);
        }
      };
      
      lines.forEach((line, index) => {
        const lineY = textY + (index - (lines.length - 1) / 2) * lineHeight;
        
        // Draw shadow for each line
        if (element.shadowBlur > 0 || element.shadowOffsetX !== 0 || element.shadowOffsetY !== 0) {
          ctx.save();
          ctx.shadowColor = element.shadowColor;
          ctx.shadowBlur = element.shadowBlur;
          ctx.shadowOffsetX = element.shadowOffsetX;
          ctx.shadowOffsetY = element.shadowOffsetY;
          ctx.fillStyle = element.shadowColor;
          renderTextLine(line, textX, lineY, (text, x, y) => ctx.fillText(text, x, y));
          ctx.restore();
        }

        // Draw stroke for each line
        if (element.strokeWidth > 0) {
          ctx.strokeStyle = element.strokeColor;
          ctx.lineWidth = element.strokeWidth;
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          renderTextLine(line, textX, lineY, (text, x, y) => ctx.strokeText(text, x, y));
        }

        // Draw fill for each line
        ctx.fillStyle = element.color;
        renderTextLine(line, textX, lineY, (text, x, y) => ctx.fillText(text, x, y));
      });

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

  const snapToGrid = (x: number, y: number) => {
    if (!canvasState.snapToGrid) return { x, y };
    
    const gridSize = canvasState.gridSize;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragElement) return;

    const pos = getMousePosition(event);
    let newX = pos.x - dragOffset.x;
    let newY = pos.y - dragOffset.y;

    // Apply snap to grid
    const snapped = snapToGrid(newX, newY);
    newX = snapped.x;
    newY = snapped.y;

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