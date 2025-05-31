#!/bin/bash

# Google Maps List Filter Extension - Packaging Script
# This script creates a clean package for browser extension stores

set -e  # Exit on any error

# Configuration
EXTENSION_NAME="google-maps-list-filter"
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
OUTPUT_DIR="dist"
PACKAGE_NAME="${EXTENSION_NAME}-v${VERSION}.zip"

echo "📦 Packaging Google Maps List Filter Extension v${VERSION}"

# Clean and create output directory
if [ -d "$OUTPUT_DIR" ]; then
    echo "🧹 Cleaning existing dist directory..."
    rm -rf "$OUTPUT_DIR"
fi

mkdir -p "$OUTPUT_DIR"

echo "📋 Copying necessary files..."

# Copy essential extension files
cp manifest.json "$OUTPUT_DIR/"
cp content.js "$OUTPUT_DIR/"
cp style.css "$OUTPUT_DIR/"

# Copy icon files (check if they exist)
for icon in icon_16x16.png icon_48x48.png icon_128x128.png; do
    if [ -f "$icon" ]; then
        cp "$icon" "$OUTPUT_DIR/"
        echo "✅ Copied $icon"
    else
        echo "⚠️  Warning: $icon not found - you may need to add this file"
    fi
done

# Copy README if it exists
if [ -f "README.md" ]; then
    cp README.md "$OUTPUT_DIR/"
    echo "✅ Copied README.md"
fi

# Create zip package
echo "🗜️  Creating zip package..."
cd "$OUTPUT_DIR"
zip -r "../$PACKAGE_NAME" ./*
cd ..

echo "✨ Package created successfully!"
echo "📁 Package location: $PACKAGE_NAME"
echo "📊 Package size: $(du -h "$PACKAGE_NAME" | cut -f1)"

# List contents for verification
echo ""
echo "📋 Package contents:"
unzip -l "$PACKAGE_NAME"

echo ""
echo "🚀 Ready for upload to browser extension stores!"
echo "   • Chrome Web Store: https://chrome.google.com/webstore/devconsole"
echo "   • Firefox Add-ons: https://addons.mozilla.org/developers/"
echo "   • Edge Add-ons: https://partner.microsoft.com/dashboard/microsoftedge" 