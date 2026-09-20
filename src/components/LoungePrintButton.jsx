import { useLoungeLoop } from '../hooks/useLoungeLoop'
import styles from './LoungePrintButton.module.css'

// Original implementation of the same idea as Skiper UI's "Micro
// Interactions_005" waveform toggle (skiper25): a pill button with five
// animated bars that stand in for a music play/pause control. Rebuilt from
// scratch in plain CSS Modules (no framer-motion, no use-sound — neither is
// part of this project) and repurposed as the trigger for the receipt
// printout: the first click prints the receipt *and* starts an
// in-browser-synthesized ambient loop (see useLoungeLoop); after that it's a
// plain play/pause toggle for the music.
export default function LoungePrintButton({ started, onFirstPress }) {
  const { playing, toggle } = useLoungeLoop()

  function handleClick() {
    if (!started) onFirstPress()
    toggle()
  }

  const label = !started ? 'Print my receipt' : playing ? 'Lounge — playing' : 'Lounge — paused'

  return (
    <button
      type="button"
      className={styles.button}
      onClick={handleClick}
      aria-pressed={started ? playing : undefined}
    >
      <span className={`${styles.bars} ${playing ? styles.playing : ''}`} aria-hidden="true">
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  )
}
