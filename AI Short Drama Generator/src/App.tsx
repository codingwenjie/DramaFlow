import { useState, type CSSProperties } from 'react'
import Overview from './components/Overview'
import ScriptEditor from './components/ScriptEditor'
import Storyboard from './components/Storyboard'
import Characters from './components/Characters'
import Dubbing from './components/Dubbing'
import VideoSynth from './components/VideoSynth'
import ApiConfig from './components/ApiConfig'
import PromptSkills from './components/PromptSkills'

type Page = 'overview' | 'script' | 'storyboard' | 'characters' | 'dubbing' | 'synthesis' | 'api' | 'prompts'

const C = {
  bg:       '#F5F6F8',
  sidebar:  '#FFFFFF',
  border:   '#E4E7EE',
  text:     '#1A1D24',
  textSub:  '#5A6070',
  textMute: '#9AA0B0',
  active:   '#FFF8EC',
  amber:    '#E69500',
}

const WORKFLOW: { id: Page; label: string; icon: string; status: string }[] = [
  { id: 'script',      label: '剧本创作', icon: '✦', status: 'done' },
  { id: 'storyboard',  label: '分镜生成', icon: '◫', status: 'done' },
  { id: 'characters',  label: '角色管理', icon: '◈', status: 'active' },
  { id: 'dubbing',     label: '场景配音', icon: '◉', status: 'pending' },
  { id: 'synthesis',   label: '视频合成', icon: '▶', status: 'pending' },
]

const SYSTEM_PAGES: { id: Page; label: string; icon: string }[] = [
  { id: 'api',     label: 'API & 用量',  icon: '⚡' },
  { id: 'prompts', label: 'Prompt & Skill', icon: '⌥' },
]

const PROJECTS = [
  { name: '都市迷情·第三季', scenes: 24, duration: '18:32' },
  { name: '重生之巅峰时代',  scenes: 18, duration: '12:10' },
  { name: '霸总的秘密花园',  scenes: 31, duration: '24:44' },
]

