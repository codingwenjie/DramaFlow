import React, { useState, useMemo } from 'react';
import { Project } from '../data/sampleData';

const C = {
  bg: '#F5F6F8',
  white: '#FFFFFF',
  border: '#E4E7EE',
  text: '#1A1D24',
  textSub: '#5A6070',
  textMute: '#9AA0B0',
  amber: '#E69500',
  amberBg: '#FFF3D0',
  amberBdr: '#F5C842',
  blue: '#2563EB',
  blueBg: '#EFF4FF',
  blueBdr: '#BFCFFF',
  green: '#16A34A',
  greenBg: '#ECFDF5',
  greenBdr: '#BBF7D0',
  red: '#DC2626',
  redBg: '#FEF2F2',
  purple: '#7C3AED',
  purpleBg: '#F5F3FF',
  tag: '#EEF0F4',
  input: '#F5F6F8',
};

interface ProjectWithProgress extends Project {
  progress?: Project['progress'];
}

interface ProjectOverviewProps {
  projects: ProjectWithProgress[];
  onSelectProject: (id: string) => void;
  onNewProject: (name: string, genre: string, scenes: number, orientation: 'vertical' | 'horizontal') => void;
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #E69500 0%, #F59E0B 50%, #F97316 100%)',
  'linear-gradient(135deg, #2563EB 0%, #6366F1 50%, #8B5CF6 100%)',
  'linear-gradient(135deg, #16A34A 0%, #0D9488 50%, #06B6D4 100%)',
];

const GENRE_OPTIONS = ['甜宠', '逆袭', '悬疑', '玄幻', '都市', '古装'];

const STATUS_CFG: Record<string, { color: string; bg: string; bdr: string; label: string }> = {
  active: { color: '#16A34A', bg: '#ECFDF5', bdr: '#BBF7D0', label: '进行中' },
  completed: { color: '#2563EB', bg: '#EFF4FF', bdr: '#BFCFFF', label: '已完成' },
  draft: { color: '#9AA0B0', bg: '#EEF0F4', bdr: '#E4E7EE', label: '草稿' },
};

const RECENT_ACTIVITY = [
  { action: '生成了分镜', target: '第5幕·危机 · 镜头004', time: '14:23', type: 'storyboard' },
  { action: '完成配音', target: '林晓 · L003 Take 2', time: '13:50', type: 'dubbing' },
  { action: 'AI润色剧本', target: '第三幕·摊牌', time: '11:22', type: 'script' },
  { action: '导出视频', target: '霸总的秘密花园 · 成片', time: '昨天', type: 'export' },
  { action: '新建角色', target: '反派A · 都市迷情', time: '昨天', type: 'character' },
];

const ACTIVITY_ICONS: Record<string, string> = {
  storyboard: '◫', dubbing: '◉', script: '✦', export: '▶', character: '◈',
};

const PROGRESS_KEYS = ['script', 'storyboard', 'characters', 'dubbing', 'synthesis'] as const;

function getProgressSegmentColor(progress: ProjectWithProgress['progress'], key: string): string {
  if (!progress) return '#E4E7EE';
  const val = progress[key as keyof typeof progress] ?? 0;
  if (val >= 100) return '#16A34A';
  if (val > 0) return '#E69500';
  return '#E4E7EE';
}

function fmtTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ projects, onSelectProject, onNewProject }) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectGenre, setNewProjectGenre] = useState('甜宠');
  const [newProjectScenes, setNewProjectScenes] = useState(24);
  const [newProjectOrientation, setNewProjectOrientation] = useState<'竖屏' | '横屏'>('竖屏');

  const doneCount = useMemo(() => projects.filter((p) => p.status === 'completed').length, [projects]);
  const totalScenes = useMemo(() => projects.reduce((sum, p) => sum + p.scenes, 0), [projects]);
  const totalTokens = useMemo(() => {
    const avg = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.scenes * 4200, 0) / projects.length) : 0;
    return avg * projects.length;
  }, [projects]);

  const filtered = useMemo(() => {
    let result = projects;
    if (filter === 'active') result = result.filter((p) => p.status === 'active');
    else if (filter === 'done') result = result.filter((p) => p.status === 'completed');
    else if (filter === 'draft') result = result.filter((p) => p.status === 'draft');
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    return result;
  }, [projects, filter, searchQuery]);

  const handleOpenNewDialog = () => setShowNewDialog(true);
  const handleCloseNewDialog = () => {
    setShowNewDialog(false);
    setNewProjectName('');
    setNewProjectGenre('甜宠');
    setNewProjectScenes(24);
    setNewProjectOrientation('竖屏');
  };

  const handleConfirmNewProject = () => {
    if (!newProjectName.trim()) return;
    onNewProject(
      newProjectName.trim(),
      newProjectGenre,
      newProjectScenes,
      newProjectOrientation === '竖屏' ? 'vertical' : 'horizontal'
    );
    handleCloseNewDialog();
  };

  if (projects.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, color: '#9AA0B0', marginBottom: 16, lineHeight: 1 }}>🎬</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#5A6070', marginBottom: 8, fontFamily: 'Inter, sans-serif' }}>
            还没有项目
          </div>
          <div style={{ fontSize: 13, color: '#9AA0B0', marginBottom: 24 }}>
            开始创建你的第一部短剧吧
          </div>
          <button onClick={handleOpenNewDialog}
            style={{ padding: '10px 24px', background: '#E69500', color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            新建项目
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px', background: C.bg }}>
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="项目总数" value={String(projects.length)} sub="个项目" icon="◈" color={C.blue} bg={C.blueBg} />
        <StatCard label="已完成" value={String(doneCount)} sub="个成片" icon="▶" color={C.green} bg={C.greenBg} />
        <StatCard label="总幕次" value={String(totalScenes)} sub="幕场景" icon="◫" color={C.purple} bg={C.purpleBg} />
        <StatCard label="累计消耗" value={fmtTokens(totalTokens)} sub="tokens" icon="⚡" color={C.amber} bg={C.amberBg} />
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
            <input
              type="text"
              placeholder="搜索项目…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '5px 10px', background: C.input, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, color: C.text, outline: 'none', width: 160, fontFamily: 'Inter, sans-serif' }}
            />
            <button onClick={handleOpenNewDialog}
              style={{ padding: '6px 14px', background: C.amber, border: 'none', borderRadius: 4, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
              + 新建项目
            </button>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.map((p, idx) => {
              const s = STATUS_CFG[p.status] || STATUS_CFG.draft;
              const gradient = COVER_GRADIENTS[idx % COVER_GRADIENTS.length];
              const totalPct = PROGRESS_KEYS.reduce((sum, k) => sum + (p.progress?.[k] ?? 0), 0) / PROGRESS_KEYS.length;
              return (
                <div key={p.id} onClick={() => onSelectProject(p.id)}
                  style={{ background: '#fff', border: '1px solid #E4E7EE', borderRadius: 6, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
                  <div style={{ width: 56, height: 72, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.text }}>▶</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1D24', fontFamily: "'Outfit', sans-serif" }}>{p.name}</span>
                      <span style={{ fontSize: 9, background: s.bg, color: s.color, border: `1px solid ${s.bdr}`, padding: '1px 6px', borderRadius: 3 }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#9AA0B0', marginBottom: 8 }}>{p.genre} · {p.scenes}幕 · {p.duration}</div>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                      {PROGRESS_KEYS.map((key) => (
                        <div key={key} style={{ flex: 1, height: 3, borderRadius: 2, background: getProgressSegmentColor(p.progress, key) }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 9, color: '#9AA0B0' }}>{Math.round(totalPct)}% 完成</span>
                      <span style={{ fontSize: 9, color: '#9AA0B0', fontFamily: "'JetBrains Mono', monospace" }}>更新于 {p.updatedAt}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#E69500', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{fmtTokens(p.scenes * 4200)}</div>
                    <div style={{ fontSize: 9, color: '#9AA0B0' }}>tokens</div>
                    <div style={{ fontSize: 10, color: '#9AA0B0', marginTop: 4 }}>≈ ¥{(p.scenes * 4200 * 0.000014).toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
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
              { label: '剧本生成', used: 68400, total: 100000, color: C.blue },
              { label: '分镜生成', used: 142800, total: 200000, color: C.purple },
              { label: '配音合成', used: 31200, total: 80000, color: C.green },
              { label: '视频合成', used: 89200, total: 100000, color: C.red },
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

      {/* New Project Dialog */}
      {showNewDialog && (
        <>
          <div onClick={handleCloseNewDialog}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#FFFFFF', borderRadius: 8, padding: 24, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 1001, fontFamily: 'Inter, sans-serif' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Outfit', sans-serif", marginBottom: 20 }}>新建项目</div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSub, marginBottom: 6, fontWeight: 500 }}>项目名称</label>
              <input type="text" placeholder="输入项目名称" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13, color: C.text, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSub, marginBottom: 6, fontWeight: 500 }}>题材类型</label>
              <select value={newProjectGenre} onChange={(e) => setNewProjectGenre(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13, color: C.text, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', background: '#FFFFFF' }}>
                {GENRE_OPTIONS.map((g) => (<option key={g} value={g}>{g}</option>))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSub, marginBottom: 6, fontWeight: 500 }}>目标幕数</label>
              <input type="number" min={1} max={100} value={newProjectScenes} onChange={(e) => setNewProjectScenes(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13, color: C.text, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, color: C.textSub, marginBottom: 6, fontWeight: 500 }}>屏幕方向</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['竖屏', '横屏'] as const).map((opt) => {
                  const isActive = newProjectOrientation === opt;
                  return (<button key={opt} onClick={() => setNewProjectOrientation(opt)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 4, border: isActive ? `2px solid ${C.amber}` : `1px solid ${C.border}`, background: isActive ? C.amberBg : '#FFFFFF', color: isActive ? C.amber : C.textSub, fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {opt}
                  </button>);
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={handleCloseNewDialog}
                style={{ padding: '8px 20px', background: '#FFFFFF', color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>取消</button>
              <button onClick={handleConfirmNewProject}
                style={{ padding: '8px 20px', background: C.amber, color: '#FFFFFF', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>确认创建</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function StatCard({ label, value, sub, icon, color, bg }: { label: string; value: string; sub: string; icon: string; color: string; bg: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E7EE', borderRadius: 6, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1D24', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 10, color: '#9AA0B0', marginTop: 2 }}>{label} · {sub}</div>
      </div>
    </div>
  );
}

export default ProjectOverview;