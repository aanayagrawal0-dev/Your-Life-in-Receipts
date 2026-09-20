import { useMemo, useState } from 'react'
import VirtualList from '../components/VirtualList.jsx'
import ReceiptCard from '../components/ReceiptCard.jsx'
import ReceiptDetail from '../components/ReceiptDetail.jsx'
import SmoothCaretInput from '../components/SmoothCaretInput.jsx'
import { TYPE_META, TYPE_ORDER } from '../lib/constants'
import styles from './Explore.module.css'

const ROW_HEIGHT = 92

export default function Explore({ life }) {
  const [query, setQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState(() => new Set(TYPE_ORDER))
  const [chapterKey, setChapterKey] = useState('all')
  const [sortDir, setSortDir] = useState('asc')
  const [selected, setSelected] = useState(null)

  const receipts = life.receipts
  const persona = life.persona

  const filtered = useMemo(() => {
    if (!persona || !receipts) return []
    const q = query.trim().toLowerCase()
    const chapter = persona.chapters.find((c) => c.key === chapterKey)
    const start = chapter ? new Date(chapter.start).getTime() : null
    const end = chapter ? new Date(chapter.end).getTime() : null

    let list = receipts.filter((r) => {
      if (!activeTypes.has(r.type)) return false
      if (start !== null) {
        const t = new Date(r.timestamp).getTime()
        if (t < start || t > end) return false
      }
      if (!q) return true
      const haystack = [
        r.title, r.subtitle, r.mood, r.location?.name,
        ...(r.people || []), ...(r.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })

    list = list.sort((a, b) => {
      const diff = new Date(a.timestamp) - new Date(b.timestamp)
      return sortDir === 'asc' ? diff : -diff
    })
    return list
  }, [receipts, query, activeTypes, chapterKey, sortDir, persona])

  const toggleType = (type) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next.size === 0 ? new Set(TYPE_ORDER) : next
    })
  }

  if (life.status === 'loading') return <p className="container">Loading&hellip;</p>
  if (life.status === 'error') return <p className="container">Couldn&rsquo;t load the dataset.</p>

  return (
    <div className={`container ${styles.wrap}`}>
      <header className={styles.intro}>
        <h1>Explore every receipt</h1>
        <p>Search, filter by type or chapter, and open anything for its full connections.</p>
      </header>

      <div className={styles.controls}>
        <label className={styles.searchLabel}>
          <span className="visually-hidden">Search receipts</span>
          <SmoothCaretInput
            type="search"
            inputClassName={styles.search}
            placeholder="Search title, place, person, tag&hellip;"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <label className={styles.selectLabel}>
          Chapter
          <select
            className={styles.select}
            value={chapterKey}
            onChange={(e) => setChapterKey(e.target.value)}
          >
            <option value="all">All chapters</option>
            {persona.chapters.map((c) => (
              <option key={c.key} value={c.key}>{c.title}</option>
            ))}
          </select>
        </label>

        <label className={styles.selectLabel}>
          Sort
          <select
            className={styles.select}
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value)}
          >
            <option value="asc">Oldest first</option>
            <option value="desc">Newest first</option>
          </select>
        </label>
      </div>

      <div className={styles.typeFilters} role="group" aria-label="Filter by type">
        {TYPE_ORDER.map((type) => (
          <button
            key={type}
            type="button"
            className={styles.typeChip}
            aria-pressed={activeTypes.has(type)}
            onClick={() => toggleType(type)}
            style={{ '--type-color': TYPE_META[type].color, opacity: activeTypes.has(type) ? 1 : 0.4 }}
          >
            <span aria-hidden="true">{TYPE_META[type].icon}</span> {TYPE_META[type].label}
          </button>
        ))}
      </div>

      <p className={styles.count} role="status">
        {filtered.length} receipt{filtered.length === 1 ? '' : 's'}
      </p>

      {filtered.length === 0 ? (
        <p className={styles.empty}>Nothing matches. Try a different search or filter.</p>
      ) : (
        <div className={styles.listWrap}>
          <VirtualList
            height={Math.min(680, filtered.length * ROW_HEIGHT)}
            itemCount={filtered.length}
            itemHeight={ROW_HEIGHT}
            renderItem={(index) => (
              <div style={{ paddingBottom: 8, paddingRight: 4 }}>
                <ReceiptCard receipt={filtered[index]} onSelect={setSelected} />
              </div>
            )}
          />
        </div>
      )}

      <ReceiptDetail receipt={selected} life={life} onClose={() => setSelected(null)} onSelect={setSelected} />
    </div>
  )
}
