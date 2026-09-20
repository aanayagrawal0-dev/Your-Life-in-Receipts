import { useEffect, useRef, useState } from 'react'
import styles from './SmoothCaretInput.module.css'

// Original implementation of the same idea as Skiper UI's "Smooth Caret
// Input" (skiper106): a text input whose visible caret is a separate
// element that glides to the real cursor position with an eased CSS
// transition, instead of the browser's caret snapping there instantly.
// Position is measured with a hidden same-font "mirror" span containing
// the text up to the cursor — simpler than canvas text measurement and
// exactly as accurate for a single font. The native caret is hidden via
// caret-color; native text selection is untouched.

export default function SmoothCaretInput({
  className,
  inputClassName,
  type = 'text',
  value,
  onChange,
  ...rest
}) {
  const inputRef = useRef(null)
  const mirrorRef = useRef(null)
  const [caretX, setCaretX] = useState(0)
  const [caretVisible, setCaretVisible] = useState(false)
  const [focused, setFocused] = useState(false)

  function updateCaret() {
    const input = inputRef.current
    const mirror = mirrorRef.current
    if (!input || !mirror) return
    const start = input.selectionStart
    const end = input.selectionEnd
    if (start == null || start !== end) {
      setCaretVisible(false)
      return
    }
    const raw = input.value.slice(0, start)
    mirror.textContent = type === 'password' ? '•'.repeat(raw.length) : raw
    const paddingLeft = parseFloat(getComputedStyle(input).paddingLeft) || 0
    setCaretX(paddingLeft + mirror.offsetWidth)
    setCaretVisible(true)
  }

  useEffect(() => {
    updateCaret()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <span className={`${styles.wrap} ${className || ''}`}>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={onChange}
        onSelect={updateCaret}
        onKeyUp={updateCaret}
        onClick={updateCaret}
        onFocus={() => {
          setFocused(true)
          updateCaret()
        }}
        onBlur={() => setFocused(false)}
        className={`${styles.input} ${inputClassName || ''}`}
        {...rest}
      />
      <span ref={mirrorRef} className={`${inputClassName || ''} ${styles.mirror}`} aria-hidden="true" />
      <span
        className={`${styles.caret} ${focused && caretVisible ? styles.caretActive : ''}`}
        aria-hidden="true"
        style={{ transform: `translateX(${caretX}px)` }}
      />
    </span>
  )
}
