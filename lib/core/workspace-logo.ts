/**
 * Client-safe helper to read and optimize business logo images.
 * Downscales images to 256x256 square on a canvas and returns Base64 JPEG.
 */
export function readLogoFile(
  file: File,
  onLogo: (dataUrl: string) => void,
  onError: () => void
): void {
  const reader = new FileReader();
  reader.onloadend = () => {
    const img = new Image();
    img.onload = () => {
      const SIZE = 256;
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        onLogo(reader.result as string);
        return;
      }
      // Cover-fit: crop to a centered square, then scale into the canvas.
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
      onLogo(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = onError;
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
}
