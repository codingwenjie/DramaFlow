import React, { useState } from 'react';

const C = {
  bg: '#F5F6F8',
  white: '#FFFFFF',
  border: '#E4E7EE',
  text: '#1A1D24',
  textSub: '#5A6070',
  textMute: '#9AA0B0',
  amber: '#E69500',
  amberBg: '#FFF3D0',
  amberBdr: '#F5C842',
  blue: '#2563EB',
  blueBg: '#EFF4FF',
  blueBdr: '#BFCFFF',
  green: '#16A34A',
  greenBg: '#ECFDF5',
  greenBdr: '#BBF7D0',
  red: '#DC2626',
  redBg: '#FEF2F2',
  purple: '#7C3AED',
  purpleBg: '#F5F3FF',
  tag: '#EEF0F4',
};

type Tab = 'prompts' | 'skills';

interface Prompt {
  id: string;
  name: string;
  category: string;
  desc: string;
  content: string;
  model: string;
  temperature: number;
  usageCount: number;
  builtin: boolean;
}

interface Skill {
  id: string;
  name: string;
  desc: string;
  trigger: string;
  steps: string[];
  enabled: boolean;
  builtin: boolean;
  runs: number;
}

const PROMPTS: Prompt[] = [
  {
    id: 'p1', name: '霸总短剧剧本生成', category: '剧本创作', desc: '生成符合短视频平台调性的霸总言情剧本，情节节奏快、爽点密集',
    content: `你是一位专业的短剧剧本作家，擅长创作适合短视频平台的言情短剧。

请根据以下信息生成一幕剧本：
- 剧情背景：{{scene_context}}
- 出场角色：{{characters}}
- 本幕目标：{{scene_goal}}
- 情绪基调：{{emotion}}

要求：
1. 每幕控制在 300-500 字
2. 对白要简短有力，每句不超过 15 字
3. 每幕必须有一个情绪高潮或反转
4. 使用"内景/外景 · 地点 · 时间"格式标注场景
5. 角色动作用括号标注

输出格式：标准剧本格式`,
    model: 'Qwen-Max', temperature: 0.85, usageCount: 284, builtin: true
  },
  {
    id: 'p2', name: '分镜画面描述', category: '分镜生成', desc: '将剧本文字转化为精准的 AI 图像生成提示词，保持视觉风格一致',
    content: `将以下剧本场景转化为分镜图像描述，用于 AI 图像生成。

场景文本：{{scene_text}}
镜头类型：{{shot_type}}（{{shot_angle}} 角度）
角色信息：{{character_desc}}

生成要求：
1. 输出英文 prompt（图像生成模型效果更好）
2. 包含：场景氛围、光线、色调、构图
3. 角色描述要符合已定义的外貌设定
4. 风格标签：cinematic, 4K, dramatic lighting, Chinese drama

输出：一段 80-120 词的英文 prompt`,
    model: 'Claude 3.5 Sonnet', temperature: 0.6, usageCount: 891, builtin: true
  },
  {
    id: 'p3', name: '台词情感润色', category: '剧本创作', desc: '优化台词的情感表达和节奏，让对话更有张力',
    content: `对以下台词进行情感润色，保留核心含义，但让表达更有戏剧性和张力。

原台词：{{original_line}}
角色：{{character}}（性格：{{personality}}）
场景情绪：{{emotion_state}}
目标效果：{{target_effect}}

润色要求：
1. 保持角色的语言风格
2. 加强情感张力，不要平铺直叙
3. 适当加入停顿（用"……"表示）
4. 输出 2-3 个备选版本，标注情感强度

输出：备选台词列表`,
    model: 'GPT-4o', temperature: 0.9, usageCount: 156, builtin: false
  },
  {
    id: 'p4', name: '角色人设生成', category: '角色管理', desc: '根据剧情需要自动生成完整的角色人设档案',
    content: `根据以下剧情背景，为新角色生成完整人设档案。

剧情类型：{{genre}}
角色定位：{{role_type}}
与主角关系：{{relationship}}

生成内容：
1. 姓名（符合剧情时代背景）
2. 年龄、外貌描述
3. 性格特征（3-5个关键词）
4. 背景故事（100字以内）
5. 口头禅 / 标志性台词
6. 与其他角色的关系设定
7. 角色弧线（在故事中的成长变化）`,
    model: 'Claude 3.5 Sonnet', temperature: 0.8, usageCount: 73, builtin: false
  },
];

