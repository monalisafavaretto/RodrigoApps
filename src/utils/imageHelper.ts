/**
 * Utility to compress and resize base64 image data URLs.
 * Downscaling image dimensions avoids inflating localStorage and server DB sizes,
 * preventing PayloadTooLargeError and browser storage quota violations.
 */
export function compressImage(dataUrl: string, maxDim = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith("data:image")) {
      resolve(dataUrl);
      return;
    }

    if (dataUrl.includes("image/svg+xml")) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Default to PNG if input is a PNG to retain background transparency, otherwise JPEG for efficiency
      const isPng = dataUrl.includes("image/png");
      const outputType = isPng ? "image/png" : "image/jpeg";
      
      try {
        const compressed = canvas.toDataURL(outputType, outputType === "image/jpeg" ? quality : undefined);
        resolve(compressed);
      } catch (err) {
        console.error("Failed to export compressed canvas:", err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
