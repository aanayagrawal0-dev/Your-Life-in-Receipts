// Shared vocabulary for receipt types. Kept in one place so every view
// (Explore filters, Chapter scenes, Constellation legend) stays in sync.
export const TYPE_META = {
  music: { label: 'Music', icon: '♪', color: '#7c5cff' },
  movie: { label: 'Movies & Entertainment', icon: '▶', color: '#e0578f' },
  place: { label: 'Places', icon: '◉', color: '#28a3a3' },
  purchase: { label: 'Purchases', icon: '✧', color: '#d99a35' },
  photo: { label: 'Photos', icon: '▣', color: '#5d8bf4' },
  message: { label: 'Messages', icon: '✉', color: '#4fb06d' },
  search: { label: 'Searches', icon: '⌕', color: '#8a8a99' },
  event: { label: 'Events', icon: '★', color: '#e8543e' },
  note: { label: 'Personal Notes', icon: '✎', color: '#b06fd1' },
}

export const TYPE_ORDER = [
  'music', 'movie', 'place', 'purchase', 'photo', 'message', 'search', 'event', 'note',
]

export const MOOD_COLOR = {
  routine: '#8a8a99', comfort: '#d99a35', 'distant-love': '#7c5cff', tired: '#6b6b7a',
  joyful: '#e0578f', anticipation: '#5d8bf4', love: '#e0578f', nostalgic: '#8a8a99',
  sad: '#4a6fa5', anxious: '#9b6bd6', numb: '#6b6b7a', lonely: '#4a6fa5',
  determined: '#4fb06d', hopeful: '#4fb06d', sore: '#d99a35', content: '#4fb06d',
  driven: '#e8543e', stressed: '#e8543e', proud: '#d99a35', wired: '#e8543e',
  excited: '#e0578f', open: '#5d8bf4', adventurous: '#28a3a3', happy: '#e0578f',
}
