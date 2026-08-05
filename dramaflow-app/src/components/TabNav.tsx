import React from 'react';
import { C } from '../constants';
import { TABS } from '../data/sampleData';
import { useAppStore } from '../store/useAppStore';

const TAB_ICONS: Record<string, string> = {
  script: '剧',
  storyboard: '镜',
  characters: '角',
  dubbing: '音',
  synthesis: '视',
};

const TabNav: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div
      style={{
        background: C.sidebar,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        padding: '0 20px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDone = tab.status === 'done';

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? `2px solid ${C.amber}` : '2px solid transparent',
              cursor: 'pointer',
              color: isActive ? C.text : C.textSub,
              fontWeight: isActive ? 500 : 400,
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              transition: 'color 0.15s, border-color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: 3,
                background: isActive ? C.amberLight : C.tag,
                color: isActive ? C.amber : C.textMute,
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              {TAB_ICONS[tab.id] || tab.id[0]}
            </span>
            <span>{tab.label}</span>
            {isDone && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 5px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 500,
                  background: C.greenBg,
                  color: C.green,
                }}
              >
                已完成
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TabNav;