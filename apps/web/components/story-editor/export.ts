import type Konva from "konva";

export async function exportStoryToImage(stage: Konva.Stage): Promise<Blob> {
  // Save current display state
  const prevW = stage.width();
  const prevH = stage.height();
  const prevScaleX = stage.scaleX();
  const prevScaleY = stage.scaleY();

  // Set to full 1080×1920 resolution for export (1:1 scale)
  stage.width(1080);
  stage.height(1920);
  stage.scaleX(1);
  stage.scaleY(1);

  // Hide transformers
  const transformers = stage.find("Transformer");
  transformers.forEach((t) => t.hide());

  stage.draw();

  // Export at full resolution
  const dataUrl = stage.toDataURL({ pixelRatio: 1, mimeType: "image/png", quality: 1 });

  // Restore display state
  transformers.forEach((t) => t.show());
  stage.width(prevW);
  stage.height(prevH);
  stage.scaleX(prevScaleX);
  stage.scaleY(prevScaleY);
  stage.draw();

  // Convert data URL to Blob
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function uploadStoryImage(blob: Blob): Promise<{ url: string; storagePath: string; fileName: string; fileSize: number; mimeType: string }> {
  const formData = new FormData();
  formData.append("file", blob, `story-${Date.now()}.png`);
  formData.append("folder", "stories");

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}
