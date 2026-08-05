import { useState } from 'react'

const C = {
  bg:        '#F5F6F8',
  sidebar:   '#FFFFFF',
  border:    '#E4E7EE',
  text:      '#1A1D24',
  textSub:   '#5A6070',
  textMute:  '#9AA0B0',
  active:    '#FFF8EC',
  amber:     '#E69500',
  amberBg:   '#FFF3D0',
  blue:      '#2563EB',
  blueBg:    '#EFF4FF',
  green:     '#16A34A',
  greenBg:   '#ECFDF5',
  tag:       '#EEF0F4',
  tagText:   '#5A6070',
  input:     '#F5F6F8',
}

const SCENES = [
  { id: 1, title: '第一幕·相遇',   type: '内景', location: '咖啡馆',    time: '白天', chars: ['陈诺', '林晓'],           words: 312 },
  { id: 2, title: '第二幕·误会',   type: '外景', location: '公司门口',  time: '傍晚', chars: ['陈诺', '秘书'],            words: 248 },
  { id: 3, title: '第三幕·摊牌',   type: '内景', location: '总裁办公室', time: '夜晚', chars: ['陈诺', '林晓', '董事长'], words: 445 },
  { id: 4, title: '第四幕·心动',   type: '内景', location: '屋顶花园',  time: '黄昏', chars: ['林晓'],                    words: 189 },
  { id: 5, title: '第五幕·危机',   type: '外景', location: '停车场',    time: '深夜', chars: ['陈诺', '反派A'],           words: 376 },
]

const SCRIPT = `INT. 高档咖啡馆 - 白天

精致的现代装潢，午后阳光透过落地玻璃洒落。

林晓端着咖啡，走路时被什么绊倒——

咖啡泼在一位穿着笔挺西装的男人身上。

林晓
（慌乱）
天哪，对不起！对不起！我真的不是故意的……

男人缓缓转过身来。这是陈诺，35岁，俊朗的
五官带着一丝冷淡，眼神却意外温和。

陈诺
（低沉）
没事。

林晓
（掏出纸巾，手忙脚乱）
您的西装……一定很贵吧？我可以赔！

陈诺微微皱眉，目光落在林晓递过来的名片上。

陈诺
（读出）
"星光广告策划……林晓。"

林晓
（点头如捣蒜）
对对对，就是我。您有任何损失尽管联系我——

陈诺
你们公司正在参与我们的投标？

林晓愣住了，看了看陈诺胸前的工牌——
【都市集团 CEO 陈诺】

林晓
（瞳孔地震）
……`

