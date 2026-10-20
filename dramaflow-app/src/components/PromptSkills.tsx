import React, { useState } from 'react';
import {
  PROMPT_PURPOSES,
  loadPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  resetPromptTemplates,
} from '../data/prompt-library';
import type { AIModelPurpose, PromptTemplate } from '../data/types';

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

const PURPOSE_COLORS: Record<string, { color: string; bg: string }> = {
  script: { color: '#2563EB', bg: '#EFF4FF' },
  polish: { color: '#7C3AED', bg: '#F5F3FF' },
  storyboard: { color: '#7C3AED', bg: '#F5F3FF' },
  character: { color: '#16A34A', bg: '#ECFDF5' },
  suggestion: { color: '#DC2626', bg: '#FEF2F2' },
};

function purposeLabel(purpose: string): string {
  return PROMPT_PURPOSES.find((p) => p.purpose === purpose)?.label ?? purpose;
}

function purposeColor(purpose: string): { color: string; bg: string } {
  return PURPOSE_COLORS[purpose] ?? { color: C.textSub, bg: C.tag };
}

/** 编辑草稿；id 为 null 表示新建 */
interface Draft {
  id: string | null;
  name: string;
  purpose: AIModelPurpose;
  desc: string;
  content: string;
}

const PromptSkills: React.FC = () => {
  const [tab, setTab] = useState<Tab>('prompts');
  const [templates, setTemplates] = useState<PromptTemplate[]>(() => loadPromptTemplates());
  const [selectedId, setSelectedId] = useState<string | null>(() => loadPromptTemplates()[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [skillsEnabled, setSkillsEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SKILLS.map((s) => [s.id, s.enabled]))
  );

  const active = templates.find((t) => t.id === selectedId) ?? null;

  const select = (id: string) => {
    setSelectedId(id);
    setDraft(null);
  };

  const handleNew = () => {
    setSelectedId(null);
    setDraft({ id: null, name: '新 Prompt 模板', purpose: 'script', desc: '', content: '' });
  };

  const handleSave = () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.content.trim()) {
      alert('请填写模板名称和内容');
      return;
    }
    if (draft.id === null) {
      const next = createPromptTemplate({
        name: draft.name.trim(),
        purpose: draft.purpose,
        desc: draft.desc.trim(),
        content: draft.content,
      });
      setTemplates(next);
      const created = next[next.length - 1];
      select(created.id);
    } else {
      const next = updatePromptTemplate(draft.id, {
        name: draft.name.trim(),
        purpose: draft.purpose,
        desc: draft.desc.trim(),
        content: draft.content,
      });
      setTemplates(next);
      select(draft.id);
    }
  };

  const handleDelete = () => {
    if (!active) return;
    if (active.builtin) return;
    if (!confirm(`确定删除「${active.name}」？`)) return;
    const next = deletePromptTemplate(active.id);
    setTemplates(next);
    select(next[0]?.id ?? '');
    if (next.length === 0) setSelectedId(null);
  };

  const handleToggleEnabled = (t: PromptTemplate) => {
    setTemplates(updatePromptTemplate(t.id, { enabled: !t.enabled }));
    if (!t.enabled) setSelectedId(t.id);
  };

  const handleReset = () => {
    if (!confirm('恢复默认将清除所有自定义模板并重置内置模板，确定？')) return;
    const next = resetPromptTemplates();
    setTemplates(next);
    select(next[0].id);
  };

  // 编辑框当前值：草稿优先，否则展示选中模板
  const view: Draft | null = draft
    ? draft
    : active
      ? { id: active.id, name: active.name, purpose: active.purpose, desc: active.desc, content: active.content }
      : null;
  const isEditing = !!draft;
  const dirty =
    !!draft &&
    !!active &&
    (draft.name !== active.name ||
      draft.purpose !== active.purpose ||
      draft.desc !== active.desc ||
      draft.content !== active.content);

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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: C.textMute }}>
            启用中的模板将作为对应功能的系统提示词
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', background: C.bg }}>
        {tab === 'prompts' && (
          <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* Prompt List */}
            <div style={{ width: 248, background: C.white, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prompts</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleReset} title="恢复默认模板"
                    style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMute, fontSize: 10, padding: '3px 8px', borderRadius: 3, cursor: 'pointer' }}>
                    恢复默认
                  </button>
                  <button onClick={handleNew}
                    style={{ background: C.amber, border: 'none', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}>
                    + 新建
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {templates.map((p) => {
                  const pc = purposeColor(p.purpose);
                  const sel = p.id === selectedId && !draft;
                  return (
                    <div key={p.id} onClick={() => select(p.id)}
                      style={{ padding: '10px 14px', background: sel ? C.amberBg : 'transparent', borderLeft: sel ? `2px solid ${C.amber}` : '2px solid transparent', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 6 }}>
                        <span style={{ fontSize: 11, color: sel ? C.text : C.textSub, fontWeight: sel ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        {p.builtin && <span style={{ fontSize: 8, background: C.tag, color: C.textMute, padding: '1px 4px', borderRadius: 2, flexShrink: 0 }}>内置</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 9, background: pc.bg, color: pc.color, padding: '1px 5px', borderRadius: 2 }}>{purposeLabel(p.purpose)}</span>
                        <span style={{ fontSize: 9, color: p.enabled ? C.green : C.textMute, fontWeight: p.enabled ? 600 : 400 }}>
                          {p.enabled ? '● 启用中' : '○ 未启用'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prompt Editor */}
            {view && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '12px 20px', background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <input
                      value={view.name}
                      disabled={!isEditing}
                      onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                      placeholder="模板名称"
                      style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "'Outfit', sans-serif", border: isEditing ? `1px solid ${C.border}` : '1px solid transparent', background: 'transparent', outline: 'none', width: 260, padding: '2px 6px', borderRadius: 4 }}
                    />
                    <select
                      value={view.purpose}
                      disabled={!isEditing}
                      onChange={(e) => setDraft((d) => (d ? { ...d, purpose: e.target.value as AIModelPurpose } : d))}
                      style={{ fontSize: 11, color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 4, padding: '3px 6px', background: C.white, outline: 'none', cursor: isEditing ? 'pointer' : 'default' }}
                    >
                      {PROMPT_PURPOSES.map((p) => (
                        <option key={p.purpose} value={p.purpose}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {active && !active.builtin && !draft && (
                      <button onClick={handleDelete} style={{ padding: '5px 12px', background: C.redBg, border: `1px solid #FCA5A5`, borderRadius: 4, color: C.red, fontSize: 11, cursor: 'pointer' }}>删除</button>
                    )}
                    {!draft && active && (
                      <button
                        onClick={() => handleToggleEnabled(active)}
                        style={{ padding: '5px 12px', background: active.enabled ? C.greenBg : C.tag, border: `1px solid ${active.enabled ? C.greenBdr : C.border}`, borderRadius: 4, color: active.enabled ? C.green : C.textSub, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}
                      >
                        {active.enabled ? '已启用（点击停用）' : '启用此模板'}
                      </button>
                    )}
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => { setDraft(null); if (active) setSelectedId(active.id); }}
                          style={{ padding: '5px 12px', background: C.tag, border: `1px solid ${C.border}`, borderRadius: 4, color: C.textSub, fontSize: 11, cursor: 'pointer' }}
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSave}
                          style={{ padding: '5px 14px', background: C.amber, border: 'none', borderRadius: 4, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                        >
                          保存{dirty ? '…' : ''}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDraft({ id: active!.id, name: active!.name, purpose: active!.purpose, desc: active!.desc, content: active!.content })}
                        style={{ padding: '5px 14px', background: C.tag, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}
                      >
                        编辑
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20 }}>
                  {/* Prompt Content */}
                  <div>
                    <Label>模板描述</Label>
                    <input
                      value={view.desc}
                      disabled={!isEditing}
                      onChange={(e) => setDraft((d) => (d ? { ...d, desc: e.target.value } : d))}
                      placeholder="一句话描述该模板的风格与适用场景"
                      style={{ width: '100%', fontSize: 12, color: C.text, border: isEditing ? `1px solid ${C.border}` : `1px solid ${C.border}`, background: isEditing ? C.white : '#FAFAFC', borderRadius: 6, outline: 'none', padding: '8px 12px', boxSizing: 'border-box', marginBottom: 14, opacity: isEditing ? 1 : 0.75 }}
                    />
                    <Label>Prompt 内容（系统提示词）</Label>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        value={view.content}
                        disabled={!isEditing}
                        onChange={(e) => setDraft((d) => (d ? { ...d, content: e.target.value } : d))}
                        style={{ width: '100%', height: 340, background: isEditing ? '#fff' : '#FAFAFC', border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, padding: '14px', resize: 'none', outline: 'none', lineHeight: 1.85, fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box', opacity: isEditing ? 1 : 0.85 }}
                      />
                      <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>
                        {view.content.length} 字符
                      </div>
                    </div>

                    {/* 说明 */}
                    <div style={{ marginTop: 10, background: C.blueBg, border: `1px solid ${C.blueBdr}`, borderRadius: 5, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: C.blue, fontWeight: 500, marginBottom: 6 }}>模板如何生效</div>
                      <div style={{ fontSize: 10, color: C.textSub, lineHeight: 1.8 }}>
                        启用后，此内容将作为「{purposeLabel(view.purpose)}」的系统提示词（角色设定与输出格式），
                        剧本生成、分镜生成、人设生成、优化建议与剧本润色都会使用它；同一用途同时只启用一个模板。
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div>
                    <Label>模板信息</Label>
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px', marginBottom: 14 }}>
                      <PropRow label="类型" value={active?.builtin ? '内置模板' : '自定义模板'} />
                      <PropRow label="用途" value={purposeLabel(view.purpose)} />
                      <PropRow label="状态" value={active?.enabled ? '启用中' : '未启用'} />
                      {active && <PropRow label="更新时间" value={new Date(active.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />}
                    </div>

                    <Label>调用场景</Label>
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px 14px' }}>
                      {view.purpose === 'script' && ['剧本工作台 · AI 生成剧本'].map((s) => <CallSite key={s} name={s} />)}
                      {view.purpose === 'polish' && ['剧本工作台 · AI 润色'].map((s) => <CallSite key={s} name={s} />)}
                      {view.purpose === 'storyboard' && ['分镜工作台 · 拆分镜头'].map((s) => <CallSite key={s} name={s} />)}
                      {view.purpose === 'character' && ['角色工作台 · AI 生成人设'].map((s) => <CallSite key={s} name={s} />)}
                      {view.purpose === 'suggestion' && ['剧本 / 角色 / 分镜 · 优化建议'].map((s) => <CallSite key={s} name={s} />)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!view && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMute, fontSize: 12 }}>
                点击「+ 新建」创建第一个 Prompt 模板
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
              <span style={{ fontSize: 10, color: C.textMute, background: C.tag, padding: '3px 10px', borderRadius: 10 }}>路线图预览 · 暂未开放自定义</span>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {SKILLS.map((skill) => (
                <div key={skill.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', opacity: skill.enabled ? 1 : 0.65, transition: 'all 0.2s' }}>
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, borderBottom: `1px solid ${C.bg}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: skill.enabled ? C.amberBg : C.tag, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      ⚡
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'Outfit', sans-serif" }}>{skill.name}</span>
                        <span style={{ fontSize: 8, background: C.tag, color: C.textMute, padding: '1px 4px', borderRadius: 2 }}>内置</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.textSub, lineHeight: 1.6, marginBottom: 6 }}>{skill.desc}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: C.textMute }}>
                        <span>触发：</span>
                        <span style={{ background: C.bg, padding: '2px 8px', borderRadius: 3, color: C.textSub }}>{skill.trigger}</span>
                      </div>
                    </div>
                    <Toggle on={skillsEnabled[skill.id] ?? skill.enabled} onClick={() => setSkillsEnabled((s) => ({ ...s, [skill.id]: !(s[skill.id] ?? skill.enabled) }))} />
                  </div>

                  {/* Steps */}
                  <div style={{ padding: '12px 18px 12px 68px' }}>
                    <div style={{ fontSize: 9, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>执行步骤</div>
                    <div style={{ position: 'relative' }}>
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

/** Skill 展示数据（路线图预览，尚未接入执行引擎） */
interface Skill {
  id: string;
  name: string;
  desc: string;
  trigger: string;
  steps: string[];
  enabled: boolean;
}

const SKILLS: Skill[] = [
  {
    id: 's1', name: '一键生成完整幕次', desc: '输入幕次标题和关键情节，自动完成：剧本撰写 → 分镜描述 → 分镜图像 → 配音文本',
    trigger: '剧本编辑器 · AI 生成完整幕次',
    steps: ['调用剧本生成 Prompt 撰写台词和场景描述', '解析剧本，拆分为独立镜头', '为每个镜头生成分镜画面描述', '调用图像模型批量生成分镜图', '提取台词列表，准备配音队列'],
    enabled: true,
  },
  {
    id: 's2', name: '角色一致性检查', desc: '扫描剧本中所有角色的称谓、描述、性格表现，自动发现前后不一致的地方',
    trigger: '工具栏 · 一致性检查',
    steps: ['提取剧本中所有角色出现的段落', '与角色档案的人设信息进行比对', '检测外貌/性格/背景的矛盾点', '生成问题报告，高亮显示冲突位置', '提供一键修复建议'],
    enabled: true,
  },
  {
    id: 's3', name: '爆款标题生成', desc: '根据剧情内容，生成 10 个适合短视频平台的吸睛标题，带点击率预测评分',
    trigger: '项目详情页 · 生成标题',
    steps: ['分析剧情关键冲突和爽点', '结合短视频平台热门标题规律', '生成 10 个标题变体', '为每个标题预测点击率评分（1-10）', '输出标题列表供选择'],
    enabled: false,
  },
  {
    id: 's4', name: '多平台适配导出', desc: '一键将成片适配为不同平台的规格：抖音竖屏、快手方形、B站横屏',
    trigger: '合成完成 · 导出面板',
    steps: ['读取成片文件和元数据', '按平台规格裁剪画面（9:16 / 1:1 / 16:9）', '重新渲染字幕位置和大小', '调整码率和格式（MP4/WebM）', '打包输出，生成平台专属封面建议'],
    enabled: true,
  },
];

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

function CallSite({ name }: { name: string }) {
  return (
    <div style={{ fontSize: 11, color: C.textSub, padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: C.green, fontSize: 10 }}>✓</span> {name}
    </div>
  );
}

export default PromptSkills;
