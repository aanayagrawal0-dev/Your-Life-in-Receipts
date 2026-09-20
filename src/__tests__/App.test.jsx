import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.jsx'

const fixture = {
  persona: {
    name: 'Meher',
    range: { start: '2025-01-01T00:00:00', end: '2025-01-14T23:59:59' },
    chapters: [
      { key: 'ch1', title: 'Chapter One', start: '2025-01-01T00:00:00', end: '2025-01-14T23:59:59' },
    ],
  },
  receipts: [
    {
      id: 'music-0001', type: 'music', timestamp: '2025-01-02T20:00:00',
      title: 'Kesariya', subtitle: 'Arijit Singh', tags: ['music', 'ch1'],
      location: { name: 'Toit Brewpub' }, people: [], mood: 'excited', meta: {},
    },
    {
      id: 'purchase-0001', type: 'purchase', timestamp: '2025-01-02T20:05:00',
      title: 'Coffee', subtitle: '₹200', tags: ['purchase', 'ch1'],
      location: { name: 'Toit Brewpub' }, people: [], mood: 'excited', meta: { amount: 200 },
    },
  ],
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(fixture) })
    )
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('opens the full-page nav overlay and loads the dataset', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Nav now lives behind a menu trigger (full-page overlay), not inline.
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Chapters' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/2 digital-life receipts/)).toBeInTheDocument()
    })
  })
})
