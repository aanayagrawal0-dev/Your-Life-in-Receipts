import { useEffect, useRef } from 'react'
import ReceiptCard from './ReceiptCard.jsx'
import { explainConnection } from '../lib/clustering'
import { TYPE_META } from '../lib/constants'
import styles from './ReceiptDetail.module.css'

/**
 * Side panel / modal that shows one receipt in full, plus every other
 * receipt it's connected to and *why* &mdash; the mechanism that lets a
 * person pivot from one fragment to the next and actually explore the
 * relationships, rather than just reading a static list.
 */
export default function ReceiptDetail({ receipt, life, onClose, onSelect }) {
  const closeRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (receipt && closeRef.current) closeRef.current.focus()
  }, [receipt])

  useEffect(() => {
    if (!receipt) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [receipt, onClose])

  if (!receipt) return null

  const { byId, edges } = life
  const related = (edges.get(receipt.id) || [])
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .map((edge) => ({ receipt: byId.get(edge.to), reasons: edge.reasons }))
    .filter((r) => r.receipt)

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-detail-title"
      >
        <div className={styles.panelHeader}>
          <span className={styles.typeBadge} style={{ color: TYPE_META[receipt.type].color }}>
            {TYPE_META[receipt.type].icon} {TYPE_META[receipt.type].label}
          </span>
          <button type="button" ref={closeRef} className={styles.close} onClick={onClose}>
            <span aria-hidden="true">&#10005;</span>
            <span className="visually-hidden">Close</span>
          </button>
        </div>

        <h2 id="receipt-detail-title" className={styles.title}>
          {receipt.title}
        </h2>
        {receipt.subtitle && <p className={styles.subtitle}>{receipt.subtitle}</p>}

        <dl className={styles.factList}>
          <div>
            <dt>When</dt>
            <dd>{new Date(receipt.timestamp).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</dd>
          </div>
          {receipt.location?.name && (
            <div>
              <dt>Where</dt>
              <dd>{receipt.location.name}</dd>
            </div>
          )}
          {receipt.people?.length > 0 && (
            <div>
              <dt>Who</dt>
              <dd>{receipt.people.join(', ')}</dd>
            </div>
          )}
          <div>
            <dt>Mood</dt>
            <dd>{receipt.mood}</dd>
          </div>
          {Object.entries(typeSpecificFacts(receipt)).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        {related.length > 0 && (
          <div className={styles.relatedSection}>
            <h3 className={styles.relatedHeading}>Connected receipts</h3>
            <ul className={styles.relatedList}>
              {related.map(({ receipt: r, reasons }) => (
                <li key={r.id}>
                  <ReceiptCard receipt={r} compact onSelect={onSelect} />
                  <p className={styles.whyConnected}>
                    {(explainConnection(receipt, r) || reasons).map((reason) => reason.label).join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function typeSpecificFacts(receipt) {
  const m = receipt.meta || {}
  switch (receipt.type) {
    case 'music':
      return {
        Album: m.album || '—',
        Played: m.msPlayed ? `${Math.round(m.msPlayed / 1000)}s` : '—',
        Skipped: m.skipped ? 'Yes' : 'No',
      }
    case 'purchase':
      return {
        Amount: `₹${Number(m.amount || 0).toLocaleString('en-IN')}`,
        Category: m.category || '—',
        Mode: m.mode || '—',
      }
    case 'movie':
      return { Genre: m.genre || '—', Platform: m.platform || '—' }
    case 'search':
      return { Query: `“${m.query}”` }
    case 'message':
      return { With: m.withPerson || '—' }
    default:
      return {}
  }
}
