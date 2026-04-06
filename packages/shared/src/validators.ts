import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const setupPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const resetPasswordRequestSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

// ─── Agency ───────────────────────────────────────────────────────────────────

export const registerAgencySchema = z.object({
  agencyName: z.string().min(2, "Mínimo 2 caracteres"),
  adminName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

// ─── Client ───────────────────────────────────────────────────────────────────

export const createClientSchema = z.object({
  companyName: z.string().min(1, "Nombre de empresa requerido"),
  name: z.string().min(1, "Nombre del contacto requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  networks: z
    .array(
      z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"])
    )
    .min(1, "Selecciona al menos una red social"),
});

export const updateClientSchema = z.object({
  id: z.string(),
  companyName: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  brandColors: z
    .object({
      primary: z.string(),
      secondary: z.string().optional(),
    })
    .optional(),
});

// ─── Editor/Team ──────────────────────────────────────────────────────────────

export const inviteEditorSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Email inválido"),
  permissions: z.array(z.string()).default([]),
});

export const updateEditorPermissionsSchema = z.object({
  editorId: z.string(),
  permissions: z.array(z.string()),
});

// ─── Post Category ───────────────────────────────────────────────────────────

export const createPostCategorySchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color hex inválido"),
});

export const updatePostCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// ─── Post ─────────────────────────────────────────────────────────────────────

export const storyElementSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "sticker", "image", "shape"]),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  props: z.record(z.unknown()),
});

export const storyDataSchema = z.object({
  version: z.literal(1),
  width: z.literal(1080),
  height: z.literal(1920),
  background: z.object({
    type: z.enum(["color", "gradient", "image"]),
    value: z.string(),
  }),
  elements: z.array(storyElementSchema),
});

export const createPostSchema = z.object({
  clientId: z.string().min(1, "Cliente requerido"),
  network: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]),
  postType: z.enum(["IMAGE", "CAROUSEL", "STORY", "REEL", "VIDEO", "TEXT"]),
  title: z.string().optional(),
  copy: z.string().optional(),
  hashtags: z.string().optional(),
  scheduledAt: z.date().optional(),
  revisionsLimit: z.number().int().min(1).max(10).default(3),
  referenceLink: z.string().url().optional().or(z.literal("")),
  categoryId: z.string().optional(),
  initialStatus: z.enum(["DRAFT", "IN_REVIEW"]).default("DRAFT"),
  storyData: storyDataSchema.optional(),
});

export const updatePostContentSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  copy: z.string().optional(),
  hashtags: z.string().optional(),
  referenceLink: z.string().url().optional().or(z.literal("")),
  scheduledAt: z.date().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  storyData: storyDataSchema.optional().nullable(),
});

export const updatePostStatusSchema = z.object({
  id: z.string(),
  toStatus: z.enum([
    "DRAFT",
    "IN_REVIEW",
    "CLIENT_CHANGES",
    "APPROVED",
    "SCHEDULED",
    "PUBLISHED",
    "PAUSED",
    "CANCELLED",
  ]),
  note: z.string().optional(),
});

export const addPostCommentSchema = z.object({
  postId: z.string(),
  content: z.string().min(1, "El comentario no puede estar vacío"),
  isInternal: z.boolean().default(false),
});

// ─── Idea ─────────────────────────────────────────────────────────────────────

export const createIdeaSchema = z.object({
  clientId: z.string().optional(),
  title: z.string().min(1, "Título requerido"),
  description: z.string().optional(),
  copyIdeas: z.string().optional(),
  network: z
    .enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"])
    .optional(),
  networks: z
    .array(z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]))
    .optional(),
  postType: z
    .enum(["IMAGE", "CAROUSEL", "STORY", "REEL", "VIDEO", "TEXT"])
    .optional(),
  tentativeDate: z.date().optional(),
});

export const updateIdeaSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  copyIdeas: z.string().optional(),
  network: z
    .enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"])
    .optional()
    .nullable(),
  networks: z
    .array(z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK", "X"]))
    .optional(),
  postType: z
    .enum(["IMAGE", "CAROUSEL", "STORY", "REEL", "VIDEO", "TEXT"])
    .optional()
    .nullable(),
  tentativeDate: z.date().optional().nullable(),
  status: z
    .enum(["BACKLOG", "IN_PROGRESS", "READY", "CONVERTED", "DISCARDED"])
    .optional(),
});

export const addIdeaLinkSchema = z.object({
  ideaId: z.string(),
  url: z.string().url("URL inválida"),
});

// ─── Brand Kit ───────────────────────────────────────────────────────────────

export const updateBrandKitSchema = z.object({
  clientId: z.string(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  typography: z
    .object({
      primaryFont: z.string().optional(),
      secondaryFont: z.string().optional(),
      sampleText: z.string().optional(),
    })
    .optional(),
  toneOfVoice: z
    .enum([
      "formal",
      "informal",
      "playful",
      "professional",
      "friendly",
      "authoritative",
      "conversational",
    ])
    .optional()
    .nullable(),
  styleNotes: z.string().optional(),
  targetAudience: z.string().optional(),
  brandValues: z.string().optional(),
  missionStatement: z.string().optional(),
  doAndDonts: z.string().optional(),
});

// ─── Video Comments (Timeline feedback) ──────────────────────────────────────

export const createVideoCommentSchema = z.object({
  mediaType: z.enum(["POST_MEDIA", "TASK_FILE"]),
  mediaId: z.string().min(1, "Media ID requerido"),
  content: z.string().min(1, "Comentario requerido"),
  timecodeSeconds: z.number().min(0).optional(), // seconds (e.g., 15.5)
  isInternal: z.boolean().default(false),
});

export const updateVideoCommentSchema = z.object({
  commentId: z.string(),
  content: z.string().min(1).optional(),
  isResolved: z.boolean().optional(),
});

export const deleteVideoCommentSchema = z.object({
  commentId: z.string(),
});
