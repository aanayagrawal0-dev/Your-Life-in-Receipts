import { useEffect, useMemo, useState } from 'react'
import { buildMoments, computeRecurringPatterns } from '../lib/clustering'

/**
 * Loads the receipts dataset once and derives every computed structure the
 * app needs (moments, patterns) a single time, memoized. Views subscribe to
 * slices of this rather than recomputing clustering themselves.
 */
export function useLifeData() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let cancelled = false
    fetch('./data/life-receipts.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load dataset (${res.status})`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', data: null, error })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const derived = useMemo(() => {
    if (!state.data) return null
    const { receipts, persona } = state.data
    const { moments, edges, byId } = buildMoments(receipts)
    const patterns = computeRecurringPatterns(receipts, persona.chapters)
    const momentByReceiptId = new Map()
    moments.forEach((m) => m.receipts.forEach((r) => momentByReceiptId.set(r.id, m)))
    return { receipts, persona, moments, edges, byId, patterns, momentByReceiptId }
  }, [state.data])

  return { status: state.status, error: state.error, ...derived }
}
