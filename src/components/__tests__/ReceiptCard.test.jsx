import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ReceiptCard from '../ReceiptCard.jsx'

const baseReceipt = {
  id: 'music-0001',
  type: 'music',
  timestamp: '2025-03-01T20:00:00',
  title: 'Kesariya',
  subtitle: 'Arijit Singh',
  tags: ['music'],
  location: { name: 'Toit Brewpub' },
  people: ['Arjun'],
  mood: 'excited',
  meta: {},
}

describe('ReceiptCard', () => {
  it('renders the title, subtitle and location', () => {
    render(<ReceiptCard receipt={baseReceipt} />)
    expect(screen.getByText('Kesariya')).toBeInTheDocument()
    expect(screen.getByText('Arijit Singh')).toBeInTheDocument()
    expect(screen.getByText(/Toit Brewpub/)).toBeInTheDocument()
  })

  it('renders as a plain (non-interactive) card when no onSelect is given', () => {
    render(<ReceiptCard receipt={baseReceipt} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders as a button and calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(<ReceiptCard receipt={baseReceipt} onSelect={onSelect} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(onSelect).toHaveBeenCalledWith(baseReceipt)
  })

  it('hides subtitle and meta line in compact mode', () => {
    render(<ReceiptCard receipt={baseReceipt} compact />)
    expect(screen.queryByText('Arijit Singh')).not.toBeInTheDocument()
  })
})
