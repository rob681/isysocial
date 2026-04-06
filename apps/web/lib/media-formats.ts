/**
 * Comprehensive Social Media Format Specifications (2026)
 *
 * Sources: Hootsuite, PostFast, Fliki, Buffer — April 2026
 */

export interface MediaSpec {
  width: number;
  height: number;
  aspectRatio: string;
  maxSizeMB: number;
  formats?: string[];
  maxDuration?: number; // seconds (video only)
  minDuration?: number; // seconds (video only)
  fps?: number;
  maxItems?: number; // carousel/multi-image
  optimalItems?: [number, number]; // [min, max] optimal
}

export interface FormatSpec {
  image?: MediaSpec;
  video?: MediaSpec;
  carousel?: MediaSpec;
  captionLimit?: number;
  displayLimit?: number; // chars shown before "...more"
  safeZone?: { topMargin: number; bottomMargin: number };
  tips: string[];
}

export const NETWORK_FORMATS: Record<string, Record<string, FormatSpec>> = {
  INSTAGRAM: {
    IMAGE: {
      image: {
        width: 1080,
        height: 1350,
        aspectRatio: "4:5",
        maxSizeMB: 30,
        formats: ["jpg", "png"],
      },
      captionLimit: 2200,
      displayLimit: 125,
      tips: [
        "Proporción 4:5 (vertical) ocupa más espacio en feed",
        "1:1 (cuadrado) también funciona bien",
        "Máximo 30MB por imagen",
        "JPG o PNG de alta calidad",
      ],
    },
    CAROUSEL: {
      carousel: {
        width: 1080,
        height: 1350,
        aspectRatio: "4:5",
        maxSizeMB: 30,
        formats: ["jpg", "png", "mp4", "mov"],
        maxItems: 20,
        optimalItems: [3, 10],
      },
      captionLimit: 2200,
      displayLimit: 125,
      tips: [
        "Hasta 20 slides por carrusel",
        "Primera imagen = hook visual",
        "Última slide = CTA",
        "Mezcla imágenes y videos",
      ],
    },
    STORY: {
      image: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        maxSizeMB: 30,
        formats: ["jpg", "png"],
      },
      video: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        maxSizeMB: 4096,
        maxDuration: 60,
        formats: ["mp4", "mov"],
      },
      safeZone: { topMargin: 250, bottomMargin: 340 },
      tips: [
        "Vertical 9:16 obligatorio",
        "Video máx 60 segundos por clip",
        "Zona segura: 250px arriba, 340px abajo",
        "Stickers interactivos aumentan engagement",
      ],
    },
    REEL: {
      video: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        maxSizeMB: 4096,
        maxDuration: 180,
        minDuration: 3,
        formats: ["mp4", "mov"],
        fps: 30,
      },
      captionLimit: 2200,
      safeZone: { topMargin: 250, bottomMargin: 250 },
      tips: [
        "3 primeros segundos son clave",
        "Duración: 3–180 segundos",
        "Audio trending aumenta alcance",
        "Subtítulos mejoran retención",
        "30fps recomendado",
      ],
    },
    VIDEO: {
      video: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        maxSizeMB: 4096,
        maxDuration: 3600,
        minDuration: 3,
        formats: ["mp4", "mov"],
        fps: 30,
      },
      captionLimit: 2200,
      tips: [
        "Video vertical 9:16 o cuadrado 1:1",
        "Máximo 60 minutos",
        "Thumbnail atractivo es clave",
      ],
    },
  },
  TIKTOK: {
    VIDEO: {
      video: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        maxSizeMB: 500,
        maxDuration: 600,
        minDuration: 3,
        formats: ["mp4", "mov", "avi"],
        fps: 30,
      },
      captionLimit: 4000,
      displayLimit: 150,
      tips: [
        "Hook en los primeros 2 segundos",
        "Algoritmo favorece 15-60 segundos",
        "Máximo 10 minutos, 500MB web",
        "Tendencias y audio viral = más alcance",
        "Hashtags en caption (no en video)",
      ],
    },
    CAROUSEL: {
      carousel: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        maxSizeMB: 500,
        formats: ["jpg", "png"],
        maxItems: 35,
        optimalItems: [5, 10],
      },
      captionLimit: 4000,
      tips: [
        "4-35 imágenes por carrusel",
        "Óptimo: 5-10 slides",
        "Vertical 9:16 recomendado",
        "Primera imagen debe enganchar",
      ],
    },
    IMAGE: {
      image: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        maxSizeMB: 500,
        formats: ["jpg", "png"],
      },
      captionLimit: 4000,
      tips: [
        "Foto vertical 9:16 recomendada",
        "También acepta 1:1 y 16:9",
      ],
    },
    STORY: {
      video: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        maxSizeMB: 500,
        maxDuration: 60,
        minDuration: 3,
        formats: ["mp4", "mov"],
      },
      tips: [
        "Mismas specs que video estándar",
        "Duración corta recomendada",
      ],
    },
  },
  FACEBOOK: {
    IMAGE: {
      image: {
        width: 1080,
        height: 1350,
        aspectRatio: "4:5",
        maxSizeMB: 30,
        formats: ["jpg", "png"],
      },
      tips: [
        "Vertical 4:5 o horizontal 16:9",
        "Menos de 20% texto en imagen",
        "Colores vibrantes destacan en feed",
      ],
    },
    CAROUSEL: {
      carousel: {
        width: 1080,
        height: 1080,
        aspectRatio: "1:1",
        maxSizeMB: 30,
        formats: ["jpg", "png"],
        maxItems: 10,
      },
      tips: [
        "Máximo 10 slides",
        "Cuadrado 1:1 recomendado",
        "Cada slide debe ser autoexplicativa",
      ],
    },
    VIDEO: {
      video: {
        width: 1280,
        height: 720,
        aspectRatio: "16:9",
        maxSizeMB: 4096,
        maxDuration: 14400,
        formats: ["mp4", "mov"],
      },
      tips: [
        "Primeros 3 segundos sin sonido",
        "Subtítulos automáticos recomendados",
        "Thumbnail atractivo",
        "Hasta 240 minutos",
      ],
    },
    STORY: {
      image: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        maxSizeMB: 30,
        formats: ["jpg", "png"],
      },
      video: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        maxSizeMB: 30,
        maxDuration: 60,
        formats: ["mp4", "mov"],
      },
      safeZone: { topMargin: 250, bottomMargin: 340 },
      tips: [
        "Vertical 9:16 obligatorio",
        "Video máx 60s",
        "Zona segura importante",
      ],
    },
    REEL: {
      video: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        maxSizeMB: 1024,
        maxDuration: 180,
        formats: ["mp4", "mov"],
      },
      tips: [
        "Igual que Instagram Reels",
        "Máximo 3 minutos",
        "Cross-post desde Instagram funciona",
      ],
    },
  },
  LINKEDIN: {
    IMAGE: {
      image: {
        width: 1200,
        height: 627,
        aspectRatio: "1.91:1",
        maxSizeMB: 8,
        formats: ["jpg", "png"],
      },
      captionLimit: 3000,
      tips: [
        "Horizontal 1.91:1 o cuadrado 1:1",
        "Contenido profesional y datos",
        "Infografías tienen alto engagement",
        "Máximo 8MB",
      ],
    },
    CAROUSEL: {
      carousel: {
        width: 1080,
        height: 1080,
        aspectRatio: "1:1",
        maxSizeMB: 100,
        formats: ["pdf", "ppt", "pptx", "doc", "docx", "jpg", "png"],
        maxItems: 20,
        optimalItems: [5, 10],
      },
      captionLimit: 3000,
      tips: [
        "PDF = mayor engagement",
        "1 idea por slide",
        "5-10 slides es óptimo",
        "Texto mín 28px para móvil",
        "Zona segura: 880x880px centro",
      ],
    },
    VIDEO: {
      video: {
        width: 1920,
        height: 1080,
        aspectRatio: "16:9",
        maxSizeMB: 5120,
        maxDuration: 600,
        minDuration: 3,
        formats: ["mp4"],
      },
      captionLimit: 3000,
      tips: [
        "Cuadrado 1:1 o vertical 4:5 también funciona",
        "Menos de 60 segundos es óptimo",
        "Thumbnail personalizado recomendado",
        "Solo MP4",
      ],
    },
    TEXT: {
      captionLimit: 3000,
      tips: [
        "Máximo 3,000 caracteres",
        "Primeras 2 líneas visibles sin expandir",
        "Emojis profesionales funcionan",
        "Preguntas generan comentarios",
      ],
    },
  },
  X: {
    IMAGE: {
      image: {
        width: 1200,
        height: 675,
        aspectRatio: "16:9",
        maxSizeMB: 5,
        formats: ["jpg", "png", "gif", "webp"],
        maxItems: 4,
      },
      captionLimit: 280,
      tips: [
        "Imagen + texto = más engagement",
        "GIFs funcionan bien",
        "Máximo 4 imágenes por tweet",
        "280 caracteres (links cuentan 23)",
      ],
    },
    VIDEO: {
      video: {
        width: 1280,
        height: 720,
        aspectRatio: "16:9",
        maxSizeMB: 512,
        maxDuration: 140,
        formats: ["mp4", "mov"],
      },
      captionLimit: 280,
      tips: [
        "Máximo 140 segundos (2:20)",
        "Vertical y horizontal funcionan",
        "512MB máximo",
        "Solo MP4 o MOV",
      ],
    },
    TEXT: {
      captionLimit: 280,
      tips: [
        "280 caracteres máximo",
        "Threads para contenido largo",
        "Preguntas = más engagement",
        "Emojis/caracteres especiales = 2 chars",
      ],
    },
    CAROUSEL: {
      carousel: {
        width: 1200,
        height: 675,
        aspectRatio: "16:9",
        maxSizeMB: 5,
        formats: ["jpg", "png"],
        maxItems: 4,
      },
      captionLimit: 280,
      tips: [
        "Máximo 4 imágenes",
        "Horizontal 16:9 recomendado",
      ],
    },
  },
  YOUTUBE: {
    VIDEO: {
      video: {
        width: 1920,
        height: 1080,
        aspectRatio: "16:9",
        maxSizeMB: 256000,
        maxDuration: 43200,
        formats: ["mp4", "mov", "avi", "wmv", "flv", "webm"],
        fps: 30,
      },
      tips: [
        "1080p o 4K recomendado",
        "16:9 estándar",
        "Thumbnail 1280x720px obligatorio",
        "Hasta 12 horas (verificado)",
      ],
    },
    SHORT: {
      video: {
        width: 1080,
        height: 1920,
        aspectRatio: "9:16",
        maxSizeMB: 80,
        maxDuration: 180,
        minDuration: 3,
        formats: ["mp4"],
        fps: 30,
      },
      tips: [
        "Vertical 9:16 obligatorio",
        "Máximo 3 minutos",
        "Algoritmo favorece < 60 segundos",
        "30fps recomendado",
      ],
    },
  },
};

