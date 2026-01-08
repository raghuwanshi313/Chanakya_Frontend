#!/bin/bash

# Chanakya Paint App - Performance Monitor
# Real-time monitoring of system resources for Raspberry Pi 5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${BOLD}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Chanakya Paint - Performance Monitor       ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Function to get CPU temperature
get_temp() {
    temp=$(vcgencmd measure_temp | cut -d'=' -f2 | cut -d"'" -f1)
    echo "$temp"
}

# Function to get CPU usage
get_cpu() {
    top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}'
}

# Function to get memory usage
get_memory() {
    free | grep Mem | awk '{printf "%.1f", ($3/$2) * 100.0}'
}

# Function to get GPU memory
get_gpu_mem() {
    vcgencmd get_mem gpu | cut -d'=' -f2
}

# Function to check throttling
check_throttle() {
    throttled=$(vcgencmd get_throttled)
    if [[ "$throttled" == "throttled=0x0" ]]; then
        echo -e "${GREEN}No throttling${NC}"
    else
        echo -e "${RED}THROTTLED: $throttled${NC}"
    fi
}

# Function to check if app is running
check_app_running() {
    if pgrep -f "npm run preview" > /dev/null; then
        echo -e "${GREEN}Running${NC}"
        return 0
    else
        echo -e "${RED}Not Running${NC}"
        return 1
    fi
}

# Function to get process memory
get_process_mem() {
    process_name=$1
    mem=$(ps aux | grep "$process_name" | grep -v grep | awk '{sum+=$6} END {print sum/1024}')
    if [ -z "$mem" ]; then
        echo "0"
    else
        printf "%.0f" "$mem"
    fi
}

# Monitoring loop
while true; do
    # Move cursor to top
    tput cup 0 0
    
    echo -e "${BOLD}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║   Chanakya Paint - Performance Monitor       ║${NC}"
    echo -e "${BOLD}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # System Status
    echo -e "${BLUE}${BOLD}System Status:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # CPU Temperature
    temp=$(get_temp)
    temp_int=${temp%.*}
    if [ "$temp_int" -gt 80 ]; then
        temp_color=$RED
    elif [ "$temp_int" -gt 70 ]; then
        temp_color=$YELLOW
    else
        temp_color=$GREEN
    fi
    echo -e "CPU Temperature:  ${temp_color}${temp}°C${NC}"
    
    # CPU Usage
    cpu=$(get_cpu)
    cpu_int=${cpu%.*}
    if [ "$cpu_int" -gt 80 ]; then
        cpu_color=$RED
    elif [ "$cpu_int" -gt 60 ]; then
        cpu_color=$YELLOW
    else
        cpu_color=$GREEN
    fi
    echo -e "CPU Usage:        ${cpu_color}${cpu}%${NC}"
    
    # Memory Usage
    mem=$(get_memory)
    mem_int=${mem%.*}
    if [ "$mem_int" -gt 85 ]; then
        mem_color=$RED
    elif [ "$mem_int" -gt 70 ]; then
        mem_color=$YELLOW
    else
        mem_color=$GREEN
    fi
    echo -e "Memory Usage:     ${mem_color}${mem}%${NC}"
    
    # GPU Memory
    gpu_mem=$(get_gpu_mem)
    echo -e "GPU Memory:       ${GREEN}${gpu_mem}${NC}"
    
    # Throttling Status
    echo -n "Throttle Status:  "
    check_throttle
    
    echo ""
    
    # App Status
    echo -e "${BLUE}${BOLD}Chanakya App Status:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo -n "Server Status:    "
    check_app_running
    
    # Node.js Memory
    node_mem=$(get_process_mem "node")
    echo -e "Node.js Memory:   ${GREEN}${node_mem} MB${NC}"
    
    # Chromium Memory
    chrome_mem=$(get_process_mem "chromium")
    echo -e "Chromium Memory:  ${GREEN}${chrome_mem} MB${NC}"
    
    echo ""
    
    # Disk Usage
    echo -e "${BLUE}${BOLD}Storage:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    df -h / | tail -1 | awk '{printf "Root Partition:   %s / %s (%s used)\n", $3, $2, $5}'
    
    # Check Downloads folder
    if [ -d ~/Downloads ]; then
        downloads_size=$(du -sh ~/Downloads 2>/dev/null | awk '{print $1}')
        echo -e "Downloads Folder: ${GREEN}${downloads_size}${NC}"
    fi
    
    echo ""
    
    # Network
    echo -e "${BLUE}${BOLD}Network:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    ip=$(hostname -I | awk '{print $1}')
    echo -e "IP Address:       ${GREEN}${ip}${NC}"
    echo -e "App URL:          ${GREEN}http://${ip}:4173${NC}"
    
    echo ""
    
    # Performance Tips
    if [ "$temp_int" -gt 75 ] || [ "$cpu_int" -gt 80 ] || [ "$mem_int" -gt 80 ]; then
        echo -e "${YELLOW}${BOLD}⚠ Performance Warnings:${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        if [ "$temp_int" -gt 75 ]; then
            echo -e "${YELLOW}• CPU temperature high - ensure proper cooling${NC}"
        fi
        
        if [ "$cpu_int" -gt 80 ]; then
            echo -e "${YELLOW}• High CPU usage - close unnecessary apps${NC}"
        fi
        
        if [ "$mem_int" -gt 80 ]; then
            echo -e "${YELLOW}• High memory usage - consider restarting${NC}"
        fi
        echo ""
    fi
    
    # Controls
    echo -e "${BOLD}Controls:${NC} [Ctrl+C] Exit | [R] Restart App | [C] Clear Cache"
    echo ""
    
    # Wait 2 seconds before refresh
    sleep 2
done
