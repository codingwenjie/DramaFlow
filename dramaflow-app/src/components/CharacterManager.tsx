import React, { useState, useEffect, useMemo } from 'react';
import { C } from '../constants';
import { Button, SectionLabel, Divider } from './common';
import MarkdownView from './MarkdownView';
import { useAppStore } from '../store/useAppStore';
import { useProjectStore } from '../store/useProjectStore';
import { loadModuleData, saveModuleData, saveProjectFile, loadProjectFile, deleteProjectFile, generateId } from '../data/storage';
import { Character, Episode } from '../data/types';
import { getAIServiceForPurpose, getAIServiceForModel } from '../services';
import { dataURLToBlob } from '../services/ai-http';
import { getImageModelForProject } from '../services/ai-models';
import { syncCharactersFromScript } from '../services/character-sync';

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

const ROLE_COLORS = ['#2563EB', '#E69500', '#16A34A', '#7C3AED', '#DB2777', '#0891B2'];

/** 全局精选音色库（带性别与描述，参照 Figma 声音库设计） */
const VOICE_LIBRARY: { name: string; gender: '男' | '女' | '通用'; desc: string }[] = [
  { name: '男声-沉稳磁性', gender: '男', desc: '低频醇厚，适合霸总、成熟男性角色' },
  { name: '男声-温柔青年', gender: '男', desc: '明亮活力，适合青春、热血男性角色' },
  { name: '男声-冷峻总裁', gender: '男', desc: '冷静疏离，适合高冷精英类角色' },
  { name: '男声-阳光活力', gender: '男', desc: '阳光开朗，适合热血青年类角色' },
  { name: '男声-威严长者', gender: '男', desc: '沉稳威严，适合权威长者类角色' },
  { name: '男声-慈祥老人', gender: '男', desc: '温和慈祥，适合长辈类角色' },
  { name: '男声-低沉中年', gender: '男', desc: '浑厚稳重，适合中年男性角色' },
  { name: '女声-清甜自然', gender: '女', desc: '清甜自然，适合元气少女类角色' },
  { name: '女声-温柔知性', gender: '女', desc: '温柔知性，适合知性女性类角色' },
  { name: '女声-活泼元气', gender: '女', desc: '活泼明亮，适合青春活力类角色' },
  { name: '女声-成熟御姐', gender: '女', desc: '成熟从容，适合强势女性类角色' },
  { name: '女声-高冷御姐', gender: '女', desc: '清冷疏离，适合高冷女性类角色' },
  { name: '女声-甜美少女', gender: '女', desc: '甜美娇气，适合少女类角色' },
  { name: '旁白-沉稳男声', gender: '通用', desc: '醇厚大气，适合旁白解说' },
  { name: '旁白-知性女声', gender: '通用', desc: '知性温润，适合旁白解说' },
];

function voiceDesc(name: string): string {
  return VOICE_LIBRARY.find((v) => v.name === name)?.desc ?? '自定义声音';
}

/** 按剧本内容统计每个角色的出场幕数与台词数 */
function computeCharacterStats(
  characters: Character[],
  episodes: Episode[]
): Record<string, { scenes: number; lines: number }> {
  const stats: Record<string, { scenes: number; lines: number }> = {};
  for (const ch of characters) stats[ch.id] = { scenes: 0, lines: 0 };
  for (const ep of episodes) {
    const seen = new Set<string>();
    for (const ch of characters) {
      if (ep.characters?.includes(ch.name)) seen.add(ch.id);
    }
    for (const line of ep.content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      for (const ch of characters) {
        if (
          trimmed.startsWith(`${ch.name}：`) ||
          trimmed.startsWith(`${ch.name}:`) ||
          trimmed.startsWith(`${ch.name}（`)
        ) {
          stats[ch.id].lines += 1;
          seen.add(ch.id);
          break;
        }
      }
    }
    for (const id of seen) stats[id].scenes += 1;
  }
  return stats;
}

