import { describe, expect, it } from 'vitest'
import { computeWeeklyDensity } from '../timeline'

describe('computeWeeklyDensity', () => {
  const persona = {
    range: { start: '2025-01-01T00:00:00', end: '2025-01-21T23:59:59' },
    chapters: [{ key: 'ch1', title: 'Chapter One', start: '2025-01-01T00:00:00', end: '2025-01-21T23:59:59' }],
  }

  it('buckets receipts into the correct week and finds the dominant mood', () => {
    const receipts = [
      { timestamp: '2025-01-02T10:00:00', mood: 'happy', tags: [] },
      { timestamp: '2025-01-03T10:00:00', mood: 'happy', tags: [] },
      { timestamp: '2025-01-04T10:00:00', mood: 'sad', tags: [] },
      { timestamp: '2025-01-10T10:00:00', mood: 'calm', tags: [] },
    ]
    const weeks = computeWeeklyDensity(receipts, persona)
    expect(weeks[0].count).toBe(3)
    expect(weeks[0].dominantMood).toBe('happy')
    expect(weeks[1].count).toBe(1)
  })

  it('flags a week containing a golden moment', () => {
    const receipts = [
      { timestamp: '2025-01-02T10:00:00', mood: 'happy', tags: ['golden-moment'] },
    ]
    const weeks = computeWeeklyDensity(receipts, persona)
    expect(weeks[0].hasGoldenMoment).toBe(true)
  })
})