const PAGE_LABELS: Record<Page, string> = {
  overview:   '项目总览',
  script:     '剧本创作',
  storyboard: '分镜生成',
  characters: '角色管理',
  dubbing:    '场景配音',
  synthesis:  '视频合成',
  api:        'API & 用量',
  prompts:    'Prompt & Skill',
}

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const [activeProject, setActiveProject] = useState(0)

  const isWorkflowPage = WORKFLOW.some(w => w.id === page)

  const renderContent = () => {
    switch (page) {
      case 'overview':    return <Overview />
      case 'script':      return <ScriptEditor />
      case 'storyboard':  return <Storyboard />
      case 'characters':  return <Characters />
      case 'dubbing':     return <Dubbing />
      case 'synthesis':   return <VideoSynth />
      case 'api':         return <ApiConfig />
      case 'prompts':     return <PromptSkills />
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

        {/* Overview Entry */}
        <div style={{ padding: '8px 8px 4px' }}>
          <NavBtn id="overview" active={page === 'overview'} onClick={setPage} icon="⊞" label="项目总览" />
        </div>

        {/* Project List */}
        <div style={{ padding: '4px 0 4px', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: '6px 14px 5px', fontSize: 10, color: C.textMute, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>当前项目</div>
          {PROJECTS.map((p, i) => (
            <button key={i} onClick={() => { setActiveProject(i); setPage('script') }}
              style={{ width: '100%', textAlign: 'left', padding: '6px 14px', background: activeProject === i && isWorkflowPage ? C.active : 'transparent', border: 'none', cursor: 'pointer', borderLeft: activeProject === i && isWorkflowPage ? `2px solid ${C.amber}` : '2px solid transparent', transition: 'all 0.1s' } as CSSProperties}>
              <div style={{ color: activeProject === i && isWorkflowPage ? C.text : C.textSub, fontSize: 11, fontWeight: activeProject === i && isWorkflowPage ? 500 : 400, marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name}
              </div>
              <div style={{ fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>
                {p.scenes}幕 · {p.duration}
              </div>
            </button>
          ))}
          <button style={{ width: '100%', textAlign: 'left', padding: '5px 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMute, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>+</span> 新建项目
          </button>
        </div>

        {/* Workflow Steps */}
        <div style={{ padding: '8px 0 4px', borderBottom: `1px solid ${C.border}`, flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '0 14px 5px', fontSize: 10, color: C.textMute, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>生产流程</div>
          {WORKFLOW.map((w, i) => (
            <button key={w.id} onClick={() => setPage(w.id)}
              style={{ width: '100%', textAlign: 'left', padding: '7px 14px', background: page === w.id ? C.active : 'transparent', border: 'none', cursor: 'pointer', borderLeft: page === w.id ? `2px solid ${C.amber}` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.1s' } as CSSProperties}>
              <StepDot status={w.status} active={page === w.id} />
              <div>
                <div style={{ fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", marginBottom: 0.5 }}>STEP {i + 1}</div>
                <div style={{ fontSize: 11, color: page === w.id ? C.text : w.status === 'done' ? C.textSub : C.textMute, fontWeight: page === w.id ? 500 : 400 }}>
                  {w.label}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* System Pages */}
        <div style={{ padding: '8px 8px 4px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: '0 6px 5px', fontSize: 10, color: C.textMute, letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>系统配置</div>
          {SYSTEM_PAGES.map(sp => (
            <NavBtn key={sp.id} id={sp.id} active={page === sp.id} onClick={setPage} icon={sp.icon} label={sp.label} />
          ))}
        </div>

        {/* Status */}
        <div style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
            <span style={{ fontSize: 11, color: C.textSub }}>AI 引擎在线</span>
          </div>
          <div style={{ fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>今日消耗 · ¥0.38</div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top Bar */}
        <header style={{ height: 44, background: C.sidebar, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            {isWorkflowPage && (
              <>
                <span style={{ fontSize: 13, color: C.textSub }}>{PROJECTS[activeProject].name}</span>
                <span style={{ color: C.border }}>·</span>
              </>
            )}
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{PAGE_LABELS[page]}</span>
          </div>
          {isWorkflowPage && (
            <>
              <button style={{ padding: '5px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.textSub, fontSize: 12, cursor: 'pointer' }}>
                保存草稿
              </button>
              <button style={{ padding: '5px 16px', background: C.amber, border: 'none', borderRadius: 4, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 1px 4px rgba(230,149,0,0.3)' }}>
                导出项目
              </button>
            </>
          )}
        </header>

        {/* Workflow Tab Nav — only when in workflow */}
        {isWorkflowPage && (
          <div style={{ background: C.sidebar, borderBottom: `1px solid ${C.border}`, display: 'flex', padding: '0 20px', gap: 0, flexShrink: 0 }}>
            {WORKFLOW.map(w => (
              <button key={w.id} onClick={() => setPage(w.id)}
                style={{ padding: '9px 16px', background: 'transparent', border: 'none', borderBottom: page === w.id ? `2px solid ${C.amber}` : '2px solid transparent', color: page === w.id ? C.text : C.textSub, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', whiteSpace: 'nowrap', fontWeight: page === w.id ? 500 : 400 }}>
                <span style={{ fontSize: 10 }}>{w.icon}</span>
                {w.label}
                {w.status === 'done' && (
                  <span style={{ fontSize: 9, background: '#ECFDF5', color: '#16A34A', padding: '1px 5px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace" }}>完成</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', background: C.bg }}>
          {renderContent()}
        </div>
      </main>
    </div>
  )
}

function NavBtn({ id, active, onClick, icon, label }: { id: Page; active: boolean; onClick: (id: Page) => void; icon: string; label: string }) {
  return (
    <button onClick={() => onClick(id)}
      style={{ width: '100%', textAlign: 'left', padding: '7px 8px', background: active ? C.active : 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.1s' } as CSSProperties}>
      <span style={{ fontSize: 12, color: active ? C.amber : C.textMute, width: 16, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 11, color: active ? C.text : C.textSub, fontWeight: active ? 500 : 400 }}>{label}</span>
    </button>
  )
}

function StepDot({ status, active }: { status: string; active: boolean }) {
  const color = active ? '#E69500' : status === 'done' ? '#16A34A' : '#D0D5E0'
  return <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, transition: 'all 0.2s' }} />
}
