import React, { useState, useEffect } from 'react';
import { C } from '../constants';
import { useAppStore } from '../store/useAppStore';
import { useProjectStore } from '../store/useProjectStore';
import { loadModuleData, saveModuleData, generateModuleId } from '../data/storage';
import { Episode } from '../data/types';
import { getAIServiceForPurpose } from '../services';
import { parseScriptToEpisodes, countWords } from '../services/script-parser';
import { normalizeScript, extractCharacters } from '../services/script-format';

const colors = {
  ...C,
  amberBg: '#FFF3D0',
  blueBg: '#EFF4FF',
  input: '#F5F6F8',
  redBg: '#FEF2F2',
  red: '#DC2626',
};

interface Suggestion {
  text: string;
}

const DEFAULT_EPISODES: Episode[] = [
  {
    id: 's1', projectId: '', title: '第一幕', sceneNumber: 1,
    type: '内景', location: '咖啡馆', time: '白天',
    characters: ['陈诺', '林晓'], words: 312,
    content: `【第一幕·相遇】

场景：内景 / 咖啡馆 / 白天

陈诺推门走进咖啡馆，门铃发出清脆的声响。他环顾四周，在靠窗的位置看到了正在低头看书的林晓。

陈诺：（走近，微笑）请问这里有人吗？

林晓：（抬头，微微一愣）没有，请坐吧。

陈诺在她对面坐下，将公文包放在旁边的椅子上。阳光透过玻璃窗洒在桌面上，咖啡的香气弥漫在空气中。

林晓：（合上书，看向陈诺）你是...来面试的？

陈诺：算是吧。不过我更想说的是，好久不见。

林晓的手微微一顿，杯中的咖啡泛起涟漪。她抬起头，仔细打量着眼前这个西装革履的男人。

林晓：（声音有些颤抖）陈诺？真的是你？

陈诺：七年了，你一点都没变。

林晓：你倒是变了不少。（低头搅拌咖啡）当年不是说要出国深造吗，怎么回来了？

陈诺：有些事情，总需要一个了结。（停顿）林晓，我欠你一个解释。`,
  },
  {
    id: 's2', projectId: '', title: '第二幕', sceneNumber: 2,
    type: '外景', location: '公司门口', time: '傍晚',
    characters: ['陈诺', '秘书'], words: 248,
    content: '',
  },
  {
    id: 's3', projectId: '', title: '第三幕', sceneNumber: 3,
    type: '内景', location: '总裁办公室', time: '夜晚',
    characters: ['陈诺', '林晓', '董事长'], words: 445,
    content: '',
  },
  {
    id: 's4', projectId: '', title: '第四幕', sceneNumber: 4,
    type: '内景', location: '屋顶花园', time: '黄昏',
    characters: ['林晓'], words: 189,
    content: '',
  },
  {
    id: 's5', projectId: '', title: '第五幕', sceneNumber: 5,
    type: '外景', location: '停车场', time: '深夜',
    characters: ['陈诺', '反派A'], words: 376,
    content: '',
  },
];

const DEFAULT_SCRIPT = DEFAULT_EPISODES[0].content;

const SUGGESTIONS: Suggestion[] = [
  { text: '加强情感冲突' },
  { text: '缩短单句台词' },
  { text: '增加环境描写' },
];

const QUICK_ACTIONS = ['续写下一幕', '优化对白节奏', '增加冲突张力', '补充人物细节'];

