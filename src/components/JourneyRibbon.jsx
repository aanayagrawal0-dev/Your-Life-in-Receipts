import { useMemo } from 'react'
import { computeWeeklyDensity } from '../lib/timeline'
import { MOOD_COLOR } from '../lib/constants'
import styles from './JourneyRibbon.module.css'

/**
 * The "clear visual representation of the journey": one bar per week of the
 * year, height = how much happened, colour = what it mostly felt like.
 * Golden-moment weeks get a marker. Every bar is a real, keyboard-reachable
 * button so this doubles as a navigation surface into Chapters — now a
 * smooth-scroll jump to that chapter's section id rather than a route, since
 * the whole site is one continuous scroll.
 */
export default function JourneyRibbon({ receipts, persona }) {
  const weeks = useMemo(() => computeWeeklyDensity(receipts, persona), [receipts, persona])
  const maxCount = Math.max(...weeks.map((w) => w.count), 1)

  return (
    <div className={styles.wrap}>
      <div className={styles.ribbon} role="list" aria-label="Weekly activity across the year">
        {weeks.map((w) => {
          const heightPct = Math.max(6, Math.round((w.count / maxCount) * 100))
          const color = MOOD_COLOR[w.dominantMood] || 'var(--border)'
          const dateLabel = w.start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
          return (
            <button
              type="button"
              role="listitem"
              key={w.index}
              className={styles.bar}
              style={{ '--bar-color': color }}
              onClick={() =>
                document
                  .getElementById(`chapter-${w.chapterKey}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              aria-label={`Week of ${dateLabel}, ${w.count} receipts, mostly ${w.dominantMood || 'quiet'}${w.hasGoldenMoment ? ', a key moment happened' : ''}. Chapter: ${w.chapterTitle || 'none'}. Open this chapter.`}
              title={`${dateLabel} · ${w.chapterTitle || ''}`}
            >
              <span className={styles.barFill} style={{ height: `${heightPct}%` }}>
                {w.hasGoldenMoment && <span className={styles.spark} aria-hidden="true" />}
              </span>
            </button>
          )
        })}
      </div>
      <div className={styles.chapterLabels} aria-hidden="true">
        {persona.chapters.map((c) => (
          <span key={c.key} className={styles.chapterLabel}>
            {c.title}
          </span>
        ))}
      </div>
    </div>
  )
}
