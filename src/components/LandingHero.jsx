import CrowdBand from './CrowdBand.jsx'
import styles from './LandingHero.module.css'

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * The top-of-page hero: a bold headline over a soft gradient glow, with the
 * illustrated crowd woven in underneath as the visual anchor. The receipt
 * card itself (ReceiptHero) lives further down the page as the year's
 * itemized summary rather than being the very first thing you see. The two
 * CTAs smooth-scroll to their section rather than routing, since the whole
 * site is now one continuous scroll rather than separate pages.
 */
export default function LandingHero({ persona, receipts }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.glow} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <p className={styles.kicker}>&#9685; A year, itemized</p>
        <h1 id="hero-heading" className={styles.headline}>
          Somewhere in this crowd is a year that turned into {receipts.length} receipts.
        </h1>
        <p className={styles.sub}>
          Music, places, purchases, messages &mdash; everything {persona.name} did for a year,
          reconstructed into one interactive story. Nothing here was written by hand; the app
          found the connections itself.
        </p>
        <div className={styles.ctaRow}>
          <button type="button" className={styles.ctaPrimary} onClick={() => scrollToSection('chapters')}>
            Read the story
          </button>
          <button
            type="button"
            className={styles.ctaSecondary}
            onClick={() => scrollToSection('connections')}
          >
            Explore the connections
          </button>
        </div>
      </div>
      <div className={`container ${styles.crowdWrap}`}>
        <CrowdBand />
      </div>
    </section>
  )
}
