import React, { useState, useEffect } from 'react';
import { C } from '../constants';
import { Button, Tag } from './common';
import { useAppStore } from '../store/useAppStore';
import { useProjectStore } from '../store/useProjectStore';
import { loadModuleData, saveModuleData, saveProjectFile, loadProjectFile } from '../data/storage';
import { Episode, Shot } from '../data/types';
import { getAIServiceForPurpose } from '../services';
import { parseShotsToShots, parseShotLines } from '../services/shot-parser';

const DEFAULT_SHOTS: Shot[] = [
  {
    id: '#001', projectId: '', scene: 1, type: '全景', angle: '平视',
    duration: '3.5s', desc: '咖啡馆全景，阳光透过玻璃，林晓端着咖啡走向镜头', status: 'done', img: '',
  },
  {
    id: '#002', projectId: '', scene: 1, type: '中景', angle: '微俯',
    duration: '2.0s', desc: '林晓脚下绊倒，咖啡杯失手飞出，慢动作特效', status: 'done', img: '',
  },
  {
    id: '#003', projectId: '', scene: 1, type: '特写', angle: '平视',
    duration: '1.5s', desc: '咖啡泼洒瞬间，溅射到西装上', status: 'done', img: '',
  },
  {
    id: '#004', projectId: '', scene: 1, type: '中近景', angle: '平视',
    duration: '4.0s', desc: '陈诺转身，表情从冷淡转为意外，望向林晓', status: 'generating', img: '',
  },
  {
    id: '#005', projectId: '', scene: 1, type: '双人景', angle: '平视',
    duration: '5.5s', desc: '两人对视，林晓慌乱道歉，陈诺平静回应', status: 'pending', img: '',
  },
  {
    id: '#006', projectId: '', scene: 2, type: '特写', angle: '仰视',
    duration: '2.0s', desc: '工牌特写：都市集团 CEO 陈诺，林晓瞳孔震惊', status: 'pending', img: '',
  },
  {
    id: '#007', projectId: '', scene: 2, type: '全景', angle: '航拍',
    duration: '3.0s', desc: '公司门口傍晚，人群散去，陈诺的车停在路边', status: 'pending', img: '',
  },
  {
    id: '#008', projectId: '', scene: 2, type: '中景', angle: '平视',
    duration: '4.5s', desc: '陈诺看到林晓加班后匆忙跑出，拦住她', status: 'pending', img: '',
  },
];

const STATUS_LABEL: Record<string, string> = {
  done: '已完成',
  generating: '生成中',
  pending: '待处理',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  done: { bg: C.greenBg, text: C.green },
  generating: { bg: '#FFF3D0', text: C.amber },
  pending: { bg: C.tag, text: C.tagText },
};

type ViewMode = 'grid' | 'list';
const PAGE_SIZE = 12;

/** 分镜缩略图：从 IndexedDB 加载图片（db:// 引用）或直接显示 dataURL/URL */
const ShotThumbnail: React.FC<{ shot: Shot }> = ({ shot }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setImgUrl(null);
    if (!shot.img) return;
    if (shot.img.startsWith('db://')) {
      setLoading(true);
      loadProjectFile(shot.projectId, shot.img.slice(5))
        .then((blob) => {
          if (alive && blob) setImgUrl(URL.createObjectURL(blob));
        })
        .catch(() => {})
        .finally(() => {
          if (alive) setLoading(false);
        });
    } else {
      setImgUrl(shot.img);
    }
    return () => {
      alive = false;
    };
  }, [shot.img, shot.projectId]);

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={shot.desc}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
        }}
      />
    );
  }
  if (loading) {
    return <div style={{ fontSize: 10, color: C.textMute }}>图片生成中…</div>;
  }
  return null;
};

/** 后台批量生成分镜图（并发 2），不阻塞描述生成主流程 */
async function generateImagesInBackground(
  projectId: string,
  shots: Shot[],
  onImage: (shotId: string, img: string) => void
): Promise<void> {
  const limit = 2;
  let index = 0;
  async function worker(): Promise<void> {
    while (index < shots.length) {
      const i = index++;
      const shot = shots[i];
      try {
        const service = getAIServiceForPurpose('image');
        const dataUrl = await service.generateImage({ prompt: shot.desc, size: '1024x1024' });
        const blob = await (await fetch(dataUrl)).blob();
        await saveProjectFile(projectId, shot.id, blob);
        onImage(shot.id, `db://${shot.id}`);
      } catch {
        // 无图像模型或生成失败：跳过，不影响分镜描述
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, shots.length) }, () => worker()));
}

