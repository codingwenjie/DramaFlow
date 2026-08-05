import React, { useState, useEffect } from 'react';
import { C } from '../constants';
import { Button, StatusBadge, SectionLabel, Divider, ProgressBar } from './common';
import { useAppStore } from '../store/useAppStore';
import { loadModuleData, saveModuleData } from '../data/storage';
import { DubbingLine } from '../data/types';
import { getAIServiceForPurpose } from '../services';

const DEFAULT_LINES: DubbingLine[] = [
  { id: 'd001', projectId: '', scene: 1, character: '林晓', characterColor: '#E69500', text: '天哪，对不起！对不起！我真的不是故意的……', status: 'done', duration: '3.2s', emotion: 'panic', speed: 1.0, volume: 80 },
  { id: 'd002', projectId: '', scene: 1, character: '陈诺', characterColor: '#2563EB', text: '没事。', status: 'done', duration: '1.0s', emotion: 'calm', speed: 1.0, volume: 80 },
  { id: 'd003', projectId: '', scene: 1, character: '林晓', characterColor: '#E69500', text: '您的西装……一定很贵吧？我可以赔！', status: 'done', duration: '2.8s', emotion: 'nervous', speed: 1.2, volume: 75 },
  { id: 'd004', projectId: '', scene: 1, character: '陈诺', characterColor: '#2563EB', text: '星光广告策划……林晓。', status: 'done', duration: '2.5s', emotion: 'calm', speed: 0.9, volume: 80 },
  { id: 'd005', projectId: '', scene: 1, character: '林晓', characterColor: '#E69500', text: '对对对，就是我。您有任何损失尽管联系我——', status: 'generating', duration: '', emotion: 'nervous', speed: 1.1, volume: 80 },
  { id: 'd006', projectId: '', scene: 1, character: '陈诺', characterColor: '#2563EB', text: '你们公司正在参与我们的投标？', status: 'pending', duration: '', emotion: 'calm', speed: 1.0, volume: 80 },
  { id: 'd007', projectId: '', scene: 1, character: '林晓', characterColor: '#E69500', text: '（瞳孔地震）', status: 'pending', duration: '', emotion: 'surprise', speed: 1.0, volume: 80 },
  { id: 'd008', projectId: '', scene: 2, character: '陈诺', characterColor: '#2563EB', text: '林晓，等一下。', status: 'pending', duration: '', emotion: 'calm', speed: 1.0, volume: 80 },
  { id: 'd009', projectId: '', scene: 2, character: '林晓', characterColor: '#E69500', text: '陈总？您怎么在这里？', status: 'pending', duration: '', emotion: 'surprise', speed: 1.0, volume: 80 },
  { id: 'd010', projectId: '', scene: 2, character: '陈诺', characterColor: '#2563EB', text: '我看了看你的策划方案，很有想法。', status: 'pending', duration: '', emotion: 'calm', speed: 1.0, volume: 80 },
];

const emotions = [
  { id: 'calm', label: '平静', emoji: '😐' },
  { id: 'happy', label: '开心', emoji: '😊' },
  { id: 'sad', label: '悲伤', emoji: '😢' },
  { id: 'angry', label: '愤怒', emoji: '😠' },
  { id: 'surprise', label: '惊讶', emoji: '😲' },
  { id: 'fear', label: '恐惧', emoji: '😨' },
];

const emotionMap: Record<string, string> = {
  panic: 'fear',
  nervous: 'sad',
  calm: 'calm',
  surprise: 'surprise',
};

