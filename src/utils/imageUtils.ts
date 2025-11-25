/**
 * Adds a watermark to a base64 image.
 * @param base64Image The source image in base64 format (data URL).
 * @param text The watermark text to overlay.
 * @returns A Promise resolving to the watermarked image as a base64 string.
 */
export const addWatermark = (base64Image: string, text: string = 'newscartoon.lol'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Configure watermark text style (1/4 size, 80% opacity)
      const fontSize = Math.max(12, Math.floor(img.width / 120));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      // Position: Bottom right with padding
      const padding = Math.floor(img.width * 0.02);
      const x = img.width - padding;
      const y = img.height - padding;

      // Draw stroke (outline) then fill
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);

      // Return as base64
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = (err) => {
      reject(new Error('Failed to load image for watermarking: ' + err));
    };

    img.src = base64Image;
  });
};
