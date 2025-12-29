/**
 * Album Visualizer Server
 * 
 * Express server that provides real-time music information from macOS media players.
 * Uses media-control to detect currently playing music and fetches album artwork
 * from Last.fm, iTunes, or media-control itself.
 */

const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');
const path = require('path');
const os = require('os');
require('dotenv').config();

// Convert exec to promise-based for async/await usage
const execAsync = promisify(exec);

// Initialize Express app
const app = express();

// Server configuration
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces by default for network access

// Last.fm API configuration
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || '';
const LASTFM_ENDPOINT = 'https://ws.audioscrobbler.com/2.0/';

// iTunes API configuration
const ITUNES_ENDPOINT = 'https://itunes.apple.com/search';
const USE_ITUNES = process.env.USE_ITUNES !== 'false'; // Enabled by default

// Cover art cache to avoid repeated API calls
// Maps: cacheKey -> imageUrl
const coverCache = new Map();
// TTL cache to track when cached entries expire
// Maps: cacheKey -> expirationTimestamp
const coverCacheTTL = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Serve static files from the 'static' directory
app.use(express.static('static'));

/**
 * Execute a shell command and return the output
 * @param {string} cmd - Command to execute
 * @returns {Promise<string>} - Command output or empty string on error
 */
async function runCommand(cmd) {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 2000 });
    return stdout.trim();
  } catch (error) {
    return '';
  }
}

/**
 * Get currently playing track information from media-control
 * Fetches metadata and artwork from various sources in priority order:
 * 1. Last.fm API (if configured)
 * 2. iTunes API (fallback)
 * 3. media-control artworkData (last resort)
 * 
 * @returns {Promise<Object>} - Track information with status, title, artist, album, cover, etc.
 */
async function getNowPlaying() {
  try {
    // Execute media-control command to get current track info
    const output = await runCommand('media-control get');
    if (!output) {
      return { status: 'stopped' };
    }

    // Parse JSON response from media-control
    let data;
    try {
      data = JSON.parse(output);
    } catch (parseError) {
      // Handle cases where media-control is not installed or returns error
      if (output.includes('command not found') || output.includes('not found')) {
        console.error('media-control is not installed. Install it with: brew install media-control');
      } else {
        console.error('Error parsing media-control output:', output);
      }
      return { status: 'stopped' };
    }
    
    // Check if media is currently playing
    // media-control returns data when something is playing, empty/null when stopped
    // If we have title/artist, assume it's playing
    const hasMetadata = (data.title || data.artist);
    
    if (!hasMetadata) {
      return { status: 'stopped' };
    }

    // Extract track metadata
    const title = data.title || '';
    const artist = data.artist || '';
    const album = data.album || '';
    const bundleIdentifier = data.bundleIdentifier || ''; // e.g., "com.spotify.client"
    
    // Handle artwork - prioritize Last.fm, then iTunes, then media-control
    let cover = '';
    let coverSource = '';
    
    // Priority 1: Try Last.fm first (if API key is configured)
    // Last.fm usually has high-quality album artwork
    if (title && artist && LASTFM_API_KEY) {
      cover = await lastfmCover(artist, title);
      if (cover) {
        coverSource = 'Last.fm';
        console.log(`[Cover] Using Last.fm for: ${artist} - ${title}`);
      }
    }
    
    // Priority 2: Fallback to iTunes if Last.fm didn't return a cover
    // iTunes has good coverage and no API key required
    if (!cover && title && artist && USE_ITUNES) {
      cover = await itunesCover(artist, album || title);
      if (cover) {
        coverSource = 'iTunes';
        console.log(`[Cover] Using iTunes for: ${artist} - ${title}`);
      }
    }
    
    // Priority 3: Last resort - use media-control artworkData if available
    // This is base64 encoded image data directly from the media player
    if (!cover && data.artworkData) {
      try {
        const buffer = Buffer.from(data.artworkData, 'base64');
        
        // Determine MIME type from file signature (magic bytes)
        let mimeType = 'image/jpeg';
        if (buffer[0] === 0x89 && buffer[1] === 0x50) mimeType = 'image/png'; // PNG signature
        else if (buffer[0] === 0x47 && buffer[1] === 0x49) mimeType = 'image/gif'; // GIF signature
        
        // Convert base64 to data URI for direct use in HTML
        cover = `data:${mimeType};base64,${data.artworkData}`;
        coverSource = 'media-control';
        console.log(`[Cover] Using media-control for: ${artist} - ${title}`);
      } catch (error) {
        console.error('Error processing artwork:', error);
      }
    }
    
    // Log if no cover was found
    if (!cover && title && artist) {
      console.log(`[Cover] No cover found for: ${artist} - ${title}`);
    }

    // Return track information
    return {
      status: 'playing',
      title,
      artist,
      album,
      cover: cover || '',
      source: bundleIdentifier,
      coverSource: coverSource
    };
  } catch (error) {
    console.error('Error getting now playing:', error);
    return { status: 'stopped' };
  }
}

