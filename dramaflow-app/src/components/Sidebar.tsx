import React from 'react';
import { C } from '../constants';
import { TABS } from '../data/sampleData';
import { SectionLabel } from './common';
import { useAppStore } from '../store/useAppStore';
import { useProjectStore } from '../store/useProjectStore';

const Sidebar: React.FC = () => {
  const { activeView, activeTab, activeProjectId, navigateToProject, navigateToOverview, setActiveTab, setActiveView } = useAppStore();
  const { projects } = useProjectStore();

  return (
    <div
      style={{
        width: 216,
        minWidth: 216,
        height: '100vh',
        background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '16px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              background: C.amber,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            D
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
            DramaAI
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            color: C.textMute,
            fontFamily: "'JetBrains Mono', monospace",
            marginLeft: 30,
          }}
        >
          v2.4.1
        </span>
      </div>

      {/* Project section */}
      <div style={{ padding: '4px 12px 8px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <SectionLabel style={{ padding: '0 4px 6px' }}>项目</SectionLabel>

        {/* 项目总览 entry */}
        <div
          onClick={navigateToOverview}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            marginBottom: 2,
            background: activeView === 'overview' ? C.active : 'transparent',
            borderLeft: activeView === 'overview' ? `2px solid ${C.amber}` : '2px solid transparent',
            marginLeft: -4,
            paddingLeft: activeView === 'overview' ? 6 : 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" stroke={activeView === 'overview' ? C.amber : C.textMute} strokeWidth="1.2" />
            <rect x="8" y="1" width="5" height="5" rx="1" stroke={activeView === 'overview' ? C.amber : C.textMute} strokeWidth="1.2" />
            <rect x="1" y="8" width="5" height="5" rx="1" stroke={activeView === 'overview' ? C.amber : C.textMute} strokeWidth="1.2" />
            <rect x="8" y="8" width="5" height="5" rx="1" stroke={activeView === 'overview' ? C.amber : C.textMute} strokeWidth="1.2" />
          </svg>
          <span
            style={{
              fontSize: 12,
              fontWeight: activeView === 'overview' ? 500 : 400,
              color: activeView === 'overview' ? C.amber : C.text,
            }}
          >
            项目总览
          </span>
        </div>

        {/* Project list */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          {projects.map((project) => {
            const isSelected = activeProjectId === project.id && activeView === 'workflow';
            return (
              <div
                key={project.id}
                onClick={() => navigateToProject(project.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '7px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  marginBottom: 1,
                  background: isSelected ? C.active : 'transparent',
                  borderLeft: isSelected ? `2px solid ${C.amber}` : '2px solid transparent',
                  marginLeft: -4,
                  paddingLeft: isSelected ? 6 : 8,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? 500 : 400,
                    color: isSelected ? C.amber : C.text,
                    lineHeight: '16px',
                  }}
                >
                  {project.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: C.textMute,
                    marginTop: 1,
                    lineHeight: '14px',
                  }}
                >
                  {project.scenes} 幕 · {project.duration}
                </span>
              </div>
            );
          })}
        </div>

        {/* New project button */}
        <div
          onClick={navigateToOverview}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            color: C.textSub,
            fontSize: 12,
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
          <span>新建项目</span>
        </div>
      </div>

      {/* AI Settings entry */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div
          onClick={() => setActiveView('ai-settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            background: activeView === 'ai-settings' ? C.active : 'transparent',
            borderLeft: activeView === 'ai-settings' ? `2px solid ${C.amber}` : '2px solid transparent',
            marginLeft: -4,
            paddingLeft: activeView === 'ai-settings' ? 6 : 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.5" stroke={activeView === 'ai-settings' ? C.amber : C.textMute} strokeWidth="1.2" />
            <path d="M7 1.5V3" stroke={activeView === 'ai-settings' ? C.amber : C.textMute} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M7 11V12.5" stroke={activeView === 'ai-settings' ? C.amber : C.textMute} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M2.5 7H4" stroke={activeView === 'ai-settings' ? C.amber : C.textMute} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M10 7H11.5" stroke={activeView === 'ai-settings' ? C.amber : C.textMute} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M3.8 3.8L4.85 4.85" stroke={activeView === 'ai-settings' ? C.amber : C.textMute} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M9.15 9.15L10.2 10.2" stroke={activeView === 'ai-settings' ? C.amber : C.textMute} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M3.8 10.2L4.85 9.15" stroke={activeView === 'ai-settings' ? C.amber : C.textMute} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M9.15 4.85L10.2 3.8" stroke={activeView === 'ai-settings' ? C.amber : C.textMute} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span
            style={{
              fontSize: 12,
              fontWeight: activeView === 'ai-settings' ? 500 : 400,
              color: activeView === 'ai-settings' ? C.amber : C.text,
            }}
          >
            AI 模型配置
          </span>
        </div>
      </div>

      {/* Workflow steps section */}
      {activeView === 'workflow' && (
        <div style={{ padding: '8px 12px', borderTop: `1px solid ${C.border}` }}>
          <SectionLabel style={{ padding: '0 4px 6px' }}>工作流</SectionLabel>
          {TABS.map((tab, index) => {
            const isSelected = activeTab === tab.id;
            const stepNum = String(index + 1).padStart(2, '0');
            const statusColor =
              tab.status === 'done'
                ? C.green
                : tab.status === 'active'
                  ? C.amber
                  : C.textMute;

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  marginBottom: 1,
                  background: isSelected ? C.active : 'transparent',
                  borderLeft: isSelected ? `2px solid ${C.amber}` : '2px solid transparent',
                  marginLeft: -4,
                  paddingLeft: isSelected ? 6 : 8,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: isSelected ? C.amber : C.textMute,
                    fontWeight: 500,
                    minWidth: 20,
                  }}
                >
                  {stepNum}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? 500 : 400,
                    color: isSelected ? C.amber : C.text,
                    flex: 1,
                  }}
                >
                  {tab.label}
                </span>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: statusColor,
                    flexShrink: 0,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom status bar */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: C.green,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, color: C.textSub }}>AI 引擎在线</span>
        </div>
        <span style={{ fontSize: 10, color: C.textMute }}>今日生成 · 47 幕</span>
      </div>
    </div>
  );
};

export default Sidebar;