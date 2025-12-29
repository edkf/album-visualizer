/**
 * StateCache - Manages application state and caching
 * 
 * Tracks the current playing track and UI state to avoid unnecessary
 * API calls and DOM updates. Only fetches new data when the track changes
 * or enough time has passed.
 */
class StateCache {
  constructor() {
    // Current track identification
    this.currentTrackKey = null; // Unique key for current track (title|artist|album)
    
    // Fetch timing control
    this.lastFetchTime = 0; // Timestamp of last API fetch
    this.FETCH_INTERVAL = 3000; // Minimum time between fetches (3 seconds)
    
    // UI state cache - tracks current values to avoid unnecessary DOM updates
    this.currentCoverUrl = null; // Current cover image URL
    this.currentTitle = null; // Current track title
    this.currentArtist = null; // Current artist name
    this.currentAlbum = null; // Current album name
    this.currentSource = null; // Current player/source info
    this.currentStatus = null; // Current playback status ('playing' or 'stopped')
    
    // Color extraction cache
    this.lastExtractedCoverUrl = null; // Last cover URL we extracted colors from
  }

  /**
   * Generate a unique key for a track based on its metadata
   * Used to detect when the track changes
   * @param {Object} data - Track data from API
   * @returns {string} - Unique track key
   */
  getTrackKey(data) {
    if (data.status !== "playing") {
      return "stopped";
    }
    return `${data.title || ""}|${data.artist || ""}|${data.album || ""}`.toLowerCase();
  }

  /**
   * Check if we should fetch new data from the API
   * Returns true if enough time has passed or if we don't have a track key yet
   * @returns {boolean} - True if we should fetch
   */
  shouldFetch() {
    const now = Date.now();
    const timeSinceLastFetch = now - this.lastFetchTime;
    return timeSinceLastFetch >= this.FETCH_INTERVAL || this.currentTrackKey === null;
  }

  /**
   * Update the timestamp of the last fetch
   */
  updateFetchTime() {
    this.lastFetchTime = Date.now();
  }

  /**
   * Check if the track has changed
   * @param {string} newTrackKey - The new track key to compare
   * @returns {boolean} - True if track has changed
   */
  hasTrackChanged(newTrackKey) {
    return newTrackKey !== this.currentTrackKey;
  }

  /**
   * Update the current track key
   * @param {string} newTrackKey - The new track key
   */
  updateTrackKey(newTrackKey) {
    this.currentTrackKey = newTrackKey;
  }
}
