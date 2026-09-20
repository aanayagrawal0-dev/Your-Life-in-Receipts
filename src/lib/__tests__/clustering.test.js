import { describe, expect, it } from 'vitest'
import {
  buildMoments,
  computeChapterStats,
  computeRecurringPatterns,
  explainConnection,
  flattenEdges,
  scoreConnection,
} from '../clustering'

function receipt(overrides) {
  return {
    id: 'r0', type: 'music', timestamp: '2025-01-01T10:00:00',
    title: 'Track', subtitle: 'Artist', tags: ['music'], location: null,
    people: [], mood: 'content', meta: {},
    ...overrides,
  }
}

describe('scoreConnection', () => {
  it('returns null for receipts more than a day apart', () => {
    const a = receipt({ id: 'a', timestamp: '2025-01-01T10:00:00' })
    const b = receipt({ id: 'b', timestamp: '2025-01-05T10:00:00' })
    expect(scoreConnection(a, b)).toBeNull()
  })

  it('connects two receipts sharing a location and time window', () => {
    const a = receipt({ id: 'a', timestamp: '2025-01-01T20:00:00', location: { name: 'Cafe' } })
    const b = receipt({
      id: 'b', type: 'purchase', timestamp: '2025-01-01T20:15:00', location: { name: 'Cafe' },
    })
    const score = scoreConnection(a, b)
    expect(score).not.toBeNull()
    expect(score.weight).toBeGreaterThanOrEqual(5)
    expect(score.reasons.some((r) => r.kind === 'location')).toBe(true)
  })

  it('does not connect same-day receipts with no shared signal', () => {
    const a = receipt({ id: 'a', timestamp: '2025-01-01T08:00:00', mood: 'content' })
    const b = receipt({ id: 'b', timestamp: '2025-01-01T20:00:00', type: 'note', mood: 'anxious' })
    // more than 6h apart (same-day weight only, 2) and no shared mood/location/people/tag
    // is below the minimum threshold (5)
    expect(scoreConnection(a, b)).toBeNull()
  })

  it('explainConnection mirrors scoreConnection reasons', () => {
    const a = receipt({ id: 'a', timestamp: '2025-01-01T20:00:00', people: ['Kabir'] })
    const b = receipt({ id: 'b', timestamp: '2025-01-01T20:05:00', people: ['Kabir'], type: 'message' })
    expect(explainConnection(a, b).length).toBeGreaterThan(0)
  })
})

describe('buildMoments', () => {
  it('groups tightly connected receipts into one moment', () => {
    const receipts = [
      receipt({ id: 'a', timestamp: '2025-02-01T21:00:00', location: { name: 'Rooftop' }, people: ['Kabir'] }),
      receipt({ id: 'b', timestamp: '2025-02-01T21:05:00', type: 'photo', location: { name: 'Rooftop' }, people: ['Kabir'] }),
      receipt({ id: 'c', timestamp: '2025-06-01T09:00:00' }), // unrelated, far away in time
    ]
    const { moments } = buildMoments(receipts)
    expect(moments.length).toBe(1)
    expect(moments[0].receipts.map((r) => r.id).sort()).toEqual(['a', 'b'])
  })

  it('ignores receipts that never form a strong-enough connection', () => {
    const receipts = [
      receipt({ id: 'a', timestamp: '2025-02-01T21:00:00' }),
      receipt({ id: 'b', timestamp: '2025-03-01T21:00:00' }),
    ]
    const { moments } = buildMoments(receipts)
    expect(moments.length).toBe(0)
  })
})

describe('flattenEdges', () => {
  it('dedupes bidirectional edges scoped to an id set', () => {
    const edges = new Map([
      ['a', [{ to: 'b', weight: 5, reasons: [] }]],
      ['b', [{ to: 'a', weight: 5, reasons: [] }]],
    ])
    const list = flattenEdges(edges, new Set(['a', 'b']))
    expect(list.length).toBe(1)
  })
})

describe('computeRecurringPatterns', () => {
  const chapters = [
    { key: 'ch1', title: 'Chapter One', start: '2025-01-01T00:00:00', end: '2025-01-31T23:59:59' },
    { key: 'ch2', title: 'Chapter Two', start: '2025-02-01T00:00:00', end: '2025-02-28T23:59:59' },
  ]

  it('detects a person who disappears after a chapter', () => {
    const receipts = [
      receipt({ id: 'a', timestamp: '2025-01-05T10:00:00', people: ['Kabir'] }),
      receipt({ id: 'b', timestamp: '2025-01-10T10:00:00', people: ['Kabir'] }),
      receipt({ id: 'c', timestamp: '2025-01-15T10:00:00', people: ['Kabir'] }),
    ]
    const patterns = computeRecurringPatterns(receipts, chapters)
    const kabir = patterns.find((p) => p.label === 'Kabir')
    expect(kabir).toBeDefined()
    expect(kabir.detail).toMatch(/Chapter One/)
  })
})

describe('computeChapterStats', () => {
  it('scopes receipts to the chapter date range and finds dominant mood', () => {
    const chapter = { key: 'ch1', start: '2025-01-01T00:00:00', end: '2025-01-31T23:59:59' }
    const receipts = [
      receipt({ id: 'a', timestamp: '2025-01-05T10:00:00', mood: 'sad' }),
      receipt({ id: 'b', timestamp: '2025-01-06T10:00:00', mood: 'sad' }),
      receipt({ id: 'c', timestamp: '2025-02-05T10:00:00', mood: 'happy' }), // outside chapter
    ]
    const stats = computeChapterStats(receipts, chapter)
    expect(stats.count).toBe(2)
    expect(stats.dominantMood).toBe('sad')
  })
})
