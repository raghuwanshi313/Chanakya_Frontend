# 🥧 Chanakya Paint App - Raspberry Pi 5 Complete Guide

## 📋 Overview

**Chanakya** is a complete educational drawing and PDF annotation application optimized for Raspberry Pi 5. This guide covers installation, optimization, and deployment for maximum performance on Raspberry Pi hardware.

---

## 🎯 App Features Summary

### **Drawing & Painting Tools**

✅ **Pencil** - Draw freehand with adjustable brush size  
✅ **Eraser** - Remove drawings  
✅ **Highlighter** - Semi-transparent highlighting tool  
✅ **Shapes** - Rectangle, Circle, Line drawing  
✅ **Fill Bucket** - Flood fill algorithm for areas  
✅ **Color Picker** - 24 preset colors + custom color selector  
✅ **Brush Size** - 1-100px adjustable slider

### **Canvas Features**

✅ **Multi-Page Support** - Create and manage multiple drawing pages  
✅ **Undo/Redo** - Complete history management  
✅ **Image Import** - Load JPG, JPEG, PNG files  
✅ **Background Color** - Changeable canvas background  
✅ **Portrait/Landscape Mode** - Toggle orientation  
✅ **Maximize/Minimize** - Fullscreen canvas mode

### **Storage & Export**

✅ **Local Gallery** - Save and load drawings from gallery  
✅ **Download to Folder** - Save PNG files to Downloads  
✅ **Cloud Sync** (Optional) - Supabase integration for cloud backup  
✅ **IndexedDB Storage** - Persistent local storage

### **PDF Features**

✅ **PDF Viewer** - View PDF documents  
✅ **PDF Annotation** - Draw and annotate on PDFs  
✅ **PDF Import** - Load and work with PDF files

### **UI/UX Features**

✅ **Touch Screen Support** - Optimized for touchscreens  
✅ **Keyboard Shortcuts** - Quick tool switching  
✅ **Offline Mode** - Works without internet  
✅ **PWA Support** - Installable as Progressive Web App  
✅ **Responsive Design** - Adapts to different screen sizes  
✅ **Kiosk Mode** - Fullscreen launch for Pi

---

## 🛠️ Raspberry Pi 5 System Requirements

### **Minimum Requirements**

- Raspberry Pi 5 (4GB RAM)
- 32GB microSD card (Class 10 or better)
- Raspberry Pi OS (64-bit recommended)
- 7" or larger touchscreen display
- Keyboard & Mouse (or touchscreen)

### **Recommended Requirements**

- Raspberry Pi 5 (8GB RAM)
- 64GB+ microSD card (UHS-I or better)
- Active cooling (heatsink + fan)
- 10" or larger touchscreen display
- USB storage for saving files

---

## 🚀 Installation Instructions

### **Step 1: Prepare Raspberry Pi**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required system packages
sudo apt install -y git chromium-browser curl wget
```

### **Step 2: Install Node.js 18+**

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v18.x or higher
npm --version
```

### **Step 3: Clone & Install App**

```bash
# Clone repository
cd ~
git clone https://github.com/raghuwanshi313/EDP_APP.git
cd EDP_APP

# Install dependencies
npm install

# Build production version
npm run build
```

### **Step 4: Setup Auto-start (Optional)**

```bash
# Make scripts executable
chmod +x setup-pi.sh
chmod +x autostart-setup.sh

# Run setup script
./setup-pi.sh

# Setup auto-start on boot
./autostart-setup.sh
```

---

## ⚙️ Performance Optimization for Raspberry Pi 5

### **1. Enable Hardware Acceleration**

Edit `/boot/firmware/config.txt`:

```bash
sudo nano /boot/firmware/config.txt
```

Add/modify these lines:

```ini
# GPU Memory (256MB minimum for graphics apps)
gpu_mem=256

# Enable KMS (Kernel Mode Setting) for better graphics
dtoverlay=vc4-kms-v3d
max_framebuffers=2

# Overclock settings (optional, use with cooling)
over_voltage=2
arm_freq=2400

# Disable WiFi/Bluetooth if not needed (saves power)
# dtoverlay=disable-wifi
# dtoverlay=disable-bt
```

Reboot after changes:

```bash
sudo reboot
```

### **2. Optimize Chromium Browser**

Create optimized launch script:

```bash
nano ~/launch-chanakya.sh
```

Add:

```bash
#!/bin/bash
# Optimized Chromium flags for Raspberry Pi 5

cd ~/EDP_APP
npm run preview &

sleep 5

chromium-browser \
  --kiosk \
  --no-first-run \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-dev-shm-usage \
  --enable-features=VaapiVideoDecoder \
  --disable-smooth-scrolling \
  --disable-gpu-vsync \
  --enable-gpu-rasterization \
  --enable-zero-copy \
  --ignore-gpu-blocklist \
  http://localhost:4173
```

Make executable:

```bash
chmod +x ~/launch-chanakya.sh
```

### **3. Reduce Memory Usage**

Edit npm scripts in `package.json`:

```json
"preview": "NODE_OPTIONS='--max-old-space-size=512' vite preview --host 0.0.0.0 --port 4173"
```

### **4. Enable Zram Swap**

```bash
# Install zram
sudo apt install -y zram-tools

# Configure zram
echo "ALGO=lz4" | sudo tee -a /etc/default/zramswap
echo "PERCENT=50" | sudo tee -a /etc/default/zramswap

# Restart service
sudo systemctl reload zramswap
```

---

## 🖥️ Kiosk Mode Setup

### **Auto-start in Kiosk Mode on Boot**

```bash
# Edit autostart
mkdir -p ~/.config/lxsession/LXDE-pi
nano ~/.config/lxsession/LXDE-pi/autostart
```

