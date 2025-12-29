/**
 * Main Application Entry Point
 * 
 * Orchestrates the application by coordinating state management,
 * UI updates, and theme management. Polls the API periodically
 * and updates the UI only when the track changes.
 */

// Initialize managers
const stateCache = new StateCache();
const uiUpdater = new UIUpdater(stateCache);
const themeManager = new ThemeManager();

/**
 * Refresh function - fetches current track info and updates UI
 * Only makes API calls when necessary (track changed or time interval passed)
 * Only updates UI when track actually changes
 */
async function refresh() {
  try {
    // Check if we should fetch (enough time passed or first load)
    if (!stateCache.shouldFetch()) {
      return;
    }

    // Fetch current track information from API
    const r = await fetch("/api/now", { cache: "no-store" });
    const data = await r.json();
    
    // Update fetch timestamp
    stateCache.updateFetchTime();
    
    // Generate track key to detect changes
    const newTrackKey = stateCache.getTrackKey(data);
    
    // Only update UI if track has changed
    if (stateCache.hasTrackChanged(newTrackKey)) {
      stateCache.updateTrackKey(newTrackKey);
      
      // Update UI with new track data
      uiUpdater.updateUI(
        data,
        // Callback to extract colors when cover changes
        (coverUrl) => themeManager.extractColorsFromCover(coverUrl),
        // Callback to reset colors when stopped
        () => themeManager.resetToDefaultColors()
      );
    }
  } catch (e) {
    console.error(e);
  }
}

// Initialize: fetch immediately on page load
refresh();

// Poll API every 2 seconds (but only fetch every 3 seconds due to FETCH_INTERVAL)
setInterval(refresh, 2000);
