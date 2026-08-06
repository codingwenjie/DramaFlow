import React, { useState, useEffect } from 'react';
import { C } from '../constants';
import { Button, Tag, SectionLabel, Divider } from './common';
import { useAppStore } from '../store/useAppStore';
import { loadModuleData, saveModuleData } from '../data/storage';
import { Character } from '../data/types';
import { getAIServiceForPurpose } from '../services';

const DEFAULT_CHARACTERS: Character[] = [
  {
    id: 'c1', projectId: '', name: '陈诺', role: '男主角', color: '#2563EB',
    avatarUrl: '', stats: { scenes: 18, lines: 145 },
    profile: { age: 35, gender: '男', occupation: '都市集团 CEO', personality: '外冷内热、果断、深情' },
    description: '陈诺是都市集团的CEO，外表冷峻内心温柔，在商场上雷厉风行，但在感情上曾受过伤，对林晓的出现既抗拒又无法自拔。',
    suggestions: ['加强情感冲突表现', '增加内心独白', '突出商业精英气质'],
    lineDistribution: { dialog: 60, monologue: 25, aside: 15 },
    currentVoice: '男声-沉稳磁性',
    voices: ['男声-沉稳磁性', '男声-温柔青年', '男声-冷峻总裁', '男声-阳光活力'],
  },
  {
    id: 'c2', projectId: '', name: '林晓', role: '女主角', color: '#E69500',
    avatarUrl: '', stats: { scenes: 20, lines: 178 },
    profile: { age: 28, gender: '女', occupation: '广告策划', personality: '乐观开朗、坚韧、善良' },
    description: '林晓是一名普通的广告策划师，因为一次意外泼咖啡事件与陈诺相识。她乐观积极，面对困难从不退缩，用真诚打动了陈诺。',
    suggestions: ['增加职业场景描写', '强化独立女性形象', '丰富情感层次'],
    lineDistribution: { dialog: 55, monologue: 30, aside: 15 },
    currentVoice: '女声-清甜自然',
    voices: ['女声-清甜自然', '女声-温柔知性', '女声-活泼元气', '女声-成熟御姐'],
  },
  {
    id: 'c3', projectId: '', name: '董事长', role: '配角', color: '#16A34A',
    avatarUrl: '', stats: { scenes: 8, lines: 42 },
    profile: { age: 60, gender: '男', occupation: '董事长', personality: '威严、睿智、传统' },
    description: '陈诺的父亲，都市集团董事长，传统观念较强，对儿子的婚姻有自己的想法，是剧情冲突的重要推动者。',
    suggestions: ['丰富人物动机', '增加家庭戏份'],
    lineDistribution: { dialog: 70, monologue: 20, aside: 10 },
    currentVoice: '男声-威严长者',
    voices: ['男声-威严长者', '男声-慈祥老人', '男声-低沉中年'],
  },
];

type SubTab = 'profile' | 'voice' | 'visual';

