// Per-chapter narrative templates. The prose framing is authored, but every
// number plugged into it (mood, skip-rate, receipt count) is computed live
// from the dataset by computeChapterStats — nothing here is hardcoded data.
const TEMPLATES = {
  autopilot: (s) =>
    `${s.count} receipts, and almost all of them feel like muscle memory. The same commute, the same order, the ` +
    `same songs on loop — ${Math.round(s.skipRate * 100)}% of plays got skipped before the chorus, like nothing quite landed. ` +
    `Dominant mood: ${s.dominantMood}.`,
  'the-trip': (s) =>
    `${s.count} receipts packed into six weeks, and the shape changes completely: new places, new photos, spending that ` +
    `spikes around one weekend. Dominant mood: ${s.dominantMood}. This is what looking forward to something looks like in the data.`,
  unraveling: (s) =>
    `${s.count} receipts, and the late-night listening jumps while the messages get shorter. Search history starts asking ` +
    `questions it wasn't asking a month ago. Dominant mood: ${s.dominantMood}.`,
  rebuilding: (s) =>
    `${s.count} receipts, and a new set of places (a gym, a running loop) start repeating for the first time all year. ` +
    `New names appear in the messages. Dominant mood: ${s.dominantMood}.`,
  'the-sprint': (s) =>
    `${s.count} receipts, mostly clustered around one building. Coffee purchases climb, notes get shorter and more ` +
    `functional, and the music turns into something to work to rather than something to feel. Dominant mood: ${s.dominantMood}.`,
  'new-constellations': (s) =>
    `${s.count} receipts, and a new person enters the message threads for the first time. Concerts, trips, a wider ` +
    `radius of places. Dominant mood: ${s.dominantMood}.`,
}

export function chapterNarrative(chapterKey, stats) {
  const fn = TEMPLATES[chapterKey]
  return fn ? fn(stats) : `${stats.count} receipts. Dominant mood: ${stats.dominantMood}.`
}
