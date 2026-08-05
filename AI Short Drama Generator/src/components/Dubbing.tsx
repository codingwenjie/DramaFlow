import { useState } from 'react'

const C = {
  bg:       '#F5F6F8',
  white:    '#FFFFFF',
  border:   '#E4E7EE',
  text:     '#1A1D24',
  textSub:  '#5A6070',
  textMute: '#9AA0B0',
  active:   '#FFF8EC',
  amber:    '#E69500',
  amberBg:  '#FFF3D0',
  blue:     '#2563EB',
  tag:      '#EEF0F4',
  input:    '#F5F6F8',
}

const LINES = [
  { id: 'L001', char: '林晓', scene: '第一幕', text: '天哪，对不起！对不起！我真的不是故意的……', status: 'done',       duration: '3.2s', take: 1 },
  { id: 'L002', char: '陈诺', scene: '第一幕', text: '没事。',                                           status: 'done',       duration: '0.8s', take: 1 },
  { id: 'L003', char: '林晓', scene: '第一幕', text: '您的西装……一定很贵吧？我可以赔！',                 status: 'done',       duration: '2.4s', take: 2 },
  { id: 'L004', char: '陈诺', scene: '第一幕', text: '"星光广告策划……林晓。"',                           status: 'generating', duration: '—',    take: 1 },
  { id: 'L005', char: '林晓', scene: '第一幕', text: '对对对，就是我。您有任何损失尽管联系我——',         status: 'pending',    duration: '—',    take: 0 },
  { id: 'L006', char: '陈诺', scene: '第一幕', text: '你们公司正在参与我们的投标？',                     status: 'pending',    duration: '—',    take: 0 },
  { id: 'L007', char: '林晓', scene: '第二幕', text: '我……我只是一名策划师，这个项目对我们公司非常重要。', status: 'pending',    duration: '—',    take: 0 },
  { id: 'L008', char: '陈诺', scene: '第二幕', text: '那你更应该知道，专业的事要用专业的方式处理。',     status: 'pending',    duration: '—',    take: 0 },
]

const CHAR_COLORS: Record<string, string> = {
  '林晓': '#2563EB',
  '陈诺': '#E69500',
  '秘书': '#7C3AED',
  '董事长': '#16A34A',
}

const STATUS_CFG: Record<string, { dot: string; label: string; labelColor: string }> = {
  done:       { dot: '#16A34A', label: '完成',   labelColor: '#16A34A' },
  generating: { dot: '#E69500', label: '生成中', labelColor: '#E69500' },
  pending:    { dot: '#C0C5D0', label: '待配音', labelColor: '#9AA0B0' },
}

export default function Dubbing() {
  const [selected, setSelected] = useState<number | null>(0)
  const [playing, setPlaying] = useState<string | null>(null)

  const done = LINES.filter(l => l.status === 'done').length
  const progress = Math.round((done / LINES.length) * 100)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Progress Bar */}
        <div style={{ padding: '9px 20px', background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: C.textSub, flexShrink: 0 }}>配音进度</span>
          <div style={{ flex: 1, height: 4, background: C.tag, borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: C.amber, borderRadius: 2, transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: 11, color: C.amber, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{done}/{LINES.length}</span>
          <button style={{ padding: '5px 14px', background: C.amber, border: 'none', borderRadius: 4, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>
            ✦ 批量配音
          </button>
        </div>

        {/* Lines */}
        <div style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
          {LINES.map((line, i) => (
            <div key={line.id} onClick={() => setSelected(i)}
              style={{ padding: '11px 20px', borderBottom: `1px solid ${C.border}`, background: selected === i ? '#FFF8EC' : C.white, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', borderLeft: selected === i ? `3px solid ${C.amber}` : '3px solid transparent', transition: 'all 0.1s', marginBottom: 1 }}>

              <div style={{ width: 48, flexShrink: 0 }}>
                <div style={{ fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>{line.id}</div>
                <div style={{ fontSize: 9, color: C.textMute }}>{line.scene}</div>
              </div>

              <div style={{ width: 3, height: 3, borderRadius: '50%', background: CHAR_COLORS[line.char] || C.textMute, marginTop: 6, flexShrink: 0 }} />

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: CHAR_COLORS[line.char] || C.textSub, fontWeight: 600 }}>{line.char}</span>
                  {line.take > 1 && <span style={{ fontSize: 9, background: '#EFF4FF', color: C.blue, padding: '1px 5px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace" }}>Take {line.take}</span>}
                </div>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{line.text}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_CFG[line.status].dot }} />
                  <span style={{ fontSize: 10, color: STATUS_CFG[line.status].labelColor }}>{STATUS_CFG[line.status].label}</span>
                </div>
                <span style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>{line.duration}</span>
                {line.status === 'done' && (
                  <button onClick={e => { e.stopPropagation(); setPlaying(playing === line.id ? null : line.id) }}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: C.tag, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: C.textSub }}>
                    {playing === line.id ? '⏸' : '▶'}
                  </button>
                )}
                {line.status === 'pending' && (
                  <button onClick={e => e.stopPropagation()}
                    style={{ padding: '2px 8px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 3, color: C.textMute, fontSize: 10, cursor: 'pointer' }}>
                    生成
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: 252, background: C.white, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {selected !== null && (
          <>
            <div style={{ padding: '14px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", marginBottom: 5 }}>台词 · {LINES[selected].id}</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>{LINES[selected].text}</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
              <SectionLabel>情绪设置</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
                {[['慌乱', true], ['焦虑', false], ['惊喜', false], ['平静', false]].map(([emotion, active]) => (
                  <button key={emotion as string}
                    style={{ padding: '6px 8px', background: active ? '#EFF4FF' : C.input, border: `1px solid ${active ? '#BFCFFF' : C.border}`, borderRadius: 4, color: active ? C.blue : C.textSub, fontSize: 11, cursor: 'pointer' }}>
                    {emotion as string}
                  </button>
                ))}
              </div>

              <SectionLabel>语速</SectionLabel>
              <input type="range" min="0.5" max="2" step="0.1" defaultValue="1.0" style={{ width: '100%', accentColor: C.amber, marginBottom: 4 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", marginBottom: 14 }}>
                <span>慢</span><span>1.0x</span><span>快</span>
              </div>

              <SectionLabel>音量</SectionLabel>
              <input type="range" min="0" max="100" defaultValue="80" style={{ width: '100%', accentColor: C.amber, marginBottom: 14 }} />

              <SectionLabel>波形预览</SectionLabel>
              <div style={{ height: 48, background: C.input, border: `1px solid ${C.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', overflow: 'hidden', gap: 2, padding: '0 10px', marginBottom: 14 }}>
                {LINES[selected].status === 'done'
                  ? Array.from({ length: 32 }).map((_, i) => (
                      <div key={i} style={{ flex: 1, background: C.amber, borderRadius: 1, opacity: 0.4 + Math.random() * 0.5, height: `${16 + Math.sin(i * 0.8) * 12 + Math.random() * 8}px` }} />
                    ))
                  : <span style={{ fontSize: 10, color: C.textMute, margin: 'auto' }}>未生成</span>
                }
              </div>

              <button style={{ width: '100%', padding: '8px', background: C.amber, border: 'none', borderRadius: 4, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                {LINES[selected].status === 'done' ? '重新生成' : '✦ AI 配音'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, color: '#9AA0B0', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{children}</div>
}
