import { useEffect, useMemo, useRef, useState } from 'react'
import { createAvatar } from '@dicebear/core'
import * as openPeeps from '@dicebear/open-peeps'
import styles from './SienaReveal.module.css'

// Original implementation inspired by siena.film's opening sequence: a
// pinned (position: sticky) stage you scroll "through" rather than past,
// where a custom SVG <mask> iris opens to bring a blurred backdrop into
// focus, in the style of a documentary's cold open. No video file exists
// for this project, so the "footage" is the same Open Peeps crowd portraits
// used elsewhere (deterministic, zero network calls) rather than a stock
// clip, and the play button's job is honest: it scrolls you into the story
// instead of pretending to start a video that isn't there.
const PORTRAIT_SEEDS = ['siena-cast-01', 'siena-cast-02', 'siena-cast-03', 'siena-cast-04']

export default function SienaReveal({ personaName }) {
  const wrapRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const reducedMotionRef = useRef(false)

  const portraits = useMemo(
    () => PORTRAIT_SEEDS.map((seed) => createAvatar(openPeeps, { seed, size: 200 }).toDataUri()),
    []
  )

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedMotionRef.current) {
      setProgress(1)
      setReducedMotion(true)
      return
    }

    let rafId = null
    function measure() {
      rafId = null
      const el = wrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const runway = rect.height - window.innerHeight
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(runway, 0))
      setProgress(runway > 0 ? scrolled / runway : 1)
    }
    function onScroll() {
      if (rafId == null) rafId = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [])

  function handlePlay() {
    document
      .getElementById('journey')
      ?.scrollIntoView({ behavior: reducedMotionRef.current ? 'auto' : 'smooth' })
  }

  // Eased iris radius, in objectBoundingBox units (0.5,0.5 is the box
  // centre; ~0.71 reaches every corner of a square box).
  const eased = 1 - Math.pow(1 - progress, 2)
  const irisR = 0.035 + eased * 0.72
  const introOpacity = Math.max(0, 1 - progress * 3)

  return (
    <section
      className={`${styles.wrap} ${reducedMotion ? styles.wrapStatic : ''}`}
      ref={wrapRef}
      aria-label="Opening sequence"
    >
      <div className={styles.stage}>
        <svg width="0" height="0" aria-hidden="true" focusable="false">
          <defs>
            <mask id="siena-iris-mask" maskContentUnits="objectBoundingBox">
              <rect x="0" y="0" width="1" height="1" fill="white" />
              <circle cx="0.5" cy="0.5" r={irisR} fill="black" />
            </mask>
          </defs>
        </svg>

        <div className={styles.backdrop} aria-hidden="true">
          {portraits.map((src, i) => (
            <img key={i} src={src} alt="" className={styles.portrait} data-slot={i} />
          ))}
        </div>

        <div
          className={styles.focusVeil}
          style={{ mask: 'url(#siena-iris-mask)', WebkitMask: 'url(#siena-iris-mask)' }}
          aria-hidden="true"
        />

        <div className={styles.titleBlock} style={{ opacity: introOpacity }}>
          <p className={styles.kicker}>A documentary, itemized</p>
          <h1 className={styles.title}>{personaName}&rsquo;s year, frame by frame</h1>
          <button type="button" className={styles.playButton} onClick={handlePlay}>
            <span className={styles.playIcon} aria-hidden="true">
              &#9658;
            </span>
            <span className="visually-hidden">Play &mdash; scroll into the story</span>
          </button>
          <p className={styles.bestViewed}>Best viewed with sound on &mdash; scroll to begin</p>
        </div>
      </div>
    </section>
  )
}
