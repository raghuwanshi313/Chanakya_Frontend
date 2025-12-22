# Chanakya - Offline Painting Application

A complete offline painting application with no API calls. All data is stored locally using IndexedDB.

## ✅ Offline Features Implemented

### 1. **Fixed Typo**

- Changed "Chanaya" → "Chanakya" in welcome message

### 2. **Image Import**

- Import JPG, JPEG, PNG files directly into canvas
- Images are scaled to fit canvas automatically
- Upload button in toolbar with file picker

### 3. **Highlighter Tool**

- New highlighter tool with semi-transparent drawing
- Press 'H' shortcut to activate
- Adjustable brush size with existing size slider

### 4. **Fixed Fill Tool**

- Implemented proper flood fill algorithm
- Fills connected areas of similar color
- Click on canvas to fill area with selected color

### 5. **Download Function**

- Download drawings to Downloads folder
- Completely offline - no API calls
- Creates PNG files with timestamp

### 6. **Multi-Page Support**

- Add multiple pages/sheets to your project
- Switch between pages with tab buttons
- Each page saves independently
- Add new pages with "+" button in toolbar

### 7. **Maximize/Minimize Canvas**

- Maximize button to expand canvas to full screen
- Minimize to return to normal view
- Perfect for detailed drawing work

### 8. **Landscape/Portrait View**

- Toggle between portrait (vertical) and landscape (horizontal) modes
- Aspect ratio automatically adjusted
- View indicator in status bar

## 🏗️ Architecture - Completely Offline

### Storage System

- **IndexedDB**: All drawings stored locally in browser
- **No API Calls**: Zero network requests
- **No Supabase**: Client disabled (`null`)
- **File System API**: Optional - for saving to specific folders

### Core Files

- `src/services/storageService.js` - All offline storage operations
- `src/components/paint/PaintCanvas.jsx` - Main drawing engine
- `src/components/paint/Toolbar.jsx` - All tools and controls
- `src/integrations/supabase/client.ts` - Disabled (offline mode)

## 🎨 Tools Available

### Drawing Tools

- ✏️ Pencil (P)
- 🖇️ Eraser (E)
- 🎨 Highlighter (H)
- 🪣 Fill/Bucket (G)

### Shape Tools

- ⬜ Rectangle (R)
- ⭕ Circle (C)
- ➖ Line (L)

### Actions

- ↩️ Undo (Ctrl+Z)
- ↪️ Redo (Ctrl+Y)
- 🗑️ Clear Canvas
- 💾 Save to Gallery
- ⬇️ Download to Downloads
- 📁 Import Image
- ➕ New Page

### Customization

- 🎨 Color Palette - Select from presets or custom colors
- 🖼️ Background Color - Change canvas background
- 📏 Brush Size - Adjustable with slider

## 💾 Data Storage

All data is stored locally:

- **Canvas Drawings**: IndexedDB
- **Multiple Pages**: IndexedDB with page metadata
- **No Cloud Sync**: Everything stays on device

## 🚀 Getting Started

1. Open the application
2. Start drawing with Pencil tool
3. Use other tools as needed
4. Save to gallery (offline storage)
5. Download to Downloads folder when needed
6. Switch pages to create multiple drawings

## 📝 Keyboard Shortcuts

- `P` - Pencil
- `E` - Eraser
- `H` - Highlighter
- `G` - Fill/Bucket
- `R` - Rectangle
- `C` - Circle
- `L` - Line
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+S` - Save Drawing

## ✨ Features

✅ Complete offline functionality  
✅ No external API calls  
✅ IndexedDB storage  
✅ Multi-page support  
✅ Multiple drawing tools  
✅ Undo/Redo system  
✅ Import images  
✅ Download drawings  
✅ Maximize/Minimize canvas  
✅ Landscape/Portrait modes  
✅ Background color customization  
✅ Responsive toolbar

## 🔧 Technical Stack

- **React 18** - UI Framework
- **Canvas API** - Drawing engine
- **IndexedDB** - Local storage
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library

---

**Version**: 1.0  
**Mode**: 🔒 Completely Offline  
**Last Updated**: December 2025
