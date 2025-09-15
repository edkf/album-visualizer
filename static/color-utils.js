// Color extraction utilities based on ui-colors-from-an-image
class ColorExtractor {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  // Extract dominant colors from an image
  async extractColors(imageUrl, numColors = 5) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Set canvas size to image size (but limit for performance)
          const maxSize = 150;
          const scale = Math.min(maxSize / img.width, maxSize / img.height);
          this.canvas.width = img.width * scale;
          this.canvas.height = img.height * scale;
          
          // Draw image to canvas
          this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
          
          // Get image data
          const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
          const pixels = imageData.data;
          
          // Extract colors
          const colors = this.getDominantColors(pixels, numColors);
          resolve(colors);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  // Get dominant colors from pixel data
  getDominantColors(pixels, numColors) {
    const colorMap = new Map();
    
    // Sample pixels (every 4th pixel for performance)
    for (let i = 0; i < pixels.length; i += 16) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      
      // Skip transparent pixels
      if (a < 128) continue;
      
      // Skip very dark or very light colors
      const brightness = (r + g + b) / 3;
      if (brightness < 30 || brightness > 225) continue;
      
      // Quantize colors to reduce noise
      const quantizedR = Math.round(r / 10) * 10;
      const quantizedG = Math.round(g / 10) * 10;
      const quantizedB = Math.round(b / 10) * 10;
      
      const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }
    
    // Sort by frequency and get top colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, numColors)
      .map(([colorKey]) => {
        const [r, g, b] = colorKey.split(',').map(Number);
        return { r, g, b, hex: this.rgbToHex(r, g, b) };
      });
    
    return sortedColors;
  }

  // Convert RGB to hex
  rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Get accessible text color (black or white) for a background color
  getAccessibleTextColor(backgroundColor) {
    const { r, g, b } = backgroundColor;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }

  // Darken a color by a percentage
  darkenColor(color, percentage = 30) {
    const factor = (100 - percentage) / 100;
    return {
      r: Math.round(color.r * factor),
      g: Math.round(color.g * factor),
      b: Math.round(color.b * factor),
      hex: this.rgbToHex(
        Math.round(color.r * factor),
        Math.round(color.g * factor),
        Math.round(color.b * factor)
      )
    };
  }

  // Create CSS gradient from colors with darkening
  createGradient(colors, direction = 'to bottom right', darkenPercent = 30) {
    if (colors.length === 0) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    // Darken all colors for better contrast
    const darkenedColors = colors.map(color => this.darkenColor(color, darkenPercent));
    
    const colorStops = darkenedColors.map((color, index) => {
      const percentage = (index / (darkenedColors.length - 1)) * 100;
      return `${color.hex} ${percentage}%`;
    }).join(', ');
    
    return `linear-gradient(${direction}, ${colorStops})`;
  }
}

// Global instance
window.colorExtractor = new ColorExtractor();