/**
 * 按剧本正文统计每个角色的台词类型分布（对话/独白/旁白）。
 * - 对话：普通台词行（角色名：台词）
 * - 独白：台词或情绪标注中包含 内心/独白/心理 的行
 * - 旁白：旁白/画外音/OS 行中提到该角色名字的
 */
function computeLineDistribution(
  characters: Character[],
  episodes: Episode[]
): Record<string, { dialog: number; monologue: number; aside: number }> {
  const counts: Record<string, { dialog: number; monologue: number; aside: number }> = {};
  for (const ch of characters) counts[ch.id] = { dialog: 0, monologue: 0, aside: 0 };

  const asideSpeakers = /^(旁白|字幕|画外音|OS|V\.O|备注|转场)/i;
  const monologueMark = /(内心|独白|心理活动|OS)/;

  for (const ep of episodes) {
    for (const raw of ep.content.split('\n')) {
      const line = raw.trim();
      const m = line.match(/^([^：:]{1,8})[：:]\s*(.+)$/);
      if (!m) continue;
      const name = m[1].trim();
      if (!name || name.length > 8) continue;
      if (/^[【\[]/.test(name)) continue;
      if (/^[\d.、\-—]+$/.test(name)) continue;

      const text = m[2].trim();
      if (!text) continue;

      // 旁白/画外音行：提到谁的名字就算谁的旁白
      if (asideSpeakers.test(name)) {
        for (const ch of characters) {
          if (text.includes(ch.name)) counts[ch.id].aside += 1;
        }
        continue;
      }

      const char = characters.find((c) => c.name === name);
      if (!char) continue;
      if (monologueMark.test(text)) {
        counts[char.id].monologue += 1;
      } else {
        counts[char.id].dialog += 1;
      }
    }
  }
  return counts;
}

/** 根据角色档案生成形象提示词 */
function buildAvatarPrompt(ch: Character, style: string): string {
  const p = ch.profile;
  return (
    `为短剧角色「${ch.name}」生成一张人物设定头像，定位：${ch.role}，` +
    `${p.age}岁${p.gender}，职业：${p.occupation || '未知'}，性格：${p.personality || '未设定'}。` +
    `风格：${style}，影视级人物设定图，半身像，纯色背景，表情与气质符合人物设定。`
  );
}

/** 角色参考表（宫格图）提示词：2 行 × 3 列，多角度/表情/全身 */
function buildGridPrompt(ch: Character, style: string): string {
  const p = ch.profile;
  return (
    `为短剧角色「${ch.name}」生成一张 2 行 3 列共 6 格的角色参考表，定位：${ch.role}，` +
    `${p.age}岁${p.gender}，职业：${p.occupation || '未知'}，性格：${p.personality || '未设定'}。\n` +
    `6 格内容依次为：正面半身、侧面、背面、表情特写（开心）、表情特写（愤怒）、全身站姿。\n` +
    `要求：6 格清晰分隔、互不合并、人物形象完全一致；风格：${style}，影视级角色设定图，无文字无水印。`
  );
}

/** 把宫格图按 rows×cols 切分，返回每格 Blob（JPEG） */
async function splitGridImage(dataUrl: string, cols: number, rows: number): Promise<Blob[]> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('宫格图加载失败'));
    el.src = dataUrl;
  });
  const cellW = Math.floor(img.width / cols);
  const cellH = Math.floor(img.height / rows);
  const canvas = document.createElement('canvas');
  canvas.width = cellW;
  canvas.height = cellH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 不可用');
  const blobs: Blob[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.clearRect(0, 0, cellW, cellH);
      ctx.drawImage(img, c * cellW, r * cellH, cellW, cellH, 0, 0, cellW, cellH);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (blob) blobs.push(blob);
    }
  }
  return blobs;
}

