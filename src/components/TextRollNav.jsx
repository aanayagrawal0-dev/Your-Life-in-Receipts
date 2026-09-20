import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './TextRollNav.module.css'

// Original implementation of the same idea as Skiper UI's "Text Roll
// Navigation" (skiper58): a full-page overlay menu whose links roll each
// character out on hover/focus. Built from scratch in plain CSS Modules
// (no Tailwind/shadcn, no animation library) to match this project's
// existing approach — the per-character roll is done with two stacked
// copies of each character in an overflow-hidden box, translated on
// hover, with a staggered transition-delay per character index.

function RollChar({ children, index }) {
  const char = children === ' ' ? ' ' : children
  return (
    <span className={styles.charBox} style={{ '--i': index }}>
      <span className={styles.charFace}>{char}</span>
      <span className={styles.charFace} aria-hidden="true">
        {char}
      </span>
    </span>
  )
}

function RollLink({ id, label, itemIndex, active, onNavigate }) {
  const chars = Array.from(label)
  return (
    <a
      href={`#${id}`}
      onClick={(e) => {
        e.preventDefault()
        onNavigate(id)
      }}
      aria-label={label}
      aria-current={active ? 'location' : undefined}
      className={`${styles.rollLink} ${active ? styles.rollLinkActive : ''}`}
      style={{ '--link-delay': `${itemIndex * 60}ms` }}
    >
      <span aria-hidden="true" className={styles.rollLinkChars}>
        {chars.map((c, i) => (
          <RollChar key={i} index={i}>
            {c}
          </RollChar>
        ))}
      </span>
    </a>
  )
}

/**
 * Renders both the persistent menu-trigger button and the full-viewport
 * overlay it opens. The overlay covers the entire page (not just a
 * dropdown), traps focus, locks background scroll, sets `inert` on
 * everything behind it, and closes on Escape, backdrop click, link click,
 * or the close button.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function TextRollNav({ items, activeId, onNavigate, extra }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const closeRef = useRef(null)
  const overlayRef = useRef(null)

  function handleNavigate(id) {
    setOpen(false)
    // Wait a couple of frames before scrolling: closing the overlay lifts
    // the `overflow: hidden` body-scroll lock via an effect cleanup, and if
    // that removal lands in the same tick as scrollIntoView, the browser's
    // scroll-snap machinery re-evaluates mid-call and can override the
    // requested section with whichever snap point is nearest instead.
    // Letting the lock finish releasing first avoids that race.
    requestAnimationFrame(() => requestAnimationFrame(() => onNavigate(id)))
  }

  useEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // preventScroll matters here: the close button is `position: absolute`
    // inside the `position: fixed` overlay, so it's already fully visible
    // the moment the overlay opens. Without preventScroll, some browsers'
    // default focus-scroll heuristic misjudges that nesting and yanks the
    // underlying document's scroll position back toward the top — very
    // noticeable now that the whole site is one long continuous scroll.
    closeRef.current?.focus({ preventScroll: true })

    function onKey(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key !== 'Tab' || !overlayRef.current) return
      const focusable = overlayRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      // Same preventScroll reasoning as opening: the trigger lives in the
      // sticky header, already onscreen, so no scroll adjustment should be
      // needed to focus it back.
      trigger?.focus({ preventScroll: true })
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        aria-expanded={open}
        aria-controls="site-nav-overlay"
        onClick={() => setOpen(true)}
      >
        <span className="visually-hidden">Open menu</span>
        <span aria-hidden="true" className={styles.triggerIcon}>
          <span />
          <span />
        </span>
      </button>

      {open &&
        createPortal(
          <div
            id="site-nav-overlay"
            ref={overlayRef}
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
          >
            <button type="button" ref={closeRef} className={styles.close} onClick={() => setOpen(false)}>
              <span className="visually-hidden">Close menu</span>
              <span aria-hidden="true">&#10005;</span>
            </button>

            <nav className={styles.links} aria-label="Primary">
              {items.map((item, i) => (
                <RollLink
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  itemIndex={i}
                  active={item.id === activeId}
                  onNavigate={handleNavigate}
                />
              ))}
            </nav>

            <div className={styles.overlayFooter}>{extra}</div>
          </div>,
          document.body
        )}
    </>
  )
}