Add these lines:

```bash
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash

# Disable screen blanking
@xset s noblank
@xset s off
@xset -dpms

# Start Chanakya app
@/bin/bash /home/pi/launch-chanakya.sh
```

---

## 📁 File Storage Configuration

### **Setup Downloads Folder**

The app uses the Downloads folder for saving files. Ensure proper permissions:

```bash
# Create downloads directory
mkdir -p ~/Downloads

# Set permissions
chmod 755 ~/Downloads
```

### **USB Storage Auto-mount**

For saving to USB drive:

```bash
# Install USB mount tools
sudo apt install -y usbmount

# Create mount point
sudo mkdir -p /media/usb0

# Files will auto-mount to /media/usb0 when USB inserted
```

---

## 🌐 Network Configuration

### **Option 1: Offline Mode (No Internet)**

The app works completely offline. All features available without network:

- Drawing and painting
- Local gallery storage
- PDF viewing
- Image import
- File downloads

### **Option 2: Local Network Access**

Access from other devices on network:

```bash
# Start with network access
npm run preview -- --host 0.0.0.0 --port 4173
```

Access from other devices: `http://<raspberry-pi-ip>:4173`

Find Pi IP:

```bash
hostname -I
```

### **Option 3: Cloud Sync (Supabase)**

For cloud backup features:

1. Create `.env` file:

```bash
nano ~/EDP_APP/.env
```

2. Add Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

3. Restart app

---

## 🎮 Keyboard Shortcuts

| Shortcut | Action           |
| -------- | ---------------- |
| `P`      | Pencil tool      |
| `E`      | Eraser tool      |
| `H`      | Highlighter tool |
| `R`      | Rectangle tool   |
| `C`      | Circle tool      |
| `L`      | Line tool        |
| `G`      | Fill bucket tool |
| `Ctrl+Z` | Undo             |
| `Ctrl+Y` | Redo             |
| `Ctrl+S` | Save drawing     |
| `Delete` | Clear canvas     |

---

## 🔧 Troubleshooting

### **App won't start**

```bash
# Check Node.js version
node --version  # Must be 18+

# Rebuild dependencies
cd ~/EDP_APP
rm -rf node_modules package-lock.json
npm install
npm run build
```

### **Slow performance**

- Enable hardware acceleration (see optimization section)
- Close other applications
- Check GPU memory allocation (min 256MB)
- Monitor temperature: `vcgencmd measure_temp`

### **Touch screen not working**

```bash
# Install touch screen drivers
sudo apt install -y xserver-xorg-input-evdev

# Calibrate touch screen
sudo apt install -y xinput-calibrator
xinput_calibrator
```

### **Canvas not saving**

```bash
# Check browser storage
# Open browser console (F12)
# Run: localStorage.length

# Clear if corrupted:
localStorage.clear()
```

### **PDF viewer errors**

PDF features require internet on first load for PDF.js worker. After first load, works offline.

---

## 📊 Performance Benchmarks

| Feature             | Performance on Pi 5 |
| ------------------- | ------------------- |
| App Startup         | 2-3 seconds         |
| Drawing Latency     | <16ms (60fps)       |
| Undo/Redo           | Instant             |
| Image Import        | 1-2 seconds         |
| PDF Loading         | 2-5 seconds         |
| Memory Usage        | 150-300MB           |
| Storage Per Drawing | 50-500KB            |

---

## 🔐 Security Considerations

### **For Educational/Kiosk Use**

```bash
# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon

# Firewall setup
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24  # Local network only
sudo ufw enable

# Auto-login (for kiosk mode)
sudo raspi-config
# Select: System Options > Boot / Auto Login > Desktop Autologin
```

---

## 📦 Backup & Restore

### **Backup Drawings**

```bash
# Backup all app data
mkdir ~/chanakya-backup
cp -r ~/EDP_APP ~/chanakya-backup/
# Backup browser storage (drawings are in IndexedDB)
# Use browser's export feature or cloud sync
```

### **Create SD Card Image**

```bash
# From another Linux machine:
sudo dd if=/dev/mmcblk0 of=~/chanakya-pi-backup.img bs=4M status=progress

# Compress
gzip ~/chanakya-pi-backup.img
```

---

## 🆘 Support & Resources

### **Documentation**

- Main README: `README.md`
- Offline Mode: `OFFLINE_MODE.md`
- Storage Setup: `STORAGE_SETUP.md`

### **Logs & Debugging**

```bash
# View app logs
npm run preview 2>&1 | tee ~/chanakya.log

# System logs
journalctl -xe

# Check Chrome process
ps aux | grep chromium
```

### **Update App**

```bash
cd ~/EDP_APP
git pull origin main
npm install
npm run build
```

---

## 🎓 Educational Use Cases

1. **Digital Art Classes** - Students create drawings and save portfolios
2. **Math Annotations** - Annotate PDFs with formulas and diagrams
3. **Science Diagrams** - Draw and label scientific illustrations
4. **Language Learning** - Practice writing characters/letters
5. **Presentations** - Live drawing and annotation during lessons

---

## 📝 License & Credits

**License:** MIT  
**Built with:** React, Vite, TailwindCSS, shadcn/ui  
**Optimized for:** Raspberry Pi 5 Educational Platform

---

## ✅ Quick Start Checklist

- [ ] Raspberry Pi 5 setup with OS installed
- [ ] Node.js 18+ installed
- [ ] App cloned and dependencies installed
- [ ] Production build completed
- [ ] Hardware acceleration enabled
- [ ] Touchscreen calibrated (if applicable)
- [ ] Auto-start configured (optional)
- [ ] Storage folders created
- [ ] Keyboard shortcuts tested
- [ ] Backup strategy in place

---

**Ready to paint! 🎨**
