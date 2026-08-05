import React, { useState, useEffect } from 'react';
import { C } from '../constants';
import { Button, StatusBadge, SectionLabel, Divider, ProgressBar } from './common';
import { useAppStore } from '../store/useAppStore';
import { loadModuleData, saveModuleData } from '../data/storage';
import { SynthesisConfig } from '../data/types';

interface Segment {
  id: string;
  name: string;
  part: string;
  shots: number;
  duration: string;
  status: string;
}

interface OutputSetting {
  label: string;
  value: string;
}

interface PostToggle {
  key: string;
  label: string;
  enabled: boolean;
}

interface SynthesisStep {
  id: string;
  label: string;
  status: 'completed' | 'loading' | 'pending';
}

const segments: Segment[] = [
  { id: 's1', name: '第一幕·相遇', part: '片段 01', shots: 6, duration: '3:24', status: 'done' },
  { id: 's2', name: '第一幕·相遇', part: '片段 02', shots: 4, duration: '2:10', status: 'done' },
  { id: 's3', name: '第二幕·误会', part: '片段 01', shots: 5, duration: '2:55', status: 'generating' },
  { id: 's4', name: '第二幕·误会', part: '片段 02', shots: 3, duration: '1:45', status: 'pending' },
  { id: 's5', name: '第三幕·摊牌', part: '片段 01', shots: 7, duration: '4:12', status: 'pending' },
  { id: 's6', name: '第三幕·摊牌', part: '片段 02', shots: 5, duration: '3:06', status: 'pending' },
];

const outputSettings: OutputSetting[] = [
  { label: '分辨率', value: '1080×1920 (竖屏)' },
  { label: '帧率', value: '30 fps' },
  { label: '码率', value: '8 Mbps' },
  { label: '格式', value: 'MP4 (H.264)' },
];

const defaultToggles: PostToggle[] = [
  { key: 'tone', label: '色调统一', enabled: true },
  { key: 'bgm', label: '背景音乐', enabled: true },
  { key: 'subtitle', label: '自动字幕', enabled: true },
  { key: 'intro', label: '片头片尾', enabled: false },
  { key: 'watermark', label: '水印去除', enabled: false },
];

const synthesisSteps: SynthesisStep[] = [
  { id: 'step1', label: '素材加载', status: 'completed' },
  { id: 'step2', label: '镜头剪辑', status: 'loading' },
  { id: 'step3', label: '配音合并', status: 'pending' },
  { id: 'step4', label: '色调处理', status: 'pending' },
  { id: 'step5', label: '字幕渲染', status: 'pending' },
  { id: 'step6', label: '最终封装', status: 'pending' },
];

const DEFAULT_CONFIG: SynthesisConfig = {
  resolution: '1080×1920 (竖屏)',
  fps: 30,
  bitrate: '8 Mbps',
  format: 'MP4 (H.264)',
  postProcessing: {
    colorGrading: true,
    bgm: true,
    subtitles: true,
    introOutro: false,
    watermarkRemoval: false,
  },
};

const toggleKeyToConfigKey: Record<string, keyof SynthesisConfig['postProcessing']> = {
  tone: 'colorGrading',
  bgm: 'bgm',
  subtitle: 'subtitles',
  intro: 'introOutro',
  watermark: 'watermarkRemoval',
};

const Toggle: React.FC<{ enabled: boolean; onToggle: () => void }> = ({ enabled, onToggle }) => {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: enabled ? C.amber : C.border,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#FFFFFF',
          position: 'absolute',
          top: 3,
          left: enabled ? 19 : 3,
          transition: 'left 0.2s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }}
      />
    </div>
  );
};

const stepStatusIcon: Record<string, React.CSSProperties> = {
  completed: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: C.green,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 700,
    flexShrink: 0,
  },
  loading: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: `2px solid ${C.amber}`,
    borderTopColor: 'transparent',
    flexShrink: 0,
  },
  pending: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: `2px solid ${C.border}`,
    flexShrink: 0,
  },
};

