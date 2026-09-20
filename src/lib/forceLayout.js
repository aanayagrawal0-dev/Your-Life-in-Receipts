// Deterministic "constellation" layout.
//
// An honest general-purpose force simulation (repulsion + spring edges)
// turned out to reliably push almost every node out to the bounding box —
// with ~100 nodes, pairwise repulsion overwhelms any centering force that's
// still weak enough not to distort real clusters. Rather than hand-tune
// physics constants to fight that, this takes a more deliberate approach
// that matches what the view is actually trying to show:
//
//   - Connected receipts (real moments the clustering engine found) are
//     grouped into small circular clusters, packed across the centre of
//     the canvas.
//   - Receipts with no strong connection are scattered in a ring around
//     the outside — "isolated receipts drift to the edges" is the literal
//     layout rule, not just copy.
const WIDTH = 1000
const HEIGHT = 640
const MARGIN = 40

function seededRandom(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function connectedComponents(nodeIds, edgeList) {
  const parent = new Map(nodeIds.map((id) => [id, id]))
  const find = (x) => {
    while (parent.get(x) !== x) x = parent.get(x)
    return x
  }
  const union = (a, b) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  for (const e of edgeList) {
    if (parent.has(e.a) && parent.has(e.b)) union(e.a, e.b)
  }
  const groups = new Map()
  for (const id of nodeIds) {
    const root = find(id)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(id)
  }
  return [...groups.values()]
}

export function computeLayout(nodeIds, edgeList) {
  const positions = new Map()
  if (nodeIds.length === 0) return positions

  const components = connectedComponents(nodeIds, edgeList)
  const clusters = components.filter((c) => c.length > 1).sort((a, b) => b.length - a.length)
  const singles = components.filter((c) => c.length === 1).map((c) => c[0])

  const rand = seededRandom(nodeIds.length * 7919 + 13)

  // --- Clusters: packed into the centre in a simple grid of cells sized to
  // fit the largest cluster's own small radial layout. ---
  const centreW = WIDTH * 0.66
  const centreH = HEIGHT * 0.7
  const centreX0 = (WIDTH - centreW) / 2
  const centreY0 = (HEIGHT - centreH) / 2

  const cols = Math.max(1, Math.ceil(Math.sqrt(clusters.length * (centreW / centreH))))
  const rows = Math.max(1, Math.ceil(clusters.length / cols))
  const cellW = centreW / cols
  const cellH = centreH / rows

  clusters.forEach((cluster, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = centreX0 + cellW * (col + 0.5)
    const cy = centreY0 + cellH * (row + 0.5)
    const ringRadius = Math.min(cellW, cellH) * 0.35 * Math.min(1.4, Math.sqrt(cluster.length) / 1.6)

    if (cluster.length === 1) {
      positions.set(cluster[0], { x: cx, y: cy })
      return
    }
    cluster.forEach((id, j) => {
      const angle = (j / cluster.length) * Math.PI * 2 + i * 0.6
      positions.set(id, {
        x: cx + Math.cos(angle) * ringRadius,
        y: cy + Math.sin(angle) * ringRadius,
      })
    })
  })

  // --- Singles: scattered in an outer ring, angle + radius jittered so
  // they read as a loose halo rather than a perfect circle. ---
  const maxRadius = Math.min(WIDTH, HEIGHT) / 2 - MARGIN
  const innerRadius = maxRadius * 0.62

  singles.forEach((id, i) => {
    const angle = (i / Math.max(singles.length, 1)) * Math.PI * 2 + rand() * 0.3
    const radius = innerRadius + rand() * (maxRadius - innerRadius)
    positions.set(id, {
      x: WIDTH / 2 + Math.cos(angle) * radius,
      y: HEIGHT / 2 + Math.sin(angle) * radius * (HEIGHT / WIDTH) * 1.5,
    })
  })

  // Clamp everything into the canvas just in case.
  for (const p of positions.values()) {
    p.x = Math.min(WIDTH - 20, Math.max(20, p.x))
    p.y = Math.min(HEIGHT - 20, Math.max(20, p.y))
  }

  return positions
}

export const LAYOUT_WIDTH = WIDTH
export const LAYOUT_HEIGHT = HEIGHT
