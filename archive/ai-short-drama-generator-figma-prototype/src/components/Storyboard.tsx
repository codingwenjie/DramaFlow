import { useState } from 'react'

const C = {
  bg:       '#F5F6F8',
  sidebar:  '#FFFFFF',
  border:   '#E4E7EE',
  text:     '#1A1D24',
  textSub:  '#5A6070',
  textMute: '#9AA0B0',
  active:   '#FFF8EC',
  amber:    '#E69500',
  tag:      '#EEF0F4',
  tagText:  '#5A6070',
  input:    '#F5F6F8',
  green:    '#16A34A',
  greenBg:  '#ECFDF5',
}

const SHOTS = [
  { id: '001', scene: 1, type: '全景',   angle: '平视', duration: '3.5s', desc: '咖啡馆全景，阳光透过玻璃，林晓端着咖啡走向镜头', status: 'done',       img: 'photo-1501339847302-ac426a4a7cbb' },
  { id: '002', scene: 1, type: '中景',   angle: '微俯', duration: '2.0s', desc: '林晓脚下绊倒，咖啡杯失手飞出，慢动作特效',         status: 'done',       img: 'photo-1495474472287-4d71bcdd2085' },
  { id: '003', scene: 1, type: '特写',   angle: '平视', duration: '1.5s', desc: '咖啡泼洒瞬间，溅射到西装上',                       status: 'done',       img: 'photo-1521727857535-28d2047619aa' },
  { id: '004', scene: 1, type: '中近景', angle: '平视', duration: '4.0s', desc: '陈诺转身，表情从冷淡转为意外，望向林晓',           status: 'generating', img: '' },
  { id: '005', scene: 1, type: '双人景', angle: '平视', duration: '5.5s', desc: '两人对视，林晓慌乱道歉，陈诺平静回应',             status: 'pending',    img: '' },
  { id: '006', scene: 1, type: '特写',   angle: '仰视', duration: '2.0s', desc: '工牌特写：都市集团 CEO 陈诺，林晓瞳孔震惊',       status: 'pending',    img: '' },
  { id: '007', scene: 2, type: '全景',   angle: '航拍', duration: '3.0s', desc: '公司门口傍晚，人群散去，陈诺的车停在路边',         status: 'pending',    img: '' },
  { id: '008', scene: 2, type: '中景',   angle: '平视', duration: '4.5s', desc: '陈诺看到林晓加班后匆忙跑出，拦住她',               status: 'pending',    img: '' },
]

const STATUS: Record<string, { color: string; bg: string; label: string }> = {
  done:       { color: '#16A34A', bg: '#ECFDF5', label: '完成' },
  generating: { color: '#E69500', bg: '#FFF3D0', label: '生成中' },
  pending:    { color: '#9AA0B0', bg: '#EEF0F4', label: '待生成' },
}

