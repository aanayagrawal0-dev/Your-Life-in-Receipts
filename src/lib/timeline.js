const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Buckets every receipt into calendar weeks across the persona's date range,
 * so the Journey view can render one bar per week: how much happened, what
 * it mostly felt like, and which chapter it falls in.
 */
export function computeWeeklyDensity(receipts, persona) {
  const start = new Date(persona.range.start).getTime()
  const end = new Date(persona.range.end).getTime()
  const weekCount = Math.ceil((end - start) / WEEK_MS) + 1

  const weeks = Array.from({ length: weekCount }, (_, i) => ({
    index: i,
    start: new Date(start + i * WEEK_MS),
    receipts: [],
  }))

  for (const r of receipts) {
    const t = new Date(r.timestamp).getTime()
    const idx = Math.min(weekCount - 1, Math.max(0, Math.floor((t - start) / WEEK_MS)))
    weeks[idx].receipts.push(r)
  }

  return weeks.map((w) => {
    const moodCounts = new Map()
    for (const r of w.receipts) moodCounts.set(r.mood, (moodCounts.get(r.mood) || 0) + 1)
    const dominantMood = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null

    const chapter = persona.chapters.find((c) => {
      const cs = new Date(c.start).getTime()
      const ce = new Date(c.end).getTime()
      return w.start.getTime() >= cs && w.start.getTime() <= ce
    })

    return {
      index: w.index,
      start: w.start,
      count: w.receipts.length,
      dominantMood,
      chapterKey: chapter?.key || null,
      chapterTitle: chapter?.title || null,
      hasGoldenMoment: w.receipts.some((r) => r.tags.includes('golden-moment')),
    }
  })
}
