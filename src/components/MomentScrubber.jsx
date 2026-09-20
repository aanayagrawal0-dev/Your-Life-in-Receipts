import { useRef } from 'react'
import styles from './MomentScrubber.module.css'

const ITEM_HEIGHT = 40

function fmtShort(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

/**
 * A compact index scrubber for jumping between a chapter's notable moments —
 * inspired by the drag-wheel day picker + animated readout pattern in the
 * attached JournalNavigation reference (a draggable vertical index wheel
 * next to an animated date/title readout). Rebuilt with plain CSS
 * transitions and keyed remount animations rather than framer-motion, to
 * match this project's existing dependency-light approach.
 */
export default function MomentScrubber({ moments, activeIndex, onJump }) {
  const dragState = useRef(null)

  if (moments.length < 2) return null
  const active = moments[activeIndex]

  function clamp(i) {
    return Math.max(0, Math.min(moments.length - 1, i))
  }

  function handlePointerDown(e) {
    dragState.current = { startY: e.clientY, startIndex: activeIndex }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!dragState.current) return
    const dy = e.clientY - dragState.current.startY
    const delta = Math.round(-dy / ITEM_HEIGHT)
    const next = clamp(dragState.current.startIndex + delta)
    if (next !== activeIndex) onJump(next)
  }

  function handlePointerUp() {
    dragState.current = null
  }

  return (
    <div className={styles.wrap}>
      <div
        className={styles.wheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="group"
        aria-label="Jump to a moment in this chapter"
      >
        <div
          className={styles.wheelTrack}
          style={{ transform: `translateY(${-activeIndex * ITEM_HEIGHT}px)` }}
        >
          {moments.map((m, i) => (
            <button
              key={m.id}
              type="button"
              className={`${styles.wheelItem} ${i === activeIndex ? styles.wheelItemActive : ''}`}
              onClick={() => onJump(i)}
            >
              {String(i + 1).padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.readout}>
        <span key={`${active.id}-date`} className={styles.readoutDate}>
          {fmtShort(active.date)}
        </span>
        <span key={`${active.id}-title`} className={styles.readoutTitle}>
          {active.title}
        </span>
      </div>

      <div className={styles.buttons}>
        <button
          type="button"
          onClick={() => onJump(clamp(activeIndex - 1))}
          disabled={activeIndex === 0}
          aria-label="Previous moment"
        >
          &#8249;
        </button>
        <button
          type="button"
          onClick={() => onJump(clamp(activeIndex + 1))}
          disabled={activeIndex === moments.length - 1}
          aria-label="Next moment"
        >
          &#8250;
        </button>
      </div>
    </div>
  )
}
