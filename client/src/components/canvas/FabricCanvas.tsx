import { forwardRef, useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { ImageIcon } from 'lucide-react';
import { TextElement, getFontSizeInPixels, getProportionalStrokeWidth } from '../MemeGenerator';

// Declare fabric global since it's loaded dynamically
declare const fabric: any;

// Helper function to convert hex color and alpha to rgba string
function getRgbaColor(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.substring(1);
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color; // Return as-is if already in rgba format
}

// Helper function to create gradient fill
function getGradientFill(element: TextElement): any {
  if (!element.fillType || element.fillType === 'solid') {
    return getRgbaColor(element.color, element.colorAlpha || 1);
  }

  const startColor = getRgbaColor(element.gradientStartColor || '#ffffff', element.gradientStartColorAlpha || 1);
  const endColor = getRgbaColor(element.gradientEndColor || '#000000', element.gradientEndColorAlpha || 1);

  if (element.gradientType === 'radial') {
    // Create radial gradient
    const centerX = (element.gradientX1 || 50) / 100;
    const centerY = (element.gradientY1 || 50) / 100;
    const radius = Math.max(element.width, element.height) / 2;

    return new fabric.Gradient({
      type: 'radial',
      coords: {
        x1: centerX,
        y1: centerY,
        x2: centerX,
        y2: centerY,
        r1: 0,
        r2: radius
      },
      colorStops: [
        { offset: 0, color: startColor },
        { offset: 1, color: endColor }
      ]
    });
  } else {
    // Create linear gradient
    const angle = (element.gradientAngle || 0) * Math.PI / 180;
    const x1 = 0.5 - Math.cos(angle) * 0.5;
    const y1 = 0.5 - Math.sin(angle) * 0.5;
    const x2 = 0.5 + Math.cos(angle) * 0.5;
    const y2 = 0.5 + Math.sin(angle) * 0.5;

    return new fabric.Gradient({
      type: 'linear',
      coords: {
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2
      },
      colorStops: [
        { offset: 0, color: startColor },
        { offset: 1, color: endColor }
      ]
    });
  }
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

        // Set HTML canvas attributes to match Fabric.js dimensions
        if (canvasRef.current) {
          canvasRef.current.width = canvasState.canvasWidth;
          canvasRef.current.height = canvasState.canvasHeight;
        }

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
        
        // Important: Tell Fabric.js to recalculate coordinates when CSS scaling is applied
        canvas.calcOffset();

        // Set up canvas event handlers
        canvas.on('selection:created', (e: any) => {
          console.log('Selection created:', e);
          if (e.selected && e.selected.length > 0) {
            const obj = e.selected[0];
            console.log('Selected object:', {
              type: obj.type,
              data: obj.data,
              selectable: obj.selectable,
              evented: obj.evented,
              left: obj.left,
              top: obj.top
            });
            if (obj.data && obj.data.id) {
              onSelectText(obj.data.id);
            }
          }
        });

        canvas.on('selection:cleared', () => {
          console.log('Selection cleared');
          onSelectText(null);
        });

        canvas.on('mouse:down', (e: any) => {
          console.log('Mouse down:', {
            target: e.target ? {
              type: e.target.type,
              data: e.target.data,
              selectable: e.target.selectable,
              evented: e.target.evented
            } : 'no target',
            pointer: e.pointer
          });
        });

        canvas.on('mouse:up', (e: any) => {
          console.log('Mouse up:', {
            target: e.target ? {
              type: e.target.type,
              data: e.target.data
            } : 'no target'
          });
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

            // Use a timeout to defer state update and avoid immediate re-render
            setTimeout(() => {
              onUpdateText(obj.data.id, updates);
            }, 0);
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
          }
        });

        canvas.on('object:scaling', (e: any) => {
          if (e.target && e.target.data && e.target.data.id) {
            e.target._isBeingModified = true;
          }
        });

        canvas.on('object:rotating', (e: any) => {
          if (e.target && e.target.data && e.target.data.id) {
            e.target._isBeingModified = true;
          }
        });

        canvas.on('mouse:up', () => {
          // Clear manipulation flags when mouse is released
          const objects = canvas.getObjects();
          objects.forEach((obj: any) => {
            obj._isBeingDragged = false;
            obj._isBeingScaled = false;
            obj._isBeingRotated = false;
            obj._isBeingModified = false;
          });
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

      // Remove background if changed or if no background image
      if (backgroundObjects.length > 0) {
        if (!canvasState.backgroundImage) {
          backgroundObjects.forEach((obj: any) => canvas.remove(obj));
        } else {
          // Check if background image URL has changed
          const currentBgObj = backgroundObjects[0];
          if (currentBgObj.getSrc && currentBgObj.getSrc() !== canvasState.backgroundImage) {
            backgroundObjects.forEach((obj: any) => canvas.remove(obj));
          }
        }
      }

      // Draw grid if visible
      if (canvasState.gridVisible && gridObjects.length === 0) {
        await drawGrid();
      }

      // Add background image if not present
      if (canvasState.backgroundImage && backgroundObjects.length === 0) {
        await addBackgroundImage();
      }

      // Add/update text elements - DO NOT remove existing text objects here
      // The addTextElements function will handle updating existing objects
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
        
        // Ensure all existing text objects are brought to front and remain interactive
        const allObjects = canvas.getObjects();
        console.log('All objects after background added:', allObjects.map((obj: any) => ({
          type: obj.type,
          data: obj.data,
          selectable: obj.selectable,
          evented: obj.evented,
          zIndex: canvas.getObjects().indexOf(obj)
        })));
        
        allObjects.forEach((obj: any) => {
          if (obj.data && obj.data.id && !obj.data.isGrid && !obj.data.isBackground) {
            // Ensure text objects are above background and fully interactive
            obj.set({
              selectable: true,
              evented: true,
              moveCursor: 'move',
              hoverCursor: 'move'
            });
            canvas.bringObjectToFront(obj);
            console.log('Brought text object to front:', {
              id: obj.data.id,
              type: obj.type,
              selectable: obj.selectable,
              evented: obj.evented,
              newZIndex: canvas.getObjects().indexOf(obj)
            });
          }
        });
        
        // Clear any active selection to reset interaction state
        canvas.discardActiveObject();
        
        // Force complete re-render and recalculation of object interactions
        canvas.requestRenderAll();
        
        // Single render cycle with proper offset calculation
        setTimeout(() => {
          canvas.calcOffset();
          canvas.renderAll();
          console.log('Final object order after background image:', canvas.getObjects().map((obj: any) => ({
            type: obj.type,
            data: obj.data,
            selectable: obj.selectable,
            evented: obj.evented
          })));
        }, 50);
        
        console.log('Background image added and scaled, text brought to front');
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
          // Calculate values once to avoid repeated calculations
          const targetFontSize = getFontSizeInPixels(element.fontSize, canvasState.canvasWidth);
          const targetStrokeWidth = getProportionalStrokeWidth(element.strokeWidth, element.fontSize);
          
          // Only update properties if they've actually changed to avoid triggering events
          const needsUpdate = 
            existingObj.text !== element.content ||
            Math.abs(existingObj.left - element.x) > 1 ||
            Math.abs(existingObj.top - element.y) > 1 ||
            existingObj.fontSize !== targetFontSize ||
            existingObj.fontFamily !== element.fontFamily ||
            existingObj.fontWeight !== element.fontWeight ||
            existingObj.fill !== (element.fillType === 'gradient' ? getGradientFill(element) : getRgbaColor(element.color, element.colorAlpha || 1)) ||
            existingObj.stroke !== getRgbaColor(element.strokeColor, element.strokeColorAlpha || 1) ||
            existingObj.strokeWidth !== targetStrokeWidth ||
            existingObj.textAlign !== element.textAlign ||
            Math.abs(existingObj.angle - element.rotation) > 1 ||
            existingObj.opacity !== element.opacity ||
            existingObj.lineHeight !== element.lineHeight ||
            existingObj.charSpacing !== element.letterSpacing ||
            existingObj.skewX !== element.skewX ||
            existingObj.skewY !== element.skewY ||
            // Shadow property changes
            (existingObj.shadow && existingObj.shadow.color) !== getRgbaColor(element.shadowColor, element.shadowColorAlpha || 0.5) ||
            (existingObj.shadow && existingObj.shadow.blur) !== element.shadowBlur ||
            (existingObj.shadow && existingObj.shadow.offsetX) !== element.shadowOffsetX ||
            (existingObj.shadow && existingObj.shadow.offsetY) !== element.shadowOffsetY ||
            // Check if shadow existence changed
            (!existingObj.shadow && (element.shadowBlur > 0 || element.shadowOffsetX !== 0 || element.shadowOffsetY !== 0)) ||
            (existingObj.shadow && !(element.shadowBlur > 0 || element.shadowOffsetX !== 0 || element.shadowOffsetY !== 0));

          if (needsUpdate && !existingObj._isBeingModified) {
            // Update shadow first
            let shadowObj = null;
            if (element.shadowBlur > 0 || element.shadowOffsetX !== 0 || element.shadowOffsetY !== 0) {
              shadowObj = new fabric.Shadow({
                color: getRgbaColor(element.shadowColor, element.shadowColorAlpha || 0.5),
                blur: element.shadowBlur,
                offsetX: element.shadowOffsetX,
                offsetY: element.shadowOffsetY
              });
            }

            existingObj.set({
              text: element.content,
              left: element.x,
              top: element.y,
              fontSize: targetFontSize,
              fontFamily: element.fontFamily,
              fontWeight: element.fontWeight,
              fill: element.fillType === 'gradient' ? getGradientFill(element) : getRgbaColor(element.color, element.colorAlpha || 1),
              stroke: getRgbaColor(element.strokeColor, element.strokeColorAlpha || 1),
              strokeWidth: targetStrokeWidth,
              textAlign: element.textAlign,
              angle: element.rotation,
              opacity: element.opacity,
              lineHeight: element.lineHeight,
              charSpacing: element.letterSpacing,
              skewX: element.skewX,
              skewY: element.skewY,
              shadow: shadowObj,
              selectable: true,
              evented: true,
              moveCursor: 'move',
              hoverCursor: 'move'
            });
          }

          // Remove from map so we know it's been processed
          existingMap.delete(element.id);
        } else {
          // Calculate values once for new text objects
          const newFontSize = getFontSizeInPixels(element.fontSize, canvasState.canvasWidth);
          const newStrokeWidth = getProportionalStrokeWidth(element.strokeWidth, element.fontSize);
          
          // Create new text object
          const text = new fabric.Text(element.content, {
            left: element.x,
            top: element.y,
            fontSize: newFontSize,
            fontFamily: element.fontFamily,
            fontWeight: element.fontWeight,
            fill: element.fillType === 'gradient' ? getGradientFill(element) : getRgbaColor(element.color, element.colorAlpha || 1),
            stroke: getRgbaColor(element.strokeColor, element.strokeColorAlpha || 1),
            strokeWidth: newStrokeWidth,
            textAlign: element.textAlign,
            angle: element.rotation,
            opacity: element.opacity,
            lineHeight: element.lineHeight,
            charSpacing: element.letterSpacing,
            skewX: element.skewX,
            skewY: element.skewY,
            selectable: true,
            evented: true,
            moveCursor: 'move',
            hoverCursor: 'move',
            data: { id: element.id }
          });

          // Apply shadow if needed
          let shadowObj = null;
          if (element.shadowBlur > 0 || element.shadowOffsetX !== 0 || element.shadowOffsetY !== 0) {
            shadowObj = new fabric.Shadow({
              color: getRgbaColor(element.shadowColor, element.shadowColorAlpha || 0.5),
              blur: element.shadowBlur,
              offsetX: element.shadowOffsetX,
              offsetY: element.shadowOffsetY
            });
          }
          
          if (shadowObj) {
            text.set({ shadow: shadowObj });
          }

          canvas.add(text);
          
          // If there's a background image, ensure text is brought to front
          const hasBackground = canvas.getObjects().some((obj: any) => obj.data && obj.data.isBackground);
          if (hasBackground) {
            canvas.bringObjectToFront(text);
          }
        }
      });

      // Only remove objects that are no longer in the state AND are not being modified
      existingMap.forEach((obj, id) => {
        if (!obj._isBeingModified && !canvasState.textElements.some(el => el.id === id)) {
          canvas.remove(obj);
        }
      });

      // Ensure all text objects are above background after updates
      const hasBackground = canvas.getObjects().some((obj: any) => obj.data && obj.data.isBackground);
      if (hasBackground) {
        const textObjects = canvas.getObjects().filter((obj: any) => 
          obj.data && obj.data.id && !obj.data.isGrid && !obj.data.isBackground
        );
        textObjects.forEach((textObj: any) => {
          canvas.bringObjectToFront(textObj);
        });
      }

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

  // Re-render canvas when state changes (but not during initial setup)
  useEffect(() => {
    if (fabricCanvasRef.current && isInitialized) {
      console.log('State changed, re-rendering canvas');
      renderCanvas();
    }
  }, [canvasState.backgroundImage, canvasState.textElements, canvasState.gridVisible, canvasState.gridSize, isInitialized, renderCanvas]);

  // Update canvas size when dimensions change
  useEffect(() => {
    if (fabricCanvasRef.current && canvasRef.current) {
      console.log('Updating canvas dimensions:', canvasState.canvasWidth, canvasState.canvasHeight);
      
      // Update Fabric.js canvas dimensions
      fabricCanvasRef.current.setDimensions({
        width: canvasState.canvasWidth,
        height: canvasState.canvasHeight
      });
      
      // Update HTML canvas attributes to match
      canvasRef.current.width = canvasState.canvasWidth;
      canvasRef.current.height = canvasState.canvasHeight;
      
      fabricCanvasRef.current.renderAll();
    }
  }, [canvasState.canvasWidth, canvasState.canvasHeight]);

  // Recompute display scale when canvas dimensions change
  useEffect(() => {
    computeDisplayScale();
  }, [canvasState.canvasWidth, canvasState.canvasHeight, computeDisplayScale]);

  // Update CSS scaling on Fabric.js canvases when display scale changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      const upperCanvas = canvas.upperCanvasEl;
      const lowerCanvas = canvas.lowerCanvasEl;

      if (upperCanvas && lowerCanvas) {
        console.log('Updating CSS scaling with displayScale:', displayScale);
        
        const displayWidth = canvasState.canvasWidth * displayScale;
        const displayHeight = canvasState.canvasHeight * displayScale;

        upperCanvas.style.width = `${displayWidth}px`;
        upperCanvas.style.height = `${displayHeight}px`;
        lowerCanvas.style.width = `${displayWidth}px`;
        lowerCanvas.style.height = `${displayHeight}px`;
        
        // Critical: Recalculate coordinate offset after CSS scaling
        canvas.calcOffset();
        canvas.renderAll();
      }
    }
  }, [displayScale, canvasState.canvasWidth, canvasState.canvasHeight]);

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
                  height: `${canvasState.canvasHeight * displayScale}px`,
                  maxWidth: '100%',
                  maxHeight: '100%'
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