const SKILLS: Skill[] = [
  {
    id: 's1', name: '一键生成完整幕次', desc: '输入幕次标题和关键情节，自动完成：剧本撰写 → 分镜描述 → 分镜图像 → 配音文本',
    trigger: '在剧本编辑器中点击"AI 生成完整幕次"',
    steps: ['调用剧本生成 Prompt 生成台词和场景描述', '解析剧本，拆分为独立镜头', '为每个镜头生成分镜画面描述', '调用图像模型批量生成分镜图', '提取台词列表，准备配音队列'],
    enabled: true, builtin: true, runs: 1284
  },
  {
    id: 's2', name: '角色一致性检查', desc: '扫描剧本中所有角色的称谓、描述、性格表现，自动发现前后不一致的地方',
    trigger: '点击工具栏"一致性检查"或剧本保存时自动触发',
    steps: ['提取剧本中所有角色出现的段落', '与角色档案的人设信息进行比对', '检测外貌/性格/背景的矛盾点', '生成问题报告，高亮显示冲突位置', '提供一键修复建议'],
    enabled: true, builtin: true, runs: 342
  },
  {
    id: 's3', name: '爆款标题生成', desc: '根据剧情内容，生成 10 个适合短视频平台的吸睛标题，带点击率预测评分',
    trigger: '项目导出前，或手动在项目详情页触发',
    steps: ['分析剧情关键冲突和爽点', '结合短视频平台热门标题规律', '生成 10 个标题变体', '为每个标题预测点击率评分（1-10）', '输出标题列表供选择'],
    enabled: false, builtin: false, runs: 89
  },
  {
    id: 's4', name: '多平台适配导出', desc: '一键将成片适配为不同平台的规格：抖音竖屏、快手方形、B站横屏',
    trigger: '视频合成完成后，在导出面板触发',
    steps: ['读取成片文件和元数据', '按平台规格裁剪画面（9:16 / 1:1 / 16:9）', '重新渲染字幕位置和大小', '调整码率和格式（MP4/WebM）', '打包输出，生成平台专属封面建议'],
    enabled: true, builtin: false, runs: 217
  },
];

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  '剧本创作': { color: '#2563EB', bg: '#EFF4FF' },
  '分镜生成': { color: '#7C3AED', bg: '#F5F3FF' },
  '角色管理': { color: '#16A34A', bg: '#ECFDF5' },
  '配音合成': { color: '#DC2626', bg: '#FEF2F2' },
};

