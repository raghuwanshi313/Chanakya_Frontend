import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush, Rect, Circle, Line, FabricObject } from "fabric";
import { Toolbar, Tool } from "./Toolbar";
import { savePage, SavedPage } from "./SavedPagesGallery";
import { toast } from "sonner";

export const PaintCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("pencil");
  const [activeColor, setActiveColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isDrawingShape = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const currentShape = useRef<FabricObject | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "#ffffff",
      isDrawingMode: true,
    });

    // Initialize brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = brushSize;

    setFabricCanvas(canvas);
    
    // Save initial state
    const initialState = JSON.stringify(canvas.toJSON());
    setHistory([initialState]);
    setHistoryIndex(0);

    toast("Canvas ready! Start drawing!");

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      canvas.setDimensions({ width: newWidth, height: newHeight });
      canvas.renderAll();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
    };
  }, []);

  // Save to history
  const saveToHistory = useCallback(() => {
    if (!fabricCanvas) return;
    
    const state = JSON.stringify(fabricCanvas.toJSON());
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, state];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [fabricCanvas, historyIndex]);

  // Handle object modifications
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleModified = () => saveToHistory();
    
    fabricCanvas.on("object:added", handleModified);
    fabricCanvas.on("object:modified", handleModified);
    fabricCanvas.on("object:removed", handleModified);

    return () => {
      fabricCanvas.off("object:added", handleModified);
      fabricCanvas.off("object:modified", handleModified);
      fabricCanvas.off("object:removed", handleModified);
    };
  }, [fabricCanvas, saveToHistory]);

  // Update tool settings
  useEffect(() => {
    if (!fabricCanvas) return;

    const isDrawingTool = activeTool === "pencil" || activeTool === "eraser";
    fabricCanvas.isDrawingMode = isDrawingTool;
    fabricCanvas.selection = activeTool === "select";

    if (isDrawingTool && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeTool === "eraser" ? "#ffffff" : activeColor;
      fabricCanvas.freeDrawingBrush.width = brushSize;
    }

    // Update cursor based on tool
    if (activeTool === "select") {
      fabricCanvas.defaultCursor = "default";
    } else if (isDrawingTool) {
      fabricCanvas.defaultCursor = "crosshair";
    } else {
      fabricCanvas.defaultCursor = "crosshair";
    }
  }, [activeTool, activeColor, brushSize, fabricCanvas]);

  // Handle shape drawing
  useEffect(() => {
    if (!fabricCanvas) return;

    const isShapeTool = ["rectangle", "circle", "line"].includes(activeTool);

    const handleMouseDown = (e: any) => {
      if (!isShapeTool || !e.pointer) return;
      
      isDrawingShape.current = true;
      startPoint.current = { x: e.pointer.x, y: e.pointer.y };

      let shape: FabricObject | null = null;

      if (activeTool === "rectangle") {
        shape = new Rect({
          left: e.pointer.x,
          top: e.pointer.y,
          width: 0,
          height: 0,
          fill: "transparent",
          stroke: activeColor,
          strokeWidth: brushSize,
        });
      } else if (activeTool === "circle") {
        shape = new Circle({
          left: e.pointer.x,
          top: e.pointer.y,
          radius: 0,
          fill: "transparent",
          stroke: activeColor,
          strokeWidth: brushSize,
        });
      } else if (activeTool === "line") {
        shape = new Line([e.pointer.x, e.pointer.y, e.pointer.x, e.pointer.y], {
          stroke: activeColor,
          strokeWidth: brushSize,
        });
      }

      if (shape) {
        currentShape.current = shape;
        fabricCanvas.add(shape);
      }
    };

    const handleMouseMove = (e: any) => {
      if (!isDrawingShape.current || !startPoint.current || !currentShape.current || !e.pointer) return;

      const { x: startX, y: startY } = startPoint.current;
      const { x: currentX, y: currentY } = e.pointer;

      if (activeTool === "rectangle") {
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        currentShape.current.set({
          left: Math.min(startX, currentX),
          top: Math.min(startY, currentY),
          width,
          height,
        });
      } else if (activeTool === "circle") {
        const radius = Math.sqrt(
          Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2)
        ) / 2;
        currentShape.current.set({
          left: (startX + currentX) / 2 - radius,
          top: (startY + currentY) / 2 - radius,
          radius,
        });
      } else if (activeTool === "line") {
        (currentShape.current as Line).set({
          x2: currentX,
          y2: currentY,
        });
      }

      fabricCanvas.renderAll();
    };

    const handleMouseUp = () => {
      isDrawingShape.current = false;
      startPoint.current = null;
      currentShape.current = null;
    };

    if (isShapeTool) {
      fabricCanvas.on("mouse:down", handleMouseDown);
      fabricCanvas.on("mouse:move", handleMouseMove);
      fabricCanvas.on("mouse:up", handleMouseUp);
    }

    return () => {
      fabricCanvas.off("mouse:down", handleMouseDown);
      fabricCanvas.off("mouse:move", handleMouseMove);
      fabricCanvas.off("mouse:up", handleMouseUp);
    };
  }, [fabricCanvas, activeTool, activeColor, brushSize]);

  // Handle fill tool
  useEffect(() => {
    if (!fabricCanvas || activeTool !== "fill") return;

    const handleClick = (e: any) => {
      if (e.target) {
        e.target.set("fill", activeColor);
        fabricCanvas.renderAll();
        saveToHistory();
      }
    };

    fabricCanvas.on("mouse:down", handleClick);

    return () => {
      fabricCanvas.off("mouse:down", handleClick);
    };
  }, [fabricCanvas, activeTool, activeColor, saveToHistory]);

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
          case "v": setActiveTool("select"); break;
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
  }, [historyIndex, history]);

  const handleUndo = () => {
    if (historyIndex <= 0 || !fabricCanvas) return;
    
    const newIndex = historyIndex - 1;
    fabricCanvas.loadFromJSON(JSON.parse(history[newIndex])).then(() => {
      fabricCanvas.renderAll();
      setHistoryIndex(newIndex);
    });
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1 || !fabricCanvas) return;
    
    const newIndex = historyIndex + 1;
    fabricCanvas.loadFromJSON(JSON.parse(history[newIndex])).then(() => {
      fabricCanvas.renderAll();
      setHistoryIndex(newIndex);
    });
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    saveToHistory();
    toast("Canvas cleared!");
  };

  const handleSave = () => {
    if (!fabricCanvas) return;
    
    const thumbnail = fabricCanvas.toDataURL({
      format: "png",
      quality: 0.5,
      multiplier: 0.3,
    });
    
    const canvasData = JSON.stringify(fabricCanvas.toJSON());
    
    const page: SavedPage = {
      id: Date.now().toString(),
      name: `Drawing ${new Date().toLocaleTimeString()}`,
      thumbnail,
      canvasData,
      createdAt: Date.now(),
    };
    
    savePage(page);
    toast.success("Drawing saved!");
  };

  const handleLoadPage = (canvasData: string) => {
    if (!fabricCanvas) return;
    
    fabricCanvas.loadFromJSON(JSON.parse(canvasData)).then(() => {
      fabricCanvas.renderAll();
      saveToHistory();
      toast.success("Drawing loaded!");
    });
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
          <canvas ref={canvasRef} />
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
