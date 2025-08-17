import { forwardRef, useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { ImageIcon } from 'lucide-react';
import { TextElement } from '../MemeGenerator';

interface FabricCanvasProps {
  canvasState: {
    backgroundImage: string | null;
    backgroundImageFileName: string | null;
    textElements: TextElement[];
    canvasWidth: number;
    canvasHeight: number;
    zoom: number;
    snapToGrid: boolean;
    gridVisible: boolean;
    gridSize: number;
  };
  onSelectText: (id: string | null) => void;
  onUpdateText: (id: string, updates: Partial<TextElement>) => void;
  onUpdateCanvas: (updates: Partial<FabricCanvasProps['canvasState']>) => void;
}

export const FabricCanvas = forwardRef<HTMLCanvasElement, FabricCanvasProps>(({
  canvasState,
  onSelectText,
  onUpdateText,
  onUpdateCanvas
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [displayScale, setDisplayScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag and drop handlers (moved before return statement)
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
    if (!isDragOver) {
      setIsDragOver(true);
    }
  }, [isDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) {
      console.log('Canvas ref not available');
      return;
    }

    console.log('=== FABRIC CANVAS INITIALIZATION ===');
    console.log('Canvas state on init:', canvasState);
    console.log('Canvas ref:', canvasRef.current);

    // Dynamically import fabric to avoid SSR issues
    const initCanvas = async () => {
      try {
        console.log('Loading Fabric.js...');
        const fabric = await import('fabric');
        console.log('Fabric.js loaded:', fabric);

        const canvas = new fabric.Canvas(canvasRef.current!, {
          width: canvasState.canvasWidth,
          height: canvasState.canvasHeight,
          selection: true,
          preserveObjectStacking: true,
          backgroundColor: '#ffffff',
          enableRetinaScaling: false,
        });

        console.log('Fabric.js canvas created with dimensions:', {
          width: canvasState.canvasWidth,
          height: canvasState.canvasHeight
        });
        fabricCanvasRef.current = canvas;

        // Apply initial responsive sizing to both canvases
        const upperCanvas = canvas.upperCanvasEl;
        const lowerCanvas = canvas.lowerCanvasEl;

        if (upperCanvas && lowerCanvas) {
          const initialDisplayScale = 1; // We'll compute this properly in the effect
          const displayWidth = canvasState.canvasWidth * initialDisplayScale;
          const displayHeight = canvasState.canvasHeight * initialDisplayScale;

          upperCanvas.style.width = `${displayWidth}px`;
          upperCanvas.style.height = `${displayHeight}px`;
          lowerCanvas.style.width = `${displayWidth}px`;
          lowerCanvas.style.height = `${displayHeight}px`;
        }

        // Set up canvas event handlers
        canvas.on('selection:created', (e: any) => {
          console.log('Selection created:', e);
          if (e.selected && e.selected.length > 0) {
            const obj = e.selected[0];
            if (obj.data && obj.data.id) {
              onSelectText(obj.data.id);
            }
          }
        });

        canvas.on('selection:cleared', () => {
          console.log('Selection cleared');
          onSelectText(null);
        });

        canvas.on('object:modified', (e: any) => {
          console.log('Object modified:', e);
          if (e.target && e.target.data && e.target.data.id) {
            const obj = e.target;
            
            // Mark object as being modified to prevent removal during re-render
            obj._isBeingModified = true;
            
            const updates: Partial<TextElement> = {
              x: Math.round(obj.left || 0),
              y: Math.round(obj.top || 0),
            };

            if (obj.scaleX !== undefined && obj.scaleY !== undefined) {
              updates.width = Math.round((obj.width || 0) * obj.scaleX);
              updates.height = Math.round((obj.height || 0) * obj.scaleY);
            }

            if (obj.angle !== undefined) {
              updates.rotation = obj.angle;
            }

            onUpdateText(obj.data.id, updates);
            
            // Clear the modification flag after a short delay
            setTimeout(() => {
              obj._isBeingModified = false;
            }, 100);
          }
        });

        canvas.on('selection:updated', (e: any) => {
          console.log('Selection updated:', e);
          if (e.selected && e.selected.length > 0) {
            const obj = e.selected[0];
            if (obj.data && obj.data.id) {
              onSelectText(obj.data.id);
            }
          }
        });

        canvas.on('object:moving', (e: any) => {
          if (e.target && e.target.data && e.target.data.id) {
            e.target._isBeingModified = true;
            setIsModifying(true);
          }
        });

        canvas.on('object:scaling', (e: any) => {
          if (e.target && e.target.data && e.target.data.id) {
            e.target._isBeingModified = true;
            setIsModifying(true);
          }
        });

        canvas.on('object:rotating', (e: any) => {
          if (e.target && e.target.data && e.target.data.id) {
            e.target._isBeingModified = true;
            setIsModifying(true);
          }
        });

        canvas.on('mouse:up', () => {
          // Clear manipulation flags when mouse is released
          const objects = canvas.getObjects();
          objects.forEach((obj: any) => {
            obj._isBeingDragged = false;
            obj._isBeingScaled = false;
            obj._isBeingRotated = false;
            // Also clear the modification flag after a delay
            setTimeout(() => {
              obj._isBeingModified = false;
            }, 100);
          });
          
          // Clear the global modification state after a delay
          setTimeout(() => {
            setIsModifying(false);
          }, 150);
        });

        canvas.renderAll();

        // Mark as initialized
        setIsInitialized(true);

        setTimeout(() => {
          console.log('Initialization complete - test objects should be visible');
        }, 100);

      } catch (err) {
        console.error('Error initializing Fabric.js canvas:', err);
        setError(`Failed to initialize canvas: ${err}`);
      }
    };

    initCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        console.log('Disposing Fabric.js canvas');
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  // Render function to update canvas content
  const renderCanvas = useCallback(async () => {
    if (!fabricCanvasRef.current || !isInitialized) return;

    try {
      const fabric = await import('fabric');
      const canvas = fabricCanvasRef.current;

      console.log('Rendering canvas with state:', {
        backgroundImage: canvasState.backgroundImage ? 'Present' : 'None',
        textElements: canvasState.textElements.length,
        gridVisible: canvasState.gridVisible,
        gridSize: canvasState.gridSize,
        canvasWidth: canvasState.canvasWidth,
        canvasHeight: canvasState.canvasHeight
      });

      // Get existing objects and categorize them
      const allObjects = canvas.getObjects();
      const gridObjects = allObjects.filter((obj: any) => obj.data && obj.data.isGrid);
      const backgroundObjects = allObjects.filter((obj: any) => obj.data && obj.data.isBackground);
      const textObjects = allObjects.filter((obj: any) => obj.data && obj.data.id);

      // Only remove objects that need to be updated

      // Remove old grid if grid visibility changed
      if (!canvasState.gridVisible && gridObjects.length > 0) {
        gridObjects.forEach((obj: any) => canvas.remove(obj));
      }

      // Remove background if changed
      if (!canvasState.backgroundImage && backgroundObjects.length > 0) {
        backgroundObjects.forEach((obj: any) => canvas.remove(obj));
      }

      // Update text objects - only remove/add if the text elements have actually changed
      const existingTextIds = textObjects.map((obj: any) => obj.data.id);
      const newTextIds = canvasState.textElements.map(el => el.id);

      // Remove text objects that no longer exist (but don't remove objects being modified)
      textObjects.forEach((obj: any) => {
        if (!newTextIds.includes(obj.data.id) && !obj._isBeingModified) {
          canvas.remove(obj);
        }
      });

      // Draw grid if visible
      if (canvasState.gridVisible && gridObjects.length === 0) {
        await drawGrid();
      }

      // Add background image if not present
      if (canvasState.backgroundImage && backgroundObjects.length === 0) {
        await addBackgroundImage();
      }

      // Add/update text elements
      await addTextElements();

      canvas.renderAll();
      console.log('Canvas rendered with', canvasState.textElements.length, 'text elements');

    } catch (err) {
      console.error('Error rendering canvas:', err);
    }
  }, [canvasState.backgroundImage, canvasState.textElements, canvasState.gridVisible, canvasState.gridSize, canvasState.canvasWidth, canvasState.canvasHeight, isInitialized]);

  // Draw grid overlay
  const drawGrid = useCallback(async () => {
    if (!fabricCanvasRef.current) return;

    try {
      const fabric = await import('fabric');
      const canvas = fabricCanvasRef.current;
      const gridSize = canvasState.gridSize;

      // Remove existing grid lines
      const existingGrid = canvas.getObjects().filter((obj: any) => obj.data && obj.data.isGrid);
      existingGrid.forEach((obj: any) => canvas.remove(obj));

      // Create new grid lines
      for (let x = 0; x <= canvasState.canvasWidth; x += gridSize) {
        const line = new fabric.Line([x, 0, x, canvasState.canvasHeight], {
          stroke: '#666666',
          strokeWidth: 1,
          selectable: false,
          evented: false,
          data: { isGrid: true }
        });
        canvas.add(line);
      }

      for (let y = 0; y <= canvasState.canvasHeight; y += gridSize) {
        const line = new fabric.Line([0, y, canvasState.canvasWidth, y], {
          stroke: '#666666',
          strokeWidth: 1,
          selectable: false,
          evented: false,
          data: { isGrid: true }
        });
        canvas.add(line);
      }

      console.log('Grid drawn with size:', gridSize);
    } catch (err) {
      console.error('Error drawing grid:', err);
    }
  }, [canvasState.gridVisible, canvasState.gridSize, canvasState.canvasWidth, canvasState.canvasHeight]);

  // Add background image
  const addBackgroundImage = useCallback(async () => {
    if (!fabricCanvasRef.current || !canvasState.backgroundImage) return;

    try {
      const fabric = await import('fabric');
      const canvas = fabricCanvasRef.current;

      // Remove existing background
      const existingBg = canvas.getObjects().find((obj: any) => obj.data && obj.data.isBackground);
      if (existingBg) {
        canvas.remove(existingBg);
      }

      // Add new background
      fabric.Image.fromURL(canvasState.backgroundImage, { crossOrigin: 'anonymous' }).then((img: any) => {
        img.set({
          left: 0,
          top: 0,
          selectable: false,
          evented: false,
          data: { isBackground: true }
        });

        // Scale image to fit canvas
        const scaleX = canvasState.canvasWidth / img.width;
        const scaleY = canvasState.canvasHeight / img.height;
        const scale = Math.min(scaleX, scaleY);

        img.scale(scale);
        img.set({
          left: (canvasState.canvasWidth - img.width * scale) / 2,
          top: (canvasState.canvasHeight - img.height * scale) / 2
        });

        canvas.add(img);
        canvas.sendToBack(img);
        canvas.renderAll();
        console.log('Background image added and scaled');
      }).catch((err: any) => {
        console.error('Failed to load background image:', err);
      });
    } catch (err) {
      console.error('Error adding background image:', err);
    }
  }, [canvasState.backgroundImage, canvasState.canvasWidth, canvasState.canvasHeight]);

  // Add text elements
  const addTextElements = useCallback(async () => {
    if (!fabricCanvasRef.current) return;

    try {
      const fabric = await import('fabric');
      const canvas = fabricCanvasRef.current;

      // Get existing text objects
      const existingTextObjects = canvas.getObjects().filter((obj: any) =>
        obj.data && obj.data.id && !obj.data.isGrid && !obj.data.isBackground
      );

      // Create a map of existing objects by ID
      const existingMap = new Map();
      existingTextObjects.forEach((obj: any) => {
        existingMap.set(obj.data.id, obj);
      });

      // Process each text element
      canvasState.textElements.forEach(element => {
        const existingObj = existingMap.get(element.id);

        if (existingObj) {
          // Update existing object properties
          existingObj.set({
            text: element.content,
            left: element.x,
            top: element.y,
            fontSize: element.fontSize,
            fontFamily: element.fontFamily,
            fontWeight: element.fontWeight,
            fill: element.color,
            stroke: element.strokeColor,
            strokeWidth: element.strokeWidth,
            textAlign: element.textAlign,
            angle: element.rotation,
            opacity: element.opacity
          });

          // Update shadow
          if (element.shadowBlur > 0 || element.shadowOffsetX !== 0 || element.shadowOffsetY !== 0) {
            existingObj.set({
              shadow: new fabric.Shadow({
                color: element.shadowColor,
                blur: element.shadowBlur,
                offsetX: element.shadowOffsetX,
                offsetY: element.shadowOffsetY
              })
            });
          } else {
            existingObj.set({ shadow: null });
          }

          // Remove from map so we know it's been processed
          existingMap.delete(element.id);
        } else {
          // Create new text object
          const text = new fabric.Text(element.content, {
            left: element.x,
            top: element.y,
            fontSize: element.fontSize,
            fontFamily: element.fontFamily,
            fontWeight: element.fontWeight,
            fill: element.color,
            stroke: element.strokeColor,
            strokeWidth: element.strokeWidth,
            textAlign: element.textAlign,
            angle: element.rotation,
            opacity: element.opacity,
            selectable: true,
            data: { id: element.id }
          });

          // Apply advanced properties
          if (element.shadowBlur > 0 || element.shadowOffsetX !== 0 || element.shadowOffsetY !== 0) {
            text.set({
              shadow: new fabric.Shadow({
                color: element.shadowColor,
                blur: element.shadowBlur,
                offsetX: element.shadowOffsetX,
                offsetY: element.shadowOffsetY
              })
            });
          }

          canvas.add(text);
        }
      });

      // Remove any objects that are no longer in the state
      existingMap.forEach((obj) => {
        canvas.remove(obj);
      });

      console.log('Updated', canvasState.textElements.length, 'text elements');
    } catch (err) {
      console.error('Error adding text elements:', err);
    }
  }, [canvasState.textElements]);

  // Compute display scale for responsive sizing
  const computeDisplayScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const availableWidth = Math.max(wrapper.clientWidth - 32, 0);

    let extraBottomPadding = 0;
    const parentEl = wrapper.parentElement as HTMLElement | null;
    if (parentEl) {
      const pcs = getComputedStyle(parentEl);
      const pb = parseFloat(pcs.paddingBottom || '0');
      if (!Number.isNaN(pb)) extraBottomPadding += pb;
    }
    const cardEl = containerRef.current?.parentElement as HTMLElement | null;
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

  // Re-render canvas when state changes (but not during initial setup or modifications)
  useEffect(() => {
    if (fabricCanvasRef.current && isInitialized && !isModifying) {
      console.log('State changed, re-rendering canvas');
      renderCanvas();
    }
  }, [canvasState.backgroundImage, canvasState.textElements, canvasState.gridVisible, canvasState.gridSize, isInitialized, isModifying]);

  // Update canvas size when dimensions change
  useEffect(() => {
    if (fabricCanvasRef.current) {
      console.log('Updating canvas dimensions:', canvasState.canvasWidth, canvasState.canvasHeight);
      fabricCanvasRef.current.setDimensions({
        width: canvasState.canvasWidth,
        height: canvasState.canvasHeight
      });
      fabricCanvasRef.current.renderAll();
    }
  }, [canvasState.canvasWidth, canvasState.canvasHeight]);

  // Recompute display scale when canvas dimensions change
  useEffect(() => {
    computeDisplayScale();
  }, [canvasState.canvasWidth, canvasState.canvasHeight, computeDisplayScale]);

  // Update zoom
  useEffect(() => {
    if (fabricCanvasRef.current) {
      console.log('Updating zoom:', canvasState.zoom);
      fabricCanvasRef.current.setZoom(canvasState.zoom);
      fabricCanvasRef.current.renderAll();
    }
  }, [canvasState.zoom]);

  // Recompute scale on resize
  useEffect(() => {
    const handleResize = () => {
      if (computeDisplayScale) {
        computeDisplayScale();
      }
    };

    // Initial computation
    handleResize();

    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (wrapperRef.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(handleResize);
      ro.observe(wrapperRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ro) ro.disconnect();
    };
  }, [computeDisplayScale]);

  // Forward the ref
  useEffect(() => {
    if (typeof ref === 'function') {
      ref(canvasRef.current);
    } else if (ref) {
      ref.current = canvasRef.current;
    }
  }, [ref]);

  if (error) {
    return (
      <div className="flex-1 p-4 bg-canvas-bg overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600">
            <h3 className="text-lg font-semibold mb-2">Canvas Error</h3>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <div ref={containerRef} className="max-w-full max-h-full">
              <canvas
                ref={canvasRef}
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
      </div>
    </div>
  );
});