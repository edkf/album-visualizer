# Album Visualizer

A real-time music visualizer that displays album artwork and track information for currently playing music on macOS. The app automatically extracts colors from album covers to create dynamic, themed backgrounds.

## Requirements

- Node.js 16+
- macOS
- [media-control](https://github.com/ungive/media-control) installed via Homebrew

## Installation

1. **Install media-control:**
   ```bash
   brew install media-control
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up cover art fallback (optional):**
   - **Last.fm API** (default, requires API key)
     - Get a free API key from [Last.fm API](https://www.last.fm/api/account/create)
   - **iTunes API** (fallback, enabled by default, no API key needed)
   - Create a `.env` file in the project root:
     ```
     LASTFM_API_KEY=your_api_key_here
     USE_ITUNES=true
     PORT=5000
     ```

## Usage

1. **Start the application:**
   ```bash
   npm start
   ```

2. **Open your browser:**
   Navigate to `http://localhost:5000`

3. **Play some music** in any supported player (Spotify, Apple Music, etc.)

## Configuration

### Environment Variables

Create a `.env` file in the project root:
```
LASTFM_API_KEY=your_api_key_here
USE_ITUNES=true
PORT=5000
```

- `LASTFM_API_KEY` - Last.fm API key for cover art (recommended, tried first if configured)
- `USE_ITUNES` - Enable iTunes API as fallback (default: true, no API key needed)
- `PORT` - Server port (default: 5000)

## Troubleshooting

### No music detected
- Ensure `media-control` is installed: `brew install media-control`
- Check if `media-control get` returns information when music is playing
- Try restarting your music player

### Cover art not showing
- Verify Last.fm API key is set correctly in `.env` file
- Check browser console for errors
