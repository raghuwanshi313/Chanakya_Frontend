# 🎨 Chanakya - Drawing Application

A web-based drawing/paint application built with React, designed to run on Raspberry Pi 5.

![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-5-purple)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-cyan)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- 🖌️ **Drawing Tools** - Pencil, Eraser, Shapes (Rectangle, Circle, Line), Fill bucket
- 🎨 **Color Picker** - 24 preset colors + custom color selector
- 📏 **Brush Size** - Adjustable brush size (1-100px)
- ↩️ **Undo/Redo** - Full history support
- 💾 **Save Options** - Save to gallery, download PNG, save to specific folder
- 🖼️ **Gallery** - View and load previously saved drawings
- 🌈 **Background Color** - Changeable canvas background
- ⌨️ **Keyboard Shortcuts** - Quick tool switching
- 📱 **Touch Support** - Works with touch screens
- 🔌 **Offline Mode** - Works without internet connection

## 🛠️ Tech Stack

| Technology   | Purpose       |
| ------------ | ------------- |
| React 18     | UI Framework  |
| Vite         | Build Tool    |
| Tailwind CSS | Styling       |
| shadcn/ui    | UI Components |
| HTML5 Canvas | Drawing       |
| localStorage | Data Storage  |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/raghuwanshi313/EDP_APP.git

# Navigate to project directory
cd EDP_APP

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser at `http://localhost:8080`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## ⌨️ Keyboard Shortcuts

| Key      | Action              |
| -------- | ------------------- |
| `P`      | Pencil tool         |
| `E`      | Eraser tool         |
| `R`      | Rectangle tool      |
| `C`      | Circle tool         |
| `L`      | Line tool           |
| `G`      | Fill (paint bucket) |
| `Ctrl+Z` | Undo                |
| `Ctrl+Y` | Redo                |
| `Ctrl+S` | Save                |

## 📁 Project Structure

```
src/
├── components/
│   ├── paint/
│   │   ├── PaintCanvas.jsx    # Main canvas component
│   │   ├── Toolbar.jsx        # Top toolbar
│   │   ├── ToolButton.jsx     # Tool button component
│   │   ├── ColorPalette.jsx   # Color picker
│   │   ├── BrushSizeSlider.jsx# Brush size control
│   │   └── SavedPagesGallery.jsx # Gallery component
│   └── ui/                    # Reusable UI components
├── services/
│   └── storageService.js      # File saving utilities
├── pages/
│   ├── Index.jsx              # Home page
│   └── NotFound.jsx           # 404 page
└── App.jsx                    # Main app component
```

## 🍓 Running on Raspberry Pi 5

### Install Node.js on Pi

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
```

### Deploy and Run

```bash
# Copy project to Pi (from your PC)
scp -r EDP_APP pi@YOUR_PI_IP:/home/pi/

# On Raspberry Pi
cd /home/pi/EDP_APP
npm install
npm run build
npm run preview -- --host
```

### Kiosk Mode (Full Screen)

```bash
chromium-browser --kiosk http://localhost:8080
```

## 💾 Data Storage

All data is stored locally - **no external APIs or databases required**:

- **Gallery** - Saved in browser's localStorage
- **Download** - Direct PNG download to device
- **Folder Save** - Save to specific folder (Chrome/Edge)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Aman Raghuwanshi**

- GitHub: [@raghuwanshi313](https://github.com/raghuwanshi313)

---

Made with ❤️ for Raspberry Pi