export default function ScriptEditor() {
  const [activeScene, setActiveScene] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setTimeout(() => { setGenerating(false); setPrompt('') }, 2200)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Scene List */}
      <div style={{ width: 210, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>幕次列表</span>
          <button style={{ background: C.amber, border: 'none', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>+ 幕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {SCENES.map((scene, i) => (
            <button key={scene.id} onClick={() => setActiveScene(i)}
              style={{ width: '100%', textAlign: 'left', padding: '9px 14px', background: activeScene === i ? C.active : 'transparent', border: 'none', borderLeft: activeScene === i ? `2px solid ${C.amber}` : '2px solid transparent', cursor: 'pointer', transition: 'all 0.1s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: activeScene === i ? C.text : C.textSub, fontWeight: activeScene === i ? 500 : 400 }}>{scene.title}</span>
                <span style={{ fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>{scene.words}字</span>
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
                <Tag label={scene.type} />
                <Tag label={scene.time} />
              </div>
              <div style={{ fontSize: 10, color: C.textMute, marginBottom: 3 }}>📍 {scene.location}</div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {scene.chars.map(c => (
                  <span key={c} style={{ fontSize: 9, background: C.tag, color: C.tagText, padding: '1px 5px', borderRadius: 2 }}>{c}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: C.textSub }}>总字数</span>
            <span style={{ fontSize: 10, color: C.amber, fontFamily: "'JetBrains Mono', monospace" }}>1,570</span>
          </div>
          <div style={{ height: 3, background: C.tag, borderRadius: 2 }}>
            <div style={{ height: '100%', width: '65%', background: C.amber, borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 9, color: C.textMute, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>目标 2,400字</div>
        </div>
      </div>

      {/* Script Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '9px 20px', background: C.sidebar, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{SCENES[activeScene].title}</span>
          <Tag label={SCENES[activeScene].type} />
          <Tag label={SCENES[activeScene].location} />
          <Tag label={SCENES[activeScene].time} />
          <div style={{ flex: 1 }} />
          <button style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 3, color: C.textSub, fontSize: 11, cursor: 'pointer' }}>格式化</button>
          <button style={{ padding: '4px 10px', background: C.blueBg, border: `1px solid #BFCFFF`, borderRadius: 3, color: C.blue, fontSize: 11, cursor: 'pointer' }}>AI 润色</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 36px', background: '#FAFBFC' }}>
          <textarea
            defaultValue={SCRIPT}
            style={{ width: '100%', minHeight: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: C.text, fontSize: 13, lineHeight: 2.1, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre-wrap' }}
          />
        </div>

        <div style={{ padding: '10px 20px', background: C.sidebar, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {['续写下一幕', '优化对白节奏', '增加冲突张力', '补充人物细节'].map(s => (
              <button key={s} onClick={() => setPrompt(s)}
                style={{ padding: '4px 10px', background: C.input, border: `1px solid ${C.border}`, borderRadius: 3, color: C.textSub, fontSize: 11, cursor: 'pointer' }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder="告诉 AI 你想要做什么…"
              style={{ flex: 1, padding: '7px 12px', background: C.input, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 12, outline: 'none', fontFamily: "'Inter', sans-serif" }}
            />
            <button onClick={handleGenerate}
              style={{ padding: '7px 18px', background: generating ? C.tag : C.amber, border: 'none', borderRadius: 4, color: generating ? C.textMute : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: "'Outfit', sans-serif" }}>
              {generating ? '生成中…' : '✦ AI 生成'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: 192, background: C.sidebar, borderLeft: `1px solid ${C.border}`, padding: '14px', overflowY: 'auto', flexShrink: 0 }}>
        <SectionLabel>场景属性</SectionLabel>
        <PropRow label="类型"   value={SCENES[activeScene].type} />
        <PropRow label="地点"   value={SCENES[activeScene].location} />
        <PropRow label="时间段" value={SCENES[activeScene].time} />
        <PropRow label="字数"   value={`${SCENES[activeScene].words}`} mono />

        <Divider />
        <SectionLabel>出场角色</SectionLabel>
        {SCENES[activeScene].chars.map(c => (
          <div key={c} style={{ padding: '5px 8px', background: C.input, borderRadius: 3, marginBottom: 4, fontSize: 11, color: C.textSub, display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.amber, fontWeight: 600 }}>
              {c[0]}
            </div>
            {c}
          </div>
        ))}

        <Divider />
        <SectionLabel>AI 建议</SectionLabel>
        {['加强情感冲突', '缩短单句台词', '增加环境描写'].map(s => (
          <div key={s} style={{ padding: '5px 8px', background: C.blueBg, border: `1px solid #DAEAFF`, borderRadius: 3, marginBottom: 5, fontSize: 10, color: '#3A70D0', cursor: 'pointer' }}>
            💡 {s}
          </div>
        ))}
      </div>
    </div>
  )
}

function Tag({ label }: { label: string }) {
  return <span style={{ fontSize: 10, background: '#EEF0F4', color: '#5A6070', padding: '2px 7px', borderRadius: 3 }}>{label}</span>
}
function Divider() {
  return <div style={{ margin: '12px 0 10px', borderTop: '1px solid #E4E7EE' }} />
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
