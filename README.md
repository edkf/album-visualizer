# Album Visualizer

A real-time music visualizer that displays album artwork and track information for currently playing music on macOS. The app automatically extracts colors from album covers to create dynamic, themed backgrounds.

## Features

- 🎵 **Real-time music detection** - Automatically detects music playing from various players
- 🎨 **Dynamic color extraction** - Extracts dominant colors from album covers
- 🌈 **Adaptive theming** - Background colors change based on album artwork
- 📊 **Progress tracking** - Shows playback progress with smooth animations
- 🖼️ **Cover art support** - Displays album covers from media-control or Last.fm API
- 🎯 **Multi-player support** - Works with Spotify, Apple Music, and other macOS media players

## Supported Music Players

- Spotify
- Apple Music
- Any macOS media player supported by [media-control](https://github.com/ungive/media-control)

## Requirements

- Node.js 16+ 
- macOS (uses `media-control` for music detection)
- [media-control](https://github.com/ungive/media-control) installed via Homebrew

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/album-visualizer.git
   cd album-visualizer
   ```

2. **Install media-control:**
   ```bash
   brew install media-control
   ```
   
   Verify it's working:
   ```bash
   media-control get
   ```

3. **Install Node.js (if not already installed):**
   Make sure you have Node.js 16+ installed:
   ```bash
   node --version
   ```
   
   If not, install via Homebrew:
   ```bash
   brew install node
   ```

4. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

5. **Set up Last.fm API (optional, for cover art fallback):**
   - Get a free API key from [Last.fm API](https://www.last.fm/api/account/create)
     - Visit: https://www.last.fm/api/account/create
     - Create a free account if you don't have one
     - Create a new application
     - Copy the API Key
   - Create a `.env` file in the project root:
     ```bash
     LASTFM_API_KEY=your_api_key_here
     PORT=5000
     ```

## Usage

1. **Start the application:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   Navigate to `http://localhost:5000`

3. **Play some music** in any supported player and watch the magic happen!

## How It Works

1. **Music Detection**: Uses `media-control` to detect currently playing music on macOS
2. **Metadata Extraction**: Gets track title, artist, album, and cover art (base64 encoded)
3. **Cover Art**: Displays album covers from media-control or fetches from Last.fm API as fallback
4. **Color Extraction**: Analyzes album artwork to extract dominant colors
5. **Dynamic Theming**: Applies extracted colors to create themed backgrounds
6. **Progress Tracking**: Shows real-time playback progress with smooth animations

## API Endpoints

- `GET /` - Main application interface
- `GET /api/now` - Current playing track information (returns data URI for artwork or Last.fm URL)

## Configuration

### Environment Variables

Create a `.env` file in the project root:
```
LASTFM_API_KEY=your_api_key_here
PORT=5000
```

- `LASTFM_API_KEY` - Last.fm API key for cover art fallback (optional)
- `PORT` - Server port (default: 5000)

## Troubleshooting

### media-control not found
```bash
# Check if it's installed
which media-control

# If not, install it again
brew install media-control
```

### No music detected
- Ensure `media-control` is installed: `brew install media-control`
- Check if `media-control get` returns information when music is playing
- Make sure music is playing
- Test manually: `media-control get`
- Verify that your player is supported by media-control
- Try restarting your music player

### Cover art not showing
- Verify Last.fm API key is set correctly in `.env` file
- Check if the `.env` file is configured correctly
- Test the Last.fm API manually
- Check browser console for errors
- Check server logs for errors
- Ensure media-control is returning artwork data

### Colors not extracting
- Ensure the cover image loads successfully
- Check browser console for CORS or loading errors

## Development

### Project Structure
```
album-visualizer/
├── server.js           # Express backend
├── package.json        # Node.js dependencies
├── static/
│   ├── index.html      # Main interface
│   ├── script.js       # Frontend logic
│   ├── styles.css      # Styling
│   └── color-utils.js  # Color extraction utilities
└── README.md          # This file
```

### Adding New Features
- Backend logic: Modify `server.js`
- Frontend: Update files in `static/`
- Color extraction: Extend `color-utils.js`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [Last.fm API](https://www.last.fm/api) for cover art fallback
- [media-control](https://github.com/ungive/media-control) for macOS music player integration
