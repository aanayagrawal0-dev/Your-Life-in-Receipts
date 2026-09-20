import { useMemo, useState } from 'react'
import ReceiptDetail from '../components/ReceiptDetail.jsx'
import { flattenEdges } from '../lib/clustering'
import { computeLayout, LAYOUT_WIDTH, LAYOUT_HEIGHT } from '../lib/forceLayout'
import { TYPE_META } from '../lib/constants'
import styles from './Connections.module.css'

export default function Connections({ life }) {
  const [tab, setTab] = useState('constellation')

  if (life.status === 'loading') return <p className="container">Loading&hellip;</p>
  if (life.status === 'error') return <p className="container">Couldn&rsquo;t load the dataset.</p>

  return (
    <div className={`container ${styles.wrap}`}>
      <header className={styles.intro}>
        <h1>Connections</h1>
        <p>
          The dataset never says which receipts belong together. This view groups receipts that
          happened close in time and share a place, a person, or a theme &mdash; and separately,
          surfaces the things that keep recurring across the whole year.
        </p>
        <div className={styles.tabs} role="tablist" aria-label="Connection views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'constellation'}
            className={tab === 'constellation' ? styles.tabActive : styles.tab}
            onClick={() => setTab('constellation')}
          >
            Constellation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'patterns'}
            className={tab === 'patterns' ? styles.tabActive : styles.tab}
            onClick={() => setTab('patterns')}
          >
            Recurring patterns
          </button>
        </div>
      </header>

      {tab === 'constellation' ? <Constellation life={life} /> : <Patterns life={life} />}
    </div>
  )
}

function Constellation({ life }) {
  const { receipts, persona, edges, byId } = life
  const [chapterKey, setChapterKey] = useState(persona.chapters[0].key)
  const [selectedId, setSelectedId] = useState(null)
  const [hiddenTypes, setHiddenTypes] = useState(() => new Set())

  const chapter = persona.chapters.find((c) => c.key === chapterKey)
  const nodeIds = useMemo(() => {
    const start = new Date(chapter.start).getTime()
    const end = new Date(chapter.end).getTime()
    return receipts
      .filter((r) => {
        const t = new Date(r.timestamp).getTime()
        return t >= start && t <= end
      })
      .map((r) => r.id)
  }, [receipts, chapter])

  const idSet = useMemo(() => new Set(nodeIds), [nodeIds])
  const edgeList = useMemo(() => flattenEdges(edges, idSet), [edges, idSet])
  const positions = useMemo(() => computeLayout(nodeIds, edgeList), [nodeIds, edgeList])

  const connectedIds = useMemo(() => new Set(edgeList.flatMap((e) => [e.a, e.b])), [edgeList])
  const selectedNeighbours = useMemo(() => {
    if (!selectedId) return new Set()
    return new Set((edges.get(selectedId) || []).map((e) => e.to).concat(selectedId))
  }, [selectedId, edges])

  const toggleType = (type) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.chapterSelectLabel}>
          Chapter
          <select
            className={styles.chapterSelect}
            value={chapterKey}
            onChange={(e) => {
              setChapterKey(e.target.value)
              setSelectedId(null)
            }}
          >
            {persona.chapters.map((c) => (
              <option key={c.key} value={c.key}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.legend} role="group" aria-label="Filter by receipt type">
          {Object.entries(TYPE_META).map(([type, meta]) => (
            <button
              key={type}
              type="button"
              className={styles.legendItem}
              aria-pressed={!hiddenTypes.has(type)}
              onClick={() => toggleType(type)}
              style={{ '--type-color': meta.color, opacity: hiddenTypes.has(type) ? 0.35 : 1 }}
            >
              <span aria-hidden="true">{meta.icon}</span> {meta.label}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.hint}>
        {connectedIds.size} of {nodeIds.length} receipts this chapter connect to at least one
        other. Isolated receipts drift to the edges. Select any node to see why it&rsquo;s linked.
      </p>

      <div className={styles.canvasWrap}>
        <svg
          className={styles.edgeLayer}
          viewBox={`0 0 ${LAYOUT_WIDTH} ${LAYOUT_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {edgeList.map((e) => {
            const pa = positions.get(e.a)
            const pb = positions.get(e.b)
            if (!pa || !pb) return null
            const dim = selectedId && !(selectedNeighbours.has(e.a) && selectedNeighbours.has(e.b))
            return (
              <line
                key={`${e.a}-${e.b}`}
                x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                className={styles.edge}
                opacity={dim ? 0.06 : 0.35}
              />
            )
          })}
        </svg>
        <div className={styles.nodeLayer}>
          {nodeIds.map((id) => {
            const r = byId.get(id)
            if (hiddenTypes.has(r.type)) return null
            const pos = positions.get(id)
            const meta = TYPE_META[r.type]
            const isConnected = connectedIds.has(id)
            const dim = selectedId && !selectedNeighbours.has(id)
            return (
              <button
                key={id}
                type="button"
                className={styles.node}
                style={{
                  left: `${(pos.x / LAYOUT_WIDTH) * 100}%`,
                  top: `${(pos.y / LAYOUT_HEIGHT) * 100}%`,
                  '--type-color': meta.color,
                  opacity: dim ? 0.25 : 1,
                  transform: `translate(-50%, -50%) scale(${isConnected ? 1 : 0.75})`,
                }}
                onClick={() => setSelectedId(id)}
                aria-label={`${meta.label}: ${r.title}, ${new Date(r.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`}
                title={r.title}
              >
                <span aria-hidden="true">{meta.icon}</span>
              </button>
            )
          })}
        </div>
      </div>

      <ReceiptDetail
        receipt={selectedId ? byId.get(selectedId) : null}
        life={life}
        onClose={() => setSelectedId(null)}
        onSelect={(r) => setSelectedId(r.id)}
      />
    </div>
  )
}

function Patterns({ life }) {
  const { patterns, byId } = life
  const [expanded, setExpanded] = useState(null)

  return (
    <div className={styles.patternsGrid}>
      {patterns.slice(0, 24).map((p) => (
        <div key={`${p.type}-${p.label}`} className={styles.patternCard}>
          <span className={styles.patternKind}>{p.type}</span>
          <h3 className={styles.patternLabel}>{p.label}</h3>
          <p className={styles.patternDetail}>{p.detail}</p>
          <button
            type="button"
            className={styles.patternExpand}
            onClick={() => setExpanded(expanded === p.label ? null : p.label)}
            aria-expanded={expanded === p.label}
          >
            {p.count} receipts {expanded === p.label ? '– hide' : '– show'}
          </button>
          {expanded === p.label && (
            <ul className={styles.patternReceipts}>
              {p.receiptIds.slice(0, 12).map((id) => {
                const r = byId.get(id)
                return (
                  <li key={id}>
                    <span className={styles.miniIcon} aria-hidden="true">{TYPE_META[r.type].icon}</span>
                    {r.title}
                    <span className={styles.miniDate}>
                      {new Date(r.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ))}
      {patterns.length === 0 && <p>No strong recurring patterns detected.</p>}
    </div>
  )
}
