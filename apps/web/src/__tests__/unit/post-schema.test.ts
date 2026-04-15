import { describe, test, expect } from 'vitest'
import {
  createPostSchema,
  updatePostContentSchema,
  updatePostStatusSchema,
  addPostCommentSchema,
  storyDataSchema,
  storyElementSchema,
} from '@isysocial/shared'

// ─── createPostSchema ──────────────────────────────────────────────────────────

describe('createPostSchema', () => {
  const validBase = {
    clientId: 'client-123',
    network: 'INSTAGRAM' as const,
    postType: 'IMAGE' as const,
  }

  describe('clientId validation', () => {
    test('rejects empty string clientId', () => {
      const result = createPostSchema.safeParse({ ...validBase, clientId: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = result.error.issues[0]?.message
        expect(msg).toContain('requerido')
      }
    })

    test('rejects null clientId', () => {
      const result = createPostSchema.safeParse({ ...validBase, clientId: null })
      expect(result.success).toBe(false)
    })

    test('rejects undefined clientId', () => {
      const { clientId: _omit, ...rest } = validBase
      const result = createPostSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    test('accepts valid clientId', () => {
      const result = createPostSchema.safeParse(validBase)
      expect(result.success).toBe(true)
    })

    test('accepts a UUID-style clientId', () => {
      const result = createPostSchema.safeParse({
        ...validBase,
        clientId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('network validation', () => {
    test('rejects invalid network', () => {
      const result = createPostSchema.safeParse({ ...validBase, network: 'SNAPCHAT' })
      expect(result.success).toBe(false)
    })

    test('accepts all valid networks', () => {
      const networks = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK', 'X'] as const
      networks.forEach((network) => {
        const result = createPostSchema.safeParse({ ...validBase, network })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('postType validation', () => {
    test('rejects invalid postType', () => {
      const result = createPostSchema.safeParse({ ...validBase, postType: 'MEME' })
      expect(result.success).toBe(false)
    })

    test('accepts all valid postTypes', () => {
      const postTypes = ['IMAGE', 'CAROUSEL', 'STORY', 'REEL', 'VIDEO', 'TEXT'] as const
      postTypes.forEach((postType) => {
        const result = createPostSchema.safeParse({ ...validBase, postType })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('optional fields', () => {
    test('accepts post without title/copy/hashtags', () => {
      const result = createPostSchema.safeParse(validBase)
      expect(result.success).toBe(true)
    })

    test('accepts post with all optional fields', () => {
      const result = createPostSchema.safeParse({
        ...validBase,
        title: 'Mi post de verano',
        copy: 'Texto del post aquí',
        hashtags: '#verano #sol',
        purpose: 'Campaña de verano para aumentar engagement',
        revisionsLimit: 5,
        initialStatus: 'IN_REVIEW',
      })
      expect(result.success).toBe(true)
    })

    test('rejects revisionsLimit below 1', () => {
      const result = createPostSchema.safeParse({ ...validBase, revisionsLimit: 0 })
      expect(result.success).toBe(false)
    })

    test('rejects revisionsLimit above 10', () => {
      const result = createPostSchema.safeParse({ ...validBase, revisionsLimit: 11 })
      expect(result.success).toBe(false)
    })

    test('accepts revisionsLimit boundary values 1 and 10', () => {
      expect(createPostSchema.safeParse({ ...validBase, revisionsLimit: 1 }).success).toBe(true)
      expect(createPostSchema.safeParse({ ...validBase, revisionsLimit: 10 }).success).toBe(true)
    })

    test('rejects purpose longer than 1000 characters', () => {
      const longPurpose = 'a'.repeat(1001)
      const result = createPostSchema.safeParse({ ...validBase, purpose: longPurpose })
      expect(result.success).toBe(false)
    })

    test('accepts purpose of exactly 1000 characters', () => {
      const maxPurpose = 'a'.repeat(1000)
      const result = createPostSchema.safeParse({ ...validBase, purpose: maxPurpose })
      expect(result.success).toBe(true)
    })

    test('rejects invalid referenceLink URL', () => {
      const result = createPostSchema.safeParse({
        ...validBase,
        referenceLink: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })

    test('accepts valid referenceLink URL', () => {
      const result = createPostSchema.safeParse({
        ...validBase,
        referenceLink: 'https://example.com/reference',
      })
      expect(result.success).toBe(true)
    })

    test('accepts empty string referenceLink (clears the field)', () => {
      const result = createPostSchema.safeParse({
        ...validBase,
        referenceLink: '',
      })
      expect(result.success).toBe(true)
    })

    test('rejects invalid initialStatus', () => {
      const result = createPostSchema.safeParse({
        ...validBase,
        initialStatus: 'PUBLISHED',
      })
      expect(result.success).toBe(false)
    })

    test('accepts initialStatus DRAFT and IN_REVIEW', () => {
      expect(createPostSchema.safeParse({ ...validBase, initialStatus: 'DRAFT' }).success).toBe(true)
      expect(createPostSchema.safeParse({ ...validBase, initialStatus: 'IN_REVIEW' }).success).toBe(true)
    })

    test('defaults revisionsLimit to 3', () => {
      const result = createPostSchema.safeParse(validBase)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.revisionsLimit).toBe(3)
      }
    })

    test('defaults initialStatus to DRAFT', () => {
      const result = createPostSchema.safeParse(validBase)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.initialStatus).toBe('DRAFT')
      }
    })
  })
})

// ─── updatePostContentSchema ───────────────────────────────────────────────────

describe('updatePostContentSchema', () => {
  test('requires id', () => {
    const result = updatePostContentSchema.safeParse({ title: 'Nuevo título' })
    expect(result.success).toBe(false)
  })

  test('accepts partial update with only id', () => {
    const result = updatePostContentSchema.safeParse({ id: 'post-abc' })
    expect(result.success).toBe(true)
  })

  test('accepts null scheduledAt to clear schedule', () => {
    const result = updatePostContentSchema.safeParse({
      id: 'post-abc',
      scheduledAt: null,
    })
    expect(result.success).toBe(true)
  })

  test('accepts null categoryId to clear category', () => {
    const result = updatePostContentSchema.safeParse({
      id: 'post-abc',
      categoryId: null,
    })
    expect(result.success).toBe(true)
  })

  test('rejects purpose longer than 1000 characters', () => {
    const result = updatePostContentSchema.safeParse({
      id: 'post-abc',
      purpose: 'x'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})

// ─── updatePostStatusSchema ────────────────────────────────────────────────────

describe('updatePostStatusSchema', () => {
  test('rejects missing id', () => {
    const result = updatePostStatusSchema.safeParse({ toStatus: 'APPROVED' })
    expect(result.success).toBe(false)
  })

  test('rejects invalid toStatus', () => {
    const result = updatePostStatusSchema.safeParse({ id: 'post-abc', toStatus: 'INVALID' })
    expect(result.success).toBe(false)
  })

  test('accepts all valid statuses', () => {
    const statuses = ['DRAFT', 'IN_REVIEW', 'CLIENT_CHANGES', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'PAUSED', 'CANCELLED'] as const
    statuses.forEach((toStatus) => {
      const result = updatePostStatusSchema.safeParse({ id: 'post-abc', toStatus })
      expect(result.success).toBe(true)
    })
  })

  test('accepts optional note', () => {
    const result = updatePostStatusSchema.safeParse({
      id: 'post-abc',
      toStatus: 'APPROVED',
      note: 'Se aprueba con cambios menores',
    })
    expect(result.success).toBe(true)
  })
})

// ─── addPostCommentSchema ──────────────────────────────────────────────────────

describe('addPostCommentSchema', () => {
  test('rejects empty content', () => {
    const result = addPostCommentSchema.safeParse({ postId: 'p1', content: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('vacío')
    }
  })

  test('accepts valid comment', () => {
    const result = addPostCommentSchema.safeParse({
      postId: 'p1',
      content: 'Por favor cambia el color del fondo',
    })
    expect(result.success).toBe(true)
  })

  test('defaults isInternal to false', () => {
    const result = addPostCommentSchema.safeParse({
      postId: 'p1',
      content: 'Comentario externo',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isInternal).toBe(false)
    }
  })
})
