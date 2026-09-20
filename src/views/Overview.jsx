import LandingHero from '../components/LandingHero.jsx'
import ReceiptHero from '../components/ReceiptHero.jsx'
import styles from './Overview.module.css'

export default function Overview({ life }) {
  if (life.status === 'loading') {
    return <p className={`container ${styles.status}`}>Loading a year of receipts&hellip;</p>
  }
  if (life.status === 'error') {
    return (
      <p className={`container ${styles.status}`}>
        Couldn&rsquo;t load the dataset: {life.error?.message}
      </p>
    )
  }

  const { receipts, persona, moments, patterns } = life

  return (
    <div>
      <LandingHero persona={persona} receipts={receipts} />

      <section className={`container ${styles.section}`} aria-labelledby="printout-heading">
        <h2 id="printout-heading" className={styles.sectionTitle}>
          The full printout
        </h2>
        <p className={styles.sectionHint}>
          Every receipt type this year, tallied &mdash; itemized like the till slip it&rsquo;s
          named after.
        </p>
        <ReceiptHero receipts={receipts} persona={persona} moments={moments} patterns={patterns} />
      </section>
    </div>
  )
}