const CharacterManager: React.FC = () => {
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('c1');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('profile');
  const [selectedVoice, setSelectedVoice] = useState<string>('男声-沉稳磁性');
  const [selectedStyle, setSelectedStyle] = useState<string>('写实');
  const [generating, setGenerating] = useState(false);

  const handleGenerateDescription = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const service = getAIServiceForPurpose('character');
      const result = await service.generateCharacter({
        name: selected.name,
        role: selected.role,
      });
      setCharacters((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, description: result } : c))
      );
    } catch (error) {
      console.error('角色生成失败:', error);
      alert(error instanceof Error ? error.message : '角色生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const service = getAIServiceForPurpose('suggestion');
      const result = await service.generateSuggestions({
        context: `${selected.name}，${selected.role}。${selected.description}`,
        type: 'character',
      });
      setCharacters((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, suggestions: result } : c))
      );
    } catch (error) {
      console.error('建议生成失败:', error);
      alert(error instanceof Error ? error.message : '建议生成失败');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!activeProjectId) return;
    const data = loadModuleData<Character[]>(activeProjectId, 'characters', DEFAULT_CHARACTERS);
    setCharacters(data);
    setLoaded(true);
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId || !loaded) return;
    saveModuleData(activeProjectId, 'characters', characters);
  }, [characters, activeProjectId, loaded]);

  useEffect(() => {
    if (loaded && characters.length > 0) {
      setSelectedId(characters[0].id);
      setSelectedVoice(characters[0].currentVoice);
    }
  }, [loaded]);

  if (!activeProjectId || !loaded) {
    return (
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          background: C.bg,
          fontFamily: 'Inter, sans-serif',
          color: C.textSub,
          fontSize: 14,
        }}
      >
        加载中...
      </div>
    );
  }

  const selected = characters.find((c) => c.id === selectedId) || characters[0];

  if (!selected) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.bg,
          fontFamily: 'Inter, sans-serif',
          color: C.textMute,
          fontSize: 13,
          gap: 8,
        }}
      >
        <div style={{ fontSize: 28 }}>👥</div>
        <div>暂无角色</div>
        <div style={{ fontSize: 11 }}>角色会在剧本生成后自动提取，或点击左侧"+"手动添加</div>
      </div>
    );
  }

  const renderCharacterList = () => (
    <div
      style={{
        width: 200,
        flexShrink: 0,
        background: C.card,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 14px 10px 14px',
          fontSize: 13,
          fontWeight: 600,
          color: C.text,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        角色列表
      </div>
      <Divider />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {characters.map((ch) => {
          const isSelected = ch.id === selectedId;
          return (
            <div
              key={ch.id}
              onClick={() => {
                setSelectedId(ch.id);
                setActiveSubTab('profile');
                setSelectedVoice(ch.currentVoice);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                cursor: 'pointer',
                background: isSelected ? C.active : 'transparent',
                borderLeft: isSelected ? `2px solid ${C.amber}` : '2px solid transparent',
                transition: 'background 0.15s',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: ch.color,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  flexShrink: 0,
                }}
              >
                {ch.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text, fontFamily: 'Inter, sans-serif' }}>
                  {ch.name}
                </div>
                <div style={{ fontSize: 11, color: C.textMute, fontFamily: 'Inter, sans-serif' }}>
                  {ch.role}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDetailHeader = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 0 16px 0' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: selected.color,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            flexShrink: 0,
          }}
        >
          {selected.name[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif' }}>
              {selected.name}
            </span>
            <Tag>{selected.role}</Tag>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <span style={{ fontSize: 12, color: C.textSub, fontFamily: 'Inter, sans-serif' }}>
              出场 <span style={{ fontWeight: 600, color: C.text }}>{selected.stats.scenes}</span> 幕
            </span>
            <span style={{ fontSize: 12, color: C.textSub, fontFamily: 'Inter, sans-serif' }}>
              台词 <span style={{ fontWeight: 600, color: C.text }}>{selected.stats.lines}</span> 条
            </span>
          </div>
        </div>
      </div>
      <Divider />
    </div>
  );

  const renderSubTabs = () => {
    const tabs: { key: SubTab; label: string }[] = [
      { key: 'profile', label: '人物档案' },
      { key: 'voice', label: '声音设置' },
      { key: 'visual', label: '形象模型' },
    ];

    return (
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, marginTop: 0 }}>
        {tabs.map((tab) => {
          const isActive = activeSubTab === tab.key;
          return (
            <div
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              style={{
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? C.amber : C.textSub,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
                borderBottom: isActive ? `2px solid ${C.amber}` : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab.label}
            </div>
          );
        })}
      </div>
    );
  };

  const renderProfileTab = () => (
    <div style={{ padding: '16px 0', overflowY: 'auto', flex: 1 }}>
      <SectionLabel>基本信息</SectionLabel>
      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.textMute, fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
            年龄
          </span>
          <span style={{ fontSize: 12, color: C.text, fontFamily: 'Inter, sans-serif' }}>
            {selected.profile.age}岁
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.textMute, fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
            性别
          </span>
          <span style={{ fontSize: 12, color: C.text, fontFamily: 'Inter, sans-serif' }}>
            {selected.profile.gender}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.textMute, fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
            职业
          </span>
          <span style={{ fontSize: 12, color: C.text, fontFamily: 'Inter, sans-serif' }}>
            {selected.profile.occupation}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.textMute, fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
            性格
          </span>
          <span style={{ fontSize: 12, color: C.text, fontFamily: 'Inter, sans-serif' }}>
            {selected.profile.personality}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <SectionLabel>人物描述</SectionLabel>
        <p
          style={{
            margin: '8px 0 0 0',
            fontSize: 12,
            color: C.textSub,
            lineHeight: 1.6,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {selected.description}
        </p>
      </div>

      <div style={{ marginTop: 16 }}>
        <SectionLabel>AI 人设建议</SectionLabel>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {selected.suggestions.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: C.textSub,
                fontFamily: 'Inter, sans-serif',
                padding: '6px 10px',
                background: C.tag,
                borderRadius: 4,
              }}
            >
              <span style={{ fontSize: 13 }}>💡</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerateSuggestions}
          disabled={generating}
          style={{ marginTop: 8 }}
        >
          {generating ? '生成中…' : '重新生成建议'}
        </Button>
      </div>

      <div style={{ marginTop: 16 }}>
        <SectionLabel>台词类型分布</SectionLabel>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: '对话', value: selected.lineDistribution.dialog },
            { label: '独白', value: selected.lineDistribution.monologue },
            { label: '旁白', value: selected.lineDistribution.aside },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 36,
                  fontSize: 11,
                  color: C.textSub,
                  fontFamily: 'Inter, sans-serif',
                  flexShrink: 0,
                }}
              >
                {item.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: C.tag,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${item.value}%`,
                    height: '100%',
                    background: C.amber,
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <span
                style={{
                  width: 32,
                  fontSize: 11,
                  color: C.text,
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderVoiceTab = () => (
    <div style={{ padding: '16px 0', overflowY: 'auto', flex: 1 }}>
      <SectionLabel>当前声音</SectionLabel>
      <div
        style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: C.tag,
          borderRadius: 6,
        }}
      >
        <button
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: C.amber,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          ▶
        </button>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, fontFamily: 'Inter, sans-serif' }}>
            {selectedVoice}
          </div>
          <div style={{ fontSize: 11, color: C.textMute, fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
            当前角色声音
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <SectionLabel>可用声音库</SectionLabel>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {selected.voices.map((v) => {
            const isActive = v === selectedVoice;
            return (
              <div
                key={v}
                onClick={() => setSelectedVoice(v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: isActive ? C.active : 'transparent',
                  border: isActive ? `1px solid ${C.amber}` : `1px solid transparent`,
                  transition: 'background 0.15s',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: isActive ? C.amber : C.text,
                    fontWeight: isActive ? 500 : 400,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {v}
                </span>
                {isActive && (
                  <span style={{ fontSize: 12, color: C.amber }}>✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderVisualTab = () => (
    <div style={{ padding: '16px 0', overflowY: 'auto', flex: 1 }}>
      <SectionLabel>形象参考</SectionLabel>
      <div
        style={{
          marginTop: 8,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              borderRadius: 6,
              overflow: 'hidden',
              border: `1px solid ${C.border}`,
              background: C.tag,
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=160&fit=crop&auto=format"
              alt={`形象参考 ${i}`}
              style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <SectionLabel>风格设置</SectionLabel>
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['写实', '动漫', '素描', '国风', '像素'].map((style) => {
            const isActive = style === selectedStyle;
            return (
              <div
                key={style}
                onClick={() => setSelectedStyle(style)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer',
                  border: isActive ? `1px solid ${C.amber}` : `1px solid ${C.border}`,
                  background: isActive ? C.amberLight : C.card,
                  color: isActive ? C.amber : C.textSub,
                  fontWeight: isActive ? 500 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {style}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <Button variant="primary" size="md" onClick={handleGenerateDescription} disabled={generating}>
          {generating ? '生成中…' : 'AI 生成人设'}
        </Button>
        <Button variant="secondary" size="md" onClick={handleGenerateSuggestions} disabled={generating}>
          {generating ? '生成中…' : '生成建议'}
        </Button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        background: C.bg,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {renderCharacterList()}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 20px' }}>
        {renderDetailHeader()}
        {renderSubTabs()}

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {activeSubTab === 'profile' && renderProfileTab()}
          {activeSubTab === 'voice' && renderVoiceTab()}
          {activeSubTab === 'visual' && renderVisualTab()}
        </div>
      </div>
    </div>
  );
};

export default CharacterManager;
