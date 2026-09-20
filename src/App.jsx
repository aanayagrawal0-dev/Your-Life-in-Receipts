import { useEffect, useState } from 'react'
import { useLifeData } from './hooks/useLifeData'
import Preloader from './components/Preloader.jsx'
import TextRollNav from './components/TextRollNav.jsx'
import SienaReveal from './components/SienaReveal.jsx'
import Overview from './views/Overview.jsx'
import Chapters from './views/Chapters.jsx'
import Connections from './views/Connections.jsx'
import Explore from './views/Explore.jsx'
import styles from './App.module.css'

// The site used to be four routed pages; it's now one continuous cinematic
// scroll, so "navigation" means smooth-scrolling to a section id rather than
// changing the URL. Each id matches a top-level <section> rendered below.
const NAV_ITEMS = [
  { id: 'journey', label: 'Journey' },
  { id: 'chapters', label: 'Chapters' },
  { id: 'connections', label: 'Connections' },
  { id: 'explore', label: 'Explore' },
]

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('life-receipts-theme') || 'system'
  )

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('life-receipts-theme', theme)
    } catch {
      /* storage unavailable — theme just won't persist */
    }
  }, [theme])

  const next = { system: 'dark', dark: 'light', light: 'system' }
  const labelFor = { system: 'Auto', dark: 'Dark', light: 'Light' }

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={() => setTheme((t) => next[t])}
      aria-label={`Theme: ${labelFor[theme]}. Activate to switch.`}
    >
      {labelFor[theme]}
    </button>
  )
}

export default function App() {
  const life = useLifeData()
  const [preloading, setPreloading] = useState(true)
  const [activeId, setActiveId] = useState('journey')

  // Which top-level section is currently in view, so the nav overlay can
  // highlight it — this is the job react-router's NavLink/isActive used to
  // do for us; now it's just which section is passing through a thin band
  // near the top of the viewport. Chapters and Explore run many times
  // taller than the viewport, so intersectionRatio (overlap ÷ the target's
  // OWN height) is the wrong metric — a tall section's ratio can never
  // cross even a low threshold. Comparing raw overlap pixels against a
  // narrow rootMargin band instead works regardless of section height.
  useEffect(() => {
    if (life.status !== 'ready') return
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean)
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        const top = visible.reduce((a, b) =>
          b.intersectionRect.height > a.intersectionRect.height ? b : a
        )
        setActiveId(top.target.id)
      },
      { threshold: 0, rootMargin: '-15% 0px -70% 0px' }
    )
    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [life.status])

  return (
    <>
      <Preloader onDone={() => setPreloading(false)} />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div inert={preloading || undefined}>
        <header className={styles.header}>
          <div className={`container ${styles.headerInner}`}>
            <button
              type="button"
              className={styles.brand}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <span aria-hidden="true">&#10022;</span> Your Life, In Receipts
            </button>
            <TextRollNav
              items={NAV_ITEMS}
              activeId={activeId}
              onNavigate={scrollToId}
              extra={<ThemeToggle />}
            />
          </div>
        </header>

        <main id="main" className={styles.main}>
          {life.status === 'loading' && <ViewLoading />}
          {life.status === 'error' && (
            <p className={`container ${styles.errorMsg}`}>Couldn&rsquo;t load the dataset.</p>
          )}
          {life.status === 'ready' && (
            <>
              <SienaReveal personaName={life.persona.name} />
              <section id="journey" className={styles.pageSection} aria-label="Journey">
                <Overview life={life} />
              </section>
              <section id="chapters" className={styles.pageSection} aria-label="Chapters">
                <Chapters life={life} />
              </section>
              <section id="connections" className={styles.pageSection} aria-label="Connections">
                <Connections life={life} />
              </section>
              <section id="explore" className={styles.pageSection} aria-label="Explore">
                <Explore life={life} />
              </section>
            </>
          )}
        </main>

        <footer className={styles.footer}>
          <div className="container">
            <p>
              A fictional year, reconstructed from {life.receipts?.length ?? '…'} digital-life
              receipts. Built for a frontend hackathon.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}

function ViewLoading() {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <span>Loading&hellip;</span>
    </div>
  )
}
