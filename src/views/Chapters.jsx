import { useMemo, useRef, useState } from 'react'
import JourneyRibbon from '../components/JourneyRibbon.jsx'
import MomentScrubber from '../components/MomentScrubber.jsx'
import ReceiptCard from '../components/ReceiptCard.jsx'
import ReceiptDetail from '../components/ReceiptDetail.jsx'
import { computeChapterStats, momentReasonSummary } from '../lib/clustering'
import { chapterNarrative } from '../lib/narrative'
import styles from './Chapters.module.css'

export default function Chapters({ life }) {
  const [active, setActive] = useState(null)

  if (life.status === 'loading') return <p className="container">Loading&hellip;</p>
  if (life.status === 'error') return <p className="container">Couldn&rsquo;t load the dataset.</p>

  const { receipts, persona, moments, edges } = life

  return (
    <div className={`container ${styles.wrap}`}>
      <header className={styles.intro}>
        <h1>The Story</h1>
        <p>
          Six chapters, auto-summarised from the receipts that fall inside each one. The scenes
          below aren&rsquo;t hand-placed &mdash; they&rsquo;re moments the connection engine found
          because several different receipt types happened together.
        </p>
      </header>

      <section className={styles.glance} aria-labelledby="glance-heading">
        <h2 id="glance-heading" className={styles.glanceHeading}>
          The year at a glance
        </h2>
        <p className={styles.glanceHint}>
          Each bar is one week &mdash; taller means more happened, colour is the week&rsquo;s
          dominant mood, and a glowing dot marks a moment worth revisiting. Click any week to
          jump to its chapter.
        </p>
        <JourneyRibbon receipts={receipts} persona={persona} />
      </section>

      {persona.chapters.map((chapter) => (
        <ChapterSection
          key={chapter.key}
          chapter={chapter}
          receipts={receipts}
          moments={moments}
          edges={edges}
          onSelect={setActive}
        />
      ))}

      <ReceiptDetail receipt={active} life={life} onClose={() => setActive(null)} onSelect={setActive} />
    </div>
  )
}

function ChapterSection({ chapter, receipts, moments, edges, onSelect }) {
  const stats = useMemo(() => computeChapterStats(receipts, chapter), [receipts, chapter])
  const [showPairs, setShowPairs] = useState(false)
  const [activeMomentIndex, setActiveMomentIndex] = useState(0)
  const sceneRefs = useRef({})
  const chapterMoments = useMemo(() => {
    const start = new Date(chapter.start).getTime()
    const end = new Date(chapter.end).getTime()
    return moments.filter((m) => {
      const t = new Date(m.date).getTime()
      return t >= start && t <= end
    })
  }, [moments, chapter])

  // A moment of just two receipts is still a real connection, but rendering
  // 60+ of them as full scene cards buries the genuinely rich moments. Scenes
  // of 3+ receipts (or any golden moment) get the full treatment; pairs are
  // folded into a compact, expandable list instead.
  const notableMoments = chapterMoments.filter((m) => m.receipts.length >= 3 || m.isGolden)
  const pairMoments = chapterMoments.filter((m) => m.receipts.length === 2 && !m.isGolden)

  const clusteredIds = new Set(chapterMoments.flatMap((m) => m.receipts.map((r) => r.id)))
  const looseCount = stats.receipts.filter((r) => !clusteredIds.has(r.id)).length

  function jumpToMoment(index) {
    setActiveMomentIndex(index)
    const moment = notableMoments[index]
    sceneRefs.current[moment.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section
      id={`chapter-${chapter.key}`}
      className={styles.chapter}
      aria-labelledby={`chapter-${chapter.key}-heading`}
    >
      <div className={styles.chapterHeader}>
        <h2 id={`chapter-${chapter.key}-heading`}>{chapter.title}</h2>
        <p className={styles.range}>
          {new Date(chapter.start).toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}
          {' – '}
          {new Date(chapter.end).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <p className={styles.narrative}>{chapterNarrative(chapter.key, stats)}</p>
      </div>

      <MomentScrubber moments={notableMoments} activeIndex={activeMomentIndex} onJump={jumpToMoment} />

      <div className={styles.scenes}>
        {notableMoments.map((moment, i) => (
          <div
            key={moment.id}
            ref={(el) => (sceneRefs.current[moment.id] = el)}
            className={i === activeMomentIndex ? styles.sceneFocused : undefined}
          >
            <Scene moment={moment} edges={edges} onSelect={onSelect} />
          </div>
        ))}
      </div>

      {pairMoments.length > 0 && (
        <div className={styles.pairsBlock}>
          <button
            type="button"
            className={styles.pairsToggle}
            aria-expanded={showPairs}
            onClick={() => setShowPairs((s) => !s)}
          >
            {showPairs ? 'Hide' : 'Show'} {pairMoments.length} smaller two-receipt connections
          </button>
          {showPairs && (
            <ul className={styles.pairsList}>
              {pairMoments.map((m) => (
                <li key={m.id}>
                  <button type="button" className={styles.pairRow} onClick={() => onSelect(m.receipts[0])}>
                    <span>{m.title}</span>
                    <span className={styles.pairItems}>
                      {m.receipts.map((r) => r.title).join(' + ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {looseCount > 0 && (
        <p className={styles.loose}>
          + {looseCount} more receipts this chapter that stood alone, without a strong enough
          connection to another moment.
        </p>
      )}
    </section>
  )
}

function Scene({ moment, edges, onSelect }) {
  const reasons = momentReasonSummary(moment, edges)
  return (
    <article className={`${styles.scene} ${moment.isGolden ? styles.goldenScene : ''}`}>
      <div className={styles.sceneHeader}>
        <h3 className={styles.sceneTitle}>{moment.title}</h3>
        {reasons.length > 0 && (
          <p className={styles.sceneReason}>
            {reasons.slice(0, 2).map((r) => r.label).join(' · ')}
          </p>
        )}
      </div>
      <div className={styles.sceneCards}>
        {moment.receipts.map((r) => (
          <ReceiptCard key={r.id} receipt={r} compact onSelect={onSelect} />
        ))}
      </div>
    </article>
  )
}
