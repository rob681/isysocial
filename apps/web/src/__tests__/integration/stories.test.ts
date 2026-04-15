import { describe, test, expect } from 'vitest'
import { createPostSchema, storyDataSchema, storyElementSchema } from '@isysocial/shared'

// ─── Story Creation — clientId validation ─────────────────────────────────────
//
// Validates the guard that every story post MUST have a valid clientId.
// In the UI, the editor page reads `?clientId=` from the URL and redirects
// back to the calendar if it's missing. These tests verify that the schema
// layer enforces the same constraint so nothing slips through to the API.

describe('Story Creation - clientId validation', () => {
  const validStoryBase = {
    clientId: 'client-xyz',
    network: 'INSTAGRAM' as const,
    postType: 'STORY' as const,
  }

  test('should reject empty clientId', () => {
    const result = createPostSchema.safeParse({ ...validStoryBase, clientId: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const clientIdIssue = result.error.issues.find((i) => i.path.includes('clientId'))
      expect(clientIdIssue).toBeDefined()
    }
  })

  test('should reject null clientId', () => {
    const result = createPostSchema.safeParse({ ...validStoryBase, clientId: null })
    expect(result.success).toBe(false)
  })

  test('should reject undefined clientId', () => {
    const { clientId: _omit, ...rest } = validStoryBase
    const result = createPostSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  test('should accept valid clientId', () => {
    const result = createPostSchema.safeParse(validStoryBase)
    expect(result.success).toBe(true)
  })

  test('should accept story post for all networks that support it', () => {
    // FACEBOOK and INSTAGRAM support STORY
    const storyNetworks = ['FACEBOOK', 'INSTAGRAM'] as const
    storyNetworks.forEach((network) => {
      const result = createPostSchema.safeParse({ ...validStoryBase, network })
      expect(result.success).toBe(true)
    })
  })
})

// ─── storyDataSchema validation ───────────────────────────────────────────────
//
// The story canvas saves a structured JSON blob that must conform to this
// schema before it can be stored. These tests verify the canvas editor
// output will be accepted or rejected correctly.

describe('storyDataSchema - canvas structure validation', () => {
  const validElement = {
    id: 'el-1',
    type: 'text' as const,
    x: 100,
    y: 200,
    width: 300,
    height: 50,
    rotation: 0,
    opacity: 1,
    props: { text: 'Hola mundo', fontSize: 24, color: '#ffffff' },
  }

  const validStoryData = {
    version: 1 as const,
    width: 1080 as const,
    height: 1920 as const,
    background: { type: 'color' as const, value: '#ff5733' },
    elements: [validElement],
  }

  test('accepts valid story data with text element', () => {
    const result = storyDataSchema.safeParse(validStoryData)
    expect(result.success).toBe(true)
  })

  test('accepts story with no elements (blank canvas)', () => {
    const result = storyDataSchema.safeParse({ ...validStoryData, elements: [] })
    expect(result.success).toBe(true)
  })

  test('rejects wrong canvas version', () => {
    const result = storyDataSchema.safeParse({ ...validStoryData, version: 2 })
    expect(result.success).toBe(false)
  })

  test('rejects wrong canvas width', () => {
    const result = storyDataSchema.safeParse({ ...validStoryData, width: 1200 })
    expect(result.success).toBe(false)
  })

  test('rejects wrong canvas height', () => {
    const result = storyDataSchema.safeParse({ ...validStoryData, height: 1080 })
    expect(result.success).toBe(false)
  })

  test('rejects invalid background type', () => {
    const result = storyDataSchema.safeParse({
      ...validStoryData,
      background: { type: 'video', value: 'https://example.com/video.mp4' },
    })
    expect(result.success).toBe(false)
  })

  test('accepts gradient background', () => {
    const result = storyDataSchema.safeParse({
      ...validStoryData,
      background: { type: 'gradient', value: 'linear-gradient(to bottom, #ff0000, #0000ff)' },
    })
    expect(result.success).toBe(true)
  })

  test('accepts image background', () => {
    const result = storyDataSchema.safeParse({
      ...validStoryData,
      background: { type: 'image', value: 'https://cdn.example.com/bg.jpg' },
    })
    expect(result.success).toBe(true)
  })
})

// ─── storyElementSchema validation ────────────────────────────────────────────

describe('storyElementSchema - individual element validation', () => {
  const baseElement = {
    id: 'el-1',
    x: 50,
    y: 100,
    width: 200,
    height: 80,
    props: {},
  }

  test('accepts all valid element types', () => {
    const types = ['text', 'sticker', 'image', 'shape'] as const
    types.forEach((type) => {
      const result = storyElementSchema.safeParse({ ...baseElement, type })
      expect(result.success).toBe(true)
    })
  })

  test('rejects invalid element type', () => {
    const result = storyElementSchema.safeParse({ ...baseElement, type: 'video' })
    expect(result.success).toBe(false)
  })

  test('defaults rotation to 0', () => {
    const result = storyElementSchema.safeParse({ ...baseElement, type: 'text' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rotation).toBe(0)
    }
  })

  test('defaults opacity to 1', () => {
    const result = storyElementSchema.safeParse({ ...baseElement, type: 'text' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.opacity).toBe(1)
    }
  })

  test('rejects opacity below 0', () => {
    const result = storyElementSchema.safeParse({ ...baseElement, type: 'text', opacity: -0.1 })
    expect(result.success).toBe(false)
  })

  test('rejects opacity above 1', () => {
    const result = storyElementSchema.safeParse({ ...baseElement, type: 'text', opacity: 1.5 })
    expect(result.success).toBe(false)
  })

  test('accepts opacity at boundary values 0 and 1', () => {
    expect(storyElementSchema.safeParse({ ...baseElement, type: 'text', opacity: 0 }).success).toBe(true)
    expect(storyElementSchema.safeParse({ ...baseElement, type: 'text', opacity: 1 }).success).toBe(true)
  })
})

// ─── createPostSchema with storyData ──────────────────────────────────────────

describe('createPostSchema - storyData field', () => {
  const validStoryData = {
    version: 1 as const,
    width: 1080 as const,
    height: 1920 as const,
    background: { type: 'color' as const, value: '#000000' },
    elements: [],
  }

  test('accepts story post with valid storyData', () => {
    const result = createPostSchema.safeParse({
      clientId: 'client-123',
      network: 'INSTAGRAM',
      postType: 'STORY',
      storyData: validStoryData,
    })
    expect(result.success).toBe(true)
  })

  test('accepts story post without storyData (draft before canvas is used)', () => {
    const result = createPostSchema.safeParse({
      clientId: 'client-123',
      network: 'INSTAGRAM',
      postType: 'STORY',
    })
    expect(result.success).toBe(true)
  })

  test('rejects story post with malformed storyData', () => {
    const result = createPostSchema.safeParse({
      clientId: 'client-123',
      network: 'INSTAGRAM',
      postType: 'STORY',
      storyData: {
        version: 1,
        width: 800, // invalid — must be 1080
        height: 1920,
        background: { type: 'color', value: '#000' },
        elements: [],
      },
    })
    expect(result.success).toBe(false)
  })
})
