import React from 'react';
import { C } from '../constants';
import { Button } from './common';
import { useAppStore } from '../store/useAppStore';
import { useProjectStore } from '../store/useProjectStore';
import { TABS } from '../data/sampleData';

const Topbar: React.FC = () => {
  const { activeView, activeProjectId, activeTab, navigateToOverview } = useAppStore();
  const { projects } = useProjectStore();

  const currentProject = projects.find((p) => p.id === activeProjectId);
  const activeTabLabel = TABS.find((t) => t.id === activeTab)?.label;

  const handleSave = () => {};
  const handleExport = () => {};

  return (
    <div
      style={{
        height: 44,
        minHeight: 44,
        background: C.sidebar,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {activeView === 'overview' ? (
          <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
            项目总览
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <span
              onClick={navigateToOverview}
              style={{
                fontWeight: 500,
                color: C.amber,
                cursor: 'pointer',
              }}
            >
              {currentProject?.name || ''}
            </span>
            <span style={{ color: C.textMute }}>·</span>
            <span style={{ color: C.textSub }}>{activeTabLabel || ''}</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button variant="secondary" size="sm" onClick={handleSave}>
          保存草稿
        </Button>
        <Button variant="primary" size="sm" onClick={handleExport}>
          导出项目
        </Button>
      </div>
    </div>
  );
};

export default Topbar;