#!/bin/bash

# Chanakya Paint App - Raspberry Pi 5 Complete Setup
# This script automates the entire setup process for Raspberry Pi 5

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}=========================================="
echo "   Chanakya Paint App"
echo "   Raspberry Pi 5 - Complete Setup"
echo "==========================================${NC}"
echo ""

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo -e "${YELLOW}⚠ Warning: This doesn't appear to be a Raspberry Pi${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Function to check if command exists
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is NOT installed"
        return 1
    fi
}

# Function to print step header
print_step() {
    echo ""
    echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}${BOLD}$1${NC}"
    echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# ============================================
# STEP 1: System Update
# ============================================
print_step "Step 1: Updating System Packages"
sudo apt update
sudo apt upgrade -y
print_success "System updated"

# ============================================
# STEP 2: Install Dependencies
# ============================================
print_step "Step 2: Installing System Dependencies"

# Install essential tools
sudo apt install -y curl wget git vim nano htop

# Install Chromium browser
sudo apt install -y chromium-browser

# Install build essentials
sudo apt install -y build-essential

print_success "System dependencies installed"

# ============================================
# STEP 3: Install Node.js 18+
# ============================================
print_step "Step 3: Installing Node.js 18.x"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_success "Node.js $(node -v) already installed"
    else
        echo "Upgrading Node.js to 18.x..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
else
    echo "Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

print_success "Node.js $(node -v) installed"
print_success "npm $(npm -v) installed"

# ============================================
# STEP 4: Optimize GPU Settings
# ============================================
print_step "Step 4: Optimizing GPU Configuration"

CONFIG_FILE="/boot/firmware/config.txt"
BACKUP_FILE="/boot/firmware/config.txt.backup"

if [ -f "$CONFIG_FILE" ]; then
    # Create backup
    sudo cp "$CONFIG_FILE" "$BACKUP_FILE"
    print_success "Created backup: $BACKUP_FILE"
    
    # Add GPU optimizations if not present
    if ! grep -q "gpu_mem=256" "$CONFIG_FILE"; then
        echo "" | sudo tee -a "$CONFIG_FILE"
        echo "# Chanakya Paint App - GPU Optimizations" | sudo tee -a "$CONFIG_FILE"
        echo "gpu_mem=256" | sudo tee -a "$CONFIG_FILE"
        echo "dtoverlay=vc4-kms-v3d" | sudo tee -a "$CONFIG_FILE"
        echo "max_framebuffers=2" | sudo tee -a "$CONFIG_FILE"
        print_success "GPU settings optimized (256MB GPU memory)"
    else
        print_success "GPU settings already optimized"
    fi
else
    print_error "Config file not found at $CONFIG_FILE"
fi

# ============================================
# STEP 5: Setup Zram Swap
# ============================================
print_step "Step 5: Setting up Zram Swap (for better performance)"

sudo apt install -y zram-tools

# Configure zram
if [ -f "/etc/default/zramswap" ]; then
    sudo sed -i 's/#ALGO=lz4/ALGO=lz4/' /etc/default/zramswap
    sudo sed -i 's/#PERCENT=50/PERCENT=50/' /etc/default/zramswap
    sudo systemctl restart zramswap
    print_success "Zram swap configured"
fi

# ============================================
# STEP 6: Clone/Update App
# ============================================
print_step "Step 6: Setting up Chanakya App"

cd ~

if [ -d "EDP_APP" ]; then
    echo "Updating existing installation..."
    cd EDP_APP
    git pull
    print_success "App updated from repository"
else
    echo "Cloning repository..."
    git clone https://github.com/raghuwanshi313/EDP_APP.git
    cd EDP_APP
    print_success "App cloned from repository"
fi

# ============================================
# STEP 7: Install App Dependencies
# ============================================
print_step "Step 7: Installing App Dependencies"

npm install
print_success "Dependencies installed"

# ============================================
# STEP 8: Build Production Version
# ============================================
print_step "Step 8: Building Production Version"

npm run build
print_success "Production build created"

# ============================================
# STEP 9: Create Launch Script
# ============================================
print_step "Step 9: Creating Optimized Launch Script"

cat > ~/launch-chanakya.sh << 'EOF'
#!/bin/bash
# Optimized launch script for Chanakya Paint App

