/**
 * Canvas-based thumbnail extraction
 * Fast, browser-native, but limited to first frame
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

    video.onloadedmetadata = () => {
      duration = video.duration;
      // Set canvas size to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Seek to 1 second or middle of video
      const seekTime = Math.min(1, video.duration / 2);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, duration });
            URL.revokeObjectURL(url);
          } else {
            reject(new Error("Failed to create thumbnail"));
          }
        },
        "image/jpeg",
        0.85
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };

    const url = URL.createObjectURL(videoFile);
    video.src = url;
  });
}
