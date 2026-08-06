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
  blueBg:   '#EFF4FF',
  blueBdr:  '#BFCFFF',
  green:    '#16A34A',
  greenBg:  '#ECFDF5',
  tag:      '#EEF0F4',
  tagText:  '#5A6070',
  input:    '#F5F6F8',
}

const CHARACTERS = [
  {
    id: 'c1', name: '陈诺', role: '男主角', age: 35, tags: ['霸总', '冷淡', '深情'],
    desc: '都市集团CEO，外表冷淡实则温柔，因童年创伤对感情设防',
    voice: '深沉男声·磁性', model: '真实风格·商务男性',
    scenes: 18, lines: 245, img: 'photo-1507003211169-0a1dd7228f2d',
    attrs: { 身份: 'CEO', 年龄: '35岁', 性格: '冷淡深情', 口头禅: '没事。' }
  },
  {
    id: 'c2', name: '林晓', role: '女主角', age: 27, tags: ['独立', '善良', '倔强'],
    desc: '星光广告策划师，性格直率，工作努力，不畏强权',
    voice: '清甜女声·元气', model: '真实风格·职场女性',
    scenes: 22, lines: 312, img: 'photo-1494790108755-2616b9e73b25',
    attrs: { 身份: '广告策划师', 年龄: '27岁', 性格: '独立倔强', 口头禅: '对不起！' }
  },
  {
    id: 'c3', name: '董事长', role: '配角', age: 62, tags: ['权威', '慈祥', '精明'],
    desc: '陈诺的父亲，看似严厉实则处处为儿子铺路',
    voice: '沉稳长者声', model: '真实风格·老年男性',
    scenes: 6, lines: 78, img: 'photo-1560250097-0b93528c311a',
    attrs: { 身份: '集团董事长', 年龄: '62岁', 性格: '精明睿智', 口头禅: '为父者…' }
  },
  {
    id: 'c4', name: '秘书', role: '配角', age: 28, tags: ['干练', '忠诚'],
    desc: '陈诺的私人秘书，处事周全，暗中观察两人关系',
    voice: '知性女声·职场', model: '真实风格·职场女性',
    scenes: 9, lines: 95, img: 'photo-1573496359142-b8d87734a5a2',
    attrs: { 身份: '私人秘书', 年龄: '28岁', 性格: '干练忠诚', 口头禅: '陈总，…' }
  },
]

type Tab = 'profile' | 'voice' | 'model'

