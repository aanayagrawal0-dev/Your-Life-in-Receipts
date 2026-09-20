import { useEffect, useMemo, useRef, useState } from 'react'
import { createAvatar } from '@dicebear/core'
import * as openPeeps from '@dicebear/open-peeps'
import styles from './CrowdBand.module.css'

// Illustrated crowd, in the spirit of Skiper UI's "Canvas Crowd" (skiper39)
// reference, but built with Open Peeps (Pablo Stanley, CC0) via DiceBear's
// @dicebear/open-peeps package (MIT, no network calls — everything renders
// from an installed npm package). Skiper's own character art is proprietary
// and isn't distributed as open source, so this uses a genuinely free
// illustrated-people library instead, generated as deterministic SVGs from
// seeds so the crowd looks the same on every load rather than reshuffling.

const MOBILE_BREAKPOINT = 640
const SEED = 0x5eed01

function mulberry32(seed) {
  let s = seed
  return function rng() {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildWalkers(count, width) {
  const rng = mulberry32(SEED)
  const highlightIndex = Math.floor(rng() * count)
  const walkers = []
  for (let i = 0; i < count; i++) {
    const scale = 0.82 + rng() * 0.4
    const goingRight = rng() > 0.22
    walkers.push({
      id: i,
      seed: `life-receipts-crowd-${i}`,
      x: rng() * width,
      topPct: 6 + rng() * 62,
      scale,
      speed: (9 + rng() * 7) * scale * (goingRight ? 1 : -1),
      highlight: i === highlightIndex,
    })
  }
  return walkers
}

/**
 * Decorative illustrated crowd strip: a small deterministic set of Open
 * Peeps portraits drifting past at different depths, with one figure ringed
 * in the accent color — a quiet "that's you" among everyone else. Purely
 * decorative (aria-hidden). Freezes for prefers-reduced-motion and pauses
 * the animation loop while the tab is hidden.
 */
export default function CrowdBand({ height = 210 }) {
  const containerRef = useRef(null)
  const trackRefs = useRef({})
  const [walkers, setWalkers] = useState([])
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function layout() {
      const w = container.clientWidth
      setWidth(w)
      const count = w < MOBILE_BREAKPOINT ? 7 : 13
      setWalkers(buildWalkers(count, w))
    }

    layout()
    const ro = new ResizeObserver(layout)
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  const avatars = useMemo(() => {
    const map = {}
    for (const w of walkers) {
      map[w.id] = createAvatar(openPeeps, { seed: w.seed, size: 96 }).toDataUri()
    }
    return map
  }, [walkers])

  useEffect(() => {
    if (!walkers.length || !width) return
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    let rafId = null
    let lastTime = null
    const positions = new Map(walkers.map((w) => [w.id, w.x]))

    function tick(now) {
      if (lastTime == null) lastTime = now
      const dt = (now - lastTime) / 1000
      lastTime = now
      for (const w of walkers) {
        let x = positions.get(w.id) + w.speed * dt
        if (w.speed > 0 && x - 60 > width) x = -60
        if (w.speed < 0 && x + 60 < 0) x = width + 60
        positions.set(w.id, x)
        const el = trackRefs.current[w.id]
        if (el) el.style.transform = `translateX(${x}px) scale(${w.scale})`
      }
      rafId = requestAnimationFrame(tick)
    }

    function handleVisibility() {
      if (document.hidden) {
        if (rafId != null) cancelAnimationFrame(rafId)
        rafId = null
        lastTime = null
      } else if (rafId == null) {
        rafId = requestAnimationFrame(tick)
      }
    }

    rafId = requestAnimationFrame(tick)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [walkers, width])

  return (
    <div className={styles.wrap} style={{ height }} ref={containerRef} aria-hidden="true">
      {walkers.map((w) => (
        <div
          key={w.id}
          ref={(el) => {
            trackRefs.current[w.id] = el
          }}
          className={`${styles.walker} ${w.highlight ? styles.highlight : ''}`}
          style={{ top: `${w.topPct}%`, transform: `translateX(${w.x}px) scale(${w.scale})` }}
        >
          {avatars[w.id] && <img src={avatars[w.id]} alt="" width={64} height={64} />}
        </div>
      ))}
    </div>
  )
}