const DubbingPanel: React.FC = () => {
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lines, setLines] = useState<DubbingLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!activeProjectId) return;
    const data = loadModuleData<DubbingLine[]>(activeProjectId, 'dubbing', DEFAULT_LINES);
    setLines(data);
    setLoaded(true);
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId || !loaded) return;
    saveModuleData(activeProjectId, 'dubbing', lines);
  }, [lines, activeProjectId, loaded]);

  const selected = lines.find((l) => l.id === selectedId) || null;

  const doneCount = lines.filter((l) => l.status === 'done').length;
  const totalCount = lines.length;
  const progressPercent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const handleSelectLine = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handleEmotionChange = (emotionId: string) => {
    if (!selectedId) return;
    setLines((prev) =>
      prev.map((l) => (l.id === selectedId ? { ...l, emotion: emotionId } : l)),
    );
  };

  const handleSpeedChange = (value: number) => {
    if (!selectedId) return;
    setLines((prev) =>
      prev.map((l) => (l.id === selectedId ? { ...l, speed: value } : l)),
    );
  };

  const handleVolumeChange = (value: number) => {
    if (!selectedId) return;
    setLines((prev) =>
      prev.map((l) => (l.id === selectedId ? { ...l, volume: value } : l)),
    );
  };

  const handleGenerate = async (id: string) => {
    const line = lines.find((l) => l.id === id);
    if (!line) return;
    setLines((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, status: 'generating' } : l,
      ),
    );
    try {
      const service = getAIServiceForPurpose('dubbing');
      await service.generateDubbing({
        text: line.text,
        character: line.character,
        emotion: line.emotion,
        speed: line.speed,
        volume: line.volume,
      });
      setLines((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, status: 'done', duration: '3.0s' } : l,
        ),
      );
    } catch (error) {
      console.error('配音生成失败:', error);
      alert(error instanceof Error ? error.message : '配音生成失败');
      setLines((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, status: 'pending' } : l,
        ),
      );
    }
  };

  const handleBatchGenerate = () => {
    // Placeholder
  };

  const renderProgressBar = () => (
    <div
      style={{
        padding: '14px 20px',
        background: C.card,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: C.text,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            配音进度
          </span>
          <span
            style={{
              fontSize: 12,
              color: C.textSub,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            已完成{' '}
            <span style={{ fontWeight: 600, color: C.amber }}>{doneCount}</span>
            /{totalCount} 条
          </span>
        </div>
        <ProgressBar percent={progressPercent} />
      </div>
      <Button variant="primary" size="md" onClick={handleBatchGenerate}>
        批量配音
      </Button>
    </div>
  );

  const renderLineRow = (line: DubbingLine) => {
    const isSelected = line.id === selectedId;
    const lineNum = parseInt(line.id.replace('d', ''), 10);

    return (
      <div
        key={line.id}
        onClick={() => handleSelectLine(line.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 20px',
          cursor: 'pointer',
          background: isSelected ? C.active : 'transparent',
          borderLeft: isSelected ? `2px solid ${C.amber}` : '2px solid transparent',
          borderBottom: `1px solid ${C.border}`,
          transition: 'background 0.15s',
          minHeight: 40,
        }}
      >
        <span
          style={{
            width: 36,
            fontSize: 11,
            fontWeight: 500,
            color: C.textMute,
            fontFamily: "'JetBrains Mono', monospace",
            flexShrink: 0,
          }}
        >
          #{String(lineNum).padStart(3, '0')}
        </span>

        <span
          style={{
            fontSize: 11,
            color: C.textSub,
            fontFamily: 'Inter, sans-serif',
            flexShrink: 0,
            width: 40,
          }}
        >
          第{line.scene}幕
        </span>

        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: line.characterColor,
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: C.text,
            fontFamily: 'Inter, sans-serif',
            flexShrink: 0,
            width: 36,
          }}
        >
          {line.character}
        </span>

        <span
          style={{
            flex: 1,
            fontSize: 12,
            color: C.textSub,
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {line.text}
        </span>

        <StatusBadge status={line.status} />

        <span
          style={{
            width: 36,
            fontSize: 11,
            color: line.duration ? C.textSub : C.textMute,
            fontFamily: "'JetBrains Mono', monospace",
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          {line.duration || '--'}
        </span>

        <div style={{ width: 48, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          {line.status === 'pending' ? (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleGenerate(line.id);
              }}
            >
              生成
            </Button>
          ) : line.status === 'done' ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              播放
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderLineList = () => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: C.card,
      }}
    >
      {/* Table header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 20px',
          borderBottom: `1px solid ${C.border}`,
          background: C.bg,
        }}
      >
        <span
          style={{
            width: 36,
            fontSize: 10,
            fontWeight: 600,
            color: C.textMute,
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          编号
        </span>
        <span
          style={{
            width: 40,
            fontSize: 10,
            fontWeight: 600,
            color: C.textMute,
            fontFamily: 'Inter, sans-serif',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          幕次
        </span>
        <div style={{ width: 10, flexShrink: 0 }} />
        <span
          style={{
            width: 36,
            fontSize: 10,
            fontWeight: 600,
            color: C.textMute,
            fontFamily: 'Inter, sans-serif',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          角色
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 10,
            fontWeight: 600,
            color: C.textMute,
            fontFamily: 'Inter, sans-serif',
            textTransform: 'uppercase',
            minWidth: 0,
          }}
        >
          台词
        </span>
        <span
          style={{
            width: 48,
            fontSize: 10,
            fontWeight: 600,
            color: C.textMute,
            fontFamily: 'Inter, sans-serif',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          状态
        </span>
        <span
          style={{
            width: 36,
            fontSize: 10,
            fontWeight: 600,
            color: C.textMute,
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase',
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          时长
        </span>
        <div style={{ width: 48, flexShrink: 0 }} />
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {lines.map((line) => renderLineRow(line))}
      </div>
    </div>
  );

  const renderWaveformPreview = () => {
    const barCount = 30;
    const bars = Array.from({ length: barCount }, () => Math.random() * 0.7 + 0.3);

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          height: 48,
          padding: '0 4px',
          background: C.inputBg,
          borderRadius: 4,
        }}
      >
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: `${h * 100}%`,
              background: i < barCount * 0.5 ? C.amber : C.amberLight,
              borderRadius: 1,
              opacity: 0.6 + h * 0.4,
            }}
          />
        ))}
      </div>
    );
  };

  const renderDetailPanel = () => {
    if (!selected) {
      return (
        <div
          style={{
            width: 260,
            flexShrink: 0,
            background: C.card,
            borderLeft: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: C.textMute,
              fontFamily: 'Inter, sans-serif',
              textAlign: 'center',
            }}
          >
            选择一条台词查看详情
          </span>
        </div>
      );
    }

    const currentEmotionId = emotionMap[selected.emotion] || selected.emotion || 'calm';

    return (
      <div
        style={{
          width: 260,
          flexShrink: 0,
          background: C.card,
          borderLeft: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 14px 0 14px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {/* Line info */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.textMute,
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 4,
              }}
            >
              #{selected.id.replace('d', '').padStart(3, '0')}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: C.text,
                lineHeight: 1.6,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {selected.text}
            </p>
          </div>

          <Divider />

          {/* Dubbing params */}
          <div style={{ marginTop: 12 }}>
            <SectionLabel>配音参数</SectionLabel>
          </div>

          {/* Emotion selector */}
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                fontSize: 10,
                color: C.textMute,
                fontFamily: 'Inter, sans-serif',
                marginBottom: 6,
              }}
            >
              情绪
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 4,
              }}
            >
              {emotions.map((em) => {
                const isActive = currentEmotionId === em.id;
                return (
                  <div
                    key={em.id}
                    onClick={() => handleEmotionChange(em.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                      padding: '5px 4px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontFamily: 'Inter, sans-serif',
                      border: isActive ? `1px solid ${C.amber}` : `1px solid ${C.border}`,
                      background: isActive ? C.amberLight : C.card,
                      color: isActive ? C.amber : C.textSub,
                      fontWeight: isActive ? 500 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{em.emoji}</span>
                    <span>{em.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Speed slider */}
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: C.textMute,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                语速
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: C.text,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {selected.speed.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={selected.speed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: 4,
                accentColor: C.amber,
                margin: 0,
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 9, color: C.textMute, fontFamily: 'Inter, sans-serif' }}>
                0.5x
              </span>
              <span style={{ fontSize: 9, color: C.textMute, fontFamily: 'Inter, sans-serif' }}>
                2.0x
              </span>
            </div>
          </div>

          {/* Volume slider */}
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: C.textMute,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                音量
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: C.text,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {selected.volume}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={selected.volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                height: 4,
                accentColor: C.amber,
                margin: 0,
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 9, color: C.textMute, fontFamily: 'Inter, sans-serif' }}>
                0%
              </span>
              <span style={{ fontSize: 9, color: C.textMute, fontFamily: 'Inter, sans-serif' }}>
                100%
              </span>
            </div>
          </div>

          {/* Waveform preview */}
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: 10,
                color: C.textMute,
                fontFamily: 'Inter, sans-serif',
                marginBottom: 6,
              }}
            >
              波形预览
            </div>
            {renderWaveformPreview()}
          </div>
        </div>

        {/* Action button */}
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}` }}>
          {selected.status === 'done' ? (
            <Button
              variant="primary"
              size="md"
              style={{ width: '100%' }}
              onClick={() => {}}
            >
              重新生成
            </Button>
          ) : selected.status === 'generating' ? (
            <Button
              variant="secondary"
              size="md"
              style={{ width: '100%' }}
              onClick={() => {}}
            >
              生成中…
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              style={{ width: '100%' }}
              onClick={() => handleGenerate(selected.id)}
            >
              生成配音
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (!activeProjectId || !loaded) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          background: C.bg,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <span style={{ fontSize: 13, color: C.textMute }}>加载中...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
        background: C.bg,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {renderProgressBar()}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {renderLineList()}
        {renderDetailPanel()}
      </div>
    </div>
  );
};

export default DubbingPanel;