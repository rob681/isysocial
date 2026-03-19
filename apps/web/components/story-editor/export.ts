import type Konva from "konva";

export async function exportStoryToImage(stage: Konva.Stage): Promise<Blob> {
  // Save current scale
  const prevScaleX = stage.scaleX();
  const prevScaleY = stage.scaleY();

  // Set to 1:1 for full resolution export
  stage.scaleX(1);
  stage.scaleY(1);
  stage.width(1080);
  stage.height(1920);

  // Hide transformers
  const transformers = stage.find("Transformer");
  transformers.forEach((t) => t.hide());

  stage.draw();

  // Export
  const dataUrl = stage.toDataURL({ pixelRatio: 1, mimeType: "image/png", quality: 1 });

  // Restore
  transformers.forEach((t) => t.show());
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
