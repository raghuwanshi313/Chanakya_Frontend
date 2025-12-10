import { useEffect, useRef, useState, useCallback } from "react";
import { Toolbar, Tool } from "./Toolbar";
import { savePage, SavedPage } from "./SavedPagesGallery";
import { toast } from "sonner";

export const PaintCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<Tool>("pencil");
  const [activeColor, setActiveColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(5);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const previewCanvas = useRef<HTMLCanvasElement | null>(null);

  // Get canvas context
  const getContext = useCallback(() => {
    return canvasRef.current?.getContext("2d");
  }, []);

  // Save current canvas state to history
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL();
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, dataUrl];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Fill with background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create preview canvas for shape drawing
    const preview = document.createElement("canvas");
    preview.width = canvas.width;
    preview.height = canvas.height;
    previewCanvas.current = preview;

    // Save initial state
    const initialState = canvas.toDataURL();
    setHistory([initialState]);
    setHistoryIndex(0);

    toast("Canvas ready! Start drawing!");

    // Handle resize
    const handleResize = () => {
      if (!container || !canvas) return;
      
      // Save current content
      const imageData = canvas.toDataURL();
      
      // Resize canvas
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      if (previewCanvas.current) {
        previewCanvas.current.width = canvas.width;
        previewCanvas.current.height = canvas.height;
      }
      
      // Restore content
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = imageData;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Get mouse/touch position relative to canvas
  const getPointerPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Draw line between two points
  const drawLine = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: string,
    size: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  // Handle drawing start
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPointerPosition(e);
    if (!pos) return;

    isDrawing.current = true;
    lastPoint.current = pos;
    startPoint.current = pos;

    const ctx = getContext();
    if (!ctx) return;

    if (activeTool === "pencil" || activeTool === "eraser") {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = activeTool === "eraser" ? backgroundColor : activeColor;
      ctx.fill();
    }
  };

  // Handle drawing movement
  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;

    const pos = getPointerPosition(e);
    if (!pos || !lastPoint.current) return;

    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    if (activeTool === "pencil" || activeTool === "eraser") {
      const color = activeTool === "eraser" ? backgroundColor : activeColor;
      drawLine(ctx, lastPoint.current, pos, color, brushSize);
      lastPoint.current = pos;
    } else if (["rectangle", "circle", "line"].includes(activeTool) && startPoint.current) {
      // Draw preview on main canvas by restoring and redrawing
      const preview = previewCanvas.current;
      if (!preview) return;

      // Restore original state
      if (history[historyIndex]) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          drawShape(ctx, startPoint.current!, pos);
        };
        img.src = history[historyIndex];
      } else {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawShape(ctx, startPoint.current!, pos);
      }
    }
  };

  // Draw shape helper
  const drawShape = (
    ctx: CanvasRenderingContext2D,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (activeTool === "rectangle") {
      const width = end.x - start.x;
      const height = end.y - start.y;
      ctx.strokeRect(start.x, start.y, width, height);
    } else if (activeTool === "circle") {
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
      ctx.beginPath();
      ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (activeTool === "line") {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  };

  // Handle drawing end
  const handlePointerUp = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      lastPoint.current = null;
      startPoint.current = null;
      saveToHistory();
    }
  };

  // Handle fill tool click
  const handleClick = (e: React.MouseEvent) => {
    if (activeTool !== "fill") return;

    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    // Simple fill - fill entire canvas with color
    ctx.fillStyle = activeColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
    toast("Canvas filled!");
  };

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;

    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const newIndex = historyIndex - 1;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(newIndex);
    };
    img.src = history[newIndex];
  }, [historyIndex, history, getContext]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const newIndex = historyIndex + 1;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(newIndex);
    };
    img.src = history[newIndex];
  }, [historyIndex, history, getContext]);

  // Clear canvas
  const handleClear = () => {
    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
    toast("Canvas cleared!");
  };

  // Save drawing
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const thumbnail = canvas.toDataURL("image/png", 0.5);
    const canvasData = canvas.toDataURL("image/png");

    const page: SavedPage = {
      id: Date.now().toString(),
      name: `Drawing ${new Date().toLocaleTimeString()}`,
      thumbnail,
      canvasData,
      createdAt: Date.now(),
    };

    savePage(page);
    toast.success("Drawing saved!");
  }, []);

  // Load saved page
  const handleLoadPage = (canvasData: string) => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      saveToHistory();
      toast.success("Drawing loaded!");
    };
    img.src = canvasData;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          handleUndo();
        } else if (e.key === "y") {
          e.preventDefault();
          handleRedo();
        } else if (e.key === "s") {
          e.preventDefault();
          handleSave();
        }
      } else {
        switch (e.key.toLowerCase()) {
          case "p": setActiveTool("pencil"); break;
          case "e": setActiveTool("eraser"); break;
          case "r": setActiveTool("rectangle"); break;
          case "c": setActiveTool("circle"); break;
          case "l": setActiveTool("line"); break;
          case "g": setActiveTool("fill"); break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleSave]);

  // Get cursor style based on tool
  const getCursor = () => {
    switch (activeTool) {
      case "pencil":
      case "eraser":
      case "rectangle":
      case "circle":
      case "line":
        return "crosshair";
      case "fill":
        return "cell";
      default:
        return "default";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-workspace">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-toolbar border-b border-toolbar-foreground/10">
        <h1 className="text-lg font-semibold text-toolbar-foreground">MyPaint</h1>
        <span className="text-xs text-toolbar-foreground/60">Raspberry Pi Edition</span>
      </header>

      {/* Toolbar */}
      <div className="px-4 py-2">
        <Toolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          activeColor={activeColor}
          onColorChange={setActiveColor}
          backgroundColor={backgroundColor}
          onBackgroundColorChange={setBackgroundColor}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onSave={handleSave}
          onLoadPage={handleLoadPage}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
        />
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-4 overflow-hidden">
        <div
          ref={containerRef}
          className="w-full h-full bg-canvas rounded-lg border border-canvas-border shadow-inner overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            style={{ cursor: getCursor() }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onClick={handleClick}
          />
        </div>
      </div>

      {/* Status Bar */}
      <footer className="flex items-center justify-between px-4 py-1 bg-toolbar text-toolbar-foreground/60 text-xs">
        <span>Tool: {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}</span>
        <span>Color: {activeColor}</span>
        <span>Size: {brushSize}px</span>
      </footer>
    </div>
  );
};
