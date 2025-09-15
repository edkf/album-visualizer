# Album Visualizer

A real-time music visualizer that displays album artwork and track information for currently playing music. The app automatically extracts colors from album covers to create dynamic, themed backgrounds.

## Features

- 🎵 **Real-time music detection** - Automatically detects music playing from various players
- 🎨 **Dynamic color extraction** - Extracts dominant colors from album covers
- 🌈 **Adaptive theming** - Background colors change based on album artwork
- 📊 **Progress tracking** - Shows playback progress with smooth animations
- 🖼️ **Cover art support** - Displays album covers from local files or Last.fm API
- 🎯 **Multi-player support** - Works with Chromium, Chrome, Firefox, Spotify, and more

## Supported Music Players

- Chromium/Chrome/Brave/Vivaldi
- Firefox
- Spotify
- Any MPRIS-compatible player

## Requirements

- Python 3.7+
- Linux (uses `playerctl` for music detection)
- MPRIS-compatible music player

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/album-visualizer.git
   cd album-visualizer
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install playerctl (if not already installed):**
   ```bash
   # Ubuntu/Debian
   sudo apt install playerctl
   
   # Arch Linux
   sudo pacman -S playerctl
   
   # Fedora
   sudo dnf install playerctl
   ```

4. **Set up Last.fm API (optional, for cover art fallback):**
   - Get a free API key from [Last.fm API](https://www.last.fm/api/account/create)
   - Set the environment variable:
     ```bash
     export LASTFM_API_KEY=your_api_key_here
     ```

## Usage

1. **Start the application:**
   ```bash
   python app.py
   ```

2. **Open your browser:**
   Navigate to `http://localhost:5000`

3. **Play some music** in any supported player and watch the magic happen!

## How It Works

1. **Music Detection**: Uses `playerctl` to detect currently playing music from MPRIS-compatible players
2. **Metadata Extraction**: Gets track title, artist, album, and cover art URL
3. **Cover Art**: Displays album covers from local files or fetches from Last.fm API
4. **Color Extraction**: Analyzes album artwork to extract dominant colors
5. **Dynamic Theming**: Applies extracted colors to create themed backgrounds
6. **Progress Tracking**: Shows real-time playback progress with smooth animations

## API Endpoints

- `GET /` - Main application interface
- `GET /api/now` - Current playing track information
- `GET /api/cover?path=<file_path>` - Serves local cover art files

## Configuration

### Environment Variables

- `LASTFM_API_KEY` - Last.fm API key for cover art fallback (optional)

### Player Priority

The app checks players in this order of preference:
1. Chromium/Chrome variants
2. Firefox
3. Spotify
4. Other MPRIS players

## Troubleshooting

### No music detected
- Ensure your music player supports MPRIS
- Check if `playerctl -l` shows your player
- Try restarting your music player

### Cover art not showing
- Check if the local file path exists
- Verify Last.fm API key is set correctly
- Check browser console for errors

### Colors not extracting
- Ensure the cover image loads successfully
- Check browser console for CORS or loading errors

## Development

### Project Structure
```
album-visualizer/
├── app.py              # Flask backend
├── static/
│   ├── index.html      # Main interface
│   ├── script.js       # Frontend logic
│   ├── styles.css      # Styling
│   └── color-utils.js  # Color extraction utilities
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

### Adding New Features
- Backend logic: Modify `app.py`
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
- [MPRIS](https://specifications.freedesktop.org/mpris-spec/latest/) for music player integration
- [playerctl](https://github.com/altdesktop/playerctl) for music player control
