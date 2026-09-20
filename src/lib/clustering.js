// ---------------------------------------------------------------------------
// The connection-discovery engine.
//
// The dataset only carries raw signals on each receipt: a timestamp, tags,
// an optional location, people mentioned, and a mood. Nothing in the data
// says "these five receipts are one moment" or "this pattern repeats".
// Everything in this file derives that structure at runtime, so the same
// logic that decides what a "moment" is also decides what counts as a
// "connection" in the Constellation view and a "pattern" in the insight
// panels. There is no hidden id linking related receipts together.
// ---------------------------------------------------------------------------

const CHAPTER_TAGS = new Set([
  'autopilot', 'the-trip', 'unraveling', 'rebuilding', 'the-sprint', 'new-constellations',
])
const GENERIC_TAGS = new Set([
  'music', 'purchase', 'photo', 'message', 'search', 'event', 'note', 'place',
  'check-in', 'played-through', 'golden-moment', 'entertainment',
])

/** Tags that actually carry meaning for connection-finding (strip chapter/type noise). */
function meaningfulTags(receipt) {
  return receipt.tags.filter((t) => !CHAPTER_TAGS.has(t) && !GENERIC_TAGS.has(t))
}

function overlap(a, b) {
  if (!a?.length || !b?.length) return []
  const setB = new Set(b)
  return a.filter((x) => setB.has(x))
}

/**
 * Score + explain a candidate connection between two receipts.
 * Returns null when the pair isn't meaningfully connected.
 */
export function scoreConnection(r1, r2) {
  if (r1.id === r2.id) return null
  const t1 = new Date(r1.timestamp).getTime()
  const t2 = new Date(r2.timestamp).getTime()
  const hoursApart = Math.abs(t1 - t2) / (60 * 60 * 1000)

  let weight = 0
  const reasons = []

  if (hoursApart <= 6) {
    weight += 4
    reasons.push({ kind: 'time', label: 'Happened within hours of each other' })
  } else if (hoursApart <= 30) {
    weight += 2
    reasons.push({ kind: 'time', label: 'Same day' })
  } else {
    return null // outside the "moment" window entirely — not a scene-level connection
  }

  if (r1.location?.name && r1.location.name === r2.location?.name) {
    weight += 4
    reasons.push({ kind: 'location', label: `Both at ${r1.location.name}` })
  }

  const peopleShared = overlap(r1.people, r2.people)
  if (peopleShared.length) {
    weight += 3 * Math.min(peopleShared.length, 2)
    reasons.push({ kind: 'people', label: `Both involve ${peopleShared.join(' & ')}` })
  }

  const tagsShared = overlap(meaningfulTags(r1), meaningfulTags(r2))
  if (tagsShared.length) {
    weight += 2 * Math.min(tagsShared.length, 2)
    reasons.push({ kind: 'tag', label: `Shared theme: ${tagsShared.join(', ')}` })
  }

  if (r1.mood && r1.mood === r2.mood) {
    weight += 1
    reasons.push({ kind: 'mood', label: `Same mood: ${r1.mood}` })
  }

  if (weight < 5) return null // require at least time + one corroborating signal
  return { weight, reasons }
}

/**
 * Groups receipts into "moments" — connected components of receipts that are
 * close in time and share a location, person, or theme. This is what powers
 * both the Chapter scenes and the Constellation graph.
 */