const ScriptEditor: React.FC = () => {
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const project = useProjectStore((s) => s.projects.find((p) => p.id === activeProjectId));

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [scriptContent, setScriptContent] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string>('s1');
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [aiInput, setAiInput] = useState<string>('');
  const [hoveredSceneId, setHoveredSceneId] = useState<string | null>(null);
  const [newCharacterInput, setNewCharacterInput] = useState('');

  // 当 projectId 变化时重新加载数据
  useEffect(() => {
    if (!activeProjectId) return;
    const data = loadModuleData<Episode[]>(activeProjectId, 'episodes', DEFAULT_EPISODES);
    setEpisodes(data);
    // 加载剧本内容（从第一幕的内容）
    setScriptContent(data[0]?.content || DEFAULT_SCRIPT);
    setLoaded(true);
  }, [activeProjectId]);

  // 自动保存
  useEffect(() => {
    if (!activeProjectId || !loaded) return;
    saveModuleData(
      activeProjectId,
      'episodes',
      episodes.map((e) => ({ ...e, words: countWords(e.content) }))
    );
  }, [episodes, activeProjectId, loaded]);

  // 编辑器内容同步回当前幕（修复切换幕次/刷新丢内容的问题）
  useEffect(() => {
    if (!loaded || !selectedSceneId) return;
    setEpisodes((prev) =>
      prev.map((s) => (s.id === selectedSceneId ? { ...s, content: scriptContent } : s))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptContent]);

  const selectedScene = episodes.find((s) => s.id === selectedSceneId) || episodes[0];

  const handleSelectScene = (scene: Episode) => {
    setSelectedSceneId(scene.id);
    setScriptContent(scene.content);
  };

  /** 更新当前幕的属性（标题/类型/地点/时间/角色等） */
  const handleUpdateScene = (updates: Partial<Episode>) => {
    if (!selectedSceneId) return;
    setEpisodes((prev) => prev.map((s) => (s.id === selectedSceneId ? { ...s, ...updates } : s)));
  };

  /** 删除幕次（至少保留一幕） */
  const handleDeleteScene = (id: string) => {
    if (episodes.length <= 1) {
      alert('至少需要保留一个幕次');
      return;
    }
    if (!window.confirm('确定删除该幕次？正文将一并删除，无法恢复。')) return;
    const index = episodes.findIndex((s) => s.id === id);
    const next = episodes.filter((s) => s.id !== id);
    setEpisodes(next);
    const nextSelected = next[Math.min(index, next.length - 1)];
    setSelectedSceneId(nextSelected.id);
    setScriptContent(nextSelected.content);
  };

  /** 移动幕次并重排编号 */
  const handleMoveScene = (id: string, dir: -1 | 1) => {
    const index = episodes.findIndex((s) => s.id === id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= episodes.length) return;
    const reordered = [...episodes];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const renumbered = reordered.map((s, i) => ({ ...s, sceneNumber: i + 1, title: `第${i + 1}幕` }));
    setEpisodes(renumbered);
  };

  /** 本地格式化当前幕正文 */
  const handleFormat = () => {
    if (!scriptContent.trim()) return;
    setScriptContent((prev) => normalizeScript(prev));
  };

  /** 添加出场角色 */
  const handleAddCharacter = () => {
    const name = newCharacterInput.trim();
    if (!name) return;
    const current = selectedScene?.characters ?? [];
    if (current.includes(name)) {
      setNewCharacterInput('');
      return;
    }
    handleUpdateScene({ characters: [...current, name] });
    setNewCharacterInput('');
  };

  /** 移除出场角色 */
  const handleRemoveCharacter = (name: string) => {
    const current = selectedScene?.characters ?? [];
    handleUpdateScene({ characters: current.filter((c) => c !== name) });
  };

  /** 从正文台词自动提取角色并合并 */
  const handleExtractCharacters = () => {
    const extracted = extractCharacters(scriptContent);
    if (extracted.length === 0) {
      alert('未在正文中识别到台词角色');
      return;
    }
    const current = selectedScene?.characters ?? [];
    const merged = Array.from(new Set([...current, ...extracted]));
    handleUpdateScene({ characters: merged });
  };

  const handleAddScene = () => {
    const newId = generateModuleId('s');
    const newEpisode: Episode = {
      id: newId,
      projectId: activeProjectId || '',
      title: `第${episodes.length + 1}幕`,
      sceneNumber: episodes.length + 1,
      type: '内景',
      location: '待定',
      time: '白天',
      characters: [],
      words: 0,
      content: '',
    };
    setEpisodes([...episodes, newEpisode]);
    setSelectedSceneId(newId);
    setScriptContent('');
  };

  const totalWords = episodes.reduce((sum, s) => sum + countWords(s.content), 0);
  const targetWords = 2400;
  const progressPercent = Math.round((totalWords / targetWords) * 100);

  /** 将 AI 生成结果应用到编辑器/幕次 */
  const applyGeneratedScript = (result: string) => {
    const parsed = parseScriptToEpisodes(result, activeProjectId || '');
    if (parsed.length === 0) {
      // 无法解析：保留原文追加
      setScriptContent((prev) => (prev ? prev + '\n\n' + result : result));
      return;
    }
    if (parsed.length === 1 && !scriptContent.trim()) {
      // 单幕且当前幕为空：填充当前幕
      const p = parsed[0];
      setScriptContent(p.content);
      setEpisodes((prev) =>
        prev.map((s) =>
          s.id === selectedSceneId
            ? { ...s, content: p.content, type: p.type, location: p.location, time: p.time, characters: p.characters }
            : s
        )
      );
      return;
    }
    // 多幕或当前幕已有内容：解析结果作为新幕次追加
    setEpisodes((prev) => [...prev, ...parsed]);
    setSelectedSceneId(parsed[0].id);
    setScriptContent(parsed[0].content);
  };

  const handleAiGenerate = async () => {
    if (!aiInput.trim() || !selectedScene) return;
    setAiGenerating(true);
    try {
      const service = getAIServiceForPurpose('script');
      const result = await service.generateScript({
        prompt: aiInput,
        context: scriptContent,
        genre: project?.genre,
      });
      applyGeneratedScript(result);
      setAiInput('');
    } catch (error) {
      console.error('AI 生成失败:', error);
      alert(error instanceof Error ? error.message : 'AI 生成失败');
    } finally {
      setAiGenerating(false);
    }
  };

  const handlePolish = async () => {
    if (!scriptContent.trim()) return;
    if (import.meta.env.DEV) {
      console.log(`[DramaFlow AI] 开始润色，正文长度：${scriptContent.length}`);
    }
    setAiGenerating(true);
    try {
      const service = getAIServiceForPurpose('polish');
      const result = await service.polishScript(scriptContent);
      const parsed = parseScriptToEpisodes(result, activeProjectId || '');
      if (parsed.length === 1) {
        const p = parsed[0];
        setScriptContent(p.content);
        setEpisodes((prev) =>
          prev.map((s) =>
            s.id === selectedSceneId
              ? { ...s, content: p.content, type: p.type, location: p.location, time: p.time, characters: p.characters }
              : s
          )
        );
      } else if (parsed.length > 1) {
        // 润色返回整部：按幕号回填现有幕次
        const byNum = new Map(parsed.map((p) => [p.sceneNumber, p]));
        setEpisodes((prev) =>
          prev.map((s) => {
            const p = byNum.get(s.sceneNumber);
            return p
              ? { ...s, content: p.content, type: p.type, location: p.location, time: p.time, characters: p.characters }
              : s;
          })
        );
        const cur = parsed.find((p) => p.sceneNumber === selectedScene?.sceneNumber);
        if (cur) setScriptContent(cur.content);
      } else {
        setScriptContent(result);
      }
    } catch (error) {
      console.error('AI 润色失败:', error);
      alert(error instanceof Error ? error.message : 'AI 润色失败');
    } finally {
      setAiGenerating(false);
    }
  };

  /** 生成完整剧本：按项目题材 + 幕数，解析后替换全部幕次 */
  const handleGenerateFullScript = async () => {
    if (!selectedScene) return;
    setAiGenerating(true);
    try {
      const service = getAIServiceForPurpose('script');
      const result = await service.generateScript({
        prompt: `请创作一部完整的${project?.genre || '都市'}题材短剧剧本，包含开场冲突、剧情推进和高潮收尾`,
        genre: project?.genre,
        sceneCount: project?.scenes || episodes.length,
      });
      const parsed = parseScriptToEpisodes(result, activeProjectId || '');
      if (parsed.length === 0) {
        alert('生成结果无法解析为幕次，请重试或使用底部输入框生成。');
        return;
      }
      setEpisodes(parsed);
      setSelectedSceneId(parsed[0].id);
      setScriptContent(parsed[0].content);
    } catch (error) {
      console.error('整部生成失败:', error);
      alert(error instanceof Error ? error.message : '整部生成失败');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setAiInput(action);
  };

  if (!activeProjectId || !loaded) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bg,
          color: colors.textMute,
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        加载中...
      </div>
    );
  }

  if (!selectedScene) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bg,
          color: colors.textMute,
          fontSize: 13,
          gap: 10,
        }}
      >
        <div style={{ fontSize: 28 }}>📝</div>
        <div>还没有幕次，点击左侧「+ 幕」创建，或使用 AI 生成</div>
      </div>
    );
  }

  const tagStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    background: colors.tag,
    color: colors.tagText,
    padding: '2px 7px',
    borderRadius: 3,
    fontSize: 10,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 400,
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    textTransform: 'uppercase' as const,
    color: colors.textMute,
    fontSize: 10,
    letterSpacing: '0.08em',
    fontWeight: 500,
  };

  const propInputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: 11,
    color: colors.text,
    background: colors.input,
    border: `1px solid ${colors.border}`,
    borderRadius: 3,
    padding: '4px 6px',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
    marginTop: 3,
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        overflow: 'hidden',
        background: colors.bg,
      }}
    >
      {/* ========== LEFT PANEL - Scene List ========== */}
      <div
        style={{
          width: 210,
          minWidth: 210,
          height: '100%',
          background: colors.sidebar,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 12px 8px',
          }}
        >
          <span style={sectionLabelStyle}>幕次列表</span>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              background: colors.amber,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 10,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
            onClick={handleAddScene}
          >
            + 幕
          </button>
        </div>

        {/* Scene items */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
          {episodes.map((scene) => {
            const isSelected = scene.id === selectedSceneId;
            return (
              <div
                key={scene.id}
                onClick={() => handleSelectScene(scene)}
                onMouseEnter={() => setHoveredSceneId(scene.id)}
                onMouseLeave={() => setHoveredSceneId(null)}
                style={{
                  padding: '10px 10px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  marginBottom: 4,
                  background: isSelected ? colors.active : 'transparent',
                  borderLeft: isSelected
                    ? `2px solid ${colors.amber}`
                    : '2px solid transparent',
                  marginLeft: -4,
                  paddingLeft: isSelected ? 8 : 10,
                  transition: 'background 0.15s',
                }}
              >
                {/* Title row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? colors.amber : colors.text,
                      lineHeight: '18px',
                    }}
                  >
                    {scene.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: colors.textMute,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {scene.words}字
                  </span>
                  {hoveredSceneId === scene.id && (
                    <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveScene(scene.id, -1); }}
                        title="上移"
                        style={{ width: 16, height: 16, fontSize: 9, lineHeight: '16px', padding: 0, background: colors.tag, border: 'none', borderRadius: 3, color: colors.tagText, cursor: 'pointer' }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveScene(scene.id, 1); }}
                        title="下移"
                        style={{ width: 16, height: 16, fontSize: 9, lineHeight: '16px', padding: 0, background: colors.tag, border: 'none', borderRadius: 3, color: colors.tagText, cursor: 'pointer' }}
                      >
                        ↓
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteScene(scene.id); }}
                        title="删除幕次"
                        style={{ width: 16, height: 16, fontSize: 9, lineHeight: '16px', padding: 0, background: colors.redBg, border: 'none', borderRadius: 3, color: colors.red, cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>

                {/* Tags row */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <span style={{ ...tagStyle, background: colors.amberBg, color: colors.amber }}>
                    {scene.type}
                  </span>
                  <span style={tagStyle}>{scene.time}</span>
                </div>

                {/* Location */}
                <div
                  style={{
                    fontSize: 10,
                    color: colors.textSub,
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <span>📍</span>
                  <span>{scene.location}</span>
                </div>

                {/* Character tags */}
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {scene.characters.map((char) => (
                    <span
                      key={char}
                      style={{
                        ...tagStyle,
                        fontSize: 9,
                        padding: '1px 5px',
                        background: colors.tag,
                        color: colors.tagText,
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom stats */}
        <div
          style={{
            padding: '10px 12px',
            borderTop: `1px solid ${colors.border}`,
          }}
        >
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
                fontSize: 11,
                color: colors.textSub,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              总字数 {totalWords.toLocaleString()}
            </span>
            <span
              style={{
                fontSize: 10,
                color: colors.textMute,
              }}
            >
              目标 2,400字
            </span>
          </div>
          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: 4,
              background: colors.tag,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, progressPercent)}%`,
                height: '100%',
                background: colors.amber,
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div
            style={{
              fontSize: 9,
              color: colors.textMute,
              textAlign: 'right' as const,
              marginTop: 2,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {progressPercent}%
          </div>
        </div>
      </div>

      {/* ========== CENTER - Script Editor ========== */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: colors.sidebar,
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: `1px solid ${colors.border}`,
            minHeight: 44,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: colors.text,
              }}
            >
              {selectedScene.title}
            </span>
            <span style={{ ...tagStyle, background: colors.amberBg, color: colors.amber }}>
              {selectedScene.type}
            </span>
            <span style={tagStyle}>
              📍 {selectedScene.location}
            </span>
            <span style={tagStyle}>{selectedScene.time}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={handleGenerateFullScript}
              disabled={aiGenerating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: colors.amber,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 500,
                cursor: aiGenerating ? 'default' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                opacity: aiGenerating ? 0.7 : 1,
              }}
            >
              {aiGenerating ? '生成中…' : 'AI 生成整部'}
            </button>
            <button
              onClick={handleFormat}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: colors.tag,
                color: colors.text,
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              格式化
            </button>
            <button
              onClick={handlePolish}
              disabled={aiGenerating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: colors.blue,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 500,
                cursor: aiGenerating ? 'default' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                opacity: aiGenerating ? 0.7 : 1,
              }}
            >
              AI 润色
            </button>
          </div>
        </div>

        {/* Editor area */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {scriptContent.trim() ? (
            <textarea
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                background: '#FAFBFC',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                lineHeight: 2.1,
                color: colors.text,
                padding: '24px 36px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            />
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: '#FAFBFC',
                color: colors.textMute,
                fontSize: 12,
              }}
            >
              <div style={{ fontSize: 32 }}>✍️</div>
              <div>{selectedScene.title}还没有内容</div>
              <div style={{ fontSize: 11 }}>
                点击上方「AI 生成整部」一键创作，或在底部输入指令生成这一幕
              </div>
            </div>
          )}
        </div>

        {/* Bottom AI input bar */}
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            padding: '8px 12px',
            background: colors.sidebar,
          }}
        >
          {/* Quick suggestion buttons */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 8px',
                  background: colors.tag,
                  color: colors.tagText,
                  border: 'none',
                  borderRadius: 3,
                  fontSize: 10,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                {action}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="输入指令或直接 @AI 提问..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              style={{
                flex: 1,
                height: 32,
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                padding: '0 10px',
                fontSize: 12,
                background: colors.input,
                color: colors.text,
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            />
            <button
              onClick={handleAiGenerate}
              disabled={aiGenerating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 32,
                padding: '0 14px',
                background: colors.amber,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                cursor: aiGenerating ? 'default' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap',
                opacity: aiGenerating ? 0.7 : 1,
                minWidth: 70,
              }}
            >
              {aiGenerating ? '生成中…' : 'AI 生成'}
            </button>
          </div>
        </div>
      </div>

      {/* ========== RIGHT PANEL - Properties ========== */}
      <div
        style={{
          width: 192,
          minWidth: 192,
          height: '100%',
          background: colors.sidebar,
          borderLeft: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          padding: '12px',
        }}
      >
        {/* Scene properties */}
        <div style={{ marginBottom: 12 }}>
          <span style={{ ...sectionLabelStyle, display: 'block', marginBottom: 8 }}>
            场景属性
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <div style={{ fontSize: 10, color: colors.textMute, marginBottom: 3 }}>幕次标题</div>
              <input
                value={selectedScene.title}
                onChange={(e) => handleUpdateScene({ title: e.target.value })}
                style={propInputStyle}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: colors.textMute }}>类型</span>
              <select
                value={selectedScene.type}
                onChange={(e) => handleUpdateScene({ type: e.target.value })}
                style={{
                  fontSize: 11,
                  color: colors.text,
                  background: colors.input,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 3,
                  padding: '2px 4px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="内景">内景</option>
                <option value="外景">外景</option>
              </select>
            </div>
            <div>
              <span style={{ fontSize: 11, color: colors.textMute }}>地点</span>
              <input
                value={selectedScene.location}
                onChange={(e) => handleUpdateScene({ location: e.target.value })}
                placeholder="如：咖啡馆"
                style={propInputStyle}
              />
            </div>
            <div>
              <span style={{ fontSize: 11, color: colors.textMute }}>时间段</span>
              <select
                value={selectedScene.time}
                onChange={(e) => handleUpdateScene({ time: e.target.value })}
                style={{ ...propInputStyle, cursor: 'pointer' }}
              >
                {['清晨', '白天', '傍晚', '黄昏', '夜晚', '深夜'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: colors.textMute }}>本幕字数</span>
              <span
                style={{
                  fontSize: 11,
                  color: colors.text,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {countWords(scriptContent)}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '100%',
            height: 1,
            background: colors.border,
            marginBottom: 12,
          }}
        />

        {/* Characters */}
        <div style={{ marginBottom: 12 }}>
          <span
            style={{ ...sectionLabelStyle, display: 'block', marginBottom: 8 }}
          >
            出场角色
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selectedScene.characters.map((char, index) => (
              <div
                key={char}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: index === 0 ? colors.amber : colors.tag,
                    color: index === 0 ? '#FFFFFF' : colors.tagText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {char[0]}
                </div>
                <span style={{ fontSize: 11, color: colors.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{char}</span>
                <button
                  onClick={() => handleRemoveCharacter(char)}
                  title={`移除 ${char}`}
                  style={{ width: 16, height: 16, fontSize: 10, lineHeight: '16px', padding: 0, background: colors.tag, border: 'none', borderRadius: 3, color: colors.tagText, cursor: 'pointer', flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
            {selectedScene.characters.length === 0 && (
              <div style={{ fontSize: 10, color: colors.textMute }}>暂无角色</div>
            )}
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={newCharacterInput}
                onChange={(e) => setNewCharacterInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCharacter(); }}
                placeholder="添加角色"
                style={{ ...propInputStyle, flex: 1 }}
              />
              <button
                onClick={handleAddCharacter}
                style={{ padding: '0 8px', background: colors.amber, border: 'none', borderRadius: 3, color: '#fff', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
              >
                +
              </button>
            </div>
            <button
              onClick={handleExtractCharacters}
              style={{ padding: '4px 8px', background: colors.blueBg, border: `1px solid ${colors.blueBg}`, borderRadius: 3, color: colors.blue, fontSize: 10, cursor: 'pointer' }}
            >
              从正文提取角色
            </button>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '100%',
            height: 1,
            background: colors.border,
            marginBottom: 12,
          }}
        />

        {/* AI suggestions */}
        <div>
          <span
            style={{ ...sectionLabelStyle, display: 'block', marginBottom: 8 }}
          >
            AI 建议
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SUGGESTIONS.map((suggestion) => (
              <div
                key={suggestion.text}
                onClick={() => setAiInput(suggestion.text)}
                style={{
                  padding: '8px 10px',
                  background: colors.blueBg,
                  border: `1px solid ${colors.blueBg}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 12, flexShrink: 0, lineHeight: '16px' }}>
                  💡
                </span>
                <span style={{ fontSize: 11, color: colors.text, lineHeight: '16px' }}>
                  {suggestion.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptEditor;