/**
 * Fetch album artwork from iTunes API
 * Searches for album by artist and album name, then requests high-quality version
 * 
 * @param {string} artist - Artist name
 * @param {string} album - Album name
 * @returns {Promise<string|null>} - High-quality artwork URL or null if not found
 */
async function itunesCover(artist, album) {
  if (!artist || !album) {
    return null;
  }

  // Create cache key for this artist/album combination
  const key = `itunes:${artist.toLowerCase()}|${album.toLowerCase()}`;
  const now = Date.now();
  const exp = coverCacheTTL.get(key) || 0;

  // Check if we have a cached result that hasn't expired
  if (now < exp && coverCache.has(key)) {
    return coverCache.get(key);
  }

  try {
    // Build search query: artist + album name
    const searchTerm = encodeURIComponent(`${artist} ${album}`);
    const url = `${ITUNES_ENDPOINT}?term=${searchTerm}&entity=album&limit=1`;
    
    // Fetch from iTunes API
    const response = await axios.get(url, { timeout: 3000 });
    const data = response.data;

    if (data.results && data.results.length > 0) {
      const albumData = data.results[0];
      
      // iTunes provides artworkUrl60 (60x60) and artworkUrl100 (100x100)
      // We can request larger sizes by modifying the URL
      const artworkUrl = albumData.artworkUrl100 || albumData.artworkUrl60;
      
      if (artworkUrl) {
        // Try multiple strategies to get the highest quality (up to 2000x2000)
        // Strategy 1: Replace size parameter with 2000x2000bb (maximum iTunes supports)
        let highQualityUrl = artworkUrl.replace(/\/(\d+)x(\d+)bb\.(jpg|png|gif)/i, '/2000x2000bb.$3');
        
        // Strategy 2: If that didn't work, try without 'bb' suffix
        if (highQualityUrl === artworkUrl) {
          highQualityUrl = artworkUrl.replace(/\/(\d+)x(\d+)\.(jpg|png|gif)/i, '/2000x2000.$3');
        }
        
        // Strategy 3: Try extracting base URL pattern and reconstructing with max size
        if (highQualityUrl === artworkUrl) {
          // iTunes URL pattern: https://isX-ssl.mzstatic.com/image/thumb/.../source/2000x2000bb.jpg
          const baseMatch = artworkUrl.match(/^(https:\/\/is\d+-ssl\.mzstatic\.com\/image\/thumb\/[^\/]+\/[^\/]+\/)(\d+x\d+bb\.)(jpg|png|gif)$/i);
          if (baseMatch) {
            highQualityUrl = baseMatch[1] + '2000x2000bb.' + baseMatch[3];
          }
        }
        
        // Cache the high-quality URL
        coverCache.set(key, highQualityUrl);
        coverCacheTTL.set(key, now + CACHE_TTL);
        
        console.log(`[iTunes] Original: ${artworkUrl}`);
        console.log(`[iTunes] High quality: ${highQualityUrl}`);
        return highQualityUrl;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching iTunes cover:', error);
    return null;
  }
}

/**
 * Fetch album artwork from Last.fm API
 * Tries album.getInfo first (usually better quality), then track.getInfo as fallback
 * Attempts to get the largest available image size
 * 
 * @param {string} artist - Artist name
 * @param {string} track - Track name (used as album name fallback)
 * @returns {Promise<string|null>} - High-quality artwork URL or null if not found
 */
async function lastfmCover(artist, track) {
  if (!LASTFM_API_KEY) {
    return null;
  }

  // Create cache key for this artist/track combination
  const key = `${artist.toLowerCase()}|${track.toLowerCase()}`;
  const now = Date.now();
  const exp = coverCacheTTL.get(key) || 0;

  // Check if we have a cached result that hasn't expired
  if (now < exp && coverCache.has(key)) {
    return coverCache.get(key);
  }

  try {
    // Strategy 1: Try album.getInfo first (usually has better quality images)
    let params = {
      method: 'album.getInfo',
      api_key: LASTFM_API_KEY,
      artist: artist,
      album: track, // Use track name as album name fallback
      format: 'json',
      autocorrect: 1 // Allow Last.fm to autocorrect artist/track names
    };

    let response = await axios.get(LASTFM_ENDPOINT, { params, timeout: 3000 });
    let data = response.data;
    let images = null;

    // Extract images from album data
    if (data.album && data.album.image) {
      images = data.album.image;
    }

    // Strategy 2: If album.getInfo didn't work, try track.getInfo
    if (!images || images.length === 0) {
      params = {
        method: 'track.getInfo',
        api_key: LASTFM_API_KEY,
        artist: artist,
        track: track,
        format: 'json',
        autocorrect: 1
      };

      response = await axios.get(LASTFM_ENDPOINT, { params, timeout: 3000 });
      data = response.data;

      // Extract images from track data
      if (data.track) {
        if (data.track.album && data.track.album.image) {
          images = data.track.album.image;
        } else if (data.track.image) {
          images = data.track.image;
        }
      }
    }

    if (images) {
      // Last.fm image sizes (from smallest to largest):
      // small (34x34), medium (64x64), large (174x174), extralarge (300x300), mega (varies, usually 300x300 to 600x600)
      // Try largest first
      for (const size of ['mega', 'extralarge', 'large', 'medium']) {
        for (const img of images) {
          if (img.size === size && img['#text']) {
            let url = img['#text'];
            
            // Try multiple strategies to get the highest quality
            // Strategy 1: Remove size parameters to get original (larger) version
            let bestUrl = url.replace(/\/\d+[sm]\.(jpg|png|gif)$/i, '/.$1')
                             .replace(/\/\d+x\d+\.(jpg|png|gif)$/i, '/.$1')
                             .replace(/\/\d+[sm]\.(jpg|png|gif)$/i, '/.$1');
            
            // Strategy 2: Try to get larger size by replacing size pattern
            if (bestUrl === url || bestUrl.includes('undefined')) {
              // Last.fm URL patterns: .../174s/... or .../300x300/... or .../avatar170s/...
              // Try to get the largest available by removing size constraints
              bestUrl = url.replace(/\/(\d+)[sm]\.(jpg|png|gif)$/i, '/.$2')
                          .replace(/\/(\d+)x(\d+)\.(jpg|png|gif)$/i, '/.$3');
            }
            
            // Strategy 3: If URL has size in path, try removing it
            if (bestUrl === url || bestUrl.includes('undefined')) {
              bestUrl = url.replace(/\/avatar\d+[sm]/, '')
                          .replace(/\/\d+[sm]\//, '/')
                          .replace(/\/\d+x\d+\//, '/');
            }
            
            // Use the best URL we found, or fallback to original
            const finalUrl = (bestUrl && bestUrl !== url && !bestUrl.includes('undefined')) ? bestUrl : url;
            
            // Cache the result
            coverCache.set(key, finalUrl);
            coverCacheTTL.set(key, now + CACHE_TTL);
            
            console.log(`[Last.fm] Found ${size} image`);
            console.log(`[Last.fm] Original: ${url}`);
            console.log(`[Last.fm] Optimized: ${finalUrl}`);
            return finalUrl;
          }
        }
      }
      
      // Fallback: use first available image
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

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Serve the main application page
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

/**
 * API endpoint to get currently playing track information
 * Returns JSON with track metadata and cover art URL
 */
app.get('/api/now', async (req, res) => {
  const data = await getNowPlaying();
  res.json(data);
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

/**
 * Get the local IP address for network access
 * Used to display network URL in startup message
 * @returns {string} - Local IP address or 'localhost'
 */
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

// Start the server
const server = app.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log('\n🎵 Album Visualizer is running!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Local:    http://localhost:${PORT}`);
  console.log(`🌐 Network:  http://${localIP}:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 Make sure media-control is installed: brew install media-control\n');
});

// Handle server errors
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
