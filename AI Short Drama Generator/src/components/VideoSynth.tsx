import { useState } from 'react'

const C = {
  bg:       '#F5F6F8',
  white:    '#FFFFFF',
  border:   '#E4E7EE',
  text:     '#1A1D24',
  textSub:  '#5A6070',
  textMute: '#9AA0B0',
  amber:    '#E69500',
  amberBg:  '#FFF3D0',
  green:    '#16A34A',
  greenBg:  '#ECFDF5',
  tag:      '#EEF0F4',
  input:    '#F5F6F8',
}

const CLIPS = [
  { id: 'S001', scene: '第一幕', shots: 6, duration: '18.4s', status: 'ready',      thumb: 'photo-1501339847302-ac426a4a7cbb' },
  { id: 'S002', scene: '第二幕', shots: 4, duration: '12.2s', status: 'ready',      thumb: 'photo-1495474472287-4d71bcdd2085' },
  { id: 'S003', scene: '第三幕', shots: 8, duration: '24.7s', status: 'processing', thumb: '' },
  { id: 'S004', scene: '第四幕', shots: 3, duration: '9.5s',  status: 'pending',    thumb: '' },
  { id: 'S005', scene: '第五幕', shots: 5, duration: '15.8s', status: 'pending',    thumb: '' },
]

const SETTINGS = [
  { label: '输出分辨率', value: '1080×1920', sub: '竖屏 9:16' },
  { label: '帧率',       value: '30fps',     sub: '标准' },
  { label: '码率',       value: '8 Mbps',    sub: '高质量' },
  { label: '格式',       value: 'MP4/H.264', sub: '兼容性强' },
]

const STATUS_CFG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  ready:      { color: '#16A34A', bg: '#ECFDF5', border: '#BBF7D0', label: '就绪' },
  processing: { color: '#E69500', bg: '#FFF3D0', border: '#FDE68A', label: '处理中' },
  pending:    { color: '#9AA0B0', bg: '#EEF0F4', border: '#E4E7EE', label: '待处理' },
}

export default function VideoSynth() {
  const [synthProgress, setSynthProgress] = useState(37)
  const [started, setStarted] = useState(false)

  const handleStart = () => {
    if (synthProgress === 100) return
    setStarted(true)
    const id = setInterval(() => {
      setSynthProgress(p => { if (p >= 100) { clearInterval(id); return 100 } return p + 2 })
    }, 180)
  }

  const steps = [
    ['素材加载', 100], ['镜头剪辑', 100], ['配音合并', 78], ['色调处理', 12], ['字幕渲染', 0], ['最终封装', 0],
  ]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Preview */}
        <div style={{ padding: '16px 20px', background: C.white, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 180, margin: '0 auto', aspectRatio: '9/16', background: C.input, borderRadius: 8, overflow: 'hidden', position: 'relative', border: `1px solid ${C.border}` }}>
            <img src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=360&h=640&fit=crop&auto=format"
              alt="预览" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: 14, color: C.amber, marginLeft: 2 }}>▶</span>
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 8px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
              <div style={{ height: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 1 }}>
                <div style={{ height: '100%', width: '28%', background: '#fff', borderRadius: 1 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'rgba(255,255,255,0.8)', fontFamily: "'JetBrains Mono', monospace" }}>
                <span>0:10</span><span>0:37</span>
              </div>
            </div>
            <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: 2, fontSize: 9, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
              PREVIEW
            </div>
          </div>
        </div>

        {/* Clips */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: C.bg }}>
          <div style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>场次片段</div>
          {CLIPS.map(clip => {
            const s = STATUS_CFG[clip.status]
            return (
              <div key={clip.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 5, padding: '11px 14px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 56, height: 32, background: C.input, borderRadius: 3, overflow: 'hidden', flexShrink: 0, border: `1px solid ${C.border}` }}>
                  {clip.thumb
                    ? <img src={`https://images.unsplash.com/${clip.thumb}?w=112&h=64&fit=crop&auto=format`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C0C5D0', fontSize: 14 }}>◫</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{clip.scene}</span>
                    <span style={{ fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>{clip.id}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 10, color: C.textSub }}>
                    <span>{clip.shots} 个镜头</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{clip.duration}</span>
                  </div>
                </div>
                <span style={{ fontSize: 10, background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 8px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{s.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: 272, background: C.white, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Settings */}
        <div style={{ padding: '14px', borderBottom: `1px solid ${C.border}` }}>
          <SectionLabel>输出设置</SectionLabel>
          {SETTINGS.map((s, i, arr) => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.input}` : 'none' }}>
              <div>
                <div style={{ fontSize: 11, color: C.textSub }}>{s.label}</div>
                <div style={{ fontSize: 9, color: C.textMute }}>{s.sub}</div>
              </div>
              <div style={{ fontSize: 11, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Post-processing */}
        <div style={{ padding: '14px', borderBottom: `1px solid ${C.border}` }}>
          <SectionLabel>后期处理</SectionLabel>
          {[['AI 色调统一', true], ['背景音乐', true], ['字幕自动生成', true], ['片头片尾', false], ['水印去除', false]].map(([label, on]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: C.textSub }}>{label as string}</span>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: on ? C.amber : C.tag, border: `1px solid ${on ? '#F5C842' : C.border}`, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: on ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Synthesis Progress */}
        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <SectionLabel>合成进度</SectionLabel>
          <div style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 5, padding: '12px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.textSub }}>总进度</span>
              <span style={{ fontSize: 11, color: C.amber, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{synthProgress}%</span>
            </div>
            <div style={{ height: 5, background: C.border, borderRadius: 3, marginBottom: 12 }}>
              <div style={{ height: '100%', width: `${synthProgress}%`, background: C.amber, borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
            {steps.map(([label, pct]) => (
              <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: (pct as number) === 100 ? C.green : (pct as number) > 0 ? C.amber : C.border, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: C.textSub, flex: 1 }}>{label as string}</span>
                <span style={{ fontSize: 10, color: (pct as number) === 100 ? C.green : (pct as number) > 0 ? C.amber : C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>
                  {(pct as number) > 0 ? `${pct}%` : '—'}
                </span>
              </div>
            ))}
          </div>

          <button onClick={handleStart}
            style={{ width: '100%', padding: '10px', background: started && synthProgress < 100 ? C.tag : C.amber, border: 'none', borderRadius: 4, color: started && synthProgress < 100 ? C.textMute : '#fff', fontSize: 13, fontWeight: 700, cursor: synthProgress === 100 ? 'pointer' : 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.2s', boxShadow: synthProgress < 100 && !started ? '0 2px 8px rgba(230,149,0,0.3)' : 'none' }}>
            {started && synthProgress < 100 ? '合成中…' : synthProgress === 100 ? '⬇ 下载成品' : '▶ 开始合成'}
          </button>

          {synthProgress === 100 && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: C.greenBg, border: `1px solid #BBF7D0`, borderRadius: 4, fontSize: 11, color: C.green, textAlign: 'center' }}>
              ✓ 合成完成 · 总时长 1:22.4
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, color: '#9AA0B0', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{children}</div>
}
