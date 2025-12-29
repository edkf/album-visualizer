const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');
const path = require('path');
const os = require('os');
require('dotenv').config();

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces by default

const LASTFM_API_KEY = process.env.LASTFM_API_KEY || '';
const LASTFM_ENDPOINT = 'https://ws.audioscrobbler.com/2.0/';

// Cache for Last.fm covers
const coverCache = new Map();
const coverCacheTTL = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Serve static files
app.use(express.static('static'));

// Helper function to run shell commands
async function runCommand(cmd) {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 2000 });
    return stdout.trim();
  } catch (error) {
    return '';
  }
}

// Get now playing information using media-control
async function getNowPlaying() {
  try {
    const output = await runCommand('media-control get');
    if (!output) {
      return { status: 'stopped' };
    }

    let data;
    try {
      data = JSON.parse(output);
    } catch (parseError) {
      // If media-control is not installed, it might return an error message
      if (output.includes('command not found') || output.includes('not found')) {
        console.error('media-control is not installed. Install it with: brew install media-control');
      } else {
        console.error('Error parsing media-control output:', output);
      }
      return { status: 'stopped' };
    }
    
    // Check if media is playing
    // media-control returns data when something is playing, empty/null when stopped
    // If we have title/artist, assume it's playing
    const hasMetadata = (data.title || data.artist);
    
    if (!hasMetadata) {
      return { status: 'stopped' };
    }

    const title = data.title || '';
    const artist = data.artist || '';
    const album = data.album || '';
    const bundleIdentifier = data.bundleIdentifier || '';
    
    // Handle artwork - media-control provides artworkData as base64
    // Convert directly to data URI, no need to save file
    let cover = '';
    if (data.artworkData) {
      try {
        const buffer = Buffer.from(data.artworkData, 'base64');
        // Determine MIME type from buffer
        let mimeType = 'image/jpeg';
        if (buffer[0] === 0x89 && buffer[1] === 0x50) mimeType = 'image/png';
        else if (buffer[0] === 0x47 && buffer[1] === 0x49) mimeType = 'image/gif';
        
        // Convert to data URI
        cover = `data:${mimeType};base64,${data.artworkData}`;
      } catch (error) {
        console.error('Error processing artwork:', error);
      }
    }

    // If no cover from media-control, try Last.fm
    if (!cover && title && artist) {
      cover = await lastfmCover(artist, title);
    }

    return {
      status: 'playing',
      title,
      artist,
      album,
      cover: cover || '',
      source: bundleIdentifier
    };
  } catch (error) {
    console.error('Error getting now playing:', error);
    return { status: 'stopped' };
  }
}

// Get Last.fm cover art
async function lastfmCover(artist, track) {
  if (!LASTFM_API_KEY) {
    return null;
  }

  const key = `${artist.toLowerCase()}|${track.toLowerCase()}`;
  const now = Date.now();
  const exp = coverCacheTTL.get(key) || 0;

  // Check cache
  if (now < exp && coverCache.has(key)) {
    return coverCache.get(key);
  }

  try {
    const params = {
      method: 'track.getInfo',
      api_key: LASTFM_API_KEY,
      artist: artist,
      track: track,
      format: 'json',
      autocorrect: 1
    };

    const response = await axios.get(LASTFM_ENDPOINT, { params, timeout: 3000 });
    const data = response.data;

    let images = null;
    if (data.track) {
      if (data.track.album && data.track.album.image) {
        images = data.track.album.image;
      } else if (data.track.image) {
        images = data.track.image;
      }
    }

    if (images) {
      // Try largest first
      for (const size of ['extralarge', 'mega', 'large', 'medium']) {
        for (const img of images) {
          if (img.size === size && img['#text']) {
            const url = img['#text'];
            coverCache.set(key, url);
            coverCacheTTL.set(key, now + CACHE_TTL);
            return url;
          }
        }
      }
      // Fallback: first with url
      for (const img of images) {
        if (img['#text']) {
          const url = img['#text'];
          coverCache.set(key, url);
          coverCacheTTL.set(key, now + CACHE_TTL);
          return url;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching Last.fm cover:', error);
    return null;
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

app.get('/api/now', async (req, res) => {
  const data = await getNowPlaying();
  res.json(data);
});

// No longer need /api/cover endpoint - images are served as data URIs directly

// Get local IP address for network access
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const server = app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log('\n🎵 Album Visualizer is running!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Local:    http://localhost:${PORT}`);
  console.log(`🌐 Network:  http://${localIP}:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 Make sure media-control is installed: brew install media-control\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' || error.code === 'EPERM') {
    console.error(`\n❌ Error: Port ${PORT} is already in use or requires permissions.`);
    console.error(`\nTry one of these solutions:`);
    console.error(`1. Use a different port: PORT=5001 npm start`);
    console.error(`2. Kill the process using port ${PORT}: lsof -ti:${PORT} | xargs kill`);
    console.error(`3. Or change PORT in your .env file\n`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