/** 角色头像：从 IndexedDB 加载 db:// 引用，无图时显示首字圆形 */
const CharacterAvatar: React.FC<{ character: Character; size: number; fontSize?: number; radius?: number }> = ({
  character,
  size,
  fontSize = 13,
  radius,
}) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setImgUrl(null);
    if (!character.avatarUrl) return;
    if (character.avatarUrl.startsWith('db://')) {
      loadProjectFile(character.projectId, character.avatarUrl.slice(5))
        .then((blob) => {
          if (alive && blob) setImgUrl(URL.createObjectURL(blob));
        })
        .catch(() => {});
    } else {
      setImgUrl(character.avatarUrl);
    }
    return () => {
      alive = false;
    };
  }, [character.avatarUrl, character.projectId]);

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={character.name}
        style={{
          width: size,
          height: size,
          borderRadius: radius ?? '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? '50%',
        background: character.color,
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        flexShrink: 0,
      }}
    >
      {character.name[0]}
    </div>
  );
};

/** 参考图格子：从 IndexedDB 加载 db:// 引用 */
const RefCell: React.FC<{ ref: string; projectId: string; onClick?: () => void }> = ({ ref, projectId, onClick }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setImgUrl(null);
    if (ref.startsWith('db://')) {
      loadProjectFile(projectId, ref.slice(5))
        .then((blob) => {
          if (alive && blob) setImgUrl(URL.createObjectURL(blob));
        })
        .catch(() => {});
    } else {
      setImgUrl(ref);
    }
    return () => {
      alive = false;
    };
  }, [ref, projectId]);
  return (
    <div
      onClick={onClick}
      style={{
        aspectRatio: '1/1',
        background: C.tag,
        borderRadius: 4,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {imgUrl ? (
        <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <span style={{ fontSize: 16, color: C.textMute }}>◫</span>
      )}
    </div>
  );
};

const CharacterManager: React.FC = () => {
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const { projects } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('c1');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('profile');
  const [selectedVoice, setSelectedVoice] = useState<string>('男声-沉稳磁性');
  const [selectedStyle, setSelectedStyle] = useState<string>('写实');
  const [generating, setGenerating] = useState(false);
  const [avatarGenerating, setAvatarGenerating] = useState(false);
  const [gridGenerating, setGridGenerating] = useState(false);
  const [descView, setDescView] = useState<'edit' | 'preview'>('edit');
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [newChar, setNewChar] = useState({
    name: '',
    role: '主角',
    gender: '男',
    age: 25,
    occupation: '',
    personality: '',
  });

  // 文生图模型：跟随项目的模型选择（与分镜模块一致），未配置时不可生成形象
  const imageModel = getImageModelForProject(project);
  const statsMap = useMemo(() => computeCharacterStats(characters, episodes), [characters, episodes]);
  const distMap = useMemo(() => computeLineDistribution(characters, episodes), [characters, episodes]);

  const updateCharacter = (id: string, patch: Partial<Character>) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleAddCharacter = () => {
    const name = newChar.name.trim();
    if (!name) {
      alert('请填写角色名');
      return;
    }
    const id = generateId();
    const color = ROLE_COLORS[characters.length % ROLE_COLORS.length];
    const baseVoices =
      newChar.gender === '女'
        ? ['女声-清甜自然', '女声-温柔知性', '女声-活泼元气', '女声-成熟御姐']
        : ['男声-沉稳磁性', '男声-温柔青年', '男声-冷峻总裁', '男声-阳光活力'];
    const ch: Character = {
      id,
      projectId: activeProjectId || '',
      name,
      role: newChar.role,
      color,
      avatarUrl: '',
      stats: { scenes: 0, lines: 0 },
      profile: {
        age: newChar.age,
        gender: newChar.gender,
        occupation: newChar.occupation,
        personality: newChar.personality,
      },
      description: '',
      suggestions: [],
      lineDistribution: { dialog: 60, monologue: 25, aside: 15 },
      currentVoice: baseVoices[0],
      voices: baseVoices,
    };
    setCharacters((prev) => [...prev, ch]);
    setSelectedId(id);
    setSelectedVoice(ch.currentVoice);
    setActiveSubTab('profile');
    setShowAddModal(false);
    setNewChar({ name: '', role: '主角', gender: '男', age: 25, occupation: '', personality: '' });
  };

  const handleDeleteCharacter = (id: string) => {
    const ch = characters.find((c) => c.id === id);
    if (!ch) return;
    if (!window.confirm(`确定删除角色「${ch.name}」？该操作不可恢复。`)) return;
    if (ch.avatarUrl?.startsWith('db://') && activeProjectId) {
      deleteProjectFile(activeProjectId, ch.avatarUrl.slice(5)).catch(() => {});
    }
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) {
      const next = characters.find((c) => c.id !== id);
      setSelectedId(next?.id ?? '');
      if (next) setSelectedVoice(next.currentVoice);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!selected || !imageModel || avatarGenerating) return;
    setAvatarGenerating(true);
    try {
      const service = getAIServiceForModel(imageModel, 'image');
      const dataUrl = await service.generateImage({
        prompt: buildAvatarPrompt(selected, selectedStyle),
        size: '1024x1024',
      });
      const blob = dataURLToBlob(dataUrl);
      const fileId = `avatar-${selected.id}`;
      if (activeProjectId) await saveProjectFile(activeProjectId, fileId, blob);
      updateCharacter(selected.id, { avatarUrl: `db://${fileId}` });
    } catch (error) {
      console.error('角色形象生成失败:', error);
      alert(error instanceof Error ? error.message : '角色形象生成失败');
    } finally {
      setAvatarGenerating(false);
    }
  };

  const handleGenerateReferenceGrid = async () => {
    if (!selected || !imageModel || gridGenerating) return;
    setGridGenerating(true);
    try {
      const service = getAIServiceForModel(imageModel, 'image');
      const dataUrl = await service.generateImage({
        prompt: buildGridPrompt(selected, selectedStyle),
        size: '1024x1024',
      });
      const cells = await splitGridImage(dataUrl, 3, 2);
      const refs: string[] = [];
      for (let i = 0; i < cells.length; i++) {
        const fileId = `char-ref-${selected.id}-${i}`;
        if (activeProjectId) await saveProjectFile(activeProjectId, fileId, cells[i]);
        refs.push(`db://${fileId}`);
      }
      updateCharacter(selected.id, { referenceImages: refs });
    } catch (error) {
      console.error('角色参考图生成失败:', error);
      alert(error instanceof Error ? error.message : '角色参考图生成失败');
    } finally {
      setGridGenerating(false);
    }
  };

  const handleVoiceSelect = (voice: string) => {
    if (!selected) return;
    setSelectedVoice(voice);
    updateCharacter(selected.id, {
      currentVoice: voice,
      voices: selected.voices?.includes(voice) ? selected.voices : [...(selected.voices ?? []), voice],
    });
  };

  /** 试听当前音色：调用配音 TTS 合成一句测试语音并播放 */
  const handlePreviewVoice = async () => {
    if (previewingVoice) {
      audioRef.current?.pause();
      setPreviewingVoice(false);
      return;
    }
    if (!selected) return;
    setPreviewingVoice(true);
    try {
      const service = getAIServiceForPurpose('dubbing');
      const dataUrl = await service.generateDubbing({
        text: `你好，我是${selected.name}，很高兴认识你。`,
        character: selected.name,
        voice: selectedVoice,
        emotion: 'calm',
        speed: 1.0,
        volume: 80,
      });
      audioRef.current?.pause();
      const audio = new Audio(dataUrl);
      audioRef.current = audio;
      audio.volume = 0.8;
      audio.onended = () => setPreviewingVoice(false);
      audio.onerror = () => {
        setPreviewingVoice(false);
        alert('音频播放失败');
      };
      void audio.play();
    } catch (error) {
      console.error('音色试听失败:', error);
      setPreviewingVoice(false);
      alert(error instanceof Error ? error.message : '音色试听失败');
    }
  };

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

  useEffect(() => {
    if (!activeProjectId) return;
    const data = loadModuleData<Character[]>(activeProjectId, 'characters', DEFAULT_CHARACTERS);
    const epData = loadModuleData<Episode[]>(activeProjectId, 'episodes', []);
    // 角色从剧本自动带入：剧本中出现的新角色自动合并进来
    const merged = syncCharactersFromScript(data, epData);
    // 旧数据自动修复：声音库为空/缺失时回填全局音色库，当前声音非法时取第一个
    const libraryNames = VOICE_LIBRARY.map((v) => v.name);
    const normalized = merged.map((c) => {
      const voices = c.voices?.length ? c.voices : libraryNames;
      const currentVoice =
        c.currentVoice && voices.includes(c.currentVoice) ? c.currentVoice : voices[0] ?? libraryNames[0];
      // 角色必须挂在当前项目下，否则头像/参考图存取用的不是同一个项目 key
      return { ...c, projectId: activeProjectId, voices, currentVoice };
    });
    setCharacters(normalized);
    setEpisodes(epData);
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
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: C.textMute,
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          角色
        </span>
        <button
          onClick={() => setShowAddModal(true)}
          title="添加角色"
          style={{
            background: C.amber,
            border: 'none',
            color: '#FFFFFF',
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 3,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          + 角色
        </button>
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
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: `1.5px solid ${isSelected ? C.amber : C.border}`,
                }}
              >
                <CharacterAvatar character={ch} size={29} radius={29} />
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 0 16px 0' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            overflow: 'hidden',
            border: `2px solid ${C.amber}`,
            flexShrink: 0,
          }}
        >
          <CharacterAvatar character={selected} size={48} fontSize={20} radius={48} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: 'Inter, sans-serif' }}>
              {selected.name}
            </span>
            <span
              style={{
                fontSize: 11,
                background: '#EFF4FF',
                color: '#2563EB',
                padding: '2px 8px',
                borderRadius: 3,
                border: '1px solid #BFCFFF',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {selected.role}
            </span>
            <button
              onClick={() => handleDeleteCharacter(selected.id)}
              title="删除角色"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#DC2626',
                cursor: 'pointer',
                fontSize: 11,
                padding: 0,
                marginLeft: 4,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              删除
            </button>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {(selected.profile.personality || '')
              .split(/[、，,/\s]+/)
              .filter(Boolean)
              .slice(0, 4)
              .map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 10,
                    background: C.tag,
                    color: C.tagText,
                    padding: '2px 7px',
                    borderRadius: 3,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  #{t}
                </span>
              ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, color: C.amber, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              {statsMap[selected.id]?.scenes ?? selected.stats.scenes}
            </div>
            <div style={{ fontSize: 10, color: C.textMute, fontFamily: 'Inter, sans-serif' }}>出场幕数</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, color: C.amber, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              {statsMap[selected.id]?.lines ?? selected.stats.lines}
            </div>
            <div style={{ fontSize: 10, color: C.textMute, fontFamily: 'Inter, sans-serif' }}>台词条数</div>
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
      { key: 'visual', label: '形象与参考' },
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
    <div style={{ padding: '20px 0', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ gridColumn: 1, gridRow: 1 }}>
          <SectionLabel>基本信息</SectionLabel>
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 5,
              padding: '12px 14px',
              marginBottom: 16,
            }}
          >
            {[
              {
                label: '姓名',
                value: selected.name,
                onChange: (v: string) => updateCharacter(selected.id, { name: v }),
              },
              {
                label: '定位',
                value: selected.role,
                onChange: (v: string) => updateCharacter(selected.id, { role: v }),
              },
              {
                label: '年龄',
                value: String(selected.profile.age),
                type: 'number',
                onChange: (v: string) =>
                  updateCharacter(selected.id, { profile: { ...selected.profile, age: Number(v) || 0 } }),
              },
              {
                label: '性别',
                value: selected.profile.gender,
                type: 'select',
                options: ['男', '女'],
                onChange: (v: string) =>
                  updateCharacter(selected.id, { profile: { ...selected.profile, gender: v } }),
              },
              {
                label: '职业',
                value: selected.profile.occupation,
                onChange: (v: string) =>
                  updateCharacter(selected.id, { profile: { ...selected.profile, occupation: v } }),
              },
              {
                label: '性格',
                value: selected.profile.personality,
                onChange: (v: string) =>
                  updateCharacter(selected.id, { profile: { ...selected.profile, personality: v } }),
              },
            ].map((field, i, arr) => (
              <div
                key={field.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid #F0F1F4' : 'none',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 11, color: C.textMute, fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
                  {field.label}
                </span>
                {field.type === 'select' ? (
                  <select
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    style={{
                      width: 150,
                      background: C.inputBg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 4,
                      padding: '4px 8px',
                      fontSize: 11,
                      color: C.text,
                      outline: 'none',
                    }}
                  >
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    style={{
                      width: 150,
                      background: C.inputBg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 4,
                      padding: '4px 8px',
                      fontSize: 11,
                      color: C.text,
                      outline: 'none',
                      textAlign: 'right',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1', gridRow: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <SectionLabel>人物描述</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', background: C.tag, borderRadius: 4, padding: 2 }}>
                {(['edit', 'preview'] as const).map((mode) => (
                  <div
                    key={mode}
                    onClick={() => setDescView(mode)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 3,
                      fontSize: 10,
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      background: descView === mode ? C.card : 'transparent',
                      color: descView === mode ? C.text : C.textMute,
                      boxShadow: descView === mode ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {mode === 'edit' ? '编辑' : '预览'}
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="sm" onClick={handleGenerateDescription} disabled={generating}>
                {generating ? '生成中…' : 'AI 生成人设'}
              </Button>
            </div>
          </div>
          {descView === 'edit' ? (
            <textarea
              value={selected.description}
              onChange={(e) => updateCharacter(selected.id, { description: e.target.value })}
              style={{
                width: '100%',
                height: 120,
                resize: 'none',
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 5,
                padding: '10px 12px',
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
                color: C.textSub,
                lineHeight: 1.8,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <div
              style={{
                minHeight: 120,
                maxHeight: 240,
                overflowY: 'auto',
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 5,
                padding: '10px 12px',
                boxSizing: 'border-box',
              }}
            >
              {selected.description.trim() ? (
                <MarkdownView content={selected.description} />
              ) : (
                <div
                  style={{
                    fontSize: 11,
                    color: C.textMute,
                    textAlign: 'center',
                    padding: '30px 0',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  暂无描述，点击「AI 生成人设」自动生成
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ gridColumn: 2, gridRow: 1 }}>
          <SectionLabel>台词类型分布</SectionLabel>
          <div
            style={{
              fontSize: 11,
              color: C.textMute,
              fontFamily: 'Inter, sans-serif',
              marginTop: 4,
              marginBottom: 10,
              lineHeight: 1.7,
            }}
          >
            基于当前剧本台词自动统计，修改剧本后自动更新
          </div>
          {(() => {
            const dist = distMap[selected.id] ?? { dialog: 0, monologue: 0, aside: 0 };
            const total = dist.dialog + dist.monologue + dist.aside;
            const items = [
              { label: '对话', value: dist.dialog, color: '#2563EB', bg: '#EFF4FF' },
              { label: '独白', value: dist.monologue, color: '#7C3AED', bg: '#F5F3FF' },
              { label: '旁白', value: dist.aside, color: '#16A34A', bg: '#ECFDF5' },
            ];
            return total > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {items.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: item.bg,
                      border: '1px solid',
                      borderColor: `${item.color}22`,
                      borderRadius: 5,
                      padding: '10px 12px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        color: item.color,
                        fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        marginBottom: 2,
                      }}
                    >
                      {Math.round((item.value / total) * 100)}%
                    </div>
                    <div style={{ fontSize: 10, color: C.textSub, fontFamily: 'Inter, sans-serif' }}>
                      {item.label} · {item.value} 条
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 11,
                  color: C.textMute,
                  background: C.tag,
                  borderRadius: 5,
                  padding: '14px',
                  textAlign: 'center',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                暂无台词数据，先生成剧本后自动统计
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );

  const renderVoiceTab = () => (
    <div style={{ padding: '20px 0', overflowY: 'auto', flex: 1, maxWidth: 560 }}>
      <SectionLabel>当前声音</SectionLabel>
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 5,
          padding: '14px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <button
          onClick={() => void handlePreviewVoice()}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: C.amber,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            flexShrink: 0,
            color: '#FFFFFF',
          }}
          title="试听当前音色"
        >
          {previewingVoice ? '⏸' : '▶'}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 500, fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>
            {selectedVoice}
          </div>
          <div style={{ fontSize: 10, color: C.textMute, fontFamily: 'Inter, sans-serif', marginBottom: 5 }}>
            {voiceDesc(selectedVoice)}（点击 ▶ 试听）
          </div>
          <div style={{ height: 3, background: C.tag, borderRadius: 2 }}>
            <div style={{ height: '100%', width: 0, background: C.amber, borderRadius: 2 }} />
          </div>
        </div>
        <span style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>--:--</span>
      </div>

      <SectionLabel>可用声音库</SectionLabel>
      <div style={{ display: 'grid', gap: 7, marginTop: 8 }}>
        {VOICE_LIBRARY.map((v) => {
          const isActive = v.name === selectedVoice;
          return (
            <div
              key={v.name}
              onClick={() => handleVoiceSelect(v.name)}
              style={{
                background: isActive ? C.active : C.card,
                border: `1px solid ${isActive ? '#F5C842' : C.border}`,
                borderRadius: 5,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isActive ? C.amberLight : C.tag,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                🎙
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: isActive ? C.text : C.textSub,
                    fontWeight: isActive ? 500 : 400,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {v.name}
                  <span
                    style={{
                      fontSize: 9,
                      color: C.textMute,
                      background: C.tag,
                      padding: '1px 5px',
                      borderRadius: 3,
                      fontWeight: 400,
                    }}
                  >
                    {v.gender}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: C.textMute, fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
                  {v.desc}
                </div>
              </div>
              {isActive && (
                <span
                  style={{
                    fontSize: 9,
                    background: C.amberLight,
                    color: '#A07010',
                    padding: '2px 6px',
                    borderRadius: 3,
                    border: '1px solid #F5C842',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  使用中
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderVisualTab = () => (
    <div style={{ padding: '20px 0', overflowY: 'auto', flex: 1, maxWidth: 680 }}>
      <SectionLabel>主形象（头像）</SectionLabel>
      <div
        style={{
          display: 'flex',
          gap: 18,
          marginTop: 8,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: 132,
            flexShrink: 0,
            aspectRatio: '3/4',
            background: C.bg,
            borderRadius: 5,
            overflow: 'hidden',
            border: selected.avatarUrl ? `2px solid ${C.amber}` : `1px solid ${C.border}`,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected.avatarUrl ? (
            <CharacterAvatar character={selected} size={132} fontSize={40} radius={5} />
          ) : (
            <span style={{ color: '#C0C5D0', fontSize: 22 }}>+</span>
          )}
          {avatarGenerating && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.78)',
                fontSize: 11,
                color: C.amber,
                fontWeight: 500,
              }}
            >
              生成中…
            </div>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: C.textMute, fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>
            角色头像，用于角色列表与分镜标注的识别展示。生成「角色参考图」后，
            可点击宫格里的格子直接设为头像。
          </div>
          <SectionLabel>生成风格</SectionLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                  }}
                >
                  {style}
                </div>
              );
            })}
          </div>
          {!imageModel && (
            <div style={{ fontSize: 11, color: C.amber, fontFamily: 'Inter, sans-serif' }}>
              未启用文生图模型，请先在「API&用量」中启用并选择
            </div>
          )}
          <div>
            <Button
              variant="primary"
              size="md"
              onClick={handleGenerateAvatar}
              disabled={!imageModel || avatarGenerating}
            >
              {avatarGenerating ? '生成中…' : selected.avatarUrl ? '重新生成形象' : '✦ AI 生成形象'}
            </Button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <SectionLabel>角色参考图（宫格）</SectionLabel>
        <div style={{ fontSize: 11, color: C.textMute, fontFamily: 'Inter, sans-serif', lineHeight: 1.7, marginTop: 4, marginBottom: 8 }}>
          6 格多角度角色设定表（正面/侧面/背面/表情/全身）。生成分镜图和视频时，
          系统会按镜头中出现的角色自动把参考图传给文生图 / 图生视频模型，保证角色形象前后一致。
        </div>
        <div style={{ marginTop: 8 }}>
          {(selected.referenceImages?.length ?? 0) > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {selected.referenceImages!.map((ref, i) => (
                <RefCell
                  key={i}
                  ref={ref}
                  projectId={selected.projectId}
                  onClick={() => updateCharacter(selected.id, { avatarUrl: ref })}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                fontSize: 11,
                color: C.textMute,
                background: C.tag,
                borderRadius: 5,
                padding: '14px',
                textAlign: 'center',
                fontFamily: 'Inter, sans-serif',
                lineHeight: 1.8,
              }}
            >
              还没有参考图。生成后自动切分为 6 格（正面/侧面/背面/表情/全身），
              点击格子可设为头像；生成分镜图和视频时作为角色参考图传入，保持角色形象一致。
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateReferenceGrid}
              disabled={!imageModel || gridGenerating}
            >
              {gridGenerating
                ? '生成中…'
                : (selected.referenceImages?.length ?? 0) > 0
                  ? '重新生成参考图'
                  : '✦ 生成角色参考图（2×3）'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
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
          {!selected ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Inter, sans-serif',
                color: C.textMute,
                fontSize: 13,
                gap: 8,
              }}
            >
              <div style={{ fontSize: 28 }}>👥</div>
              <div>暂无角色</div>
              <div style={{ fontSize: 11 }}>点击左侧「+」手动添加角色</div>
            </div>
          ) : (
            <>
              {renderDetailHeader()}
              {renderSubTabs()}
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {activeSubTab === 'profile' && renderProfileTab()}
                {activeSubTab === 'voice' && renderVoiceTab()}
                {activeSubTab === 'visual' && renderVisualTab()}
              </div>
            </>
          )}
        </div>
      </div>

      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 420,
              maxWidth: '90vw',
              background: C.card,
              borderRadius: 8,
              padding: '20px 24px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 16 }}>
              添加角色
            </div>
            {[
              { key: 'name', label: '角色名', type: 'text', placeholder: '例如：林晓' },
              { key: 'role', label: '定位', type: 'text', placeholder: '例如：女主角' },
              { key: 'age', label: '年龄', type: 'number', placeholder: '' },
              { key: 'occupation', label: '职业', type: 'text', placeholder: '例如：广告策划' },
              { key: 'personality', label: '性格', type: 'text', placeholder: '例如：乐观开朗、坚韧' },
            ].map((field) => (
              <div key={field.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: C.textMute, marginBottom: 4 }}>{field.label}</div>
                <input
                  type={field.type}
                  value={String((newChar as Record<string, unknown>)[field.key])}
                  onChange={(e) =>
                    setNewChar((prev) => ({
                      ...prev,
                      [field.key]: field.type === 'number' ? Number(e.target.value) || 0 : e.target.value,
                    }))
                  }
                  placeholder={field.placeholder}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: C.inputBg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    padding: '7px 10px',
                    fontSize: 12,
                    color: C.text,
                    outline: 'none',
                  }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.textMute, marginBottom: 4 }}>性别</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['男', '女'].map((g) => (
                  <div
                    key={g}
                    onClick={() => setNewChar((prev) => ({ ...prev, gender: g }))}
                    style={{
                      padding: '4px 14px',
                      borderRadius: 4,
                      fontSize: 12,
                      cursor: 'pointer',
                      border: `1px solid ${newChar.gender === g ? C.amber : C.border}`,
                      background: newChar.gender === g ? C.amberLight : C.card,
                      color: newChar.gender === g ? C.amber : C.textSub,
                    }}
                  >
                    {g}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={handleAddCharacter}>
                添加
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CharacterManager;
