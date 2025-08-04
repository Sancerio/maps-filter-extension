# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install development dependencies
npm install

# Run all tests (unit + E2E)
npm test

# Run specific test suites
npm test tests/unit      # Unit tests only
npm test tests/e2e       # E2E tests only

# Create distribution package (bumps version automatically)
chmod +x package.sh
./package.sh
```

## Architecture Overview

This is a browser extension for filtering Google Maps saved places lists. The core architecture consists of:

### Main Components
- **content.js** - Main content script that injects filtering functionality into Google Maps pages
- **style.css** - Styling for the filter UI overlay
- **manifest.json** - Extension configuration supporting Manifest V3 with extensive Google Maps domain coverage

### Key Functionality
- **Text Extraction**: Uses `extractAllText()` with TreeWalker to recursively collect all text from DOM elements including alt text, aria labels, and textarea values
- **Diacritic Normalization**: `removeDiacritics()` normalizes Unicode characters for better search matching
- **Exclude Filtering**: Supports `-word` syntax to exclude specific terms from search results
- **Auto-loading**: Automatically loads all places in long lists via `observeListChanges()` with MutationObserver
- **Persistent UI State**: Draggable search box with position saved via Chrome storage API
- **List Navigation Detection**: Tracks list changes and reloads filter UI accordingly

### Testing Architecture
- **Jest Configuration**: Uses Node environment with 30s timeout for async operations
- **Unit Tests**: Test core filtering logic in isolation with JSDOM
- **E2E Tests**: Puppeteer-based tests that interact with actual Google Maps pages
- **Test Fixtures**: Mock HTML structures in `tests/fixtures/` simulate Google Maps DOM

### Extension Patterns
- Content script injection across 40+ Google Maps domains
- Chrome storage permissions for UI state persistence  
- Mutation observers for dynamic content handling
- Real-time DOM manipulation without disrupting Google Maps functionality

The extension operates entirely as a content script overlay without requiring background scripts or external APIs.