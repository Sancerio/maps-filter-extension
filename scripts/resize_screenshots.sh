#!/bin/bash

# Resize screenshots for Chrome Web Store submission
# This script requires Python 3 and Pillow (PIL)

echo "Chrome Web Store Screenshot Resizer"
echo "===================================="

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed or not in PATH"
    exit 1
fi

# Check if Pillow is installed
if ! python3 -c "import PIL" &> /dev/null; then
    echo "Installing Pillow (PIL) for image processing..."
    pip3 install Pillow || {
        echo "Error: Failed to install Pillow. Please install it manually:"
        echo "pip3 install Pillow"
        exit 1
    }
fi

# Navigate to the project root directory
cd "$(dirname "$0")/.." || exit 1

echo "Current directory: $(pwd)"
echo

# Run the Python script with default settings (fit method)
python3 scripts/resize_screenshots.py "$@"

echo
echo "Done! Your screenshots should now be 1280x800 and ready for Chrome Web Store submission." 