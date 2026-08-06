import React, { useState, useEffect, useCallback } from 'react';
import { C } from '../constants';
import { Button, StatusBadge, SectionLabel, Divider, ProgressBar } from './common';
import { useAppStore } from '../store/useAppStore';
import { useProjectStore } from '../store/useProjectStore';
import { loadModuleData, saveModuleData } from '../data/storage';
import type { Shot, SynthesisConfig } from '../data/types';
import { buildSynthesisJob } from '../services/synthesizer';
import type { SynthesisResult } from '../../electron/synthesis';

interface Segment {
  id: string;
  name: string;
  part: string;
  shots: number;
  duration: number;
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

const STEP_ORDER: { stage: string; label: string }[] = [
  { stage: 'assets', label: '素材加载' },
  { stage: 'tts', label: '配音生成' },
  { stage: 'render', label: '镜头剪辑' },
  { stage: 'render', label: '字幕渲染' },
  { stage: 'concat', label: '最终封装' },
];

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
  const projects = useProjectStore((s) => s.projects);
  const project = projects.find((p) => p.id === activeProjectId);

  const [config, setConfig] = useState<SynthesisConfig | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [shots, setShots] = useState<Shot[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('');
  const [toggles, setToggles] = useState<PostToggle[]>([]);

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageMessage, setStageMessage] = useState('');
  const [result, setResult] = useState<SynthesisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasDesktop = typeof window !== 'undefined' && !!window.electronAPI;

  // 加载项目数据
  useEffect(() => {
    if (!activeProjectId) return;
    const data = loadModuleData<SynthesisConfig>(activeProjectId, 'synthesis', DEFAULT_CONFIG);
    const shotData = loadModuleData<Shot[]>(activeProjectId, 'shots', []);
    setConfig(data);
    setShots(shotData);
    setToggles([
      { key: 'tone', label: '色调统一', enabled: data.postProcessing.colorGrading },
      { key: 'bgm', label: '背景音乐', enabled: data.postProcessing.bgm },
      { key: 'subtitle', label: '自动字幕', enabled: data.postProcessing.subtitles },
      { key: 'intro', label: '片头片尾', enabled: data.postProcessing.introOutro },
      { key: 'watermark', label: '水印去除', enabled: data.postProcessing.watermarkRemoval },
    ]);
    setLoaded(true);
  }, [activeProjectId]);

  // 保存配置
  useEffect(() => {
    if (!activeProjectId || !loaded || !config) return;
    saveModuleData(activeProjectId, 'synthesis', config);
  }, [config, activeProjectId, loaded]);