export default function Storyboard() {
  const [selected, setSelected] = useState<number | null>(0)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '9px 20px', background: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: C.textSub }}>共 {SHOTS.length} 个镜头</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 3, background: C.tag, padding: 3, borderRadius: 4 }}>
            {(['grid', 'list'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: '3px 10px', background: viewMode === m ? '#fff' : 'transparent', border: 'none', borderRadius: 3, color: viewMode === m ? C.text : C.textMute, fontSize: 11, cursor: 'pointer', boxShadow: viewMode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {m === 'grid' ? '网格' : '列表'}
              </button>
            ))}
          </div>
          <button style={{ padding: '5px 14px', background: C.amber, border: 'none', borderRadius: 4, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
            ✦ AI 生成全部
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: C.bg }}>
          <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(210px, 1fr))' : '1fr', gap: 10 }}>
            {SHOTS.map((shot, i) => (
              <ShotCard key={shot.id} shot={shot} active={selected === i} onClick={() => setSelected(i)} listMode={viewMode === 'list'} />
            ))}
          </div>
        </div>
      </div>

      {selected !== null && (
        <div style={{ width: 256, background: '#fff', borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>镜头 #{SHOTS[selected].id}</div>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{SHOTS[selected].type}</div>
          </div>

          <div style={{ width: '100%', aspectRatio: '16/9', background: C.bg, position: 'relative', overflow: 'hidden' }}>
            {SHOTS[selected].status === 'done' && SHOTS[selected].img ? (
              <img src={`https://images.unsplash.com/${SHOTS[selected].img}?w=512&h=288&fit=crop&auto=format`}
                alt={SHOTS[selected].desc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : SHOTS[selected].status === 'generating' ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, border: `2px solid ${C.amber}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 11, color: C.amber }}>AI 生成中…</span>
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ fontSize: 24, color: C.border }}>◫</div>
                <button style={{ padding: '5px 14px', background: C.amber, border: 'none', borderRadius: 3, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>生成分镜</button>
              </div>
            )}
            <div style={{ position: 'absolute', top: 6, right: 6 }}>
              <StatusBadge status={SHOTS[selected].status} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            <div style={{ fontSize: 11, color: C.textSub, lineHeight: 1.7, marginBottom: 14 }}>{SHOTS[selected].desc}</div>

            <SectionLabel>镜头参数</SectionLabel>
            <PropRow label="镜头类型" value={SHOTS[selected].type} />
            <PropRow label="拍摄角度" value={SHOTS[selected].angle} />
            <PropRow label="时长"     value={SHOTS[selected].duration} mono />
            <PropRow label="所属场景" value={`第 ${SHOTS[selected].scene} 幕`} />

            <div style={{ margin: '12px 0', borderTop: `1px solid ${C.border}` }} />
            <SectionLabel>镜头描述</SectionLabel>
            <textarea defaultValue={SHOTS[selected].desc}
              style={{ width: '100%', background: C.input, border: `1px solid ${C.border}`, borderRadius: 3, color: C.textSub, fontSize: 11, padding: '8px', resize: 'none', outline: 'none', lineHeight: 1.7, height: 80, fontFamily: "'Inter', sans-serif" }} />
            <button style={{ width: '100%', padding: '7px', background: C.input, border: `1px solid ${C.border}`, borderRadius: 3, color: C.textSub, fontSize: 11, cursor: 'pointer', marginTop: 8 }}>
              重新生成
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function ShotCard({ shot, active, onClick, listMode }: { shot: typeof SHOTS[0]; active: boolean; onClick: () => void; listMode: boolean }) {
  if (listMode) {
    return (
      <div onClick={onClick}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: active ? '#FFF8EC' : '#fff', border: `1px solid ${active ? '#F5C842' : '#E4E7EE'}`, borderRadius: 5, cursor: 'pointer', transition: 'all 0.1s' }}>
        <div style={{ width: 80, height: 45, background: '#F5F6F8', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
          {shot.status === 'done' && shot.img
            ? <img src={`https://images.unsplash.com/${shot.img}?w=160&h=90&fit=crop&auto=format`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#D0D5E0' }}>◫</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: '#9AA0B0', fontFamily: "'JetBrains Mono', monospace" }}>#{shot.id}</span>
            <span style={{ fontSize: 11, color: '#5A6070' }}>{shot.type} · {shot.angle}</span>
            <StatusBadge status={shot.status} />
          </div>
          <div style={{ fontSize: 11, color: '#5A6070', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {shot.desc}
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#9AA0B0', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{shot.duration}</div>
      </div>
    )
  }

  return (
    <div onClick={onClick}
      style={{ background: '#fff', border: `1px solid ${active ? '#F5C842' : '#E4E7EE'}`, borderRadius: 5, cursor: 'pointer', overflow: 'hidden', transition: 'all 0.1s', boxShadow: active ? '0 0 0 2px rgba(230,149,0,0.15)' : 'none' }}>
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#F5F6F8', position: 'relative', overflow: 'hidden' }}>
        {shot.status === 'done' && shot.img
          ? <img src={`https://images.unsplash.com/${shot.img}?w=420&h=236&fit=crop&auto=format`} alt={shot.desc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 22, color: shot.status === 'generating' ? '#E69500' : '#D0D5E0' }}>◫</div>
              {shot.status === 'generating' && <span style={{ fontSize: 9, color: '#E69500', fontFamily: "'JetBrains Mono', monospace" }}>生成中…</span>}
            </div>}
        <div style={{ position: 'absolute', top: 5, left: 6, background: 'rgba(255,255,255,0.88)', padding: '1px 5px', borderRadius: 2, fontSize: 9, color: '#5A6070', fontFamily: "'JetBrains Mono', monospace" }}>
          #{shot.id}
        </div>
        <div style={{ position: 'absolute', top: 5, right: 6 }}>
          <StatusBadge status={shot.status} />
        </div>
        <div style={{ position: 'absolute', bottom: 5, right: 6, background: 'rgba(255,255,255,0.88)', padding: '1px 5px', borderRadius: 2, fontSize: 9, color: '#5A6070', fontFamily: "'JetBrains Mono', monospace" }}>
          {shot.duration}
        </div>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 4 }}>
          <span style={{ fontSize: 9, background: '#EEF0F4', color: '#5A6070', padding: '1px 5px', borderRadius: 2 }}>{shot.type}</span>
          <span style={{ fontSize: 9, background: '#EEF0F4', color: '#5A6070', padding: '1px 5px', borderRadius: 2 }}>{shot.angle}</span>
        </div>
        <div style={{ fontSize: 10, color: '#5A6070', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {shot.desc}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = { done: { color: '#16A34A', bg: '#ECFDF5', label: '完成' }, generating: { color: '#E69500', bg: '#FFF3D0', label: '生成中' }, pending: { color: '#9AA0B0', bg: '#EEF0F4', label: '待生成' } }[status] || { color: '#9AA0B0', bg: '#EEF0F4', label: '—' }
  return <span style={{ fontSize: 9, background: s.bg, color: s.color, padding: '1px 5px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</span>
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, color: '#9AA0B0', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{children}</div>
}
function PropRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: '#9AA0B0' }}>{label}</span>
      <span style={{ fontSize: 11, color: '#5A6070', fontFamily: mono ? "'JetBrains Mono', monospace" : undefined }}>{value}</span>
    </div>
  )
}
