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
  amberLight: '#FFF3D0',
  blue: '#2563EB',
  green: '#16A34A',
  greenBg: '#ECFDF5',
  tag: '#EEF0F4',
  tagText: '#5A6070',
  input: '#F5F6F8',
  active: '#FFF8EC',
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

const FILTER_TABS = ['全部项目', '进行中', '已完成', '最近编辑'];

const GENRE_OPTIONS = ['甜宠', '逆袭', '悬疑', '玄幻', '都市', '古装'];

const PROGRESS_LABELS = ['剧', '分', '角', '配', '合'];
const PROGRESS_KEYS = ['script', 'storyboard', 'characters', 'dubbing', 'synthesis'] as const;

function getProgressSegmentColor(progress: ProjectWithProgress['progress'], key: string): string {
  if (!progress) return '#E4E7EE';
  const val = progress[key as keyof typeof progress] ?? 0;
  if (val >= 100) return '#16A34A';
  if (val > 0) return '#E69500';
  return '#E4E7EE';
}

function getProgressStageText(progress: ProjectWithProgress['progress']): string {
  if (!progress) return '未开始';
  const stages = ['剧本创作', '分镜生成', '角色管理', '场景配音', '视频合成'];
  for (let i = stages.length - 1; i >= 0; i--) {
    const key = PROGRESS_KEYS[i];
    if (progress[key] > 0) {
      return `${stages[i]}中 · 完成 ${progress[key]}%`;
    }
  }
  return '未开始';
}

