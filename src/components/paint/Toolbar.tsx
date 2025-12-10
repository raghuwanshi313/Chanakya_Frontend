import { 
  Pencil, 
  Eraser, 
  Square, 
  Circle, 
  Minus, 
  Undo2, 
  Redo2, 
  Trash2, 
  Save,
  PaintBucket,
  Palette
} from "lucide-react";
import { ToolButton } from "./ToolButton";
import { ColorPalette } from "./ColorPalette";
import { BrushSizeSlider } from "./BrushSizeSlider";
import { Separator } from "@/components/ui/separator";
import { SavedPagesGallery } from "./SavedPagesGallery";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Tool = "pencil" | "eraser" | "rectangle" | "circle" | "line" | "fill";

const BG_COLORS = [
  "#FFFFFF", "#F5F5F5", "#E0E0E0", "#000000",
  "#FFF8E1", "#E3F2FD", "#E8F5E9", "#FCE4EC",
  "#F3E5F5", "#FFFDE7", "#E0F7FA", "#FBE9E7",
];

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
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
  backgroundColor,
  onBackgroundColorChange,
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

      <Separator orientation="vertical" className="h-6 bg-toolbar-foreground/20" />

      {/* Background Color */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-toolbar-foreground/10 transition-colors"
            title="Background Color"
          >
            <Palette size={16} className="text-toolbar-foreground" />
            <div
              className="w-5 h-5 rounded border border-toolbar-foreground/30"
              style={{ backgroundColor: backgroundColor }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="space-y-3">
            <Label className="text-xs font-medium">Background Color</Label>
            <div className="grid grid-cols-4 gap-1">
              {BG_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${
                    backgroundColor === color ? "border-primary" : "border-border"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onBackgroundColorChange(color)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="bg-color" className="text-xs">Custom:</Label>
              <Input
                id="bg-color"
                type="color"
                value={backgroundColor}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
                className="w-12 h-8 p-0 border-0 cursor-pointer"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

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