export function buildMoments(receipts) {
  const sorted = [...receipts].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  )

  // Bucket by day (+ neighbouring day) so we only ever compare receipts that
  // could plausibly be within the 30h window scoreConnection allows.
  const byDay = new Map()
  for (const r of sorted) {
    const dayKey = r.timestamp.slice(0, 10)
    if (!byDay.has(dayKey)) byDay.set(dayKey, [])
    byDay.get(dayKey).push(r)
  }

  const edges = new Map() // id -> [{ to, weight, reasons }]
  const addEdge = (a, b, score) => {
    if (!edges.has(a.id)) edges.set(a.id, [])
    if (!edges.has(b.id)) edges.set(b.id, [])
    edges.get(a.id).push({ to: b.id, ...score })
    edges.get(b.id).push({ to: a.id, ...score })
  }

  const dayKeys = [...byDay.keys()].sort()
  for (let i = 0; i < dayKeys.length; i++) {
    const key = dayKeys[i]
    const nextKey = dayKeys[i + 1]
    const bucket = byDay.get(key)
    const nextBucket = nextKey ? byDay.get(nextKey) || [] : []
    const candidates = [...bucket, ...nextBucket]

    for (let a = 0; a < bucket.length; a++) {
      for (let b = a + 1; b < candidates.length; b++) {
        const score = scoreConnection(bucket[a], candidates[b])
        if (score) addEdge(bucket[a], candidates[b], score)
      }
    }
  }

  // Union-find over the edge graph to get connected components ("moments").
  const parent = new Map(sorted.map((r) => [r.id, r.id]))
  const find = (x) => {
    while (parent.get(x) !== x) x = parent.get(x)
    return x
  }
  const union = (x, y) => {
    const rx = find(x)
    const ry = find(y)
    if (rx !== ry) parent.set(rx, ry)
  }
  for (const [id, list] of edges) for (const e of list) union(id, e.to)

  const byId = new Map(sorted.map((r) => [r.id, r]))
  const groups = new Map()
  for (const r of sorted) {
    const root = find(r.id)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(r)
  }

  const moments = []
  for (const group of groups.values()) {
    if (group.length < 2) continue
    group.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    moments.push({
      id: `moment-${group[0].id}`,
      receipts: group,
      date: group[0].timestamp.slice(0, 10),
      title: titleForMoment(group),
      isGolden: group.some((r) => r.tags.includes('golden-moment')),
    })
  }

  moments.sort((a, b) => new Date(a.date) - new Date(b.date))
  return { moments, edges, byId }
}

function titleForMoment(group) {
  const locations = group.map((r) => r.location?.name).filter(Boolean)
  const people = [...new Set(group.flatMap((r) => r.people || []))]
  const tags = [...new Set(group.flatMap(meaningfulTags))]
  const dateLabel = new Date(group[0].timestamp).toLocaleDateString('en-IN', {
    month: 'short', day: 'numeric',
  })

  if (locations.length && locations.every((l) => l === locations[0])) {
    return `${locations[0]} — ${dateLabel}`
  }
  if (people.length) {
    return `With ${people.slice(0, 2).join(' & ')} — ${dateLabel}`
  }
  if (tags.length) {
    return `${tags[0][0].toUpperCase()}${tags[0].slice(1).replace(/-/g, ' ')} — ${dateLabel}`
  }
  return `A moment — ${dateLabel}`
}

/**
 * Explains why two specific receipts are connected (used by the detail
 * panel when a user pivots from one receipt to a related one).
 */
export function explainConnection(r1, r2) {
  const score = scoreConnection(r1, r2)
  return score ? score.reasons : []
}

/**
 * Recurring-pattern detector: independent of the day-bucketed moment graph
 * above, this looks across the *entire* timeline for people, places and
 * themes that keep resurfacing, and reports when they start, peak, and (if
 * relevant) drop off. This is what notices "Kabir appears in 41 receipts,
 * then nothing after February" without being told where the chapters are.
 */
