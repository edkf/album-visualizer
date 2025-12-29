/**
 * UIUpdater - Handles all DOM updates for the application
 * 
 * Manages updating text elements, cover images, and UI state.
 * Only updates DOM elements when values actually change to avoid
 * unnecessary reflows and improve performance.
 */
class UIUpdater {
  constructor(stateCache) {
    this.cache = stateCache;
  }

  /**
   * Show or hide the loading placeholder for the cover image
   * @param {boolean} show - True to show placeholder, false to hide
   */
  togglePlaceholder(show) {
    const placeholder = document.getElementById("cover-placeholder");
    if (show) {
      placeholder.classList.remove("hidden");
    } else {
      placeholder.classList.add("hidden");
    }
  }

  /**
   * Update text elements (title, artist, album, source) in the UI
   * Only updates if the value has changed to avoid unnecessary DOM operations
   * @param {Object} data - Track data from API
   */
  updateTextElements(data) {
    const title = document.getElementById("title");
    const artist = document.getElementById("artist");
    const album = document.getElementById("album");
    const source = document.getElementById("source");

    // Prepare new values
    const newTitle = data.title || "Unknown title";
    const newArtist = data.artist || "";
    const newAlbum = data.album ? `Album: ${data.album}` : "";
    
    // Build source text showing player and cover source
    let sourceText = "";
    if (data.source) {
      sourceText = `Player: ${data.source}`;
      if (data.coverSource) {
        sourceText += ` | Cover: ${data.coverSource}`;
      }
    } else if (data.coverSource) {
      sourceText = `Cover: ${data.coverSource}`;
    }
    const newSource = sourceText;

    // Update title only if changed
    if (this.cache.currentTitle !== newTitle) {
      title.textContent = newTitle;
      this.cache.currentTitle = newTitle;
    }
    
    // Update artist only if changed
    if (this.cache.currentArtist !== newArtist) {
      artist.textContent = newArtist;
      this.cache.currentArtist = newArtist;
    }
    
    // Update album only if changed
    if (this.cache.currentAlbum !== newAlbum) {
      album.textContent = newAlbum;
      this.cache.currentAlbum = newAlbum;
    }
    
    // Update source only if changed
    if (this.cache.currentSource !== newSource) {
      source.textContent = newSource;
      this.cache.currentSource = newSource;
    }
  }

  /**
   * Update the cover image in the UI
   * Handles loading states, error handling, and triggers color extraction
   * @param {Object} data - Track data from API
   * @param {Function} onColorExtract - Callback to extract colors from the cover
   */
  updateCoverImage(data, onColorExtract) {
    const cover = document.getElementById("cover");
    const newTitle = data.title || "Unknown title";

    if (data.cover) {
      // Only update if the cover URL has changed
      if (this.cache.currentCoverUrl !== data.cover) {
        this.cache.currentCoverUrl = data.cover;
        
        // Show loading placeholder
        this.togglePlaceholder(true);
        
        // Set cover image source (data URI or URL)
        cover.src = data.cover;
        cover.loading = 'eager'; // Load immediately, don't lazy load
        cover.decoding = 'async'; // Decode asynchronously for better performance
        
        // Extract colors only once per image
        if (this.cache.lastExtractedCoverUrl !== data.cover) {
          this.cache.lastExtractedCoverUrl = data.cover;
          onColorExtract(data.cover);
        }
        
        // Handle successful image load
        cover.onload = () => {
          this.togglePlaceholder(false);
        };
        
        // Handle image load errors
        cover.onerror = () => {
          console.log("Failed to load cover image:", cover.src);
          cover.src = "";
          this.cache.currentCoverUrl = null;
          this.togglePlaceholder(true);
        };
      }
    } else {
      // No cover available - clear image if we had one before
      if (this.cache.currentCoverUrl) {
        cover.src = "";
        this.cache.currentCoverUrl = null;
        this.cache.lastExtractedCoverUrl = null;
        this.togglePlaceholder(true);
      }
    }
    
    // Update alt text for accessibility
    const newAlt = data.status === "playing" ? `Cover for ${newTitle}` : "Album cover";
    if (cover.alt !== newAlt) {
      cover.alt = newAlt;
    }
  }

  /**
   * Update UI to show "stopped" state when no music is playing
   * Only updates if we're not already in stopped state
   */
  updateStoppedState() {
    // Skip if already in stopped state
    if (this.cache.currentStatus === "stopped") {
      return;
    }

    const title = document.getElementById("title");
    const artist = document.getElementById("artist");
    const album = document.getElementById("album");
    const source = document.getElementById("source");
    const cover = document.getElementById("cover");

    // Update title to "Nothing playing"
    if (this.cache.currentTitle !== "Nothing playing") {
      title.textContent = "Nothing playing";
      this.cache.currentTitle = "Nothing playing";
    }
    
    // Clear artist
    if (this.cache.currentArtist !== "") {
      artist.textContent = "";
      this.cache.currentArtist = "";
    }
    
    // Clear album
    if (this.cache.currentAlbum !== "") {
      album.textContent = "";
      this.cache.currentAlbum = "";
    }
    
    // Clear source
    if (this.cache.currentSource !== "") {
      source.textContent = "";
      this.cache.currentSource = "";
    }
    
    // Clear cover image
    if (this.cache.currentCoverUrl) {
      cover.src = "";
      this.cache.currentCoverUrl = null;
      this.cache.lastExtractedCoverUrl = null;
      this.togglePlaceholder(true);
    }
    
    // Update alt text
    if (cover.alt !== "Album cover") {
      cover.alt = "Album cover";
    }
    
    // Mark as stopped
    this.cache.currentStatus = "stopped";
  }

  /**
   * Main UI update function - orchestrates all UI updates
   * @param {Object} data - Track data from API
   * @param {Function} onColorExtract - Callback to extract colors from cover
   * @param {Function} onResetColors - Callback to reset colors to default
   */
  updateUI(data, onColorExtract, onResetColors) {
    if (data.status === "playing") {
      // Update UI for playing state
      this.updateTextElements(data);
      this.updateCoverImage(data, onColorExtract);
    } else {
      // Update UI for stopped state
      this.updateStoppedState();
      onResetColors();
    }
  }
}