const PromptSkills: React.FC = () => {
  const [tab, setTab] = useState<Tab>('prompts');
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>('p1');
  const [prompts] = useState(PROMPTS);
  const [skills, setSkills] = useState(SKILLS);
  const [editingContent, setEditingContent] = useState<string | null>(null);

  const activePrompt = prompts.find((p) => p.id === selectedPrompt);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Tab Bar */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', padding: '0 24px', flexShrink: 0 }}>
        {([['prompts', 'Prompt 管理'], ['skills', 'Skill 编排']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: tab === id ? `2px solid ${C.amber}` : '2px solid transparent', color: tab === id ? C.text : C.textSub, fontSize: 12, cursor: 'pointer', fontWeight: tab === id ? 500 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', background: C.bg }}>
        {tab === 'prompts' && (
          <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* Prompt List */}
            <div style={{ width: 248, background: C.white, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prompts</span>
                <button style={{ background: C.amber, border: 'none', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>+ 新建</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {prompts.map((p) => {
                  const cat = CATEGORY_COLORS[p.category] || { color: C.textSub, bg: C.tag };
                  return (
                    <button key={p.id} onClick={() => { setSelectedPrompt(p.id); setEditingContent(null); }}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: selectedPrompt === p.id ? C.amberBg : 'transparent', border: 'none', borderLeft: selectedPrompt === p.id ? `2px solid ${C.amber}` : '2px solid transparent', cursor: 'pointer', transition: 'all 0.1s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: selectedPrompt === p.id ? C.text : C.textSub, fontWeight: selectedPrompt === p.id ? 500 : 400 }}>{p.name}</span>
                        {p.builtin && <span style={{ fontSize: 8, background: C.tag, color: C.textMute, padding: '1px 4px', borderRadius: 2 }}>内置</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 9, background: cat.bg, color: cat.color, padding: '1px 5px', borderRadius: 2 }}>{p.category}</span>
                        <span style={{ fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>{p.usageCount}次</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt Editor */}
            {activePrompt && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '12px 20px', background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "'Outfit', sans-serif" }}>{activePrompt.name}</div>
                    <div style={{ fontSize: 11, color: C.textMute, marginTop: 2 }}>{activePrompt.desc}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!activePrompt.builtin && (
                      <button style={{ padding: '5px 12px', background: C.redBg, border: `1px solid #FCA5A5`, borderRadius: 4, color: C.red, fontSize: 11, cursor: 'pointer' }}>删除</button>
                    )}
                    <button style={{ padding: '5px 12px', background: C.tag, border: `1px solid ${C.border}`, borderRadius: 4, color: C.textSub, fontSize: 11, cursor: 'pointer' }}>测试运行</button>
                    <button style={{ padding: '5px 14px', background: C.amber, border: 'none', borderRadius: 4, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>保存</button>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20 }}>
                  {/* Prompt Content */}
                  <div>
                    <Label>Prompt 内容</Label>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        value={editingContent ?? activePrompt.content}
                        onChange={(e) => setEditingContent(e.target.value)}
                        style={{ width: '100%', height: 340, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, padding: '14px', resize: 'none', outline: 'none', lineHeight: 1.85, fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }}
                      />
                      <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>
                        {(editingContent ?? activePrompt.content).length} 字符
                      </div>
                    </div>

                    {/* Variables hint */}
                    <div style={{ marginTop: 10, background: C.blueBg, border: `1px solid ${C.blueBdr}`, borderRadius: 5, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: C.blue, fontWeight: 500, marginBottom: 6 }}>变量占位符</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['{{scene_context}}', '{{characters}}', '{{scene_goal}}', '{{emotion}}', '{{character_desc}}'].map((v) => (
                          <code key={v} style={{ fontSize: 10, background: C.white, border: `1px solid ${C.blueBdr}`, color: C.blue, padding: '2px 6px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace" }}>{v}</code>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Settings */}
                  <div>
                    <Label>模型设置</Label>
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px', marginBottom: 14 }}>
                      <PropRow label="模型" value={activePrompt.model} />
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 11, color: C.textMute }}>Temperature</span>
                          <span style={{ fontSize: 11, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{activePrompt.temperature}</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.05" defaultValue={activePrompt.temperature}
                          style={{ width: '100%', accentColor: C.amber }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textMute, marginTop: 2 }}>
                          <span>精确</span><span>创意</span>
                        </div>
                      </div>
                      <PropRow label="Max Tokens" value="2048" />
                      <PropRow label="使用次数" value={`${activePrompt.usageCount} 次`} />
                    </div>

                    <Label>调用场景</Label>
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px 14px', marginBottom: 14 }}>
                      {['剧本创作面板', 'Skill: 一键生成完整幕次'].map((s) => (
                        <div key={s} style={{ fontSize: 11, color: C.textSub, padding: '4px 0', borderBottom: '1px solid #F5F6F8', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: C.green, fontSize: 10 }}>✓</span> {s}
                        </div>
                      ))}
                    </div>

                    <Label>版本历史</Label>
                    <div style={{ display: 'grid', gap: 5 }}>
                      {[{ v: 'v3 (当前)', date: '8/5 14:23', active: true }, { v: 'v2', date: '7/28', active: false }, { v: 'v1 (内置)', date: '创建时', active: false }].map((h) => (
                        <div key={h.v} style={{ background: h.active ? C.amberBg : C.white, border: `1px solid ${h.active ? C.amberBdr : C.border}`, borderRadius: 4, padding: '6px 10px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10, color: h.active ? C.amber : C.textSub, fontWeight: h.active ? 600 : 400 }}>{h.v}</span>
                          <span style={{ fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>{h.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'skills' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "'Outfit', sans-serif" }}>Skill 编排</h2>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: C.textMute }}>组合多个 Prompt 步骤，构建自动化生成流水线</p>
              </div>
              <button style={{ padding: '7px 16px', background: C.amber, border: 'none', borderRadius: 4, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                + 新建 Skill
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {skills.map((skill) => (
                <div key={skill.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', opacity: skill.enabled ? 1 : 0.65, transition: 'all 0.2s' }}>
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, borderBottom: `1px solid ${C.bg}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: skill.enabled ? C.amberBg : C.tag, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      ⚡
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'Outfit', sans-serif" }}>{skill.name}</span>
                        {skill.builtin && <span style={{ fontSize: 8, background: C.tag, color: C.textMute, padding: '1px 4px', borderRadius: 2 }}>内置</span>}
                        <span style={{ fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", marginLeft: 'auto' }}>运行 {skill.runs} 次</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.textSub, lineHeight: 1.6, marginBottom: 6 }}>{skill.desc}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: C.textMute }}>
                        <span>触发：</span>
                        <span style={{ background: C.bg, padding: '2px 8px', borderRadius: 3, color: C.textSub }}>{skill.trigger}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {!skill.builtin && (
                        <button style={{ padding: '4px 10px', background: C.tag, border: `1px solid ${C.border}`, borderRadius: 3, color: C.textSub, fontSize: 11, cursor: 'pointer' }}>编辑</button>
                      )}
                      <Toggle on={skill.enabled} onClick={() => setSkills((ss) => ss.map((s) => s.id === skill.id ? { ...s, enabled: !s.enabled } : s))} />
                    </div>
                  </div>

                  {/* Steps */}
                  <div style={{ padding: '12px 18px 12px 68px' }}>
                    <div style={{ fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>执行步骤</div>
                    <div style={{ position: 'relative' }}>
                      {/* Vertical line */}
                      <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 1, background: C.border }} />
                      {skill.steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8, position: 'relative' }}>
                          <div style={{ width: 15, height: 15, borderRadius: '50%', background: skill.enabled ? C.amber : C.tag, border: `2px solid ${C.white}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                            <span style={{ fontSize: 8, color: skill.enabled ? '#fff' : C.textMute, fontWeight: 700 }}>{i + 1}</span>
                          </div>
                          <span style={{ fontSize: 11, color: C.textSub, lineHeight: 1.5, paddingTop: 1 }}>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ width: 34, height: 19, borderRadius: 10, background: on ? C.amber : '#D0D5E0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2.5, left: on ? 16 : 2.5, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: '#9AA0B0', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{children}</div>;
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: '#9AA0B0' }}>{label}</span>
      <span style={{ fontSize: 11, color: '#5A6070' }}>{value}</span>
    </div>
  );
}

export default PromptSkills;