  const handleToggle = (key: string) => {
    const configKey = toggleKeyToConfigKey[key];
    setToggles((prev) => prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t)));
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

  // 分镜按幕次分组为片段列表
  const segments: Segment[] = useMemoSegments(shots);

  const steps: SynthesisStep[] = useMemoSteps(isSynthesizing, isComplete, progress);

  const handleStartSynthesis = useCallback(async () => {
    if (!activeProjectId || !config) return;
    if (!hasDesktop) {
      setError('本地合成为桌面版功能。请使用 npm run dev 启动桌面端后重试（Web 演示版暂不支持本地渲染）。');
      return;
    }
    setError(null);
    setIsSynthesizing(true);
    setIsComplete(false);
    setResult(null);
    setProgress(0);
    setStageMessage('准备中...');
    try {
      const built = await buildSynthesisJob(activeProjectId, project?.name ?? '', config, project?.orientation ?? 'vertical');
      if (!built) {
        setError('项目还没有分镜数据，请先在「分镜生成」中创建分镜。');
        setIsSynthesizing(false);
        return;
      }
      const unsubscribe = window.electronAPI!.onSynthesisProgress((p) => {
        setProgress(p.percent);
        setStageMessage(p.message);
      });
      const res = await window.electronAPI!.synthesize(built.job);
      unsubscribe();
      if (res.ok && res.outputPath) {
        setResult(res);
        setProgress(100);
        setStageMessage('合成完成');
        setIsComplete(true);
      } else {
        setError(res.error || '合成失败，请查看控制台日志。');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '合成过程发生异常');
    } finally {
      setIsSynthesizing(false);
    }
  }, [activeProjectId, config, hasDesktop, project?.name, project?.orientation]);

  const handleDownload = useCallback(async () => {
    if (!result?.outputPath) return;
    const saved = await window.electronAPI?.saveVideo(result.outputPath, `${project?.name || 'DramaFlow'}-成片.mp4`);
    if (saved) {
      setStageMessage(`已保存到 ${saved}`);
    }
  }, [result, project?.name]);

  const videoSrc = result?.outputPath
    ? `dramaflow-media://local/?path=${encodeURIComponent(result.outputPath)}`
    : '';

  const outputSettings: OutputSetting[] = config
    ? [
        { label: '分辨率', value: config.resolution },
        { label: '帧率', value: `${config.fps} fps` },
        { label: '码率', value: config.bitrate },
        { label: '格式', value: config.format },
      ]
    : [];

  return !activeProjectId || !loaded || !config ? (
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
        {/* 视频预览区 */}
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
          {videoSrc ? (
            <video
              key={result?.outputPath}
              src={videoSrc}
              controls
              style={{
                height: 480,
                maxWidth: '100%',
                background: '#000',
                borderRadius: 6,
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                width: 270,
                height: 480,
                background: '#000000',
                borderRadius: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default',
                }}
              >
                <span style={{ fontSize: 22, color: C.text, marginLeft: 3 }}>▶</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                {isComplete ? '点击播放预览成片' : '合成完成后在此预览'}
              </div>
            </div>
          )}
        </div>

        {/* 场次片段列表 */}
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
          <div style={{ padding: '14px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionLabel>场次片段</SectionLabel>
            <span style={{ fontSize: 11, color: C.textMute }}>{shots.length} 个镜头</span>
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
            {segments.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: C.textMute }}>
                暂无分镜数据，请先在「分镜生成」中创建分镜
              </div>
            ) : (
              segments.map((seg) => {
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
                      {seg.shots} 镜头
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
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
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, fontSize: 11, color: C.textSub }}>
                        <span>{seg.part}</span>
                        <span>约 {seg.duration.toFixed(1)}s</span>
                      </div>
                    </div>
                    <StatusBadge status={seg.status} />
                  </div>
                );
              })
            )}
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
        {/* 输出设置 */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <SectionLabel>输出设置</SectionLabel>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {outputSettings.map((setting, idx) => (
              <div key={idx}>
                {idx > 0 && <Divider style={{ margin: '0 0 10px 0' }} />}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: C.textSub }}>{setting.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{setting.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 后期处理 */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <SectionLabel>后期处理</SectionLabel>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {toggles.map((item) => (
              <div key={item.key} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: C.text }}>{item.label}</span>
                <Toggle enabled={item.enabled} onToggle={() => handleToggle(item.key)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 底部合成区域 ===== */}
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
          <>
            <Button variant="primary" onClick={handleStartSynthesis} style={{ padding: '8px 24px', fontSize: 14, fontWeight: 600 }}>
              开始合成
            </Button>
            {!hasDesktop && (
              <span style={{ fontSize: 11, color: C.amber }}>本地合成需要桌面版（npm run dev）</span>
            )}
          </>
        ) : isComplete && result ? (
          <>
            <Button variant="primary" onClick={handleDownload} style={{ padding: '8px 24px', fontSize: 14, fontWeight: 600 }}>
              下载成品
            </Button>
            {result.duration != null && (
              <span style={{ fontSize: 12, color: C.textSub }}>
                时长 {result.duration.toFixed(1)}s · {(result.size ?? 0) / 1024 / 1024 < 1
                  ? `${((result.size ?? 0) / 1024).toFixed(0)} KB`
                  : `${((result.size ?? 0) / 1024 / 1024).toFixed(1)} MB`}
              </span>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.textSub }}>
                <span>合成进度</span>
                <span>{progress}%{stageMessage ? ` · ${stageMessage}` : ''}</span>
              </div>
              <ProgressBar percent={progress} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              {steps.map((step) => {
                const iconStyle = stepStatusIcon[step.status];
                const isCompleted = step.status === 'completed';
                const isLoading = step.status === 'loading';
                return (
                  <div key={step.id} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <div style={iconStyle}>
                      {isCompleted ? '✓' : ''}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: isCompleted ? C.textSub : isLoading ? C.amber : C.textMute,
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
        {error && (
          <div style={{ fontSize: 11, color: '#D64545', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

function useMemoSegments(shots: Shot[]): Segment[] {
  return React.useMemo(() => {
    const map = new Map<number, { shots: Shot[] }>();
    for (const shot of shots) {
      if (!map.has(shot.scene)) map.set(shot.scene, { shots: [] });
      map.get(shot.scene)!.shots.push(shot);
    }
    const segs: Segment[] = [];
    let partIndex = 1;
    for (const [scene, group] of Array.from(map.entries()).sort((a, b) => a[0] - b[0])) {
      const totalDuration = group.shots.reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
      segs.push({
        id: `scene-${scene}`,
        name: `第 ${scene} 幕`,
        part: `片段 ${String(partIndex).padStart(2, '0')}`,
        shots: group.shots.length,
        duration: totalDuration,
        status: 'done',
      });
      partIndex += 1;
    }
    return segs;
  }, [shots]);
}

function useMemoSteps(isSynthesizing: boolean, isComplete: boolean, progress: number): SynthesisStep[] {
  return React.useMemo(() => {
    if (!isSynthesizing && !isComplete) {
      return STEP_ORDER.map((s, i) => ({
        id: `step-${i}`,
        label: s.label,
        status: 'pending' as const,
      }));
    }
    let currentStage = 'assets';
    if (isComplete) currentStage = 'done';
    else if (progress >= 82) currentStage = 'concat';
    else if (progress >= 20) currentStage = 'render';
    else if (progress >= 8) currentStage = 'tts';
    else if (isSynthesizing) currentStage = 'assets';

    const stageIndex = STEP_ORDER.findIndex((s) => s.stage === currentStage);
    return STEP_ORDER.map((s, i) => ({
      id: `step-${i}`,
      label: s.label,
      status:
        currentStage === 'done' || i < stageIndex
          ? 'completed'
          : i === stageIndex
            ? 'loading'
            : 'pending',
    }));
  }, [isSynthesizing, isComplete, progress]);
}

export default SynthesisPanel;