function getStatusBadge(status: string): { label: string; bg: string; color: string } {
  switch (status) {
    case 'active':
      return { label: '进行中', bg: '#FFF3D0', color: '#E69500' };
    case 'done':
      return { label: '已完成', bg: '#ECFDF5', color: '#16A34A' };
    default:
      return { label: '草稿', bg: '#EEF0F4', color: '#5A6070' };
  }
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ projects, onSelectProject, onNewProject }) => {
  const [activeFilter, setActiveFilter] = useState('全部项目');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectGenre, setNewProjectGenre] = useState('甜宠');
  const [newProjectScenes, setNewProjectScenes] = useState(24);
  const [newProjectOrientation, setNewProjectOrientation] = useState<'竖屏' | '横屏'>('竖屏');

  const activeCount = useMemo(() => projects.filter((p) => p.status === 'active').length, [projects]);
  const totalScenes = useMemo(() => projects.reduce((sum, p) => sum + p.scenes, 0), [projects]);

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (activeFilter === '进行中') {
      result = result.filter((p) => p.status === 'active');
    } else if (activeFilter === '已完成') {
      result = result.filter((p) => p.status === 'completed');
    } else if (activeFilter === '最近编辑') {
      result = [...result].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    return result;
  }, [projects, activeFilter, searchQuery]);

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

  const statsCards = [
    { label: '全部项目', value: projects.length, growth: '+8.3% 较上月', iconColor: '#E69500', iconBg: '#FFF3D0', icon: '📁' },
    { label: '进行中', value: activeCount, growth: null, iconColor: '#2563EB', iconBg: '#EBF0FF', icon: '⚡' },
    { label: '本月成片', value: 3, growth: null, iconColor: '#16A34A', iconBg: '#ECFDF5', icon: '🎬' },
    { label: '总幕数', value: totalScenes, growth: null, iconColor: '#8B5CF6', iconBg: '#F3EEFF', icon: '📐' },
  ];

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
          <button
            onClick={handleOpenNewDialog}
            style={{
              padding: '10px 24px',
              background: '#E69500',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            新建项目
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px 32px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {statsCards.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: '#FFFFFF',
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: stat.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {stat.icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: C.text,
                  fontFamily: 'Outfit, Inter, sans-serif',
                  lineHeight: 1.2,
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: C.textMute, marginTop: 2 }}>{stat.label}</div>
              {stat.growth && (
                <div style={{ fontSize: 11, color: C.green, marginTop: 2 }}>{stat.growth}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? C.amber : C.textSub,
                  background: isActive ? C.active : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="搜索项目…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '6px 12px',
            background: C.input,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            fontSize: 13,
            color: C.text,
            outline: 'none',
            width: 200,
            fontFamily: 'Inter, sans-serif',
          }}
        />
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button
          onClick={handleOpenNewDialog}
          style={{
            padding: '8px 16px',
            background: C.amber,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          从灵感开始
        </button>
        <button
          onClick={handleOpenNewDialog}
          style={{
            padding: '8px 16px',
            background: '#FFFFFF',
            color: C.textSub,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          从剧本导入
        </button>
        <button
          onClick={handleOpenNewDialog}
          style={{
            padding: '8px 16px',
            background: '#FFFFFF',
            color: C.textSub,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          从模板开始
        </button>
      </div>

      {/* Project Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {filteredProjects.map((project, idx) => {
          const gradient = COVER_GRADIENTS[idx % COVER_GRADIENTS.length];
          const statusBadge = getStatusBadge(project.status);
          const stageText = getProgressStageText(project.progress);
          return (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              {/* Cover */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  background: gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    color: C.text,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                >
                  ▶
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: 12 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.text,
                    fontFamily: 'Outfit, Inter, sans-serif',
                    marginBottom: 6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {project.name}
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 10,
                      border: `1px solid ${C.amber}`,
                      color: C.amber,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {project.genre}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: statusBadge.bg,
                      color: statusBadge.color,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                    {PROGRESS_KEYS.map((key) => (
                      <div
                        key={key}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background: getProgressSegmentColor(project.progress, key),
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {PROGRESS_LABELS.map((label, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          fontSize: 9,
                          color: C.textMute,
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: C.textSub, marginBottom: 4 }}>
                  {stageText}
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: C.textMute,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {project.updatedAt}
                </div>
              </div>
            </div>
          );
        })}

        {/* New Project Card */}
        <div
          onClick={handleOpenNewDialog}
          style={{
            border: `2px dashed ${C.border}`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 240,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = C.amber;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
          }}
        >
          <div style={{ fontSize: 32, color: C.textMute, marginBottom: 8, lineHeight: 1 }}>+</div>
          <div style={{ fontSize: 13, color: C.textSub, fontFamily: 'Inter, sans-serif' }}>
            新建项目
          </div>
        </div>
      </div>

      {/* New Project Dialog */}
      {showNewDialog && (
        <>
          <div
            onClick={handleCloseNewDialog}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 1000,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#FFFFFF',
              borderRadius: 8,
              padding: 24,
              width: 400,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              zIndex: 1001,
              fontFamily: 'Inter, sans-serif',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: C.text,
                fontFamily: 'Outfit, Inter, sans-serif',
                marginBottom: 20,
              }}
            >
              新建项目
            </div>

            {/* Project Name */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: C.textSub,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                项目名称
              </label>
              <input
                type="text"
                placeholder="输入项目名称"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  fontSize: 13,
                  color: C.text,
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Genre */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: C.textSub,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                题材类型
              </label>
              <select
                value={newProjectGenre}
                onChange={(e) => setNewProjectGenre(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  fontSize: 13,
                  color: C.text,
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  boxSizing: 'border-box',
                  background: '#FFFFFF',
                }}
              >
                {GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Scenes */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: C.textSub,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                目标幕数
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={newProjectScenes}
                onChange={(e) => setNewProjectScenes(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  fontSize: 13,
                  color: C.text,
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Orientation Toggle */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  color: C.textSub,
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                屏幕方向
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['竖屏', '横屏'] as const).map((opt) => {
                  const isActive = newProjectOrientation === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setNewProjectOrientation(opt)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 4,
                        border: isActive ? `2px solid ${C.amber}` : `1px solid ${C.border}`,
                        background: isActive ? C.active : '#FFFFFF',
                        color: isActive ? C.amber : C.textSub,
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseNewDialog}
                style={{
                  padding: '8px 20px',
                  background: '#FFFFFF',
                  color: C.textSub,
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmNewProject}
                style={{
                  padding: '8px 20px',
                  background: C.amber,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                确认创建
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectOverview;