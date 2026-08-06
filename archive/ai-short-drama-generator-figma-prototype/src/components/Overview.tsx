import { useState } from 'react'

const C = {
  bg:      '#F5F6F8',
  white:   '#FFFFFF',
  border:  '#E4E7EE',
  text:    '#1A1D24',
  textSub: '#5A6070',
  textMute:'#9AA0B0',
  amber:   '#E69500',
  amberBg: '#FFF3D0',
  amberBdr:'#F5C842',
  blue:    '#2563EB',
  blueBg:  '#EFF4FF',
  green:   '#16A34A',
  greenBg: '#ECFDF5',
  red:     '#DC2626',
  redBg:   '#FEF2F2',
  purple:  '#7C3AED',
  purpleBg:'#F5F3FF',
  tag:     '#EEF0F4',
}

const PROJECTS = [
  { name: '都市迷情·第三季', genre: '都市言情', status: 'active',   progress: 65, scenes: 24, duration: '18:32', tokens: 142800, updated: '今天 14:23', thumb: 'photo-1501339847302-ac426a4a7cbb' },
  { name: '重生之巅峰时代',   genre: '爽文逆袭', status: 'paused',   progress: 40, scenes: 18, duration: '12:10', tokens: 89200,  updated: '昨天 22:05', thumb: 'photo-1507003211169-0a1dd7228f2d' },
  { name: '霸总的秘密花园',   genre: '甜宠短剧', status: 'done',     progress: 100,scenes: 31, duration: '24:44', tokens: 234600, updated: '3天前',      thumb: 'photo-1495474472287-4d71bcdd2085' },
  { name: '穿越之绝代风华',   genre: '古风穿越', status: 'draft',    progress: 12, scenes: 8,  duration: '—',     tokens: 12400,  updated: '5天前',      thumb: 'photo-1528360983277-13d401cdc186' },
]

const RECENT_ACTIVITY = [
  { action: '生成了分镜', target: '第5幕·危机 · 镜头004', time: '14:23', type: 'storyboard' },
  { action: '完成配音',   target: '林晓 · L003 Take 2',   time: '13:50', type: 'dubbing' },
  { action: 'AI润色剧本', target: '第三幕·摊牌',           time: '11:22', type: 'script' },
  { action: '导出视频',   target: '霸总的秘密花园 · 成片', time: '昨天',  type: 'export' },
  { action: '新建角色',   target: '反派A · 都市迷情',      time: '昨天',  type: 'character' },
]

const STATUS_CFG: Record<string, { color: string; bg: string; bdr: string; label: string }> = {
  active:    { color: '#16A34A', bg: '#ECFDF5', bdr: '#BBF7D0', label: '进行中' },
  paused:    { color: '#E69500', bg: '#FFF3D0', bdr: '#F5C842', label: '暂停'   },
  done:      { color: '#2563EB', bg: '#EFF4FF', bdr: '#BFCFFF', label: '已完成' },
  draft:     { color: '#9AA0B0', bg: '#EEF0F4', bdr: '#E4E7EE', label: '草稿'   },
}

const ACTIVITY_ICONS: Record<string, string> = {
  storyboard: '◫', dubbing: '◉', script: '✦', export: '▶', character: '◈',
}

export default function Overview() {
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'draft'>('all')

  const filtered = PROJECTS.filter(p => filter === 'all' || p.status === filter)

  const totalTokens = PROJECTS.reduce((s, p) => s + p.tokens, 0)
  const totalScenes = PROJECTS.reduce((s, p) => s + p.scenes, 0)
  const doneCount   = PROJECTS.filter(p => p.status === 'done').length

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px', background: C.bg }}>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="项目总数"   value={String(PROJECTS.length)} sub="个项目" icon="◈" color={C.blue}   bg={C.blueBg} />
        <StatCard label="已完成"     value={String(doneCount)}       sub="个成片" icon="▶" color={C.green}  bg={C.greenBg} />
        <StatCard label="总幕次"     value={String(totalScenes)}     sub="幕场景" icon="◫" color={C.purple} bg={C.purpleBg} />
        <StatCard label="累计消耗"   value={fmtTokens(totalTokens)}  sub="tokens" icon="⚡" color={C.amber}  bg={C.amberBg} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Projects */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "'Outfit', sans-serif" }}>全部项目</h2>
            <div style={{ display: 'flex', gap: 4, background: C.tag, padding: 3, borderRadius: 5 }}>
              {(['all', 'active', 'done', 'draft'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '3px 10px', background: filter === f ? '#fff' : 'transparent', border: 'none', borderRadius: 3, color: filter === f ? C.text : C.textMute, fontSize: 11, cursor: 'pointer', boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', whiteSpace: 'nowrap' }}>
                  {{ all: '全部', active: '进行中', done: '已完成', draft: '草稿' }[f]}
                </button>
              ))}
            </div>
            <button style={{ padding: '6px 14px', background: C.amber, border: 'none', borderRadius: 4, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
              + 新建项目
            </button>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.map(p => <ProjectCard key={p.name} p={p} />)}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Recent Activity */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 12, fontFamily: "'Outfit', sans-serif" }}>最近操作</div>
            {RECENT_ACTIVITY.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', borderBottom: i < RECENT_ACTIVITY.length - 1 ? `1px solid ${C.bg}` : 'none' }}>
                <div style={{ width: 24, height: 24, borderRadius: 4, background: C.tag, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: C.amber, flexShrink: 0 }}>
                  {ACTIVITY_ICONS[a.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: C.textSub }}>{a.action}</div>
                  <div style={{ fontSize: 10, color: C.textMute, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.target}</div>
                </div>
                <span style={{ fontSize: 9, color: C.textMute, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{a.time}</span>
              </div>
            ))}
          </div>

          {/* Quick Stats */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 12, fontFamily: "'Outfit', sans-serif" }}>本月用量</div>
            {[
              { label: '剧本生成',   used: 68400,  total: 100000, color: C.blue },
              { label: '分镜生成',   used: 142800, total: 200000, color: C.purple },
              { label: '配音合成',   used: 31200,  total: 80000,  color: C.green },
              { label: '视频合成',   used: 89200,  total: 100000, color: C.red },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: C.textSub }}>{item.label}</span>
                  <span style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>{fmtTokens(item.used)} / {fmtTokens(item.total)}</span>
                </div>
                <div style={{ height: 3, background: C.tag, borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${Math.round(item.used / item.total * 100)}%`, background: item.color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ p }: { p: typeof PROJECTS[0] }) {
  const s = STATUS_CFG[p.status]
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E7EE', borderRadius: 6, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
      <div style={{ width: 56, height: 72, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#F5F6F8' }}>
        <img src={`https://images.unsplash.com/${p.thumb}?w=112&h=144&fit=crop&auto=format`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1D24', fontFamily: "'Outfit', sans-serif" }}>{p.name}</span>
          <span style={{ fontSize: 9, background: s.bg, color: s.color, border: `1px solid ${s.bdr}`, padding: '1px 6px', borderRadius: 3 }}>{s.label}</span>
        </div>
        <div style={{ fontSize: 10, color: '#9AA0B0', marginBottom: 8 }}>{p.genre} · {p.scenes}幕 · {p.duration}</div>
        <div style={{ height: 3, background: '#EEF0F4', borderRadius: 2, marginBottom: 4 }}>
          <div style={{ height: '100%', width: `${p.progress}%`, background: p.progress === 100 ? '#2563EB' : '#E69500', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: '#9AA0B0' }}>{p.progress}% 完成</span>
          <span style={{ fontSize: 9, color: '#9AA0B0', fontFamily: "'JetBrains Mono', monospace" }}>更新于 {p.updated}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: '#E69500', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{fmtTokens(p.tokens)}</div>
        <div style={{ fontSize: 9, color: '#9AA0B0' }}>tokens</div>
        <div style={{ fontSize: 10, color: '#9AA0B0', marginTop: 4 }}>≈ ¥{(p.tokens * 0.000014).toFixed(2)}</div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon, color, bg }: { label: string; value: string; sub: string; icon: string; color: string; bg: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E7EE', borderRadius: 6, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1D24', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 10, color: '#9AA0B0', marginTop: 2 }}>{label} · {sub}</div>
      </div>
    </div>
  )
}

function fmtTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`
  return String(n)
}
