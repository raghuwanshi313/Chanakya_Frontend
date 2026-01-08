#!/bin/bash

# Chanakya Paint App - Troubleshooting & Diagnostics
# Automatically diagnose and fix common issues

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Chanakya - Troubleshooting & Diagnostics   ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════╝${NC}"
echo ""

ISSUES_FOUND=0
FIXES_APPLIED=0

# Function to print test header
print_test() {
    echo -e "\n${BLUE}▶ Testing:${NC} $1"
}

# Function to print pass
print_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
}

# Function to print fail
print_fail() {
    echo -e "  ${RED}✗${NC} $1"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
}

# Function to print fix
print_fix() {
    echo -e "  ${YELLOW}↻${NC} $1"
    FIXES_APPLIED=$((FIXES_APPLIED + 1))
}

# ============================================
# Test 1: Node.js Version
# ============================================
print_test "Node.js Installation"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_pass "Node.js $(node -v) installed and compatible"
    else
        print_fail "Node.js version too old (v${NODE_VERSION}), need v18+"
        echo -e "  ${YELLOW}Fix:${NC} Run 'curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs'"
    fi
else
    print_fail "Node.js not installed"
    echo -e "  ${YELLOW}Fix:${NC} Run './complete-pi5-setup.sh' to install"
fi

# ============================================
# Test 2: npm Installation
# ============================================
print_test "npm Installation"

if command -v npm &> /dev/null; then
    print_pass "npm $(npm -v) installed"
else
    print_fail "npm not installed"
fi

# ============================================
# Test 3: App Directory
# ============================================
print_test "App Directory"

if [ -d ~/EDP_APP ]; then
    print_pass "App directory exists at ~/EDP_APP"
    cd ~/EDP_APP
else
    print_fail "App directory not found"
    echo -e "  ${YELLOW}Fix:${NC} Clone with 'git clone https://github.com/raghuwanshi313/EDP_APP.git ~/EDP_APP'"
    exit 1
fi

# ============================================
# Test 4: Dependencies
# ============================================
print_test "Node.js Dependencies"

if [ -d ~/EDP_APP/node_modules ]; then
    print_pass "Dependencies installed"
else
    print_fail "Dependencies not installed"
    read -p "Install dependencies now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_fix "Installing dependencies..."
        npm install
        print_pass "Dependencies installed"
    fi
fi

# ============================================
# Test 5: Build Files
# ============================================
print_test "Production Build"

if [ -d ~/EDP_APP/dist ]; then
    print_pass "Production build exists"
else
    print_fail "Production build not found"
    read -p "Build production version now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_fix "Building production version..."
        npm run build
        print_pass "Build completed"
    fi
fi

# ============================================
# Test 6: Port Availability
# ============================================
print_test "Port Availability"

if netstat -tuln 2>/dev/null | grep -q ":4173 "; then
    print_fail "Port 4173 already in use"
    echo -e "  ${YELLOW}Fix:${NC} Kill existing process with 'pkill -f \"vite preview\"'"
    read -p "Kill process now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -f "vite preview"
        print_fix "Killed existing process"
    fi
else
    print_pass "Port 4173 available"
fi

# ============================================
# Test 7: GPU Configuration
# ============================================
print_test "GPU Configuration"

CONFIG_FILE="/boot/firmware/config.txt"
if [ -f "$CONFIG_FILE" ]; then
    if grep -q "gpu_mem" "$CONFIG_FILE"; then
        GPU_MEM=$(grep "gpu_mem" "$CONFIG_FILE" | cut -d'=' -f2)
        if [ "$GPU_MEM" -ge 256 ]; then
            print_pass "GPU memory allocated: ${GPU_MEM}MB"
        else
            print_fail "GPU memory too low: ${GPU_MEM}MB (need 256MB+)"
        fi
    else
        print_fail "GPU memory not configured"
        read -p "Configure GPU memory now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "gpu_mem=256" | sudo tee -a "$CONFIG_FILE"
            print_fix "Added gpu_mem=256 to config"
            echo -e "  ${YELLOW}Note:${NC} Reboot required for changes to take effect"
        fi
    fi
else
    print_fail "Config file not found at $CONFIG_FILE"
fi

# ============================================
# Test 8: System Temperature
# ============================================
print_test "CPU Temperature"

if command -v vcgencmd &> /dev/null; then
    TEMP=$(vcgencmd measure_temp | cut -d'=' -f2 | cut -d"'" -f1)
    TEMP_INT=${TEMP%.*}
    
    if [ "$TEMP_INT" -lt 70 ]; then
        print_pass "Temperature OK: ${TEMP}°C"
    elif [ "$TEMP_INT" -lt 80 ]; then
        print_fail "Temperature high: ${TEMP}°C (warn)"
        echo -e "  ${YELLOW}Fix:${NC} Ensure adequate cooling/ventilation"
    else
        print_fail "Temperature critical: ${TEMP}°C"
        echo -e "  ${RED}Fix:${NC} Add cooling immediately - risk of throttling"
    fi
fi

# ============================================
# Test 9: Memory Availability
# ============================================
print_test "Memory Availability"

MEM_TOTAL=$(free -m | grep Mem | awk '{print $2}')
MEM_FREE=$(free -m | grep Mem | awk '{print $4}')
MEM_PERCENT=$((($MEM_TOTAL - $MEM_FREE) * 100 / $MEM_TOTAL))

