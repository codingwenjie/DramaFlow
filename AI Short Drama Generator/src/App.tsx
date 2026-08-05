import { useState, type CSSProperties } from 'react'
import ScriptEditor from './components/ScriptEditor'
import Storyboard from './components/Storyboard'
import Characters from './components/Characters'
import Dubbing from './components/Dubbing'
import VideoSynth from './components/VideoSynth'

type Tab = 'script' | 'storyboard' | 'characters' | 'dubbing' | 'synthesis'

const TABS: { id: Tab; label: string; icon: string; status: string }[] = [
  { id: 'script',      label: '剧本创作', icon: '✦', status: 'done' },
  { id: 'storyboard',  label: '分镜生成', icon: '◫', status: 'done' },
  { id: 'characters',  label: '角色管理', icon: '◈', status: 'active' },
  { id: 'dubbing',     label: '场景配音', icon: '◉', status: 'pending' },
  { id: 'synthesis',   label: '视频合成', icon: '▶', status: 'pending' },
]

const PROJECTS = [
  { name: '都市迷情·第三季', scenes: 24, duration: '18:32', updated: '今天 14:23', active: true },
  { name: '重生之巅峰时代',   scenes: 18, duration: '12:10', updated: '昨天 22:05', active: false },
  { name: '霸总的秘密花园',   scenes: 31, duration: '24:44', updated: '3天前',      active: false },
]

// Palette
const C = {
  bg:         '#F5F6F8',
  sidebar:    '#FFFFFF',
  border:     '#E4E7EE',
  borderHov:  '#CDD2DE',
  text:       '#1A1D24',
  textSub:    '#5A6070',
  textMute:   '#9AA0B0',
  active:     '#FFF8EC',
  activeBdr:  '#E69500',
  amber:      '#E69500',
  amberLight: '#FFF3D0',
  blue:       '#2563EB',
  green:      '#16A34A',
  card:       '#FFFFFF',
  inputBg:    '#F5F6F8',
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('script')
  const [activeProject, setActiveProject] = useState(0)

  const renderContent = () => {
    switch (activeTab) {
      case 'script':      return <ScriptEditor />
      case 'storyboard':  return <Storyboard />
      case 'characters':  return <Characters />
      case 'dubbing':     return <Dubbing />
      case 'synthesis':   return <VideoSynth />
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>

      {/* Left Sidebar */}
      <aside style={{ width: 216, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '15px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 28, height: 28, background: C.amber, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 4px rgba(230,149,0,0.35)' }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>剧</span>
            </div>
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: C.text, letterSpacing: '-0.01em' }}>DramaAI</div>
              <div style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>v2.4.1</div>
            </div>
          </div>
        </div>

        {/* Project List */}
        <div style={{ padding: '10px 0 6px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: '0 14px 6px', fontSize: 10, color: C.textMute, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>项目</div>
          {PROJECTS.map((p, i) => (
            <button key={i} onClick={() => setActiveProject(i)}
              style={{ width: '100%', textAlign: 'left', padding: '7px 14px', background: activeProject === i ? C.active : 'transparent', border: 'none', cursor: 'pointer', borderLeft: activeProject === i ? `2px solid ${C.amber}` : '2px solid transparent', transition: 'all 0.1s' } as CSSProperties}>
              <div style={{ color: activeProject === i ? C.text : C.textSub, fontSize: 12, fontWeight: activeProject === i ? 500 : 400, marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name}
              </div>
              <div style={{ display: 'flex', gap: 8, color: C.textMute, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                <span>{p.scenes}幕</span>
                <span>{p.duration}</span>
              </div>
            </button>
          ))}
          <button style={{ width: '100%', textAlign: 'left', padding: '6px 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMute, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> 新建项目
          </button>
        </div>

        {/* Workflow Steps */}
        <div style={{ padding: '10px 0', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '0 14px 6px', fontSize: 10, color: C.textMute, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>工作流</div>
          {TABS.map((tab, i) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ width: '100%', textAlign: 'left', padding: '8px 14px', background: activeTab === tab.id ? C.active : 'transparent', border: 'none', cursor: 'pointer', borderLeft: activeTab === tab.id ? `2px solid ${C.amber}` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.1s' } as CSSProperties}>
              <StepDot status={tab.status} active={activeTab === tab.id} />
              <div>
                <div style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", marginBottom: 1 }}>STEP {i + 1}</div>
                <div style={{ fontSize: 12, color: activeTab === tab.id ? C.text : tab.status === 'done' ? C.textSub : C.textMute, fontWeight: activeTab === tab.id ? 500 : 400 }}>
                  {tab.label}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom Status */}
        <div style={{ padding: '11px 14px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
            <span style={{ fontSize: 11, color: C.textSub }}>AI 引擎在线</span>
          </div>
          <div style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>今日生成 · 47 幕</div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top Bar */}
        <header style={{ height: 44, background: C.sidebar, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{PROJECTS[activeProject].name}</span>
            <span style={{ color: C.border, margin: '0 8px' }}>·</span>
            <span style={{ fontSize: 12, color: C.textSub }}>{TABS.find(t => t.id === activeTab)?.label}</span>
          </div>
          <button style={{ padding: '5px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.textSub, fontSize: 12, cursor: 'pointer' }}>
            保存草稿
          </button>
          <button style={{ padding: '5px 16px', background: C.amber, border: 'none', borderRadius: 4, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 1px 4px rgba(230,149,0,0.3)' }}>
            导出项目
          </button>
        </header>

        {/* Tab Nav */}
        <div style={{ background: C.sidebar, borderBottom: `1px solid ${C.border}`, display: 'flex', padding: '0 20px', gap: 0, flexShrink: 0 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: '9px 16px', background: 'transparent', border: 'none', borderBottom: activeTab === tab.id ? `2px solid ${C.amber}` : '2px solid transparent', color: activeTab === tab.id ? C.text : C.textSub, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', whiteSpace: 'nowrap', fontWeight: activeTab === tab.id ? 500 : 400 }}>
              <span style={{ fontSize: 10 }}>{tab.icon}</span>
              {tab.label}
              {tab.status === 'done' && (
                <span style={{ fontSize: 9, background: '#ECFDF5', color: '#16A34A', padding: '1px 5px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace" }}>完成</span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'hidden', background: C.bg }}>
          {renderContent()}
        </div>
      </main>
    </div>
  )
}

function StepDot({ status, active }: { status: string; active: boolean }) {
  const color = active ? '#E69500' : status === 'done' ? '#16A34A' : '#D0D5E0'
  return (
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, transition: 'all 0.2s' }} />
  )
}
