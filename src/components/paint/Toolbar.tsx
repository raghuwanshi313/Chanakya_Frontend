import { 
  Pencil, 
  Eraser, 
  Square, 
  Circle, 
  Minus, 
  MousePointer2, 
  Undo2, 
  Redo2, 
  Trash2, 
  Save,
  PaintBucket
} from "lucide-react";
import { ToolButton } from "./ToolButton";
import { ColorPalette } from "./ColorPalette";
import { BrushSizeSlider } from "./BrushSizeSlider";
import { Separator } from "@/components/ui/separator";
import { SavedPagesGallery } from "./SavedPagesGallery";

export type Tool = "select" | "pencil" | "eraser" | "rectangle" | "circle" | "line" | "fill";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onLoadPage: (canvasData: string) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const Toolbar = ({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onClear,
  onSave,
  onLoadPage,
  canUndo,
  canRedo,
}: ToolbarProps) => {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-toolbar rounded-lg">
      {/* Selection & Drawing Tools */}
      <div className="flex items-center gap-0.5">
        <ToolButton
          icon={MousePointer2}
          label="Select"
          shortcut="V"
          isActive={activeTool === "select"}
          onClick={() => onToolChange("select")}
        />
        <ToolButton
          icon={Pencil}
          label="Pencil"
          shortcut="P"
          isActive={activeTool === "pencil"}
          onClick={() => onToolChange("pencil")}
        />
        <ToolButton
          icon={Eraser}
          label="Eraser"
          shortcut="E"
          isActive={activeTool === "eraser"}
          onClick={() => onToolChange("eraser")}
        />
        <ToolButton
          icon={PaintBucket}
          label="Fill"
          shortcut="G"
          isActive={activeTool === "fill"}
          onClick={() => onToolChange("fill")}
        />
      </div>

      <Separator orientation="vertical" className="h-6 bg-toolbar-foreground/20" />

      {/* Shape Tools */}
      <div className="flex items-center gap-0.5">
        <ToolButton
          icon={Square}
          label="Rectangle"
          shortcut="R"
          isActive={activeTool === "rectangle"}
          onClick={() => onToolChange("rectangle")}
        />
        <ToolButton
          icon={Circle}
          label="Circle"
          shortcut="C"
          isActive={activeTool === "circle"}
          onClick={() => onToolChange("circle")}
        />
        <ToolButton
          icon={Minus}
          label="Line"
          shortcut="L"
          isActive={activeTool === "line"}
          onClick={() => onToolChange("line")}
        />
      </div>

      <Separator orientation="vertical" className="h-6 bg-toolbar-foreground/20" />

      {/* Brush Size */}
      <BrushSizeSlider size={brushSize} onSizeChange={onBrushSizeChange} />

      <Separator orientation="vertical" className="h-6 bg-toolbar-foreground/20" />

      {/* Colors */}
      <ColorPalette activeColor={activeColor} onColorChange={onColorChange} />

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <ToolButton
          icon={Undo2}
          label="Undo"
          shortcut="Ctrl+Z"
          onClick={onUndo}
        />
        <ToolButton
          icon={Redo2}
          label="Redo"
          shortcut="Ctrl+Y"
          onClick={onRedo}
        />
        <ToolButton
          icon={Trash2}
          label="Clear Canvas"
          onClick={onClear}
        />
        <ToolButton
          icon={Save}
          label="Save Drawing"
          shortcut="Ctrl+S"
          onClick={onSave}
        />
        <SavedPagesGallery onLoad={onLoadPage} />
      </div>
    </div>
  );
};
