/**
 * ThemeManager - Handles color extraction and dynamic theming
 * 
 * Extracts dominant colors from album artwork and applies them
 * to the background and text for a dynamic, themed experience.
 */
const BACKGROUND_DARKEN_PERCENT = 40; // Percentage to darken background color for better contrast

class ThemeManager {
  /**
   * Extract colors from album cover and apply to background
   * Uses the colorExtractor utility to analyze the image
   * @param {string} coverUrl - URL or data URI of the cover image
   */
  async extractColorsFromCover(coverUrl) {
    try {
      // Extract top 3 dominant colors from the image
      const colors = await window.colorExtractor.extractColors(coverUrl, 3);
      if (colors && colors.length > 0) {
        this.applyColorsToBackground(colors);
      }
    } catch (error) {
      console.log('Failed to extract colors:', error);
      this.resetToDefaultColors();
    }
  }

  /**
   * Apply extracted colors to the page background and text
   * Uses the dominant color, darkened for better contrast
   * @param {Array} colors - Array of color objects with r, g, b, hex properties
   */
  applyColorsToBackground(colors) {
    // Use the first (dominant) color
    const dominantColor = colors[0];
    
    // Darken the color for better contrast and readability
    const darkenedColor = window.colorExtractor.darkenColor(dominantColor, BACKGROUND_DARKEN_PERCENT);
    const solidColor = darkenedColor.hex;
    
    // Calculate accessible text color (black or white) based on brightness
    const textColor = window.colorExtractor.getAccessibleTextColor(dominantColor);
    
    // Update CSS custom properties
    document.documentElement.style.setProperty('--bg-gradient', solidColor);
    document.documentElement.style.setProperty('--text-color', textColor);
    
    // Adjust text shadow based on text color for better readability
    const textShadow = textColor === '#000000' 
      ? '0 2px 4px rgba(255, 255, 255, 0.3)' // White shadow for dark text
      : '0 2px 4px rgba(0, 0, 0, 0.3)'; // Black shadow for light text
    document.documentElement.style.setProperty('--text-shadow', textShadow);
  }

  /**
   * Reset colors to default gradient theme
   * Used when no cover is available or on errors
   */
  resetToDefaultColors() {
    document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    document.documentElement.style.setProperty('--text-color', '#ffffff');
    document.documentElement.style.setProperty('--text-shadow', '0 2px 4px rgba(0, 0, 0, 0.3)');
  }
}
