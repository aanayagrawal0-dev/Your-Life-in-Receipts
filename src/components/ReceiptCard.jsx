import { TYPE_META } from '../lib/constants'
import styles from './ReceiptCard.module.css'

const PALETTE_GRADIENTS = {
  sunset: 'linear-gradient(135deg, #ff9966, #e0578f)',
  citylights: 'linear-gradient(135deg, #2c3e70, #7c5cff)',
  beach: 'linear-gradient(135deg, #5ecbd6, #d99a35)',
  forest: 'linear-gradient(135deg, #2f6b4f, #7ab86c)',
  cafe: 'linear-gradient(135deg, #6b4226, #d99a35)',
  concert: 'linear-gradient(135deg, #1a1030, #e0578f)',
  skyline: 'linear-gradient(135deg, #1c2b4a, #5d8bf4)',
  rain: 'linear-gradient(135deg, #3a4a5c, #8a8a99)',
}

function formatTime(ts) {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  })
}

/**
 * One receipt, rendered according to its type. Used inside chapter scenes,
 * the constellation detail panel, and the Explore list.
 */
export default function ReceiptCard({ receipt, compact = false, onSelect, highlighted = false }) {
  const meta = TYPE_META[receipt.type]
  const isPhoto = receipt.type === 'photo'

  const body = (
    <>
      {isPhoto && (
        <span
          className={styles.photoSwatch}
          style={{ background: PALETTE_GRADIENTS[receipt.meta?.palette] || PALETTE_GRADIENTS.cafe }}
          aria-hidden="true"
        />
      )}
      <div className={styles.body}>
        <div className={styles.topRow}>
          <span className={styles.icon} style={{ color: meta.color }} aria-hidden="true">
            {meta.icon}
          </span>
          <span className={styles.typeLabel}>{meta.label}</span>
          <time className={styles.time} dateTime={receipt.timestamp}>
            {formatTime(receipt.timestamp)}
          </time>
        </div>
        <p className={styles.title}>{receipt.title}</p>
        {!compact && receipt.subtitle && <p className={styles.subtitle}>{receipt.subtitle}</p>}
        {!compact && (receipt.location?.name || receipt.people?.length > 0) && (
          <p className={styles.metaLine}>
            {receipt.location?.name && <span>&#9679; {receipt.location.name}</span>}
            {receipt.people?.length > 0 && <span>&#9679; {receipt.people.join(', ')}</span>}
          </p>
        )}
      </div>
    </>
  )

  if (!onSelect) {
    return (
      <div
        className={`${styles.card} ${highlighted ? styles.highlighted : ''}`}
        style={{ '--type-color': meta.color }}
      >
        {body}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`${styles.card} ${styles.cardButton} ${highlighted ? styles.highlighted : ''}`}
      style={{ '--type-color': meta.color }}
      onClick={() => onSelect(receipt)}
    >
      {body}
    </button>
  )
}