export default function Characters() {
  const [selected, setSelected] = useState(0)
  const [tab, setTab] = useState<Tab>('profile')
  const char = CHARACTERS[selected]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Character List */}
      <div style={{ width: 196, background: C.white, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>角色</span>
          <button style={{ background: C.amber, border: 'none', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>+ 角色</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {CHARACTERS.map((c, i) => (
            <button key={c.id} onClick={() => setSelected(i)}
              style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: selected === i ? C.active : 'transparent', border: 'none', borderLeft: selected === i ? `2px solid ${C.amber}` : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.1s' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1.5px solid ${selected === i ? C.amber : C.border}` }}>
                <img src={`https://images.unsplash.com/${c.img}?w=64&h=64&fit=crop&auto=format`} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: selected === i ? C.text : C.textSub, fontWeight: selected === i ? 500 : 400, marginBottom: 1 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: C.textMute }}>{c.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${C.amber}`, flexShrink: 0 }}>
            <img src={`https://images.unsplash.com/${char.img}?w=104&h=104&fit=crop&auto=format`} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <span style={{ fontSize: 16, color: C.text, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>{char.name}</span>
              <span style={{ fontSize: 11, background: C.blueBg, color: C.blue, padding: '2px 8px', borderRadius: 3, border: `1px solid ${C.blueBdr}` }}>{char.role}</span>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {char.tags.map(t => (
                <span key={t} style={{ fontSize: 10, background: C.tag, color: C.tagText, padding: '2px 7px', borderRadius: 3 }}>#{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, color: C.amber, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{char.scenes}</div>
              <div style={{ fontSize: 10, color: C.textMute }}>出场幕数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, color: C.amber, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{char.lines}</div>
              <div style={{ fontSize: 10, color: C.textMute }}>台词条数</div>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', padding: '0 20px' }}>
          {([['profile', '人物档案'], ['voice', '声音设置'], ['model', '形象模型']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '9px 16px', background: 'transparent', border: 'none', borderBottom: tab === id ? `2px solid ${C.amber}` : '2px solid transparent', color: tab === id ? C.text : C.textSub, fontSize: 12, cursor: 'pointer', fontWeight: tab === id ? 500 : 400 }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: C.bg }}>
          {tab === 'profile' && <ProfileTab char={char} />}
          {tab === 'voice'   && <VoiceTab char={char} />}
          {tab === 'model'   && <ModelTab char={char} />}
        </div>
      </div>
    </div>
  )
}

function ProfileTab({ char }: { char: typeof CHARACTERS[0] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div>
        <SectionLabel>基本信息</SectionLabel>
        <div style={{ background: '#fff', border: '1px solid #E4E7EE', borderRadius: 5, padding: '12px 14px', marginBottom: 16 }}>
          {Object.entries(char.attrs).map(([k, v], i, arr) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < arr.length - 1 ? '1px solid #F0F1F4' : 'none' }}>
              <span style={{ fontSize: 11, color: '#9AA0B0' }}>{k}</span>
              <span style={{ fontSize: 11, color: '#2A2D36' }}>{v}</span>
            </div>
          ))}
        </div>
        <SectionLabel>人物描述</SectionLabel>
        <textarea defaultValue={char.desc}
          style={{ width: '100%', background: '#fff', border: '1px solid #E4E7EE', borderRadius: 5, color: '#5A6070', fontSize: 12, padding: '10px 12px', resize: 'none', outline: 'none', lineHeight: 1.8, height: 90, fontFamily: "'Inter', sans-serif" }} />
      </div>
      <div>
        <SectionLabel>AI 人设建议</SectionLabel>
        <div style={{ background: '#FFFDF0', border: '1px solid #F5E080', borderRadius: 5, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#7A6010', lineHeight: 1.8, marginBottom: 10 }}>
            💡 根据剧本分析，{char.name}在第3幕中的情绪弧线建议：从"冷漠疏离"逐步过渡到"意外动容"，加入短暂犹豫和内心独白，增强层次感。
          </div>
          <button style={{ padding: '4px 12px', background: '#fff', border: '1px solid #F5C842', borderRadius: 3, color: '#A07010', fontSize: 11, cursor: 'pointer' }}>应用建议</button>
        </div>
        <SectionLabel>台词类型分布</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['情感类台词', '38%', '#2563EB', '#EFF4FF'], ['冲突类台词', '28%', '#DC2626', '#FEF2F2'], ['日常对话', '24%', '#7C3AED', '#F5F3FF'], ['独白', '10%', '#16A34A', '#ECFDF5']].map(([label, val, color, bg]) => (
            <div key={label} style={{ background: bg as string, border: '1px solid', borderColor: `${color}22`, borderRadius: 5, padding: '10px 12px' }}>
              <div style={{ fontSize: 16, color: color as string, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, marginBottom: 2 }}>{val}</div>
              <div style={{ fontSize: 10, color: '#5A6070' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VoiceTab({ char }: { char: typeof CHARACTERS[0] }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div style={{ maxWidth: 560 }}>
      <SectionLabel>当前声音</SectionLabel>
      <div style={{ background: '#fff', border: '1px solid #E4E7EE', borderRadius: 5, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => setPlaying(!playing)}
          style={{ width: 38, height: 38, borderRadius: '50%', background: '#E69500', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, color: '#fff' }}>
          {playing ? '⏸' : '▶'}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: '#1A1D24', fontWeight: 500, marginBottom: 5 }}>{char.voice}</div>
          <div style={{ height: 3, background: '#EEF0F4', borderRadius: 2 }}>
            <div style={{ height: '100%', width: playing ? '45%' : '0%', background: '#E69500', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
        <span style={{ fontSize: 10, color: '#9AA0B0', fontFamily: "'JetBrains Mono', monospace" }}>0:03.2</span>
      </div>
      <SectionLabel>可用声音库</SectionLabel>
      <div style={{ display: 'grid', gap: 7 }}>
        {[
          { name: '深沉男声·磁性', desc: '低频醇厚，适合霸总、成熟男性角色', active: true },
          { name: '青年男声·阳光', desc: '明亮活力，适合青春、热血男性角色', active: false },
          { name: '中年男声·儒雅', desc: '温润稳重，适合学者、父亲类角色',   active: false },
          { name: '老年男声·沉稳', desc: '岁月感强，适合权威长者类角色',     active: false },
        ].map(v => (
          <div key={v.name}
            style={{ background: v.active ? '#FFF8EC' : '#fff', border: `1px solid ${v.active ? '#F5C842' : '#E4E7EE'}`, borderRadius: 5, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: v.active ? '#FFF3D0' : '#EEF0F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🎙</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: v.active ? '#1A1D24' : '#5A6070', fontWeight: v.active ? 500 : 400 }}>{v.name}</div>
              <div style={{ fontSize: 10, color: '#9AA0B0', marginTop: 2 }}>{v.desc}</div>
            </div>
            {v.active && <span style={{ fontSize: 9, background: '#FFF3D0', color: '#A07010', padding: '2px 6px', borderRadius: 3, border: '1px solid #F5C842' }}>使用中</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function ModelTab({ char }: { char: typeof CHARACTERS[0] }) {
  return (
    <div>
      <SectionLabel>形象参考</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ aspectRatio: '3/4', background: '#F5F6F8', borderRadius: 5, overflow: 'hidden', border: i === 0 ? `2px solid #E69500` : `1px solid #E4E7EE`, cursor: 'pointer' }}>
            {i === 0
              ? <img src={`https://images.unsplash.com/${char.img}?w=200&h=267&fit=crop&auto=format`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C0C5D0', fontSize: 22 }}>+</div>}
          </div>
        ))}
      </div>
      <SectionLabel>风格设置</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 480, marginBottom: 20 }}>
        {[['渲染风格', '真实风格'], ['服装风格', '商务正装'], ['年龄段', '35-40岁'], ['体型', '高挑偏瘦']].map(([label, val]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #E4E7EE', borderRadius: 5, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#9AA0B0', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 12, color: '#2A2D36' }}>{val}</div>
          </div>
        ))}
      </div>
      <button style={{ padding: '8px 22px', background: '#E69500', border: 'none', borderRadius: 4, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
        ✦ AI 生成形象
      </button>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, color: '#9AA0B0', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{children}</div>
}
