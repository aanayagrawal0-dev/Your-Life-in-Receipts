import { useRef, useState } from 'react'

/**
 * Minimal fixed-row-height virtualizer. Explore can hold 700+ receipts;
 * rendering only the rows within (and just around) the visible viewport
 * keeps the DOM small and scroll performance smooth without pulling in a
 * separate windowing dependency for what is, with a fixed row height, a
 * fairly small amount of arithmetic.
 */
export default function VirtualList({ itemCount, itemHeight, height, renderItem, overscan = 6 }) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef(null)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleCount = Math.ceil(height / itemHeight) + overscan * 2
  const endIndex = Math.min(itemCount, startIndex + visibleCount)

  const items = []
  for (let i = startIndex; i < endIndex; i++) {
    items.push(
      <div
        key={i}
        style={{ position: 'absolute', top: i * itemHeight, left: 0, right: 0, height: itemHeight }}
      >
        {renderItem(i)}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ height, overflowY: 'auto', position: 'relative' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      role="presentation"
    >
      <div style={{ height: itemCount * itemHeight, position: 'relative' }}>{items}</div>
    </div>
  )
}
