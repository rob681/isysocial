/**
 * Canvas-based thumbnail extraction with intelligent frame selection
 * Tries multiple frame times (1s, 5s, 30s) to find one with visible content
 * Falls back to placeholder if all frames are blank
 */

function isFrameValid(imageData: ImageData): boolean {
  // Check if frame has meaningful content (not all black/white/blank)
  const data = imageData.data;

  // Count non-zero and non-255 bytes to detect actual content
  let contentBytes = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Pixel has actual content if not completely transparent
    if (a > 128) {
      const brightness = (r + g + b) / 3;
      // Accept any pixel that's not pure white/black (very lenient)
      if (brightness > 5 && brightness < 250) {
        contentBytes++;
      }
    }
  }

  // Consider frame valid if at least 1% of pixels have content
  const totalPixels = imageData.width * imageData.height;
  return contentBytes > totalPixels * 0.01;
}

function createPlaceholder(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Gray background with play icon
    ctx.fillStyle = "#999999";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `${Math.min(width, height) / 4}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("▶", width / 2, height / 2);
  }

  return canvas;
}

export async function extractCanvasThumbnail(
  videoFile: File
): Promise<{ blob: Blob; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    let duration = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    let resolved = false;
    let seekAttempts = 0;
    const frameTimes = [1, 5, 30]; // Segundos a intentar extraer
    let currentFrameIndex = 0;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      video.src = "";
      video.pause();
    };

    const finalize = (blob: Blob) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      URL.revokeObjectURL(url);
      resolve({ blob, duration });
    };

    const handleError = (error: Error) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      URL.revokeObjectURL(url);
      reject(error);
    };

    const tryNextFrame = () => {
      if (currentFrameIndex >= frameTimes.length) {
        // Si todos los frames están en blanco, usar placeholder
        try {
          const placeholderCanvas = createPlaceholder(canvas.width, canvas.height);
          placeholderCanvas.toBlob(
            (blob) => {
              if (blob && blob.size > 0) {
                finalize(blob);
              } else {
                handleError(new Error("Failed to create placeholder thumbnail"));
              }
            },
            "image/jpeg",
            0.8
          );
        } catch (err) {
          handleError(err instanceof Error ? err : new Error("Failed to create placeholder"));
        }
        return;
      }

      const frameTime = Math.min(frameTimes[currentFrameIndex]!, duration * 0.8);
      currentFrameIndex++;
      video.currentTime = frameTime;
      seekAttempts++;

      // Set timeout for this specific seek
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Timeout on seek - try next frame or fallback to placeholder
        tryNextFrame();
      }, 5000);
    };

    video.onloadedmetadata = () => {
      duration = video.duration;
      if (!isFinite(duration)) {
        handleError(new Error("Invalid video duration"));
        return;
      }

      // Set canvas size to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (canvas.width === 0 || canvas.height === 0) {
        handleError(new Error("Invalid video dimensions"));
        return;
      }

      // Start trying to extract frames
      tryNextFrame();
    };

    video.onseeked = () => {
      try {
        ctx.drawImage(video, 0, 0);

        // Validate that canvas has pixel data with content
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        if (isFrameValid(imageData)) {
          // Found a valid frame!
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size > 0) {
                finalize(blob);
              } else {
                handleError(new Error("Failed to create thumbnail blob"));
              }
            },
            "image/jpeg",
            0.8
          );
          return;
        }

        // Frame is blank, try next time
        tryNextFrame();
      } catch (err) {
        handleError(err instanceof Error ? err : new Error("Failed to draw frame"));
      }
    };

    video.onerror = () => {
      handleError(new Error("Failed to load video"));
    };

    const url = URL.createObjectURL(videoFile);
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.src = url;
  });
}
