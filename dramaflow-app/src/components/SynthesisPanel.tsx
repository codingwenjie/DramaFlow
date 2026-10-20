import React, { useState, useEffect, useCallback, useRef } from 'react';
import { C } from '../constants';
import { Button, SectionLabel, ProgressBar } from './common';
import { useAppStore } from '../store/useAppStore';
import { useProjectStore } from '../store/useProjectStore';
import {
  loadModuleData,
  saveModuleData,
  loadProjectFile,
  saveProjectFile,
  deleteProjectFile,
  generateId,
} from '../data/storage';
import type { Shot, SynthesisConfig, BgmItem } from '../data/types';
import { buildSynthesisJob } from '../services/synthesizer';
import { base64ToBlob } from '../data/project-io';
import type { SynthesisResult } from '../../electron/synthesis';

interface Segment {
  id: string;
  name: string;
  part: string;
  shots: number;
  duration: number;
  status: string;
  thumbShot?: Shot;
}


const AUDIO_FILTERS = [
  { name: '音频文件', extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'] },
];

const AUDIO_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
};

function mimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_MIME[ext] ?? 'audio/mpeg';
}

interface OutputSetting {
  label: string;
  sub: string;
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

const SEGMENT_STATUS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  ready: { color: '#16A34A', bg: '#ECFDF5', border: '#BBF7D0', label: '就绪' },
  processing: { color: '#E69500', bg: '#FFF3D0', border: '#FDE68A', label: '处理中' },
  pending: { color: '#9AA0B0', bg: '#EEF0F4', border: '#E4E7EE', label: '待处理' },
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

/** 场次片段缩略图：从 IndexedDB 加载该幕第一个镜头的图片 */
const SegmentThumb: React.FC<{ shot?: Shot }> = ({ shot }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setImgUrl(null);
    if (!shot?.img) return;
    if (shot.img.startsWith('db://')) {
      loadProjectFile(shot.projectId, shot.img.slice(5))
        .then((blob) => {
          if (alive && blob) setImgUrl(URL.createObjectURL(blob));
        })
        .catch(() => {});
    } else {
      setImgUrl(shot.img);
    }
    return () => {
      alive = false;
    };
  }, [shot?.img, shot?.projectId]);

  return (
    <div
      style={{
        width: 80,
        height: 45,
        background: C.inputBg,
        borderRadius: 3,
        overflow: 'hidden',
        flexShrink: 0,
        border: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#C0C5D0',
        fontSize: 14,
      }}
    >
      {imgUrl ? (
        <img
          src={imgUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        '◫'
      )}
    </div>
  );
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
  const [bgmList, setBgmList] = useState<BgmItem[]>([]);
  const [bgmPreviewUrl, setBgmPreviewUrl] = useState<string | null>(null);
  const [bgmBusy, setBgmBusy] = useState(false);
  const bgmInputRef = useRef<HTMLInputElement>(null);

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
    const shotData = loadModuleData<Shot[]>(activeProjectId, 'shots', []).map((s) => ({
      ...s,
      projectId: activeProjectId,
    }));
    setConfig(data);
    setShots(shotData);
    setBgmList(loadModuleData<BgmItem[]>(activeProjectId, 'bgmLibrary', []));
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

  // 保存 BGM 素材库清单
  useEffect(() => {
    if (!activeProjectId || !loaded) return;
    saveModuleData(activeProjectId, 'bgmLibrary', bgmList);
  }, [bgmList, activeProjectId, loaded]);

  // 选中 BGM 时生成试播 URL
  useEffect(() => {
    let alive = true;
    setBgmPreviewUrl(null);
    if (!activeProjectId || !config?.bgmFileId) return;
    loadProjectFile(activeProjectId, config.bgmFileId)
      .then((blob) => {
        if (alive && blob) setBgmPreviewUrl(URL.createObjectURL(blob));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [activeProjectId, config?.bgmFileId]);

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

  // ===== BGM 素材库 =====
  const addBgmFile = useCallback(
    async (name: string, blob: Blob) => {
      if (!activeProjectId) return;
      setBgmBusy(true);
      try {
        const fileId = `bgm-${generateId()}`;
        await saveProjectFile(activeProjectId, fileId, blob);
        setBgmList((prev) => [...prev, { fileId, name }]);
        setConfig((prev) =>
          prev ? { ...prev, bgmFileId: fileId, bgmVolume: prev.bgmVolume ?? 30 } : prev
        );
      } catch (e) {
        alert(`导入失败：${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setBgmBusy(false);
      }
    },
    [activeProjectId]
  );

  const handleImportBgm = useCallback(async () => {
    if (!activeProjectId || bgmBusy) return;
    try {
      if (window.electronAPI?.openBinaryFile) {
        const opened = await window.electronAPI.openBinaryFile(AUDIO_FILTERS);
        if (opened) {
          await addBgmFile(opened.name, base64ToBlob(opened.base64, mimeFromName(opened.name)));
        }
        return;
      }
      // 浏览器降级：隐藏 file input
      bgmInputRef.current?.click();
    } catch (e) {
      alert(`导入失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }, [activeProjectId, bgmBusy, addBgmFile]);

  const handleImportBgmFile = useCallback(
    async (file: File) => {
      await addBgmFile(file.name, file);
    },
    [addBgmFile]
  );

  const handleSelectBgm = useCallback((fileId: string) => {
    setConfig((prev) => (prev ? { ...prev, bgmFileId: fileId } : prev));
  }, []);

  const handleRemoveBgm = useCallback(
    async (fileId: string) => {
      setBgmList((prev) => prev.filter((b) => b.fileId !== fileId));
      setConfig((prev) =>
        prev && prev.bgmFileId === fileId ? { ...prev, bgmFileId: undefined } : prev
      );
      if (activeProjectId) {
        await deleteProjectFile(activeProjectId, fileId).catch(() => {});
      }
    },
    [activeProjectId]
  );

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
        {
          label: '输出分辨率',
          sub: project?.orientation === 'horizontal' ? '横屏 16:9' : '竖屏 9:16',
          value: config.resolution,
        },
        { label: '帧率', sub: '标准', value: `${config.fps} fps` },
        { label: '码率', sub: '高质量', value: config.bitrate },
        { label: '格式', sub: '兼容性强', value: config.format },
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
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                background: 'rgba(0,0,0,0.5)',
                padding: '1px 5px',
                borderRadius: 2,
                fontSize: 9,
                color: '#FFFFFF',
                fontFamily: "'JetBrains Mono', monospace",
                zIndex: 2,
              }}
            >
              PREVIEW
            </div>
            {videoSrc ? (
              <video
                key={result?.outputPath}
                src={videoSrc}
                controls
                style={{
                  height: 380,
                  maxWidth: '100%',
                  background: '#000',
                  borderRadius: 6,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: 225,
                  height: 400,
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
                    width: 48,
                    height: 48,
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
          {result?.duration != null && (
            <div
              style={{
                marginTop: 8,
                fontSize: 10,
                color: C.textMute,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              总时长 {result.duration.toFixed(1)}s ·{' '}
              {((result.size ?? 0) / 1024 / 1024) < 1
                ? `${((result.size ?? 0) / 1024).toFixed(0)} KB`
                : `${((result.size ?? 0) / 1024 / 1024).toFixed(1)} MB`}
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
          <div style={{ padding: '16px 18px 2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionLabel>场次片段</SectionLabel>
            <span style={{ fontSize: 11, color: C.textMute }}>共 {segments.length} 个片段 · {shots.length} 个镜头</span>
          </div>

          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '10px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {segments.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: C.textMute }}>
                暂无分镜数据，请先在「分镜生成」中创建分镜
              </div>
            ) : (
              segments.map((seg) => {
                const isSelected = seg.id === selectedSegmentId;
                const s = SEGMENT_STATUS[seg.status] || SEGMENT_STATUS.pending;
                return (
                  <div
                    key={seg.id}
                    onClick={() => setSelectedSegmentId(seg.id)}
                    style={{
                      background: C.card,
                      border: `1px solid ${isSelected ? '#F5C842' : C.border}`,
                      borderRadius: 5,
                      padding: '14px 18px',
                      marginBottom: 10,
                      display: 'flex',
                      gap: 14,
                      alignItems: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <SegmentThumb shot={seg.thumbShot} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
                          {seg.name}
                        </span>
                        <span style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>
                          {seg.part}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: C.textSub, fontFamily: 'Inter, sans-serif' }}>
                        <span>{seg.shots} 个镜头</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{seg.duration.toFixed(1)}s</span>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        background: s.bg,
                        color: s.color,
                        border: `1px solid ${s.border}`,
                        padding: '3px 10px',
                        borderRadius: 3,
                        fontFamily: "'JetBrains Mono', monospace",
                        flexShrink: 0,
                      }}
                    >
                      {s.label}
                    </span>
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
          width: 272,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflow: 'auto',
        }}
      >
        {/* 输出设置 */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
          <SectionLabel>输出设置</SectionLabel>
          <div style={{ marginTop: 8 }}>
            {outputSettings.map((setting, idx) => (
              <div
                key={setting.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '7px 0',
                  borderBottom: idx < outputSettings.length - 1 ? `1px solid ${C.inputBg}` : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: C.textSub }}>{setting.label}</div>
                  <div style={{ fontSize: 9, color: C.textMute }}>{setting.sub}</div>
                </div>
                <div style={{ fontSize: 11, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{setting.value}</div>
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

          {/* BGM 素材库（开启背景音乐时显示） */}
          {config.postProcessing.bgm && (
            <div style={{ borderTop: `1px solid ${C.inputBg}`, marginTop: 12, paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: C.textSub }}>音乐素材</span>
                <button
                  onClick={() => void handleImportBgm()}
                  disabled={bgmBusy}
                  style={{
                    background: bgmBusy ? C.inputBg : C.amberLight,
                    border: `1px solid ${bgmBusy ? C.border : '#F5C842'}`,
                    borderRadius: 3,
                    color: bgmBusy ? C.textMute : '#B47400',
                    fontSize: 10,
                    padding: '3px 10px',
                    cursor: bgmBusy ? 'default' : 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {bgmBusy ? '导入中…' : '+ 导入音乐'}
                </button>
                <input
                  ref={bgmInputRef}
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImportBgmFile(f);
                    e.target.value = '';
                  }}
                />
              </div>

              {bgmList.length === 0 ? (
                <div style={{ fontSize: 10, color: C.textMute, marginTop: 8, lineHeight: 1.6 }}>
                  导入 MP3 / WAV 等音乐文件，合成时将循环铺底、随镜头淡出；未选择素材时不混入背景音
                </div>
              ) : (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {bgmList.map((b) => {
                    const sel = config.bgmFileId === b.fileId;
                    return (
                      <div
                        key={b.fileId}
                        onClick={() => handleSelectBgm(b.fileId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 10px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          background: sel ? C.amberLight : C.inputBg,
                          border: `1px solid ${sel ? '#F5C842' : C.border}`,
                        }}
                      >
                        <span style={{ fontSize: 10, color: sel ? '#B47400' : C.textMute }}>
                          {sel ? '◉' : '○'}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 11,
                            color: sel ? '#B47400' : C.text,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={b.name}
                        >
                          {b.name}
                        </span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRemoveBgm(b.fileId);
                          }}
                          style={{ fontSize: 11, color: C.textMute, cursor: 'pointer', padding: '0 2px' }}
                          title="删除素材"
                        >
                          ✕
                        </span>
                      </div>
                    );
                  })}

                  {bgmPreviewUrl && (
                    <audio controls src={bgmPreviewUrl} style={{ width: '100%', height: 30, marginTop: 2 }} />
                  )}

                  <div style={{ marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: C.textSub }}>音乐音量</span>
                      <span style={{ fontSize: 11, color: C.amber, fontFamily: "'JetBrains Mono', monospace" }}>
                        {config.bgmVolume ?? 30}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      value={config.bgmVolume ?? 30}
                      onChange={(e) =>
                        setConfig((prev) => (prev ? { ...prev, bgmVolume: Number(e.target.value) } : prev))
                      }
                      style={{ width: '100%', accentColor: C.amber }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 合成进度 */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <SectionLabel>合成进度</SectionLabel>
          <div style={{ background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 5, padding: 12, marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.textSub }}>总进度</span>
              <span style={{ fontSize: 11, color: C.amber, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                {progress}%
              </span>
            </div>
            <ProgressBar percent={progress} />
            {stageMessage && (
              <div style={{ marginTop: 8, fontSize: 10, color: C.textMute }}>{stageMessage}</div>
            )}
            <div style={{ marginTop: 12 }}>
              {steps.map((step) => {
                const isCompleted = step.status === 'completed';
                const isLoading = step.status === 'loading';
                return (
                  <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isCompleted ? C.green : isLoading ? C.amber : C.border,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 10, color: C.textSub, flex: 1 }}>{step.label}</span>
                    <span
                      style={{
                        fontSize: 10,
                        color: isCompleted ? C.green : isLoading ? C.amber : C.textMute,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {isCompleted ? '100%' : isLoading ? '进行中' : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: 10,
                padding: '8px 10px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 4,
                fontSize: 11,
                color: '#DC2626',
              }}
            >
              {error}
            </div>
          )}

          {!isSynthesizing && !isComplete ? (
            <>
              <Button
                variant="primary"
                onClick={handleStartSynthesis}
                style={{ width: '100%', marginTop: 12, padding: '10px', fontSize: 13, fontWeight: 700 }}
              >
                ▶ 开始合成
              </Button>
              {!hasDesktop && (
                <div style={{ marginTop: 8, fontSize: 10, color: C.amber, textAlign: 'center' }}>
                  本地合成需要桌面版（npm run dev）
                </div>
              )}
            </>
          ) : isComplete && result ? (
            <>
              <Button
                variant="primary"
                onClick={handleDownload}
                style={{ width: '100%', marginTop: 12, padding: '10px', fontSize: 13, fontWeight: 700 }}
              >
                ⬇ 下载成品
              </Button>
              <div
                style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  background: C.greenBg,
                  border: '1px solid #BBF7D0',
                  borderRadius: 4,
                  fontSize: 11,
                  color: C.green,
                  textAlign: 'center',
                }}
              >
                ✓ 合成完成
                {result.duration != null ? ` · 总时长 ${result.duration.toFixed(1)}s` : ''}
              </div>
            </>
          ) : (
            <Button
              variant="secondary"
              disabled
              style={{ width: '100%', marginTop: 12, padding: '10px', fontSize: 13, fontWeight: 700 }}
            >
              合成中…
            </Button>
          )}
        </div>
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
        status: group.shots.every((s) => s.img)
          ? 'ready'
          : group.shots.some((s) => s.status === 'generating')
            ? 'processing'
            : 'pending',
        thumbShot: group.shots[0],
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
