# Google Maps List Filter

A browser extension that adds a powerful search and filter functionality to your saved places in Google Maps lists. Easily find specific restaurants, hotels, or attractions by searching through names, types, prices, or your personal notes.

![Extension in Action](assets/demo.gif)

*Your complete list of saved places with the filter UI in the top-right corner*

## ✨ Features

- 🔍 **Smart Search**: Filter places by name, type, price, or notes
- ❌ **Exclude Filtering**: Use `-word` syntax to exclude unwanted results  
- 🎯 **Real-time Filtering**: Results update as you type
- 🌍 **Diacritic Support**: Searches work with accented characters
- 🎨 **Clean UI**: Non-intrusive overlay that matches Google's design
- ⚡ **Auto-loading**: Automatically loads all places in long lists
- 📱 **Responsive**: Works seamlessly on different screen sizes
- 🖱️ **Draggable UI**: Move the search box so it never blocks Maps controls
- 🔄 **List Navigation**: Automatically reloads when switching between lists

## 🚀 Installation

### From Browser Extension Stores

**Chrome Web Store**
- Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/cbbcmnjjnjppiblignienleehdgffhim)
- Click "Add to Chrome"

**Firefox Add-ons** (Coming Soon)
- Visit the [Firefox Add-ons page](#)
- Click "Add to Firefox"

### Manual Installation (Developer Mode)

1. **Download the extension**
   ```bash
   git clone https://github.com/Sancerio/maps-filter-extension.git
   cd maps-filter-extension
   ```

2. **Chrome/Edge Installation**
   - Open `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode" 
   - Click "Load unpacked"
   - Select the extension folder

3. **Firefox Installation**
   - Open `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select `manifest.json` from the extension folder

## 🎯 Usage

1. **Open Google Maps** and navigate to any list of saved places
2. **Look for the search box** that appears in the top-right corner
3. **Start typing** to filter places by:
   - Place names (e.g., "pizza", "hotel")
   - Place types (e.g., "restaurant", "museum") 
   - Price ranges (e.g., "$", "$$$$")
   - Your personal notes

![Basic Filtering](images/screenshot-3-mount-filter.png)
*Filtering for "mount" shows all mountain-related places*

### Advanced Filtering with Exclusions

Use the `-` prefix to exclude specific terms from your results:

![Exclude Filtering](images/screenshot-1-exclude-demo.png)
*Searching "mount -laojun" shows mountain places but excludes Laojun Mountain*

### Example Searches
- `"coffee"` - Find all coffee shops
- `"restaurant -expensive"` - Restaurants but exclude expensive ones
- `"$$"` - Filter by price range
- `"romantic"` - Search your notes for romantic places
- `"museum -closed"` - Museums excluding any marked as closed
- `"mala -✅"` - Find mala places excluding completed ones

![Partial Match Filtering](images/screenshot-2-nex-filter.png)
*Even partial matches like "nex" will find relevant places*

## 🛠️ Development

### Prerequisites
- Node.js (optional, for development tools)
- A modern web browser
- Basic knowledge of JavaScript/CSS

### Setup
```bash
# Clone the repository
git clone https://github.com/Sancerio/maps-filter-extension.git
cd maps-filter-extension

# Install development dependencies (optional)
npm install

# Run tests
npm test

# Load the extension in developer mode (see Installation section)
```

### File Structure
```
maps-filter-extension/
├── manifest.json       # Extension configuration
├── content.js          # Main functionality
├── style.css          # UI styling
├── icons/             # Extension icons
│   ├── icon_16x16.png
│   ├── icon_48x48.png
│   └── icon_128x128.png
├── package.sh         # Version bump + packaging wrapper
├── scripts/           # Build and utility scripts
│   └── pack.sh        # Distribution packaging script
├── tests/             # Test suite
│   ├── unit/          # Unit tests
│   ├── e2e/           # End-to-end tests
│   └── fixtures/      # Test data
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

### Building for Distribution
```bash
# Make sure the package script is executable
chmod +x package.sh

# Create a distribution package (automatically bumps the version)
./package.sh
```

This creates a `google-maps-list-filter-v<version>.zip` file ready for store submission.

## 🧪 Testing

The extension includes comprehensive test coverage with both unit and end-to-end tests:

```bash
# Run all tests
npm test

# Run only unit tests
npm test tests/unit

# Run only E2E tests
npm test tests/e2e
```

The extension is tested for compatibility with various Google Maps list formats and handles:
- Dynamic content loading
- Different list layouts
- Various place information structures
- Real-time DOM changes
- List navigation and switching
- Exclude filtering functionality

### Manual Testing
1. Create a Google Maps list with diverse places
2. Add notes to some places
3. Test filtering by different criteria
4. Test exclude functionality with `-word` syntax
5. Verify results update in real-time
6. Test navigation between different lists

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### How to Contribute
1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
   ```bash
   npm test
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines
- Follow existing code style
- Test on multiple browsers when possible
- Add tests for new features
- Update documentation for new features
- Keep the UI minimal and non-intrusive

## 🐛 Known Issues & Limitations

- Works on any Google Maps domain, such as `google.co.uk/maps`
- Requires lists to be fully loaded (extension auto-loads them)
- Some very old Google Maps layouts may not be supported
- Auto-scroll only triggers for actual list content, not list overview pages

## 📝 Changelog

### Version 1.0.0
- Initial release
- Basic search and filter functionality
- Real-time filtering
- Diacritic support
- Auto-loading of list items
- Exclude filtering with `-word` syntax
- Smart list navigation detection
- Loading states and progress indicators
- Comprehensive test coverage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Maps for providing an extensible platform
- The open source community for inspiration and tools

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Sancerio/maps-filter-extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Sancerio/maps-filter-extension/discussions)
- **Email**: limiardi.dev@gmail.com

---

**Enjoy filtering your Google Maps lists!** ⭐  
If you find this extension helpful, please consider giving it a star on GitHub.

You can also support future updates and development:

[![Sponsor](https://img.shields.io/badge/sponsor-GitHub-lightgrey?logo=github)](https://github.com/sponsors/Sancerio)