if [ "$MEM_PERCENT" -lt 80 ]; then
    print_pass "Memory usage OK: ${MEM_PERCENT}% (${MEM_FREE}MB free)"
else
    print_fail "Memory usage high: ${MEM_PERCENT}% (${MEM_FREE}MB free)"
    echo -e "  ${YELLOW}Fix:${NC} Close unnecessary applications or restart"
fi

# ============================================
# Test 10: Disk Space
# ============================================
print_test "Disk Space"

DISK_USED=$(df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1)

if [ "$DISK_USED" -lt 80 ]; then
    print_pass "Disk space OK: ${DISK_USED}% used"
else
    print_fail "Disk space low: ${DISK_USED}% used"
    echo -e "  ${YELLOW}Fix:${NC} Run 'sudo apt clean' and remove old files"
    read -p "Clean package cache now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo apt clean
        print_fix "Package cache cleaned"
    fi
fi

# ============================================
# Test 11: Browser Installation
# ============================================
print_test "Chromium Browser"

if command -v chromium-browser &> /dev/null; then
    print_pass "Chromium browser installed"
else
    print_fail "Chromium browser not found"
    read -p "Install Chromium now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo apt install -y chromium-browser
        print_fix "Chromium installed"
    fi
fi

# ============================================
# Test 12: Storage Folders
# ============================================
print_test "Storage Folders"

if [ -d ~/Downloads ]; then
    print_pass "Downloads folder exists"
else
    print_fail "Downloads folder missing"
    mkdir -p ~/Downloads
    print_fix "Created Downloads folder"
fi

if [ -d ~/Documents/Chanakya ]; then
    print_pass "Chanakya folder exists"
else
    mkdir -p ~/Documents/Chanakya
    print_fix "Created Chanakya folder"
fi

# ============================================
# Test 13: Network Connectivity
# ============================================
print_test "Network Configuration"

IP=$(hostname -I | awk '{print $1}')
if [ -n "$IP" ]; then
    print_pass "IP address: $IP"
    echo -e "  ${GREEN}→${NC} App will be accessible at: http://$IP:4173"
else
    print_fail "No network connection"
fi

# ============================================
# Test 14: Process Status
# ============================================
print_test "App Process Status"

if pgrep -f "vite preview" > /dev/null; then
    print_pass "App server is running"
    PID=$(pgrep -f "vite preview")
    echo -e "  ${GREEN}→${NC} PID: $PID"
else
    print_fail "App server not running"
fi

if pgrep -f "chromium" > /dev/null; then
    print_pass "Chromium browser is running"
else
    print_fail "Chromium browser not running"
fi

# ============================================
# Test 15: File Permissions
# ============================================
print_test "File Permissions"

if [ -x ~/EDP_APP/setup-pi.sh ]; then
    print_pass "Scripts are executable"
else
    print_fail "Scripts not executable"
    chmod +x ~/EDP_APP/*.sh
    print_fix "Made scripts executable"
fi

# ============================================
# Additional Diagnostics
# ============================================
echo ""
echo -e "${BLUE}${BOLD}Additional Information:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for throttling
if command -v vcgencmd &> /dev/null; then
    THROTTLE=$(vcgencmd get_throttled)
    if [[ "$THROTTLE" == "throttled=0x0" ]]; then
        echo -e "Throttle Status:  ${GREEN}No throttling${NC}"
    else
        echo -e "Throttle Status:  ${RED}THROTTLED${NC} ($THROTTLE)"
    fi
fi

# Check Raspberry Pi model
if [ -f /proc/cpuinfo ]; then
    MODEL=$(grep "Model" /proc/cpuinfo | cut -d':' -f2 | xargs)
    echo -e "Device Model:     ${GREEN}$MODEL${NC}"
fi

# Check OS version
if [ -f /etc/os-release ]; then
    OS=$(grep PRETTY_NAME /etc/os-release | cut -d'"' -f2)
    echo -e "Operating System: ${GREEN}$OS${NC}"
fi

# ============================================
# Summary
# ============================================
echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║              Diagnostic Summary               ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$ISSUES_FOUND" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ All tests passed! No issues found.${NC}"
    echo ""
    echo "Your Chanakya app should be working correctly."
    echo "To start the app: ~/launch-chanakya.sh"
else
    echo -e "${YELLOW}${BOLD}⚠ Found $ISSUES_FOUND issue(s)${NC}"
    if [ "$FIXES_APPLIED" -gt 0 ]; then
        echo -e "${GREEN}Applied $FIXES_APPLIED fix(es)${NC}"
    fi
    echo ""
    echo "Review the issues above and apply suggested fixes."
fi

echo ""
echo -e "${BOLD}Quick Actions:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Start app:           ~/launch-chanakya.sh"
echo "2. Restart app:         pkill -f 'vite preview' && ~/launch-chanakya.sh"
echo "3. Rebuild app:         cd ~/EDP_APP && npm run build"
echo "4. View logs:           journalctl -xe"
echo "5. Monitor performance: ~/EDP_APP/monitor-performance.sh"
echo "6. Complete setup:      ~/EDP_APP/complete-pi5-setup.sh"
echo ""
