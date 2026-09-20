import { useEffect, useRef, useState } from 'react'

// A tiny procedurally-generated ambient "lounge" pad, built entirely with the
// Web Audio API — no audio file, no network request. A soft triangle-wave
// chord (a spread ninth voicing) runs through a lowpass filter with a slow
// LFO on the cutoff and a spacious feedback delay, which is what gives it
// that warm, unhurried lounge/lofi character instead of a flat drone.
//
// The AudioContext is created lazily, inside the first play() call, because
// browsers refuse to start audio before a user gesture.
const CHORD_HZ = [130.81, 164.81, 196.0, 246.94, 293.66] // C3 E3 G3 B3 D4 — Cmaj9

function buildGraph(ctx) {
  const master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 900
  filter.Q.value = 0.6
  filter.connect(master)

  const delay = ctx.createDelay(1.2)
  delay.delayTime.value = 0.42
  const feedback = ctx.createGain()
  feedback.gain.value = 0.27
  delay.connect(feedback)
  feedback.connect(delay)
  delay.connect(filter)

  const dry = ctx.createGain()
  dry.gain.value = 0.8
  dry.connect(filter)
  dry.connect(delay)

  const voices = CHORD_HZ.map((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    osc.detune.value = (i % 2 === 0 ? 1 : -1) * 3 // subtle detune for warmth
    const gain = ctx.createGain()
    gain.gain.value = 0.15
    osc.connect(gain)
    gain.connect(dry)
    osc.start()
    return osc
  })

  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.065
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 260
  lfo.connect(lfoGain)
  lfoGain.connect(filter.frequency)
  lfo.start()

  return { master, voices, lfo }
}

export function useLoungeLoop() {
  const ctxRef = useRef(null)
  const graphRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    return () => {
      const ctx = ctxRef.current
      const graph = graphRef.current
      if (!ctx) return
      graph.voices.forEach((osc) => osc.stop())
      graph.lfo.stop()
      ctx.close()
    }
  }, [])

  function ensureContext() {
    if (ctxRef.current) return ctxRef.current
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextCtor) return null
    const ctx = new AudioContextCtor()
    ctxRef.current = ctx
    graphRef.current = buildGraph(ctx)
    return ctx
  }

  function play() {
    const ctx = ensureContext()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    graphRef.current.master.gain.cancelScheduledValues(now)
    graphRef.current.master.gain.setValueAtTime(graphRef.current.master.gain.value, now)
    graphRef.current.master.gain.linearRampToValueAtTime(0.16, now + 0.7)
    setPlaying(true)
  }

  function pause() {
    const ctx = ctxRef.current
    if (!ctx) return
    const now = ctx.currentTime
    graphRef.current.master.gain.cancelScheduledValues(now)
    graphRef.current.master.gain.setValueAtTime(graphRef.current.master.gain.value, now)
    graphRef.current.master.gain.linearRampToValueAtTime(0, now + 0.4)
    setPlaying(false)
  }

  function toggle() {
    if (playing) pause()
    else play()
  }

  return { playing, toggle }
}
