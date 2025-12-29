
// Cache to track current track and avoid unnecessary requests
let currentTrackKey = null;
let lastFetchTime = 0;
const FETCH_INTERVAL = 3000; // Check every 3 seconds, but only fetch if changed

// Function to show/hide placeholder
function togglePlaceholder(show) {
  const placeholder = document.getElementById("cover-placeholder");
  
  if (show) {
    placeholder.classList.remove("hidden");
  } else {
    placeholder.classList.add("hidden");
  }
}

// Create a unique key for a track
function getTrackKey(data) {
  if (data.status !== "playing") {
    return "stopped";
  }
  return `${data.title || ""}|${data.artist || ""}|${data.album || ""}`.toLowerCase();
}

async function refresh() {
  try {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    
    // Only fetch if enough time has passed (to avoid too frequent requests)
    // or if we don't have a track key yet (first load)
    if (timeSinceLastFetch >= FETCH_INTERVAL || currentTrackKey === null) {
      const r = await fetch("/api/now", { cache: "no-store" });
      const data = await r.json();
      lastFetchTime = now;
      
      const newTrackKey = getTrackKey(data);
      
      // Only update UI if track changed
      if (newTrackKey !== currentTrackKey) {
        currentTrackKey = newTrackKey;
        updateUI(data);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

function updateUI(data) {
  const title = document.getElementById("title");
  const artist = document.getElementById("artist");
  const album = document.getElementById("album");
  const cover = document.getElementById("cover");
  const source = document.getElementById("source");

  if (data.status === "playing") {
      title.textContent = data.title || "Unknown title";
      artist.textContent = data.artist || "";
      album.textContent = data.album ? `Album: ${data.album}` : "";
      
      
      source.textContent = data.source ? `Source: ${data.source}` : "";
      
      // Handle cover image - now using data URIs directly
      if (data.cover) {
        // Show loading state
        togglePlaceholder(true);
        
        // Set cover directly (data URI or URL from Last.fm)
        // Clear src first to force reload if same image
        if (cover.src === data.cover) {
          cover.src = '';
          // Force reflow
          cover.offsetHeight;
        }
        cover.src = data.cover;
        // Ensure high quality rendering
        cover.loading = 'eager';
        cover.decoding = 'async';
        
        // Extract colors from the cover image
        extractColorsFromCover(data.cover);
        
        // Handle successful image load
        cover.onload = function() {
          togglePlaceholder(false);
        };
        
        // Handle image load errors
        cover.onerror = function() {
          console.log("Failed to load cover image:", cover.src);
          cover.src = "";
          togglePlaceholder(true);
          resetToDefaultColors();
        };
      } else {
        cover.src = "";
        togglePlaceholder(true);
        // Reset to default colors when no cover
        resetToDefaultColors();
      }
      cover.alt = data.title ? `Cover for ${data.title}` : "Album cover";
    } else {
      title.textContent = "Nothing playing";
      artist.textContent = "";
      album.textContent = "";
      source.textContent = "";
      cover.src = "";
      cover.alt = "Album cover";
      togglePlaceholder(true);
      resetToDefaultColors();
    }
}

// Extract colors from cover image and apply to background
async function extractColorsFromCover(coverUrl) {
  try {
    // coverUrl is now either a data URI or a URL from Last.fm
    const colors = await window.colorExtractor.extractColors(coverUrl, 3);
    if (colors && colors.length > 0) {
      applyColorsToBackground(colors);
    }
  } catch (error) {
    console.log('Failed to extract colors:', error);
    resetToDefaultColors();
  }
}

// Configuration for background darkening (adjust this value to change darkness level)
const BACKGROUND_DARKEN_PERCENT = 40; // 40% darker for better contrast

// Apply extracted colors to background
function applyColorsToBackground(colors) {
  // Use only the dominant color, darkened for better contrast
  const dominantColor = colors[0];
  const darkenedColor = window.colorExtractor.darkenColor(dominantColor, BACKGROUND_DARKEN_PERCENT);
  const solidColor = darkenedColor.hex;
  
  // Use the original dominant color for text contrast calculation
  const textColor = window.colorExtractor.getAccessibleTextColor(dominantColor);
  
  // Update CSS variables with solid color instead of gradient
  document.documentElement.style.setProperty('--bg-gradient', solidColor);
  document.documentElement.style.setProperty('--text-color', textColor);
  
  // Adjust text shadow based on text color
  const textShadow = textColor === '#000000' 
    ? '0 2px 4px rgba(255, 255, 255, 0.3)' 
    : '0 2px 4px rgba(0, 0, 0, 0.3)';
  document.documentElement.style.setProperty('--text-shadow', textShadow);
}

// Reset to default colors
function resetToDefaultColors() {
  document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
  document.documentElement.style.setProperty('--text-color', '#ffffff');
  document.documentElement.style.setProperty('--text-shadow', '0 2px 4px rgba(0, 0, 0, 0.3)');
}

refresh();
// Check every 2 seconds, but only fetch from API every 3 seconds (or when track changes)
setInterval(refresh, 2000);