# Kill any existing instances
pkill -f "npm run preview" || true
pkill -f "vite preview" || true
pkill -f chromium-browser || true

# Wait for cleanup
sleep 2

# Start the app server
cd ~/EDP_APP
npm run preview &

# Wait for server to start
echo "Starting Chanakya server..."
sleep 5

# Launch Chromium in kiosk mode with optimizations
chromium-browser \
  --kiosk \
  --no-first-run \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-dev-shm-usage \
  --enable-features=VaapiVideoDecoder \
  --disable-smooth-scrolling \
  --enable-gpu-rasterization \
  --enable-zero-copy \
  --ignore-gpu-blocklist \
  --disk-cache-size=52428800 \
  http://localhost:4173
EOF

chmod +x ~/launch-chanakya.sh
print_success "Launch script created: ~/launch-chanakya.sh"

# ============================================
# STEP 10: Setup Auto-start
# ============================================
print_step "Step 10: Configuring Auto-start on Boot"

read -p "Do you want Chanakya to start automatically on boot? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create autostart directory
    mkdir -p ~/.config/lxsession/LXDE-pi
    
    # Create autostart file
    cat > ~/.config/lxsession/LXDE-pi/autostart << 'EOF'
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi

# Disable screen blanking
@xset s noblank
@xset s off
@xset -dpms

# Disable cursor (optional)
# @unclutter -idle 0.5 -root

# Start Chanakya Paint App
@/bin/bash /home/pi/launch-chanakya.sh
EOF
    
    print_success "Auto-start configured"
    
    # Also create a .desktop entry
    mkdir -p ~/.config/autostart
    cat > ~/.config/autostart/chanakya.desktop << EOF
[Desktop Entry]
Type=Application
Name=Chanakya Paint
Comment=Educational Drawing Application
Exec=/bin/bash /home/pi/launch-chanakya.sh
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
EOF
    
    print_success "Desktop entry created"
else
    print_success "Skipped auto-start setup"
fi

# ============================================
# STEP 11: Setup Storage Folders
# ============================================
print_step "Step 11: Setting up Storage Folders"

mkdir -p ~/Downloads
mkdir -p ~/Documents/Chanakya
chmod 755 ~/Downloads
chmod 755 ~/Documents/Chanakya

print_success "Storage folders created"

# ============================================
# STEP 12: Install Optional Tools
# ============================================
print_step "Step 12: Installing Optional Tools"

# USB auto-mount
read -p "Install USB auto-mount support? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo apt install -y usbmount
    sudo mkdir -p /media/usb0
    print_success "USB auto-mount installed"
fi

# Touchscreen calibration
read -p "Install touchscreen calibration tool? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo apt install -y xinput-calibrator xserver-xorg-input-evdev
    print_success "Touchscreen tools installed"
fi

# ============================================
# STEP 13: System Info & Test
# ============================================
print_step "Step 13: System Information"

echo ""
echo -e "${BOLD}System Details:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Hostname: $(hostname)"
echo "IP Address: $(hostname -I | awk '{print $1}')"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "CPU: $(lscpu | grep "Model name" | cut -d':' -f2 | xargs)"
echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"
echo ""

# ============================================
# SETUP COMPLETE
# ============================================
echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}${BOLD}   ✓ SETUP COMPLETE!${NC}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo ""
echo "1. ${BOLD}Test the app:${NC}"
echo "   ~/launch-chanakya.sh"
echo ""
echo "2. ${BOLD}Access from network:${NC}"
echo "   http://$(hostname -I | awk '{print $1}'):4173"
echo ""
echo "3. ${BOLD}Reboot to apply GPU settings:${NC}"
echo "   sudo reboot"
echo ""
echo "4. ${BOLD}View logs:${NC}"
echo "   npm run preview 2>&1 | tee ~/chanakya.log"
echo ""
echo "5. ${BOLD}Read documentation:${NC}"
echo "   cat ~/EDP_APP/RASPBERRY_PI_5_GUIDE.md"
echo ""
echo -e "${YELLOW}Note: If you enabled auto-start, the app will launch on next boot!${NC}"
echo ""
echo -e "${GREEN}Happy painting! 🎨${NC}"
echo ""
