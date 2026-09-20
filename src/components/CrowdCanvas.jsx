import { useEffect, useRef } from 'react'
import styles from './CrowdCanvas.module.css'

// A note on provenance: this is an original implementation of the same idea
// as Skiper UI's "Canvas Crowd" (skiper39) — a canvas-drawn crowd of walking
// silhouettes — built from scratch for this project. That component ships
// through the shadcn CLI into a Tailwind + shadcn/ui project; this codebase
// deliberately uses plain CSS Modules with no Tailwind, so rather than
// bolting a second styling system on for one component, this rebuilds the
// same effect (procedural canvas figures, requestAnimationFrame, seeded
// deterministic placement, prefers-reduced-motion support) in the project's
// own style, themed off the app's CSS custom properties.

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

function makeWalkers(count, rng, width, height) {
  const highlightIndex = Math.floor(rng() * count)
  const walkers = []
  for (let i = 0; i < count; i++) {
    const scale = 0.7 + rng() * 0.55
    const goingRight = rng() > 0.22
    walkers.push({
      x: rng() * width,
      baseY: height * (0.6 + rng() * 0.34),
      scale,
      speed: (18 + rng() * 16) * scale * (goingRight ? 1 : -1),
      phase: rng() * Math.PI * 2,
      strideSpeed: 5 + rng() * 1.6,
      highlight: i === highlightIndex,
    })
  }
  return walkers
}

function drawWalker(ctx, w, t, color) {
  const legSwing = Math.sin(t * w.strideSpeed + w.phase) * 0.6
  const armSwing = Math.sin(t * w.strideSpeed + w.phase + Math.PI) * 0.45
  const s = w.scale
  const headR = 4.2 * s
  const bodyLen = 15 * s
  const limbLen = 9.5 * s
  const x = w.x
  const hipY = w.baseY
  const shoulderY = hipY - bodyLen

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(1.3, 1.9 * s)
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.arc(x, shoulderY - headR - 2 * s, headR, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(x, shoulderY)
  ctx.lineTo(x, hipY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x, hipY)
  ctx.lineTo(x + Math.sin(legSwing) * limbLen, hipY + Math.cos(legSwing) * limbLen)
  ctx.moveTo(x, hipY)
  ctx.lineTo(x - Math.sin(legSwing) * limbLen, hipY + Math.cos(legSwing) * limbLen)
  ctx.stroke()

  const shoulderDrop = 2.2 * s
  ctx.beginPath()
  ctx.moveTo(x, shoulderY + shoulderDrop)
  ctx.lineTo(
    x + Math.sin(armSwing) * limbLen * 0.8,
    shoulderY + shoulderDrop + Math.cos(armSwing) * limbLen * 0.8
  )
  ctx.moveTo(x, shoulderY + shoulderDrop)
  ctx.lineTo(
    x - Math.sin(armSwing) * limbLen * 0.8,
    shoulderY + shoulderDrop + Math.cos(armSwing) * limbLen * 0.8
  )
  ctx.stroke()
}

function readColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/**
 * Decorative canvas strip: a small deterministic crowd of procedurally-drawn
 * walking figures drifting past, with one figure picked out in the accent
 * color — a quiet visual echo of "one of these lives is about to become a
 * receipt." Purely decorative (aria-hidden); the surrounding copy carries
 * the meaning for screen readers. Freezes on a single mid-stride frame for
 * prefers-reduced-motion, and pauses the animation loop while the tab is
 * hidden.
 */
export default function CrowdCanvas({ height = 190 }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = container.clientWidth
    let walkers = []
    let rafId = null
    let lastTime = null

    function layout() {
      width = container.clientWidth
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = width < MOBILE_BREAKPOINT ? 8 : 16
      walkers = makeWalkers(count, mulberry32(SEED), width, height)
    }

    function renderFrame(t) {
      ctx.clearRect(0, 0, width, height)
      const faint = readColor('--text-faint')
      const accent = readColor('--accent')
      for (const w of walkers) {
        drawWalker(ctx, w, t, w.highlight ? accent : faint)
      }
    }

    function tick(now) {
      if (lastTime == null) lastTime = now
      const dt = (now - lastTime) / 1000
      lastTime = now
      for (const w of walkers) {
        w.x += w.speed * dt
        if (w.speed > 0 && w.x - 24 > width) w.x = -24
        if (w.speed < 0 && w.x + 24 < 0) w.x = width + 24
      }
      renderFrame(now / 1000)
      rafId = requestAnimationFrame(tick)
    }

    layout()
    const ro = new ResizeObserver(() => {
      layout()
      if (prefersReducedMotion) renderFrame(0.4)
    })
    ro.observe(container)

    if (prefersReducedMotion) {
      renderFrame(0.4)
      return () => ro.disconnect()
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
      ro.disconnect()
    }
  }, [height])

  return (
    <div className={styles.wrap} ref={containerRef} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
