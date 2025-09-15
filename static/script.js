// Global variables for smooth progress animation
let currentPosition = 0;
let currentLength = 0;
let lastUpdateTime = 0;
let progressAnimationId = null;

// Smooth progress bar animation
function animateProgress() {
  if (currentLength > 0) {
    const now = Date.now();
    const timeDiff = (now - lastUpdateTime) / 1000; // seconds
    
    // Update position based on elapsed time
    currentPosition += timeDiff;
    lastUpdateTime = now;
    
    const progress = (currentPosition / currentLength) * 100;
    const progressBar = document.getElementById("progress-bar");
    
    if (progressBar) {
      progressBar.style.width = `${Math.min(progress, 100)}%`;
    }
    
    // Continue animation if still playing
    if (progress < 100) {
      progressAnimationId = requestAnimationFrame(animateProgress);
    }
  }
}

async function refresh() {
  try {
    const r = await fetch("/api/now", { cache: "no-store" });
    const data = await r.json();
    const title = document.getElementById("title");
    const artist = document.getElementById("artist");
    const album = document.getElementById("album");
    const cover = document.getElementById("cover");
    const source = document.getElementById("source");

    if (data.status === "playing") {
      title.textContent = data.title || "Unknown title";
      artist.textContent = data.artist || "";
      album.textContent = data.album ? `Album: ${data.album}` : "";
      
      // Update progress bar with smooth animation
      if (data.position !== undefined && data.length !== undefined && data.length > 0) {
        // Stop current animation
        if (progressAnimationId) {
          cancelAnimationFrame(progressAnimationId);
        }
        
        // Update current values
        currentPosition = data.position;
        currentLength = data.length;
        lastUpdateTime = Date.now();
        
        // Start smooth animation
        animateProgress();
      } else {
        currentPosition = 0;
        currentLength = 0;
        const progressBar = document.getElementById("progress-bar");
        if (progressBar) {
          progressBar.style.width = "0%";
        }
      }
      
      source.textContent = data.source ? `Source: ${data.source}` : "";
      
      // Handle cover image - convert file:// URLs to our API endpoint
      if (data.cover) {
        if (data.cover.startsWith('file://')) {
          cover.src = `/api/cover?path=${encodeURIComponent(data.cover)}`;
        } else {
          cover.src = data.cover;
        }
        
        // Extract colors from the cover image
        extractColorsFromCover(data.cover);
      } else {
        cover.src = "";
        // Reset to default colors when no cover
        resetToDefaultColors();
      }
      cover.alt = data.title ? `Cover for ${data.title}` : "Album cover";
      
      // Handle image load errors
      cover.onerror = function() {
        console.log("Failed to load cover image:", cover.src);
        cover.src = "";
        resetToDefaultColors();
      };
    } else {
      title.textContent = "Nothing playing";
      artist.textContent = "";
      album.textContent = "";
      source.textContent = "";
      cover.src = "";
      cover.alt = "Album cover";
      resetToDefaultColors();
      
      // Stop progress animation
      if (progressAnimationId) {
        cancelAnimationFrame(progressAnimationId);
        progressAnimationId = null;
      }
      currentPosition = 0;
      currentLength = 0;
      const progressBar = document.getElementById("progress-bar");
      if (progressBar) {
        progressBar.style.width = "0%";
      }
    }
  } catch (e) {
    console.error(e);
  }
}

// Extract colors from cover image and apply to background
async function extractColorsFromCover(coverUrl) {
  try {
    // Use the actual cover URL for color extraction
    let imageUrl = coverUrl;
    if (coverUrl.startsWith('file://')) {
      imageUrl = `/api/cover?path=${encodeURIComponent(coverUrl)}`;
    }
    
    const colors = await window.colorExtractor.extractColors(imageUrl, 3);
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
setInterval(refresh, 2000);
