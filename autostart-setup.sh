#!/bin/bash

# Chanakya Paint App - Auto-start on boot setup
# This script configures the app to start automatically when Pi boots

echo "Setting up Chanakya to auto-start on boot..."

# Create autostart directory if it doesn't exist
mkdir -p ~/.config/autostart

# Create desktop entry for autostart
cat > ~/.config/autostart/chanakya.desktop << EOF
[Desktop Entry]
Type=Application
Name=Chanakya Paint
Comment=Start Chanakya Paint App
Exec=/bin/bash -c "cd ~/EDP_APP && npm run preview & sleep 5 && chromium-browser --kiosk http://localhost:4173"
Terminal=false
Hidden=false
EOF

echo "✓ Auto-start configured!"
echo ""
echo "The app will now:"
echo "  1. Start the preview server on boot"
echo "  2. Open Chromium in kiosk (fullscreen) mode"
echo ""
echo "To disable auto-start, delete:"
echo "  ~/.config/autostart/chanakya.desktop"
echo ""
echo "Reboot to test: sudo reboot"
