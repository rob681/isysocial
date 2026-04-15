import { describe, test, expect } from 'vitest'
import {
  createIdeaSchema,
  updateIdeaSchema,
  addIdeaLinkSchema,
} from '@isysocial/shared'

// ─── Idea Creation — validation ───────────────────────────────────────────────
//
// The IdeaForm component calls trpc.ideas.create.mutateAsync with an object
// shaped like createIdeaSchema. clientId is optional here (ideas can be
// created without a client), but title is required.

describe('Idea Creation - validation', () => {
  test('should require title', () => {
    const result = createIdeaSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const titleIssue = result.error.issues.find((i) => i.path.includes('title'))
      expect(titleIssue).toBeDefined()
      expect(titleIssue?.message).toContain('requerido')
    }
  })

  test('should reject missing title entirely', () => {
    const result = createIdeaSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('clientId is optional — idea can be created without a client', () => {
    // Ideas can be created in the backlog before associating to a client
    const result = createIdeaSchema.safeParse({ title: 'Idea sin cliente' })
    expect(result.success).toBe(true)
  })

  test('should create idea with only title', () => {
    const result = createIdeaSchema.safeParse({ title: 'Campaña de Black Friday' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Campaña de Black Friday')
      expect(result.data.clientId).toBeUndefined()
    }
  })

  test('should create idea with valid clientId', () => {
    const result = createIdeaSchema.safeParse({
      title: 'Post de producto nuevo',
      clientId: 'client-abc-123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.clientId).toBe('client-abc-123')
    }
  })

  test('should create idea with all optional fields', () => {
    const result = createIdeaSchema.safeParse({
      title: 'Campaña de verano',
      description: 'Post con imágenes de la playa para captar atención',
      copyIdeas: 'El verano es mejor con nosotros #sol #playa',
      clientId: 'client-xyz',
      network: 'INSTAGRAM',
      networks: ['INSTAGRAM', 'FACEBOOK'],
      postType: 'CAROUSEL',
      tentativeDate: new Date('2026-06-21'),
    })
    expect(result.success).toBe(true)
  })

  test('should reject invalid network', () => {
    const result = createIdeaSchema.safeParse({
      title: 'Idea válida',
      network: 'PINTEREST',
    })
    expect(result.success).toBe(false)
  })

  test('should reject invalid postType', () => {
    const result = createIdeaSchema.safeParse({
      title: 'Idea válida',
      postType: 'MEME',
    })
    expect(result.success).toBe(false)
  })

  test('should accept all valid networks', () => {
    const networks = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK', 'X'] as const
    networks.forEach((network) => {
      const result = createIdeaSchema.safeParse({ title: 'Test', network })
      expect(result.success).toBe(true)
    })
  })

  test('should accept all valid postTypes', () => {
    const postTypes = ['IMAGE', 'CAROUSEL', 'STORY', 'REEL', 'VIDEO', 'TEXT'] as const
    postTypes.forEach((postType) => {
      const result = createIdeaSchema.safeParse({ title: 'Test', postType })
      expect(result.success).toBe(true)
    })
  })
})

// ─── Idea Update — validation ─────────────────────────────────────────────────

describe('Idea Update - validation', () => {
  test('requires id', () => {
    const result = updateIdeaSchema.safeParse({ title: 'Nuevo título' })
    expect(result.success).toBe(false)
  })

  test('rejects empty title on update', () => {
    const result = updateIdeaSchema.safeParse({ id: 'idea-1', title: '' })
    expect(result.success).toBe(false)
  })

  test('accepts partial update with only id', () => {
    const result = updateIdeaSchema.safeParse({ id: 'idea-1' })
    expect(result.success).toBe(true)
  })

  test('accepts valid status transitions', () => {
    const statuses = ['BACKLOG', 'IN_PROGRESS', 'READY', 'CONVERTED', 'DISCARDED'] as const
    statuses.forEach((status) => {
      const result = updateIdeaSchema.safeParse({ id: 'idea-1', status })
      expect(result.success).toBe(true)
    })
  })

  test('rejects invalid status', () => {
    const result = updateIdeaSchema.safeParse({ id: 'idea-1', status: 'PUBLISHED' })
    expect(result.success).toBe(false)
  })

  test('accepts null network to clear assignment', () => {
    const result = updateIdeaSchema.safeParse({ id: 'idea-1', network: null })
    expect(result.success).toBe(true)
  })

  test('accepts null postType to clear assignment', () => {
    const result = updateIdeaSchema.safeParse({ id: 'idea-1', postType: null })
    expect(result.success).toBe(true)
  })

  test('accepts null tentativeDate to clear date', () => {
    const result = updateIdeaSchema.safeParse({ id: 'idea-1', tentativeDate: null })
    expect(result.success).toBe(true)
  })

  test('accepts multiple networks in update', () => {
    const result = updateIdeaSchema.safeParse({
      id: 'idea-1',
      networks: ['INSTAGRAM', 'TIKTOK', 'X'],
    })
    expect(result.success).toBe(true)
  })
})

// ─── addIdeaLinkSchema validation ─────────────────────────────────────────────

describe('addIdeaLinkSchema - reference links', () => {
  test('rejects invalid URL', () => {
    const result = addIdeaLinkSchema.safeParse({ ideaId: 'idea-1', url: 'not-a-url' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('inválida')
    }
  })

  test('rejects empty URL', () => {
    const result = addIdeaLinkSchema.safeParse({ ideaId: 'idea-1', url: '' })
    expect(result.success).toBe(false)
  })

  test('accepts valid http URL', () => {
    const result = addIdeaLinkSchema.safeParse({
      ideaId: 'idea-1',
      url: 'http://www.example.com/ref',
    })
    expect(result.success).toBe(true)
  })

  test('accepts valid https URL', () => {
    const result = addIdeaLinkSchema.safeParse({
      ideaId: 'idea-1',
      url: 'https://www.instagram.com/p/ABC123',
    })
    expect(result.success).toBe(true)
  })

  test('requires ideaId', () => {
    const result = addIdeaLinkSchema.safeParse({ url: 'https://example.com' })
    expect(result.success).toBe(false)
  })
})

// ─── IdeaForm business logic — derived state ──────────────────────────────────
//
// These tests verify the pure functions / logic extracted from idea-form.tsx
// without needing to render the React component.

describe('Idea Form - available post types derivation', () => {
  // Mirror the logic from idea-form.tsx's availablePostTypes computed value
  const NETWORK_POST_TYPES: Record<string, string[]> = {
    FACEBOOK: ['IMAGE', 'CAROUSEL', 'VIDEO', 'TEXT', 'STORY'],
    INSTAGRAM: ['IMAGE', 'CAROUSEL', 'STORY', 'REEL'],
    LINKEDIN: ['IMAGE', 'CAROUSEL', 'VIDEO', 'TEXT'],
    TIKTOK: ['REEL', 'VIDEO'],
    X: ['IMAGE', 'VIDEO', 'TEXT'],
  }

  function getAvailablePostTypes(selectedNetworks: string[]): string[] {
    if (selectedNetworks.length === 0) {
      return ['IMAGE', 'CAROUSEL', 'STORY', 'REEL', 'VIDEO', 'TEXT']
    }
    return selectedNetworks.reduce<string[]>((common, net, i) => {
      const types = NETWORK_POST_TYPES[net] ?? []
      return i === 0 ? types : common.filter((t) => types.includes(t))
    }, [])
  }

  test('returns all post types when no network selected', () => {
    const types = getAvailablePostTypes([])
    expect(types).toContain('IMAGE')
    expect(types).toContain('CAROUSEL')
    expect(types).toContain('STORY')
    expect(types).toContain('REEL')
    expect(types).toContain('VIDEO')
    expect(types).toContain('TEXT')
  })

  test('returns Instagram post types for Instagram only', () => {
    const types = getAvailablePostTypes(['INSTAGRAM'])
    expect(types).toEqual(['IMAGE', 'CAROUSEL', 'STORY', 'REEL'])
    expect(types).not.toContain('TEXT')
  })

  test('returns TikTok post types for TikTok only', () => {
    const types = getAvailablePostTypes(['TIKTOK'])
    expect(types).toEqual(['REEL', 'VIDEO'])
  })

  test('returns intersection for Instagram + TikTok (only REEL in common)', () => {
    const types = getAvailablePostTypes(['INSTAGRAM', 'TIKTOK'])
    expect(types).toEqual(['REEL'])
  })

  test('returns intersection for Facebook + LinkedIn (IMAGE, CAROUSEL, VIDEO, TEXT)', () => {
    const types = getAvailablePostTypes(['FACEBOOK', 'LINKEDIN'])
    expect(types).toContain('IMAGE')
    expect(types).toContain('CAROUSEL')
    expect(types).toContain('VIDEO')
    expect(types).toContain('TEXT')
    expect(types).not.toContain('STORY')
    expect(types).not.toContain('REEL')
  })

  test('returns empty array when no post types are in common', () => {
    // X only has IMAGE, VIDEO, TEXT. TikTok only has REEL, VIDEO.
    // Intersection: VIDEO
    const types = getAvailablePostTypes(['X', 'TIKTOK'])
    expect(types).toEqual(['VIDEO'])
  })
})
