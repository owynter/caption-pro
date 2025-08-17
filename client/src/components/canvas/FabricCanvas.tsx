import { forwardRef, useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { ImageIcon } from 'lucide-react';

interface TextElement {
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        
        const canvas = new fabric.Canvas(canvasRef.current, {
          width: 800,
          height: 600,
          selection: false,
          preserveObjectStacking: true,
          backgroundColor: '#f0f0f0', // Light gray background to make it visible
        });

        console.log('Fabric.js canvas created with dimensions:', {
          width: Math.max(canvasState.canvasWidth, 800),
          height: Math.max(canvasState.canvasHeight, 600)
        });
        fabricCanvasRef.current = canvas;

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
          }
        });

        // Initial render with test objects
        console.log('Adding test objects to verify Fabric.js is working...');
        
        // Add a simple test rectangle to verify canvas is working
        const testRect = new fabric.Rect({
          left: 50,
          top: 50,
          width: 100,
          height: 100,
          fill: 'red',
          stroke: 'blue',
          strokeWidth: 3,
          selectable: false,
          data: { isTest: true }
        });
        
        // Add a test text object as well
        const testText = new fabric.Text('TEST CANVAS', {
          left: 200,
          top: 100,
          fontSize: 24,
          fill: 'green',
          fontWeight: 'bold',
          selectable: false,
          data: { isTest: true }
        });
        
        console.log('About to add test objects to canvas');
        canvas.add(testRect);
        console.log('Test rectangle added, canvas objects count:', canvas.getObjects().length);
        canvas.add(testText);
        console.log('Test text added, canvas objects count:', canvas.getObjects().length);
        
        console.log('Canvas objects:', canvas.getObjects());
        console.log('Canvas dimensions:', { width: canvas.width, height: canvas.height });
        
        canvas.renderAll();
        console.log('Canvas renderAll() called - test objects should now be visible');
        
        // Mark as initialized so renderCanvas doesn't clear test objects immediately
        setIsInitialized(true);
        
        // Add a small delay to ensure test objects are fully rendered before any other operations
        setTimeout(() => {
          console.log('Initialization complete - test objects should be visible');
        }, 100);
        
        // IMPORTANT: Don't mix HTML5 Canvas API with Fabric.js!
        // Fabric.js completely takes over the canvas element.
        // Using getContext('2d') would conflict with Fabric.js rendering.
        // The canvas element is managed entirely by Fabric.js now.

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
      
      // Preserve test objects during development
      const allObjects = canvas.getObjects();
      const testObjects = allObjects.filter((obj: any) => 
        obj.data && obj.data.isTest === true
      );
      
      console.log('Preserving test objects:', testObjects.length);
      
      // Clear existing objects
      canvas.clear();
      
      // Re-add test objects immediately
      testObjects.forEach((obj: any) => {
        console.log('Re-adding test object:', obj.type, obj.data);
        canvas.add(obj);
      });
      
      // Draw grid if visible
      if (canvasState.gridVisible) {
        drawGrid();
      }
      
      // Add background image
      if (canvasState.backgroundImage) {
        await addBackgroundImage();
      }
      
      // Add text elements
      addTextElements();
      
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
      fabric.Image.fromURL(canvasState.backgroundImage, (img: any) => {
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
      
      // Remove existing text objects (except grid and background)
      const existingText = canvas.getObjects().filter((obj: any) => 
        obj.data && !obj.data.isGrid && !obj.data.isBackground
      );
      existingText.forEach((obj: any) => canvas.remove(obj));
      
      // Add new text elements
      canvasState.textElements.forEach(element => {
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
      });
      
      console.log('Added', canvasState.textElements.length, 'text elements');
    } catch (err) {
      console.error('Error adding text elements:', err);
    }
  }, [canvasState.textElements]);

  // Re-render canvas when state changes (but not during initial setup)
  useEffect(() => {
    if (fabricCanvasRef.current && isInitialized) {
      // Only render if we have actual content to show
      if (canvasState.backgroundImage || canvasState.textElements.length > 0 || canvasState.gridVisible) {
        console.log('State changed, re-rendering canvas');
        renderCanvas();
      }
    }
  }, [renderCanvas, isInitialized, canvasState.backgroundImage, canvasState.textElements.length, canvasState.gridVisible]);

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

  // Update zoom
  useEffect(() => {
    if (fabricCanvasRef.current) {
      console.log('Updating zoom:', canvasState.zoom);
      fabricCanvasRef.current.setZoom(canvasState.zoom);
      fabricCanvasRef.current.renderAll();
    }
  }, [canvasState.zoom]);

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

  // Recompute scale on resize
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
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="relative max-w-full max-h-full">
          <Card className="p-4 bg-blue-100 border-2 border-blue-500 max-w-full max-h-full">
            <div ref={containerRef} className="max-w-full max-h-full">
              <canvas
                ref={canvasRef}
                className="border-2 border-red-500 bg-yellow-200 block"
                width="800"
                height="600"
                style={{
                  width: '800px',
                  height: '600px'
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

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const img = new window.Image();
        img.onload = () => {
          onUpdateCanvas({
            backgroundImage: result,
            backgroundImageFileName: imageFile.name,
            canvasWidth: img.width,
            canvasHeight: img.height
          });
        };
        img.src = result;
      };
      reader.readAsDataURL(imageFile);
    }
  }
});