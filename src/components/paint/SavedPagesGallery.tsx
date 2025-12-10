import { useState, useEffect } from "react";
import { Trash2, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SavedPage {
  id: string;
  name: string;
  thumbnail: string;
  canvasData: string;
  createdAt: number;
}

interface SavedPagesGalleryProps {
  onLoad: (canvasData: string) => void;
}

const STORAGE_KEY = "mypaint-saved-pages";

export const getSavedPages = (): SavedPage[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const savePage = (page: SavedPage) => {
  const pages = getSavedPages();
  pages.unshift(page);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
};

export const deletePage = (id: string) => {
  const pages = getSavedPages().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
};

export const SavedPagesGallery = ({ onLoad }: SavedPagesGalleryProps) => {
  const [pages, setPages] = useState<SavedPage[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setPages(getSavedPages());
    }
  }, [open]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deletePage(id);
    setPages(getSavedPages());
  };

  const handleLoad = (canvasData: string) => {
    onLoad(canvasData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-toolbar-foreground hover:bg-toolbar-foreground/10"
        >
          <Image className="w-4 h-4 mr-1" />
          Gallery
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Saved Drawings</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <Image className="w-12 h-12 mb-2 opacity-50" />
              <p>No saved drawings yet</p>
              <p className="text-sm">Save your work to see it here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="group relative cursor-pointer rounded-lg border border-border overflow-hidden hover:border-primary transition-colors"
                  onClick={() => handleLoad(page.canvasData)}
                >
                  <img
                    src={page.thumbnail}
                    alt={page.name}
                    className="w-full aspect-square object-cover bg-white"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                      Load
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(page.id, e)}
                    className="absolute top-1 right-1 p-1 rounded bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                    <p className="text-white text-xs truncate">{page.name}</p>
                    <p className="text-white/60 text-[10px]">
                      {new Date(page.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
