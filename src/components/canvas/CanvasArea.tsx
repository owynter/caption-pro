import { forwardRef, useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { ImageIcon } from 'lucide-react';
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragElement, setDragElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  // Proportional display scale so the canvas never exceeds the visible main area
  const [displayScale, setDisplayScale] = useState(1);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ id: string; startX: number; startY: number; width: number; height: number } | null>(null);

  // Inline editor
  const [editor, setEditor] = useState<{ active: boolean; id: string | null; value: string; left: number; top: number; width: number; height: number }>(
    { active: false, id: null, value: '', left: 0, top: 0, width: 0, height: 0 }
  );
  const editorRef = useRef<HTMLTextAreaElement>(null);
  
  // Cache for background image to prevent flickering
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageLoadedRef = useRef(false);
  
  // Debounce redraw during dragging to prevent excessive updates
  const redrawTimeoutRef = useRef<number | null>(null);

  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      if (redrawTimeoutRef.current) {
        cancelAnimationFrame(redrawTimeoutRef.current);
      }
    };
  }, []);

  // Forward the ref
  useEffect(() => {
    if (typeof ref === 'function') {
      ref(canvasRef.current);
    } else if (ref) {
      ref.current = canvasRef.current;
    }
  }, [ref]);

  // Compute a scale that contains the canvas within the wrapper (like object-fit: contain)
  const computeDisplayScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Measure width from wrapper; height from viewport bottom, minus real bottom paddings
    const rect = wrapper.getBoundingClientRect();

    // Left/right are fine using wrapper width
    const availableWidth = Math.max(wrapper.clientWidth - 32, 0); // minus Card padding (p-4)

    // Calculate extra bottom padding from parent container (p-4) and the Card (p-4)
    let extraBottomPadding = 0;
    const parentEl = wrapper.parentElement as HTMLElement | null; // the p-4 container
    if (parentEl) {
      const pcs = getComputedStyle(parentEl);
      const pb = parseFloat(pcs.paddingBottom || '0');
      if (!Number.isNaN(pb)) extraBottomPadding += pb;
    }
    const cardEl = containerRef.current?.parentElement as HTMLElement | null; // Card element wraps containerRef
    if (cardEl) {
      const ccs = getComputedStyle(cardEl);
      const cpb = parseFloat(ccs.paddingBottom || '0');
      if (!Number.isNaN(cpb)) extraBottomPadding += cpb;
    }

    const availableHeight = Math.max(window.innerHeight - rect.top - extraBottomPadding, 0);

    const { canvasWidth, canvasHeight } = canvasState;
    if (canvasWidth <= 0 || canvasHeight <= 0) {
      setDisplayScale(1);
      return;
    }

    const scaleX = availableWidth / canvasWidth;
    const scaleY = availableHeight / canvasHeight;
    const next = Math.min(scaleX, scaleY, 1);
    if (!Number.isFinite(next) || next <= 0) return;
    setDisplayScale(next);
  }, [canvasState.canvasWidth, canvasState.canvasHeight]);

  // Recompute when canvas size or wrapper size changes
  useEffect(() => {
    computeDisplayScale();
    const onResize = () => computeDisplayScale();
    window.addEventListener('resize', onResize);
    let ro: ResizeObserver | null = null;
    if (wrapperRef.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => computeDisplayScale());
      ro.observe(wrapperRef.current);
    }
    return () => {
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
    };
  }, [computeDisplayScale]);

  const computeLineWidth = (ctx: CanvasRenderingContext2D, text: string, letterSpacing: number) => {
    if (!text) return 0;
    const chars = [...text];
    let width = 0;
    for (let i = 0; i < chars.length; i++) {
      width += ctx.measureText(chars[i]).width;
      if (i < chars.length - 1) width += letterSpacing || 0;
    }
    return width;
  };

  const wrapTextToWidth = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, letterSpacing: number) => {
    const paragraphs = text.split('\n');
    const lines: string[] = [];
    for (const para of paragraphs) {
      const words = para.split(' ');
      let current = '';
      for (let i = 0; i < words.length; i++) {
        const attempt = current ? current + ' ' + words[i] : words[i];
        const attemptWidth = computeLineWidth(ctx, attempt, letterSpacing);
        if (attemptWidth <= maxWidth || current.length === 0) {
          current = attempt;
        } else {
          lines.push(current);
          current = words[i];
        }
      }
      lines.push(current);
    }
    return lines;
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background first
    if (backgroundImageRef.current && backgroundImageLoadedRef.current) {
      ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
    } else if (canvasState.backgroundImage) {
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw grid on top of background but behind text
    if (canvasState.gridVisible) {
      drawGrid(ctx);
    }

    drawTextElements(ctx);
  }, [
    canvasState.gridVisible,
    canvasState.textElements,
    canvasState.backgroundImage,
    canvasState.canvasWidth,
    canvasState.canvasHeight
  ]);

  // Load and cache background image when it changes
  useEffect(() => {
    if (canvasState.backgroundImage && canvasState.backgroundImage !== backgroundImageRef.current?.src) {
      const img = new Image();
      img.onload = () => {
        backgroundImageRef.current = img;
        backgroundImageLoadedRef.current = true;
        drawCanvas();
      };
      img.src = canvasState.backgroundImage;
    } else if (!canvasState.backgroundImage) {
      backgroundImageRef.current = null;
      backgroundImageLoadedRef.current = false;
    }
  }, [canvasState.backgroundImage, drawCanvas]);

  // Prevent default drag behavior globally for the canvas area
  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      // Always prevent default for dragover and drop events
      e.preventDefault();
      e.stopPropagation();
    };

    // Use capture phase to ensure we intercept before other handlers
    document.addEventListener('dragover', preventDefault, true);
    document.addEventListener('drop', preventDefault, true);

    return () => {
      document.removeEventListener('dragover', preventDefault, true);
      document.removeEventListener('drop', preventDefault, true);
    };
  }, []);

  // Redraw canvas when grid visibility changes
  useEffect(() => {
    drawCanvas();
  }, [canvasState.gridVisible, drawCanvas]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = canvasState.gridSize;
    
    ctx.save();
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.setLineDash([]); // Solid lines
    ctx.globalAlpha = 0.8;
    
    for (let x = 0; x <= canvasState.canvasWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasState.canvasHeight);
      ctx.stroke();
    }
    
    for (let y = 0; y <= canvasState.canvasHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasState.canvasWidth, y);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  const drawTextElements = (ctx: CanvasRenderingContext2D) => {
    // Draw lower zIndex first, higher on top
    const sortedElements = [...canvasState.textElements].sort((a, b) => a.zIndex - b.zIndex);

    sortedElements.forEach((element) => {
      if (element.opacity === 0) return;

      ctx.save();

      ctx.globalAlpha = element.opacity;

      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.rotate((element.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);

      if (element.skewX || element.skewY) {
        const skewXRad = (element.skewX || 0) * Math.PI / 180;
        const skewYRad = (element.skewY || 0) * Math.PI / 180;
        ctx.transform(1, Math.tan(skewYRad), Math.tan(skewXRad), 1, 0, 0);
      }

      ctx.font = `${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
      ctx.textAlign = element.textAlign;
      ctx.textBaseline = 'middle';
      
      let textX = element.x;
      if (element.textAlign === 'center') {
        textX = element.x + element.width / 2;
      } else if (element.textAlign === 'right') {
        textX = element.x + element.width;
      }
      const textY = element.y + element.height / 2;

      // Wrap lines to element.width
      const letterSpacing = element.letterSpacing || 0;
      const lines = wrapTextToWidth(ctx, element.content, element.width, letterSpacing);
      const lineHeight = (element.lineHeight || 1.2) * element.fontSize;
      
      const renderTextLine = (line: string, x: number, y: number, renderFn: (text: string, x: number, y: number) => void) => {
        if (letterSpacing !== 0) {
          let currentX = x;
          const totalWidth = computeLineWidth(ctx, line, letterSpacing);
          if (element.textAlign === 'center') currentX = x - totalWidth / 2;
          if (element.textAlign === 'right') currentX = x - totalWidth;
          for (const char of line) {
            renderFn(char, currentX, y);
            currentX += ctx.measureText(char).width + letterSpacing;
          }
        } else {
          renderFn(line, x, y);
        }
      };
      
      lines.forEach((line, index) => {
        const lineY = textY + (index - (lines.length - 1) / 2) * lineHeight;
        
        // Render shadow first (behind everything)
        if (element.shadowBlur > 0 || element.shadowOffsetX !== 0 || element.shadowOffsetY !== 0 || element.shadowSize > 0) {
          ctx.save();
          ctx.shadowColor = element.shadowColor;
          ctx.shadowBlur = element.shadowBlur;
          ctx.shadowOffsetX = element.shadowOffsetX;
          ctx.shadowOffsetY = element.shadowOffsetY;
          
          // Apply shadow size scaling
          if (element.shadowSize !== 1) {
            ctx.scale(element.shadowSize, element.shadowSize);
            const scaledX = textX / element.shadowSize;
            const scaledY = lineY / element.shadowSize;
            
            // Draw shadow with stroke if stroke exists
            if (element.strokeWidth > 0) {
              ctx.strokeStyle = element.shadowColor;
              ctx.lineWidth = element.strokeWidth / element.shadowSize;
              ctx.lineJoin = 'round';
              ctx.miterLimit = 2;
              renderTextLine(line, scaledX, scaledY, (text, x, y) => ctx.strokeText(text, x, y));
            }
            
            // Draw shadow fill
            ctx.fillStyle = element.shadowColor;
            renderTextLine(line, scaledX, scaledY, (text, x, y) => ctx.fillText(text, x, y));
          } else {
            // Draw shadow with stroke if stroke exists
            if (element.strokeWidth > 0) {
              ctx.strokeStyle = element.shadowColor;
              ctx.lineWidth = element.strokeWidth;
              ctx.lineJoin = 'round';
              ctx.miterLimit = 2;
              renderTextLine(line, textX, lineY, (text, x, y) => ctx.strokeText(text, x, y));
            }
            
            // Draw shadow fill
            ctx.fillStyle = element.shadowColor;
            renderTextLine(line, textX, lineY, (text, x, y) => ctx.fillText(text, x, y));
          }
          ctx.restore();
        }
        
        // Render main text stroke
        if (element.strokeWidth > 0) {
          ctx.strokeStyle = element.strokeColor;
          ctx.lineWidth = element.strokeWidth;
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          renderTextLine(line, textX, lineY, (text, x, y) => ctx.strokeText(text, x, y));
        }
        
        // Render main text fill
        ctx.fillStyle = element.color;
        renderTextLine(line, textX, lineY, (text, x, y) => ctx.fillText(text, x, y));
      });

      if (element.selected) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        // Draw selection tightly around the element bounds (no extra padding)
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        ctx.setLineDash([]);
        // Draw bottom-right resize handle
        const handleSize = 8;
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(element.x + element.width - handleSize, element.y + element.height - handleSize, handleSize, handleSize);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(element.x + element.width - handleSize, element.y + element.height - handleSize, handleSize, handleSize);
      }

      ctx.restore();
    });
  };

  const getMousePosition = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    // Map from displayed to logical coordinates using actual displayed size
    const scaleX = canvasState.canvasWidth / rect.width;
    const scaleY = canvasState.canvasHeight / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const getTextElementAt = (x: number, y: number): TextElement | null => {
    const sortedElements = [...canvasState.textElements].sort((a, b) => b.zIndex - a.zIndex);
    for (const element of sortedElements) {
      if (element.opacity === 0) continue;
      if (x >= element.x && x <= element.x + element.width && y >= element.y && y <= element.y + element.height) {
        return element;
      }
    }
    return null;
  };

  const isInResizeHandle = (element: TextElement, x: number, y: number) => {
    const handleSize = 8;
    return (
      x >= element.x + element.width - handleSize &&
      x <= element.x + element.width &&
      y >= element.y + element.height - handleSize &&
      y <= element.y + element.height
    );
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePosition(event);
    const element = getTextElementAt(pos.x, pos.y);

    if (element) {
      onSelectText(element.id);
      // Check resize handle first
      if (isInResizeHandle(element, pos.x, pos.y)) {
        setIsResizing(true);
        resizeStartRef.current = { id: element.id, startX: pos.x, startY: pos.y, width: element.width, height: element.height };
        return;
      }

      setIsDragging(true);
      setDragElement(element.id);
      setDragOffset({ x: pos.x - element.x, y: pos.y - element.y });
    } else {
      onSelectText(null);
    }
  };

  const snapToGrid = (x: number, y: number) => {
    if (!canvasState.snapToGrid) return { x, y };
    const gridSize = canvasState.gridSize;
    return { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePosition(event);

    if (isResizing && resizeStartRef.current) {
      const { id, startX, startY, width, height } = resizeStartRef.current;
      let newWidth = Math.max(50, width + (pos.x - startX));
      let newHeight = Math.max(24, height + (pos.y - startY));
      
      // Apply snap to grid for resizing if enabled
      if (canvasState.snapToGrid && !event.shiftKey) {
        newWidth = Math.round(newWidth / canvasState.gridSize) * canvasState.gridSize;
        newHeight = Math.round(newHeight / canvasState.gridSize) * canvasState.gridSize;
        // Ensure minimum sizes are maintained
        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(24, newHeight);
      }
      
      onUpdateText(id, { width: newWidth, height: newHeight });
      
      // Immediate redraw for smooth resizing
      requestAnimationFrame(() => {
        if (backgroundImageLoadedRef.current) {
          drawCanvas();
        }
      });
      return;
    }

    if (!isDragging || !dragElement) return;

    let newX = pos.x - dragOffset.x;
    let newY = pos.y - dragOffset.y;

    // Only snap to grid if snap is enabled and we're not holding Shift (for fine positioning)
    if (canvasState.snapToGrid && !event.shiftKey) {
      const snapped = snapToGrid(newX, newY);
      newX = snapped.x;
      newY = snapped.y;
    }

    onUpdateText(dragElement, { x: newX, y: newY });

    // Use requestAnimationFrame for smooth 60fps updates
    if (redrawTimeoutRef.current) {
      cancelAnimationFrame(redrawTimeoutRef.current);
    }
    redrawTimeoutRef.current = requestAnimationFrame(() => {
      if (backgroundImageLoadedRef.current) {
        drawCanvas();
      }
    });
  };

  const handleMouseUp = () => {
    if (isResizing) {
      setIsResizing(false);
      resizeStartRef.current = null;
    }
    setIsDragging(false);
    setDragElement(null);
    setDragOffset({ x: 0, y: 0 });

    if (redrawTimeoutRef.current) {
      cancelAnimationFrame(redrawTimeoutRef.current);
      redrawTimeoutRef.current = null;
    }

    if (backgroundImageLoadedRef.current) {
      drawCanvas();
    }
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePosition(event);
    const element = getTextElementAt(pos.x, pos.y);

    if (!element || !wrapperRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / canvasState.canvasWidth;
    const scaleY = canvasRect.height / canvasState.canvasHeight;
    
    const left = canvasRect.left + element.x * scaleX;
    const top = canvasRect.top + element.y * scaleY;
    const width = element.width * scaleX;
    const height = element.height * scaleY;

    setEditor({ active: true, id: element.id, value: element.content, left, top, width, height });
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvasState.canvasWidth;
      canvas.height = canvasState.canvasHeight;
      drawCanvas();
    }
  }, [canvasState.canvasWidth, canvasState.canvasHeight, drawCanvas]);

  // Handle drag and drop for images
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    // Keep overlay visible while dragging over
    if (!isDragOver) {
      setIsDragOver(true);
    }
  }, [isDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide overlay if we're leaving the entire drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(false);
    
    console.log('Drop event triggered', e.dataTransfer.types);
    
    // Handle files first
    const files = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', files);
    
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      console.log('Processing image file:', imageFile.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const img = new window.Image();
        img.onload = () => {
          console.log('Image loaded, dimensions:', img.width, 'x', img.height);
          onUpdateCanvas({
            backgroundImage: result,
            backgroundImageFileName: imageFile.name,
            canvasWidth: img.width,
            canvasHeight: img.height
          });
        };
        img.onerror = (err) => {
          console.error('Failed to load image:', err);
        };
        img.src = result;
      };
      reader.onerror = (err) => {
        console.error('Failed to read file:', err);
      };
      reader.readAsDataURL(imageFile);
      return;
    }
    
    // Handle image URLs (when dragging from another tab/window)
    const imageUrl = e.dataTransfer.getData('text/html');
    if (imageUrl) {
      console.log('Processing HTML image:', imageUrl);
      const imgMatch = imageUrl.match(/<img[^>]+src="([^"]+)"/);
      if (imgMatch) {
        const imgUrl = imgMatch[1];
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          console.log('URL image loaded, dimensions:', img.width, 'x', img.height);
          onUpdateCanvas({
            backgroundImage: imgUrl,
            backgroundImageFileName: 'dropped-image',
            canvasWidth: img.width,
            canvasHeight: img.height
          });
        };
        img.onerror = (err) => {
          console.error('Failed to load dropped image URL:', err);
        };
        img.src = imgUrl;
        return;
      }
    }
    
    // Handle plain text URLs
    const textUrl = e.dataTransfer.getData('text/plain');
    if (textUrl && (textUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || textUrl.startsWith('data:image/'))) {
      console.log('Processing text URL:', textUrl);
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('Text URL image loaded, dimensions:', img.width, 'x', img.height);
        onUpdateCanvas({
          backgroundImage: textUrl,
          backgroundImageFileName: 'dropped-image',
          canvasWidth: img.width,
          canvasHeight: img.height
        });
      };
      img.onerror = (err) => {
        console.error('Failed to load text URL image:', err);
      };
      img.src = textUrl;
    }
    
    console.log('No valid image found in drop data');
  }, [onUpdateCanvas]);

  const containerStyle = {} as const;

  return (
    <div className="flex-1 p-4 bg-canvas-bg overflow-hidden">
      <div 
        ref={wrapperRef} 
        className="relative flex items-center justify-center w-full h-full max-w-full max-h-full"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="relative max-w-full max-h-full">
          <Card className="p-4 bg-canvas-border max-w-full max-h-full">
            <div ref={containerRef} style={containerStyle} className="max-w-full max-h-full">
              <canvas
                ref={canvasRef}
                width={canvasState.canvasWidth}
                height={canvasState.canvasHeight}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                className="border border-canvas-border bg-white block"
                style={{
                  width: `${canvasState.canvasWidth * displayScale}px`,
                  height: `${canvasState.canvasHeight * displayScale}px`
                }}
              />
            </div>
          </Card>
        </div>
        {/* Drop Zone Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-primary/20 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-10">
            <div className="text-center text-primary font-medium">
              <ImageIcon className="h-12 w-12 mx-auto mb-2" />
              <p>Drop image here to set as background</p>
            </div>
          </div>
        )}
        
        {editor.active && (
          <textarea
            ref={editorRef}
            value={editor.value}
            onChange={(e) => setEditor((prev) => ({ ...prev, value: e.target.value }))}
            onBlur={() => {
              if (editor.id) onUpdateText(editor.id, { content: editor.value });
              setEditor({ active: false, id: null, value: '', left: 0, top: 0, width: 0, height: 0 });
              drawCanvas();
            }}
            style={{
              position: 'absolute',
              left: `${editor.left}px`,
              top: `${editor.top}px`,
              width: `${editor.width}px`,
              height: `${editor.height}px`,
              padding: '4px 6px',
              fontFamily: 'inherit',
              fontSize: '14px',
              lineHeight: '1.2',
              color: '#111',
              outline: '2px solid rgba(139,92,246,0.7)',
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '6px',
              zIndex: 20,
              resize: 'both',
              overflow: 'auto'
            }}
          />
        )}
      </div>
    </div>
  );
});