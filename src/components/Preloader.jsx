import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './Preloader.module.css'

// A note on provenance: this is an original implementation of a well-known
// pattern (multi-language word-cycling preloaders with a curved letter
// entrance on the final word), in the style popularised by sites like
// dennissnellenberg.com. It is written from scratch for this project, not
// copied from any commercial component library.
const CYCLE_WORDS = [
  { text: 'HELLO', lang: 'en' },
  { text: 'BONJOUR', lang: 'fr' },
  { text: 'HOLA', lang: 'es' },
  { text: 'नमस्ते', lang: 'hi' },
  { text: 'こんにちは', lang: 'ja' },
  { text: 'HALLO', lang: 'de' },
]
const FINAL_TEXT = 'YOUR LIFE, IN RECEIPTS'
const CYCLE_MS = 420
const FINAL_HOLD_MS = 1700
const EXIT_MS = 800
const SESSION_KEY = 'life-receipts-preloader-shown'

function segments(word) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      return Array.from(seg.segment(word), (s) => s.segment)
    } catch {
      /* fall through to code-point split below */
    }
  }
  return Array.from(word)
}

/**
 * Full-screen entry preloader: rapidly cycles the word "loading" through a
 * few languages, then settles on the app's name with a curved per-letter
 * entrance, before the whole curtain slides away. Shows once per browser
 * session, skips instantly for prefers-reduced-motion, and can be
 * dismissed early with a click, Enter, Space or Escape.
 */
export default function Preloader({ onDone }) {
  // Dev/testing escape hatch: append ?preloader=force to the URL to replay
  // the preloader regardless of session state or the OS's reduced-motion
  // setting — handy while iterating on the design instead of clearing
  // sessionStorage or opening a fresh tab every time.
  const forceShow = useMemo(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('preloader') === 'force',
    []
  )
  const prefersReducedMotion = useMemo(
    () =>
      !forceShow &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [forceShow]
  )
  const alreadyShown = useMemo(() => {
    if (forceShow) return false
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      return false
    }
  }, [forceShow])

  const [phase, setPhase] = useState('cycle') // 'cycle' | 'final' | 'exit' | 'hidden'
  const [wordIndex, setWordIndex] = useState(0)
  const finishedRef = useRef(false)

  const finish = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      /* sessionStorage unavailable — just skip persistence */
    }
    setPhase('hidden')
    onDone?.()
  }

  useEffect(() => {
    if (prefersReducedMotion || alreadyShown) {
      finish()
      return
    }
    let idx = 0
    const timer = setInterval(() => {
      idx += 1
      if (idx >= CYCLE_WORDS.length) {
        clearInterval(timer)
        setPhase('final')
        return
      }
      setWordIndex(idx)
    }, CYCLE_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'final') return
    const t = setTimeout(() => setPhase('exit'), FINAL_HOLD_MS)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'exit') return
    const t = setTimeout(finish, EXIT_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase === 'hidden') return
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (phase === 'hidden' || alreadyShown || prefersReducedMotion) return null

  const finalChars = segments(FINAL_TEXT)

  return (
    <div
      className={`${styles.overlay} ${phase === 'exit' ? styles.exiting : ''}`}
      onClick={finish}
      role="status"
    >
      <span className="visually-hidden">Loading Your Life, In Receipts</span>
      <div className={styles.stage} aria-hidden="true">
        {phase === 'cycle' && (
          <p key={wordIndex} lang={CYCLE_WORDS[wordIndex].lang} className={styles.cycleWord}>
            {CYCLE_WORDS[wordIndex].text}
          </p>
        )}
        {(phase === 'final' || phase === 'exit') && (
          <p className={styles.finalWord}>
            {finalChars.map((ch, i) => (
              <CurvedChar key={i} index={i} total={finalChars.length}>
                {ch}
              </CurvedChar>
            ))}
          </p>
        )}
      </div>
      <button type="button" className={styles.skipHint} onClick={finish}>
        click to skip
      </button>
    </div>
  )
}

function CurvedChar({ children, index, total }) {
  const center = (total - 1) / 2
  const x = center === 0 ? 0 : (index - center) / center
  const dy = Math.pow(x, 2) * 26
  const rot = x * 14
  const delay = index * 32
  return (
    <span
      className={styles.char}
      style={{ '--dy': `${dy}px`, '--rot': `${rot}deg`, animationDelay: `${delay}ms` }}
    >
      {children === ' ' ? ' ' : children}
    </span>
  )
}
