/**
 * Canvas-based thumbnail extraction
 * Extracts frame at 1s, validates pixel data, with timeout handling
 */

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

      // Seek to 1 second
      video.currentTime = Math.min(1, duration * 0.5);

      // Set timeout if seeking doesn't complete within 5 seconds
      timeoutId = setTimeout(() => {
        handleError(new Error("Video seek timeout"));
      }, 5000);
    };

    video.onseeked = () => {
      try {
        ctx.drawImage(video, 0, 0);

        // Validate that canvas has pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasPixels = imageData.data.some((byte) => byte !== 0);

        if (!hasPixels) {
          handleError(new Error("Failed to extract valid frame from video"));
          return;
        }

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