const Storyboard: React.FC = () => {
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const { projects, updateProject } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const [shots, setShots] = useState<Shot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [editDescriptions, setEditDescriptions] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [aiGeneratingAll, setAiGeneratingAll] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [lastGenerateMessage, setLastGenerateMessage] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // 已写好剧本的幕数（联动分镜生成的可用素材）
  const scriptReadyCount = episodes.filter((e) => e.content.trim()).length;
  const visibleShots = shots.slice(0, visibleCount);
  const hasMore = visibleCount < shots.length;

  // 底部哨兵：内容不满一屏时自动继续加载，滚动到底时触发下一页
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(shots.length, c + PAGE_SIZE));
        }
      },
      { rootMargin: '0px 0px 160px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, shots.length, viewMode]);

  const handleGenerateShot = async (shotId: string) => {
    const shot = shots.find((s) => s.id === shotId);
    if (!shot) return;
    setGeneratingId(shotId);
    try {
      const service = getAIServiceForPurpose('storyboard');
      const result = await service.generateShots({
        scriptContent: shot.desc,
        scene: `场景 ${shot.scene}`,
        style: `${shot.type} / ${shot.angle}`,
      });
      const parsed = parseShotLines(result.join('\n'));
      const newDesc = parsed[0]?.desc || result[0] || shot.desc;
      setShots((prev) =>
        prev.map((s) => (s.id === shotId ? { ...s, desc: newDesc, status: 'done' } : s))
      );
    } catch (error) {
      console.error('分镜生成失败:', error);
      alert(error instanceof Error ? error.message : '分镜生成失败');
    } finally {
      setGeneratingId(null);
    }
  };

  /** AI 生成全部：逐幕读取剧本内容批量生成镜头，替换该幕现有镜头 */
  const handleGenerateAll = async () => {
    if (aiGeneratingAll) return;
    setAiGeneratingAll(true);
    setLastGenerateMessage(null);
    try {
      const grouped = new Map<number, Shot[]>();
      for (const s of shots) {
        if (!grouped.has(s.scene)) grouped.set(s.scene, []);
        grouped.get(s.scene)!.push(s);
      }
      // 场景列表从剧本（有内容的幕）推导，新项目没有镜头也能批量生成
      const scenes = episodes
        .filter((e) => e.content.trim())
        .map((e) => e.sceneNumber)
        .sort((a, b) => a - b);
      const skipped: number[] = [];
      let generated = 0;
      for (const scene of scenes) {
        const sceneShots = grouped.get(scene) || [];
        const episode = episodes.find((e) => e.sceneNumber === scene);
        // 剧本为空则跳过，避免用旧镜头描述硬生成
        if (!episode?.content?.trim()) {
          skipped.push(scene);
          continue;
        }
        // 标记整幕生成中
        setShots((prev) => prev.map((s) => (s.scene === scene ? { ...s, status: 'generating' as const } : s)));
        const words = episode.content.replace(/\s/g, '').length;
        const targetCount = Math.max(3, Math.min(12, Math.round(words / 70)));
        try {
          const service = getAIServiceForPurpose('storyboard');
          const result = await service.generateShots({
            scriptContent: episode.content,
            scene: `第${scene}幕`,
            sceneCount: targetCount,
          });
          const parsed = parseShotsToShots(result.join('\n'), activeProjectId || '', scene);
          if (parsed.length > 0) {
            generated += 1;
            setShots((prev) => {
              const sceneIds = new Set(sceneShots.map((s) => s.id));
              return [...prev.filter((s) => !sceneIds.has(s.id)), ...parsed];
            });
            // 后台生成分镜图（真实文生图或模拟占位图），完成后逐个回填
            void generateImagesInBackground(activeProjectId || '', parsed, (shotId, img) => {
              setShots((prev) => prev.map((s) => (s.id === shotId ? { ...s, img } : s)));
            });
          } else {
            setShots((prev) => prev.map((s) => (s.scene === scene ? { ...s, status: 'pending' as const } : s)));
          }
        } catch (error) {
          console.error('分镜批量生成失败:', error);
          alert(error instanceof Error ? error.message : '分镜生成失败');
          setShots((prev) => prev.map((s) => (s.scene === scene ? { ...s, status: 'pending' as const } : s)));
        }
      }
      // 回写项目进度（剧本已 100 时，分镜按生成幕数占比）
      if (activeProjectId && project && generated > 0) {
        const totalWithScript = scenes.length - skipped.length;
        const storyboardPct = totalWithScript > 0 ? Math.round((generated / totalWithScript) * 100) : 0;
        updateProject(activeProjectId, {
          progress: {
            script: project.progress?.script ?? 0,
            storyboard: storyboardPct,
            characters: project.progress?.characters ?? 0,
            dubbing: project.progress?.dubbing ?? 0,
            synthesis: project.progress?.synthesis ?? 0,
          },
        });
      }
      const msgParts: string[] = [];
      if (generated > 0) msgParts.push(`已生成 ${generated} 幕分镜`);
      if (skipped.length > 0) msgParts.push(`第 ${skipped.join('、')} 幕剧本为空，已跳过`);
      if (msgParts.length) setLastGenerateMessage(msgParts.join('；'));
      setVisibleCount(PAGE_SIZE);
    } finally {
      setAiGeneratingAll(false);
    }
  };

  /** 滚动到底部自动加载下一页 */
  const handleScrollLoad = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (import.meta.env.DEV) {
      console.log('[分页调试] 滚动触发', {
        scrollTop: Math.round(el.scrollTop),
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        visibleCount,
        total: shots.length,
      });
    }
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      setVisibleCount((c) => Math.min(shots.length, c + PAGE_SIZE));
    }
  };

  const renderLoadStatus = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 16px',
        borderTop: `1px solid ${C.border}`,
        background: C.sidebar,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 11, color: C.textMute }}>
        {hasMore
          ? `已加载 ${visibleShots.length} / ${shots.length} 个镜头，滚动到底部加载更多`
          : `已全部加载（${shots.length} 个镜头）`}
      </span>
    </div>
  );

  useEffect(() => {
    if (!activeProjectId) return;
    const data = loadModuleData<Shot[]>(activeProjectId, 'shots', DEFAULT_SHOTS);
    const epData = loadModuleData<Episode[]>(activeProjectId, 'episodes', []);
    setShots(data);
    setEpisodes(epData);
    setLoaded(true);
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId || !loaded) return;
    saveModuleData(activeProjectId, 'shots', shots);
  }, [shots, activeProjectId, loaded]);

  if (!activeProjectId || !loaded) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.bg,
          color: C.textMute,
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        加载中...
      </div>
    );
  }

  const selectedShot = shots.find((s) => s.id === selectedShotId) || null;

  const handleSelectShot = (id: string) => {
    setSelectedShotId((prev) => (prev === id ? null : id));
  };

  const handleDescriptionChange = (shotId: string, value: string) => {
    setEditDescriptions((prev) => ({ ...prev, [shotId]: value }));
  };

  const getDescription = (shot: Shot) => {
    return editDescriptions[shot.id] ?? shot.desc;
  };

  const GridIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="0.5" y="0.5" width="5" height="5" rx="1" stroke="currentColor" />
      <rect x="8.5" y="0.5" width="5" height="5" rx="1" stroke="currentColor" />
      <rect x="0.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" />
      <rect x="8.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" />
    </svg>
  );

  const ListIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="0.5" y="0.5" width="13" height="3" rx="1" stroke="currentColor" />
      <rect x="0.5" y="5.5" width="13" height="3" rx="1" stroke="currentColor" />
      <rect x="0.5" y="10.5" width="13" height="3" rx="1" stroke="currentColor" />
    </svg>
  );

  const renderThumbnail = (shot: Shot, size: 'card' | 'list' | 'detail') => {
    const isList = size === 'list';
    const isDetail = size === 'detail';
    const width = isList ? 80 : isDetail ? '100%' : '100%';
    const height = isList ? 45 : isDetail ? undefined : undefined;
    const aspectRatio = isDetail ? '16 / 9' : isList ? undefined : '16 / 9';

    const bgColor =
      shot.status === 'done'
        ? '#E8F4E8'
        : shot.status === 'generating'
          ? '#FFF8EC'
          : C.tag;

    return (
      <div
        style={{
          width,
          height,
          aspectRatio,
          background: bgColor,
          borderRadius: isList ? 3 : 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {shot.status === 'generating' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              border: '2px solid transparent',
              borderTopColor: C.amber,
              borderRightColor: C.amber,
              animation: 'storyboard-spin 1s linear infinite',
            }}
          />
        )}
        {shot.status === 'done' && shot.img ? (
          <ShotThumbnail shot={shot} />
        ) : shot.status === 'done' ? (
          <div
            style={{
              width: isList ? 20 : 28,
              height: isList ? 20 : 28,
              borderRadius: '50%',
              background: C.greenBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width={isList ? 10 : 14} height={isList ? 10 : 14} viewBox="0 0 14 14" fill="none">
              <path
                d="M2.9165 7.58333L5.83317 10.5L11.6665 3.5"
                stroke={C.green}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : null}
        {shot.status === 'pending' && !isList && (
          <div
            style={{
              fontSize: 11,
              color: C.textMute,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            等待生成
          </div>
        )}
      </div>
    );
  };

  const renderStatusLabel = (status: string) => {
    const colors = STATUS_COLOR[status] || STATUS_COLOR.pending;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '1px 6px',
          borderRadius: 3,
          fontSize: 10,
          fontWeight: 500,
          fontFamily: 'Inter, sans-serif',
          background: colors.bg,
          color: colors.text,
        }}
      >
        {STATUS_LABEL[status] || '待处理'}
      </span>
    );
  };

  const renderGridView = () => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 16,
          minHeight: 0,
        }}
        onScroll={handleScrollLoad}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 12,
            alignContent: 'start',
          }}
        >
      {visibleShots.map((shot) => {
        const isSelected = selectedShotId === shot.id;
        return (
          <div
            key={shot.id}
            onClick={() => handleSelectShot(shot.id)}
            style={{
              background: C.sidebar,
              borderRadius: 6,
              border: `1px solid ${isSelected ? C.amber : C.border}`,
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              boxShadow: isSelected ? '0 0 0 2px rgba(230,149,0,0.2)' : 'none',
            }}
          >
            {renderThumbnail(shot, 'card')}
            <div style={{ padding: '10px 12px 12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {shot.id}
                </span>
                {renderStatusLabel(shot.status)}
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                <Tag>第 {shot.scene} 幕</Tag>
                <Tag>{shot.type}</Tag>
                <Tag>{shot.angle}</Tag>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.textSub,
                  fontFamily: 'Inter, sans-serif',
                  lineHeight: '18px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: 6,
                }}
              >
                {getDescription(shot)}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: C.textMute,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {shot.duration}
                </span>
                {(shot.status === 'pending' || shot.status === 'generating') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleGenerateShot(shot.id);
                    }}
                    disabled={generatingId === shot.id}
                  >
                    {generatingId === shot.id ? '生成中…' : '生成分镜'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
        </div>
        <div ref={hasMore ? sentinelRef : undefined} style={{ height: 1 }} />
      </div>
      {renderLoadStatus()}
    </div>
  );

  const renderListView = () => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          minHeight: 0,
        }}
        onScroll={handleScrollLoad}
      >
      {visibleShots.map((shot) => {
        const isSelected = selectedShotId === shot.id;
        return (
          <div
            key={shot.id}
            onClick={() => handleSelectShot(shot.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              background: isSelected ? C.active : C.sidebar,
              borderRadius: 4,
              border: `1px solid ${isSelected ? C.amber : 'transparent'}`,
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            {renderThumbnail(shot, 'list')}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {shot.id}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: C.amber,
                    background: C.amberLight,
                    padding: '1px 6px',
                    borderRadius: 3,
                    fontWeight: 500,
                  }}
                >
                  第 {shot.scene} 幕
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: C.textSub,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {shot.type}
                </span>
                <Tag>{shot.angle}</Tag>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.textSub,
                  fontFamily: 'Inter, sans-serif',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {getDescription(shot)}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {renderStatusLabel(shot.status)}
              <span
                style={{
                  fontSize: 11,
                  color: C.textMute,
                  fontFamily: 'Inter, sans-serif',
                  width: 32,
                  textAlign: 'right',
                }}
              >
                {shot.duration}
              </span>
              {(shot.status === 'pending' || shot.status === 'generating') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleGenerateShot(shot.id);
                  }}
                  disabled={generatingId === shot.id}
                >
                  {generatingId === shot.id ? '生成中…' : '生成分镜'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
      <div ref={hasMore ? sentinelRef : undefined} style={{ height: 1 }} />
      </div>
      {renderLoadStatus()}
    </div>
  );

  const renderDetailPanel = () => {
    if (!selectedShot) return null;
    return (
      <div
        style={{
          width: 256,
          flexShrink: 0,
          background: C.sidebar,
          borderLeft: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            padding: '16px 16px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: C.text,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {selectedShot.id}
            </span>
            <span
              style={{
                fontSize: 13,
                color: C.textSub,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {selectedShot.type}
            </span>
          </div>
          <button
            onClick={() => setSelectedShotId(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              color: C.textMute,
              display: 'flex',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
            {renderThumbnail(selectedShot, 'detail')}
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
              }}
            >
              {renderStatusLabel(selectedShot.status)}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '0 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                fontSize: 11,
                color: C.textMute,
                fontFamily: 'Inter, sans-serif',
                width: 60,
                flexShrink: 0,
              }}
            >
              镜头类型
            </span>
            <span
              style={{
                fontSize: 12,
                color: C.text,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {selectedShot.type}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                fontSize: 11,
                color: C.textMute,
                fontFamily: 'Inter, sans-serif',
                width: 60,
                flexShrink: 0,
              }}
            >
              拍摄角度
            </span>
            <span
              style={{
                fontSize: 12,
                color: C.text,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {selectedShot.angle}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                fontSize: 11,
                color: C.textMute,
                fontFamily: 'Inter, sans-serif',
                width: 60,
                flexShrink: 0,
              }}
            >
              时长
            </span>
            <span
              style={{
                fontSize: 12,
                color: C.text,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {selectedShot.duration}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                fontSize: 11,
                color: C.textMute,
                fontFamily: 'Inter, sans-serif',
                width: 60,
                flexShrink: 0,
              }}
            >
              所属场景
            </span>
            <span
              style={{
                fontSize: 12,
                color: C.text,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              第{selectedShot.scene}场
            </span>
          </div>
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              fontSize: 11,
              color: C.textMute,
              fontFamily: 'Inter, sans-serif',
              marginBottom: 6,
            }}
          >
            描述
          </div>
          <textarea
            value={getDescription(selectedShot)}
            onChange={(e) => handleDescriptionChange(selectedShot.id, e.target.value)}
            style={{
              width: '100%',
              minHeight: 80,
              resize: 'vertical',
              background: C.inputBg,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: '8px 10px',
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              color: C.text,
              lineHeight: '18px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 10 }}>
            <Button
              variant="secondary"
              style={{ width: '100%' }}
              onClick={() => selectedShot && handleGenerateShot(selectedShot.id)}
              disabled={!selectedShot || generatingId === selectedShot?.id}
            >
              {generatingId === selectedShot?.id ? '生成中…' : '重新生成'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: C.bg,
        height: '100%',
      }}
    >
      <style>{`
        @keyframes storyboard-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* 剧本联动信息条 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 16px',
          borderBottom: `1px solid ${C.border}`,
          background: C.sidebar,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 12, color: C.textSub, fontWeight: 500 }}>📜 剧本联动</span>
        <span style={{ fontSize: 11, color: scriptReadyCount > 0 ? C.green : C.textMute }}>
          {episodes.length} 幕中 {scriptReadyCount} 幕已写好剧本
        </span>
        {scriptReadyCount < episodes.length && (
          <span style={{ fontSize: 11, color: C.amber }}>
            还有 {episodes.length - scriptReadyCount} 幕未写，生成时自动跳过
          </span>
        )}
        {lastGenerateMessage && (
          <span style={{ fontSize: 11, color: C.blue, marginLeft: 'auto' }}>{lastGenerateMessage}</span>
        )}
      </div>

      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: `1px solid ${C.border}`,
          background: C.sidebar,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: C.text,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          共 {shots.length} 个镜头
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              background: C.tag,
              borderRadius: 4,
              padding: 2,
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 26,
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                background: viewMode === 'grid' ? C.sidebar : 'transparent',
                color: viewMode === 'grid' ? C.text : C.textMute,
                transition: 'all 0.15s',
              }}
            >
              <GridIcon />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 26,
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                background: viewMode === 'list' ? C.sidebar : 'transparent',
                color: viewMode === 'list' ? C.text : C.textMute,
                transition: 'all 0.15s',
              }}
            >
              <ListIcon />
            </button>
          </div>

          <Button
            variant="primary"
            onClick={handleGenerateAll}
            disabled={aiGeneratingAll || scriptReadyCount === 0}
          >
            {aiGeneratingAll ? '生成中…' : 'AI 生成全部'}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {viewMode === 'grid' ? renderGridView() : renderListView()}
        </div>
        {renderDetailPanel()}
      </div>
    </div>
  );
};

export default Storyboard;
