/**
 * Reads an image file as a Data URL while preserving transparency (PNG/SVG/WebP).
 * If the image is excessively large, scales it down to max 600px width/height on a transparent canvas.
 */
export function readBrandLogoFile(
  file: File,
  onSuccess: (dataUrl: string) => void,
  onError: (msg: string) => void
): void {
  if (!file.type.startsWith("image/")) {
    onError("Only image files (PNG, SVG, WebP, JPG) are allowed.");
    return;
  }

  // If SVG, read as DataURL directly without rasterizing
  if (file.type === "image/svg+xml") {
    const reader = new FileReader();
    reader.onload = () => onSuccess(reader.result as string);
    reader.onerror = () => onError("Failed to read SVG file.");
    reader.readAsDataURL(file);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const MAX_WIDTH = 600;
      const MAX_HEIGHT = 200;
      let { width, height } = img;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        onSuccess(reader.result as string);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      // Export as PNG to preserve transparency
      onSuccess(canvas.toDataURL("image/png"));
    };
    img.onerror = () => onError("Failed to load image preview.");
    img.src = reader.result as string;
  };
  reader.onerror = () => onError("Failed to read file.");
  reader.readAsDataURL(file);
}
