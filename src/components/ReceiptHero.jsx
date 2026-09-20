import { useMemo, useState } from 'react'
import LoungePrintButton from './LoungePrintButton.jsx'
import { TYPE_META, TYPE_ORDER } from '../lib/constants'
import styles from './ReceiptHero.module.css'

const BARCODE_WIDTHS = [2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2]

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * The front door of the whole experience, styled as an actual till receipt
 * that gets printed on demand: a "Print my receipt" button feeds it out of
 * a printer slot with a clip-path unroll animation, instead of it just
 * appearing on load. It also doubles as the stats summary so that data
 * isn't repeated lower on the page.
 */
export default function ReceiptHero({ receipts, persona, moments, patterns }) {
  const [phase, setPhase] = useState('idle') // 'idle' | 'printing' | 'done'
  const [printCount, setPrintCount] = useState(0)

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const typeCounts = TYPE_ORDER.map((type) => ({
    type,
    count: receipts.filter((r) => r.type === type).length,
  }))

  function handlePrint() {
    setPrintCount((n) => n + 1)
    setPhase(prefersReducedMotion ? 'done' : 'printing')
  }

  function handleAnimationEnd(e) {
    if (e.target !== e.currentTarget) return
    setPhase('done')
  }

  return (
    <section className={styles.wrap} aria-label="Year summary receipt">
      <div className={styles.printer}>
        <div className={styles.printerBody}>
          <span className={styles.printerSlot} aria-hidden="true" />
          <span
            className={`${styles.printerLight} ${phase === 'printing' ? styles.printerLightActive : ''}`}
            aria-hidden="true"
          />
        </div>
        {phase !== 'idle' && (
          <button
            type="button"
            className={styles.replayLink}
            onClick={handlePrint}
            disabled={phase === 'printing'}
          >
            &#8635; replay animation
          </button>
        )}
      </div>

      <LoungePrintButton started={phase !== 'idle'} onFirstPress={handlePrint} />

      {phase !== 'idle' && (
        <div
          key={printCount}
          className={`${styles.paper} ${phase === 'printing' && !prefersReducedMotion ? styles.printing : ''}`}
          onAnimationEnd={handleAnimationEnd}
        >
          <div className={styles.paperInner}>
            <header className={styles.head}>
              <p className={styles.brand}>&#10022; YOUR LIFE, IN RECEIPTS &#10022;</p>
              <h1 className={styles.personaLine}>{persona.name.toUpperCase()}&rsquo;S YEAR</h1>
              <p className={styles.dateRange}>
                {fmtDate(persona.range.start)} &ndash; {fmtDate(persona.range.end)}
              </p>
            </header>

            <div className={styles.divider} aria-hidden="true" />
            <p className={styles.status}>RECONSTRUCTING FROM {receipts.length} FRAGMENTS&hellip;</p>
            <div className={styles.divider} aria-hidden="true" />

            <ul className={styles.items}>
              {typeCounts.map(({ type, count }) => (
                <li key={type} className={styles.itemRow}>
                  <span className={styles.itemLabel}>
                    <span aria-hidden="true">{TYPE_META[type].icon}</span> {TYPE_META[type].label}
                  </span>
                  <span className={styles.itemValue}>{count}</span>
                </li>
              ))}
            </ul>

            <div className={styles.divider} aria-hidden="true" />

            <ul className={styles.totals}>
              <li>
                <span>TOTAL RECEIPTS</span>
                <span>{receipts.length}</span>
              </li>
              <li>
                <span>MOMENTS DISCOVERED</span>
                <span>{moments.length}</span>
              </li>
              <li>
                <span>RECURRING PATTERNS</span>
                <span>{patterns.length}</span>
              </li>
            </ul>

            <div className={styles.divider} aria-hidden="true" />

            <p className={styles.thankyou}>** THANK YOU FOR LIVING THIS YEAR **</p>

            <div className={styles.barcode} aria-hidden="true">
              {BARCODE_WIDTHS.map((w, i) => (
                <span key={i} style={{ width: `${w}px` }} />
              ))}
            </div>
            <p className={styles.barcodeCaption}>NO REFUNDS &middot; NO REGRETS</p>
          </div>
          <div className={styles.tornEdge} aria-hidden="true" />
        </div>
      )}

      <p className="visually-hidden" role="status">
        {phase === 'done' ? 'Receipt printed.' : ''}
      </p>
    </section>
  )
}