// ─── Validation Utilities ────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function parseAspectRatio(ratio: string): [number, number] | null {
  const parts = ratio.split(":").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)) {
    return [parts[0]!, parts[1]!];
  }
  return null;
}

function isRatioClose(
  width: number,
  height: number,
  expectedRatio: string,
  tolerance: number = 0.15
): boolean {
  const parsed = parseAspectRatio(expectedRatio);
  if (!parsed) return true; // Unknown ratio = allow
  const expected = parsed[0] / parsed[1];
  const actual = width / height;
  return Math.abs(actual - expected) / expected < tolerance;
}

export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = URL.createObjectURL(file);
  });
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.onloadedmetadata = () => {
      resolve(video.duration);
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => reject(new Error("No se pudo leer el video"));
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
  });
}

export async function validateMedia(
  file: File,
  network: string,
  postType: string,
  currentMediaCount: number = 0
): Promise<ValidationResult> {
  const spec = NETWORK_FORMATS[network]?.[postType];
  if (!spec) return { valid: true, errors: [], warnings: [] };

  const errors: string[] = [];
  const warnings: string[] = [];

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  // Determine which spec to use
  const mediaSpec = isVideo ? spec.video : isImage ? spec.image : spec.carousel;

  if (!mediaSpec && isVideo && !spec.video) {
    errors.push(
      `${network} ${postType} no acepta videos. Sube una imagen.`
    );
    return { valid: false, errors, warnings };
  }

  if (!mediaSpec && isImage && !spec.image && !spec.carousel) {
    errors.push(
      `${network} ${postType} no acepta imágenes. Sube un video.`
    );
    return { valid: false, errors, warnings };
  }

  if (!mediaSpec) return { valid: true, errors: [], warnings: [] };

  // Check file size
  const sizeMB = file.size / (1024 * 1024);
  if (mediaSpec.maxSizeMB && sizeMB > mediaSpec.maxSizeMB) {
    errors.push(
      `Archivo muy grande: ${sizeMB.toFixed(1)}MB (máx ${mediaSpec.maxSizeMB}MB para ${network})`
    );
  }

  // Check file format
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (mediaSpec.formats && ext && !mediaSpec.formats.includes(ext)) {
    errors.push(
      `Formato .${ext} no soportado en ${network}. Usa: ${mediaSpec.formats.join(", ")}`
    );
  }

  // Check max items for carousel
  const carouselSpec = spec.carousel;
  if (carouselSpec?.maxItems && currentMediaCount >= carouselSpec.maxItems) {
    errors.push(
      `Máximo ${carouselSpec.maxItems} archivos para ${network} ${postType}`
    );
  }

  // Image-specific checks
  if (isImage && mediaSpec.aspectRatio) {
    try {
      const { width, height } = await getImageDimensions(file);
      if (!isRatioClose(width, height, mediaSpec.aspectRatio)) {
        warnings.push(
          `Proporción recomendada: ${mediaSpec.aspectRatio} (${mediaSpec.width}×${mediaSpec.height}), tu imagen es ${width}×${height}`
        );
      }
    } catch {
      // Can't read dimensions, skip check
    }
  }

  // Video-specific checks
  if (isVideo) {
    try {
      const duration = await getVideoDuration(file);
      if (mediaSpec.maxDuration && duration > mediaSpec.maxDuration) {
        errors.push(
          `Video muy largo: ${Math.round(duration)}s (máx ${mediaSpec.maxDuration}s para ${network})`
        );
      }
      if (mediaSpec.minDuration && duration < mediaSpec.minDuration) {
        errors.push(
          `Video muy corto: ${Math.round(duration)}s (mín ${mediaSpec.minDuration}s)`
        );
      }
    } catch {
      // Can't read duration, skip check
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get format requirements text for display above media uploader.
 */
export function getFormatRequirements(
  network: string,
  postType: string
): {
  label: string;
  dimensions: string;
  duration?: string;
  captionLimit?: number;
  maxItems?: number;
  formats: string;
  tips: string[];
} | null {
  const spec = NETWORK_FORMATS[network]?.[postType];
  if (!spec) return null;

  const mediaSpec = spec.video || spec.image || spec.carousel;
  if (!mediaSpec) {
    return {
      label: `${network} ${postType}`,
      dimensions: "Solo texto",
      captionLimit: spec.captionLimit,
      formats: "",
      tips: spec.tips,
    };
  }

  const dims = `${mediaSpec.width}×${mediaSpec.height} (${mediaSpec.aspectRatio})`;
  const dur =
    mediaSpec.maxDuration !== undefined
      ? mediaSpec.maxDuration >= 3600
        ? `${Math.round(mediaSpec.maxDuration / 3600)}h`
        : mediaSpec.maxDuration >= 60
          ? `${Math.floor(mediaSpec.maxDuration / 60)}min ${mediaSpec.maxDuration % 60 ? (mediaSpec.maxDuration % 60) + "s" : ""}`
          : `${mediaSpec.maxDuration}s`
      : undefined;
  const fmts = mediaSpec.formats?.map((f) => `.${f.toUpperCase()}`).join(", ") || "";

  return {
    label: `${network} ${postType}`,
    dimensions: dims,
    duration: dur
      ? `${mediaSpec.minDuration ? mediaSpec.minDuration + "s–" : ""}${dur}`
      : undefined,
    captionLimit: spec.captionLimit,
    maxItems: spec.carousel?.maxItems || mediaSpec.maxItems,
    formats: fmts,
    tips: spec.tips,
  };
}