const SynthesisPanel: React.FC = () => {
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const [config, setConfig] = useState<SynthesisConfig | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('s1');
  const [toggles, setToggles] = useState<PostToggle[]>(defaultToggles);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  // Load config from storage
  useEffect(() => {
    if (!activeProjectId) return;
    const data = loadModuleData<SynthesisConfig>(activeProjectId, 'synthesis', DEFAULT_CONFIG);
    setConfig(data);
    setToggles([
      { key: 'tone', label: '色调统一', enabled: data.postProcessing.colorGrading },
      { key: 'bgm', label: '背景音乐', enabled: data.postProcessing.bgm },
      { key: 'subtitle', label: '自动字幕', enabled: data.postProcessing.subtitles },
      { key: 'intro', label: '片头片尾', enabled: data.postProcessing.introOutro },
      { key: 'watermark', label: '水印去除', enabled: data.postProcessing.watermarkRemoval },
    ]);
    setLoaded(true);
  }, [activeProjectId]);

  // Save config to storage when it changes
  useEffect(() => {
    if (!activeProjectId || !loaded || !config) return;
    saveModuleData(activeProjectId, 'synthesis', config);
  }, [config, activeProjectId, loaded]);

  const handleToggle = (key: string) => {
    const configKey = toggleKeyToConfigKey[key];
    setToggles((prev) =>
      prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)),
    );
    if (configKey) {
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          postProcessing: { ...prev.postProcessing, [configKey]: !prev.postProcessing[configKey] },
        };
      });
    }
  };

  const handleStartSynthesis = () => {
    setIsSynthesizing(true);
    setIsComplete(false);
    setProgress(0);

    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setIsSynthesizing(false);
        setIsComplete(true);
      }
    }, 150);
  };

  return !activeProjectId || !loaded ? (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          color: C.textSub,
        }}
      >
        {!activeProjectId ? '请先选择项目' : '加载中...'}
      </div>
    ) : (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        gap: 16,
        padding: 16,
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* ===== 左侧主区域 ===== */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflow: 'hidden',
        }}
      >
        {/* 7.1 视频预览区 */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 360,
              height: 640,
              background: '#000000',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* 播放按钮 */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  color: C.text,
                  marginLeft: 3,
                }}
              >
                ▶
              </span>
            </div>

            {/* 底部进度条和时间戳 */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <ProgressBar percent={30} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span>00:00</span>
                <span>18:32</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7.2 场次片段列表 */}
        <div
          style={{
            flex: 1,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 16px 0' }}>
            <SectionLabel>场次片段</SectionLabel>
          </div>

          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '8px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {segments.map((seg) => {
              const isSelected = seg.id === selectedSegmentId;
              return (
                <div
                  key={seg.id}
                  onClick={() => setSelectedSegmentId(seg.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: isSelected ? C.active : 'transparent',
                    border: isSelected ? `1px solid ${C.amberLight}` : '1px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* 缩略图占位 */}
                  <div
                    style={{
                      width: 80,
                      height: 45,
                      borderRadius: 4,
                      background: C.tag,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: C.textMute,
                    }}
                  >
                    缩略图
                  </div>

                  {/* 中间信息 */}
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.text,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {seg.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 11,
                        color: C.textSub,
                      }}
                    >
                      <span>{seg.part}</span>
                      <span>{seg.shots} 镜头</span>
                      <span>{seg.duration}</span>
                    </div>
                  </div>

                  {/* 状态标签 */}
                  <StatusBadge status={seg.status} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== 右侧面板 ===== */}
      <div
        style={{
          width: 260,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflow: 'auto',
        }}
      >
        {/* 7.3 输出设置面板 */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <SectionLabel>输出设置</SectionLabel>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {outputSettings.map((setting, idx) => (
              <div key={idx}>
                {idx > 0 && <Divider style={{ margin: '0 0 10px 0' }} />}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: C.textSub,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {setting.label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: C.text,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {setting.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7.4 后期处理开关 */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <SectionLabel>后期处理</SectionLabel>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {toggles.map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: C.text,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {item.label}
                </span>
                <Toggle
                  enabled={item.enabled}
                  onToggle={() => handleToggle(item.key)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 7.5 底部合成区域 ===== */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: C.card,
          borderTop: `1px solid ${C.border}`,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          zIndex: 10,
        }}
      >
        {!isSynthesizing && !isComplete ? (
          <Button
            variant="primary"
            onClick={handleStartSynthesis}
            style={{ padding: '8px 24px', fontSize: 14, fontWeight: 600 }}
          >
            开始合成
          </Button>
        ) : isComplete ? (
          <Button
            variant="primary"
            onClick={() => {}}
            style={{ padding: '8px 24px', fontSize: 14, fontWeight: 600 }}
          >
            下载成品
          </Button>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: C.textSub,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span>合成进度</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar percent={progress} />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 16,
                alignItems: 'center',
              }}
            >
              {synthesisSteps.map((step) => {
                const iconStyle = stepStatusIcon[step.status];
                const isCompleted = step.status === 'completed';
                const isLoading = step.status === 'loading';

                return (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    {isCompleted ? (
                      <div style={iconStyle}>✓</div>
                    ) : isLoading ? (
                      <div style={iconStyle} />
                    ) : (
                      <div style={iconStyle} />
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        color: isCompleted
                          ? C.textSub
                          : isLoading
                            ? C.amber
                            : C.textMute,
                        fontFamily: 'Inter, sans-serif',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SynthesisPanel;