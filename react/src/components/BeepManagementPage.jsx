import { useState, useCallback } from 'react'
import beepService, { beep } from '../services/beepService'

const PATTERNS = [
  { key: 'b1',   label: 'b1',   desc: 'Beep tunggal 70ms' },
  { key: 'b2',   label: 'b2',   desc: '1 set double-beep' },
  { key: 'b3',   label: 'b3',   desc: '5 set (amaran solat)' },
  { key: 'ba',   label: 'ba',   desc: '8 set (azan/prayer)' },
  { key: 'bell', label: 'bell', desc: 'Loceng jam 900 Hz' },
]

const s = {
  page: {
    minHeight: '100vh', background: '#0d0d0d', color: '#ddd',
    padding: 28, fontFamily: 'sans-serif',
  },
  infoBox: {
    background: '#0f1a0f', border: '1px solid #2a4a2a',
    borderRadius: 10, padding: '14px 18px', marginBottom: 20,
  },
  infoTitle: { fontSize: 13, fontWeight: 500, color: '#6f6', marginBottom: 8 },
  infoText: { fontSize: 12, color: '#999', lineHeight: 1.7, margin: 0 },
  card: {
    background: '#1a1a1a', border: '1px solid #333', borderRadius: 10,
    padding: '14px 18px', marginBottom: 12,
  },
  h2: { fontSize: 13, color: '#666', marginBottom: 12, fontWeight: 500 },
  row: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  label: { fontSize: 13, color: '#888', minWidth: 90 },
  val: { fontSize: 13, fontFamily: 'monospace', minWidth: 60, textAlign: 'right', color: '#ccc' },
  btn: {
    border: '1px solid #444', borderRadius: 6, padding: '7px 14px',
    fontSize: 13, cursor: 'pointer', background: '#111', color: '#ccc',
  },
  btnGreen: {
    border: '1px solid #3a5a3a', borderRadius: 6, padding: '7px 14px',
    fontSize: 13, cursor: 'pointer', background: '#1a2a1a', color: '#8f8',
  },
  btnRed: {
    border: '1px solid #6a2a2a', borderRadius: 6, padding: '7px 14px',
    fontSize: 13, cursor: 'pointer', background: '#2a1a1a', color: '#f88',
  },
  pre: {
    background: '#111', border: '1px solid #2a2a2a', borderRadius: 8,
    padding: '12px 16px', marginTop: 28,
  },
}

export default function BeepManagementPage() {
  const [params, setParams] = useState(beepService.getParams())
  const [customN, setCustomN] = useState(3)
  const [status, setStatus] = useState('')

  const updateParam = useCallback((key, value) => {
    const next = { ...params, [key]: value }
    setParams(next)
    beepService.setParams(next)
  }, [params])

  const playPattern = useCallback((key) => {
    beepService.playPattern(key)
    setStatus(`▶ playPattern("${key}")`)
  }, [])

  const playBeep = useCallback((n) => {
    beep(n)
    setStatus(`▶ beep(${n}) — ${n} set double-beep`)
  }, [])

  return (
    <div style={s.page}>
      <h1 style={{ fontSize: 18, fontWeight: 500, marginBottom: 16, color: '#eee' }}>
        Pengurusan Beep
      </h1>

      {/* Penjelasan ringkas */}
      <div style={s.infoBox}>
        <p style={s.infoTitle}>Apa page ni?</p>
        <p style={s.infoText}>
          Page ini untuk uji dan konfigurasi sistem bunyi beep iPray.<br />
          <strong style={{ color: '#ccc' }}>beepService.js</strong> — engine bunyi guna Web Audio API (tanpa fail WAV).
          Parameter disimpan dalam service dan digunakan oleh seluruh app.<br /><br />
          <strong style={{ color: '#ccc' }}>Konsep beep(n):</strong><br />
          Satu "beep" = satu set double-beep (bunyi dua kali: pip•pip).<br />
          <code style={{ color: '#8f8' }}>beep(2)</code> = 2 set → pip•pip ··· pip•pip<br />
          <code style={{ color: '#8f8' }}>beep(n)</code> = n set dengan jeda 800ms antara tiap set.<br /><br />
          Akses page ini via <code style={{ color: '#fa8' }}>/?beep</code> dalam URL. Tanpa query itu, app berjalan seperti biasa.
        </p>
      </div>

      {/* Parameter */}
      <div style={s.card}>
        <p style={s.h2}>Parameter</p>
        <div style={s.row}>
          <span style={s.label}>Frekuensi</span>
          <input type="range" min={500} max={4000} step={50}
            value={params.freq}
            onChange={e => updateParam('freq', +e.target.value)}
            style={{ flex: 1 }} />
          <span style={s.val}>{params.freq} Hz</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Amplitud</span>
          <input type="range" min={0.1} max={1} step={0.01}
            value={params.amp}
            onChange={e => updateParam('amp', +e.target.value)}
            style={{ flex: 1 }} />
          <span style={s.val}>{params.amp.toFixed(2)}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Fade</span>
          <input type="range" min={1} max={20} step={1}
            value={params.fadeMs}
            onChange={e => updateParam('fadeMs', +e.target.value)}
            style={{ flex: 1 }} />
          <span style={s.val}>{params.fadeMs} ms</span>
        </div>
      </div>

      {/* beep(n) */}
      <div style={s.card}>
        <p style={s.h2}>beep(n) — n set double-beep</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button style={s.btn} onClick={() => playBeep(2)}>
            beep() <span style={{ color: '#555' }}>default 2 set</span>
          </button>
          {[1, 3, 4, 5].map(n => (
            <button key={n} style={s.btn} onClick={() => playBeep(n)}>
              beep({n})
            </button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number" min={1} max={20} value={customN}
              onChange={e => setCustomN(Math.max(1, +e.target.value))}
              style={{
                width: 52, padding: '6px 8px', borderRadius: 6,
                background: '#111', border: '1px solid #444',
                color: '#ddd', fontSize: 13,
              }}
            />
            <button style={s.btnGreen} onClick={() => playBeep(customN)}>
              beep({customN})
            </button>
          </div>
        </div>
      </div>

      {/* Pattern preset */}
      <div style={s.card}>
        <p style={s.h2}>Pattern preset (dari firmware ESP32)</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PATTERNS.map(p => (
            <button key={p.key} style={s.btn} onClick={() => playPattern(p.key)}>
              {p.label}
              <span style={{ color: '#555', marginLeft: 6, fontSize: 12 }}>{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stop */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button style={s.btnRed}
          onClick={() => { beepService.stop(); setStatus('■ Berhenti') }}>
          ■ Stop
        </button>
        {status && <span style={{ fontSize: 12, color: '#888' }}>{status}</span>}
      </div>

      {/* Usage */}
      <div style={s.pre}>
        <p style={{ fontSize: 12, color: '#555', margin: '0 0 8px' }}>Cara guna dalam komponen lain:</p>
        <pre style={{ fontSize: 12, color: '#888', margin: 0, lineHeight: 1.7 }}>{`import { beep } from '../services/beepService'
import beepService from '../services/beepService'

beep()      // 2 set (default) — pip•pip ··· pip•pip
beep(1)     // 1 set           — pip•pip
beep(n)     // n set

beepService.playPattern('b3')   // 5 set amaran solat
beepService.playPattern('ba')   // 8 set azan/prayer
beepService.stop()              // henti semua`}</pre>
      </div>
    </div>
  )
}