export function computeRecurringPatterns(receipts, chapters) {
  const patterns = []

  const byPerson = new Map()
  const byLocation = new Map()
  const byTag = new Map()

  for (const r of receipts) {
    for (const p of r.people || []) {
      if (!byPerson.has(p)) byPerson.set(p, [])
      byPerson.get(p).push(r)
    }
    if (r.location?.name) {
      const loc = r.location.name
      if (!byLocation.has(loc)) byLocation.set(loc, [])
      byLocation.get(loc).push(r)
    }
    for (const t of meaningfulTags(r)) {
      if (!byTag.has(t)) byTag.set(t, [])
      byTag.get(t).push(r)
    }
  }

  const chapterIndex = (ts) => {
    const t = new Date(ts).getTime()
    return chapters.findIndex(
      (c) => t >= new Date(c.start).getTime() && t <= new Date(c.end).getTime()
    )
  }

  const describeSpan = (list) => {
    if (list.length < 3) return null
    const idxs = list.map((r) => chapterIndex(r.timestamp)).filter((i) => i >= 0)
    const first = Math.min(...idxs)
    const last = Math.max(...idxs)
    const span = last - first + 1
    const fadedOut = last < chapters.length - 1
    return { first, last, span, fadedOut }
  }

  for (const [person, list] of byPerson) {
    const span = describeSpan(list)
    if (!span) continue
    let detail
    if (span.fadedOut) {
      detail = `Appears through "${chapters[span.first].title}" → "${chapters[span.last].title}", then disappears entirely.`
    } else if (span.span === chapters.length) {
      detail = `Present across the whole year — ${chapters.length} chapters.`
    } else {
      detail = `First shows up in "${chapters[span.first].title}", still present in "${chapters[span.last].title}".`
    }
    patterns.push({
      type: 'person', label: person, count: list.length, detail,
      receiptIds: list.map((r) => r.id), first: span.first, last: span.last,
    })
  }

  for (const [loc, list] of byLocation) {
    if (list.length < 4) continue
    const span = describeSpan(list)
    patterns.push({
      type: 'location', label: loc, count: list.length,
      detail: span
        ? `Visited ${list.length} times, mostly during "${chapters[span.first]?.title}".`
        : `Visited ${list.length} times.`,
      receiptIds: list.map((r) => r.id),
    })
  }

  for (const [tag, list] of byTag) {
    if (list.length < 6) continue
    const span = describeSpan(list)
    if (!span) continue
    patterns.push({
      type: 'theme', label: tag.replace(/-/g, ' '), count: list.length,
      detail: span.fadedOut
        ? `Recurs ${list.length} times, concentrated in "${chapters[span.first].title}"${span.span > 1 ? ` through "${chapters[span.last].title}"` : ''}, then fades.`
        : `Recurs ${list.length} times across the year.`,
      receiptIds: list.map((r) => r.id),
    })
  }

  return patterns.sort((a, b) => b.count - a.count)
}

/** Deduplicated list of "why this is one scene" reasons for a moment. */
export function momentReasonSummary(moment, edges) {
  const seen = new Set()
  const reasons = []
  for (const r of moment.receipts) {
    for (const edge of edges.get(r.id) || []) {
      const inMoment = moment.receipts.some((other) => other.id === edge.to)
      if (!inMoment) continue
      for (const reason of edge.reasons) {
        if (!seen.has(reason.label)) {
          seen.add(reason.label)
          reasons.push(reason)
        }
      }
    }
  }
  return reasons
}

/** Flattens the bidirectional edge map into a deduped list, scoped to a set of ids. */
export function flattenEdges(edges, idSet) {
  const seen = new Set()
  const list = []
  for (const [id, neighbours] of edges) {
    if (!idSet.has(id)) continue
    for (const edge of neighbours) {
      if (!idSet.has(edge.to)) continue
      const key = id < edge.to ? `${id}|${edge.to}` : `${edge.to}|${id}`
      if (seen.has(key)) continue
      seen.add(key)
      list.push({ a: id, b: edge.to, weight: edge.weight })
    }
  }
  return list
}

/** Per-chapter stats used to generate each chapter's data-driven intro line. */
export function computeChapterStats(receipts, chapter) {
  const start = new Date(chapter.start).getTime()
  const end = new Date(chapter.end).getTime()
  const inChapter = receipts.filter((r) => {
    const t = new Date(r.timestamp).getTime()
    return t >= start && t <= end
  })

  const moodCounts = new Map()
  const typeCounts = new Map()
  for (const r of inChapter) {
    moodCounts.set(r.mood, (moodCounts.get(r.mood) || 0) + 1)
    typeCounts.set(r.type, (typeCounts.get(r.type) || 0) + 1)
  }
  const dominantMood = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const skippedMusic = inChapter.filter((r) => r.type === 'music' && r.meta?.skipped).length
  const musicTotal = typeCounts.get('music') || 0

  return {
    receipts: inChapter,
    count: inChapter.length,
    dominantMood,
    typeCounts,
    skipRate: musicTotal ? skippedMusic / musicTotal : 0,
  }
}
