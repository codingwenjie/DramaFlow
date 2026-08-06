import React, { useState } from 'react';
import {
  loadModelSettings,
  saveModelSettings,
  MODEL_PRESETS,
  testModelConnection,
  PURPOSE_LABELS,
} from '../services';
import type { AIModelConfig, AIModelPurpose, AIModelSettings } from '../data/types';

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

const ALL_TASKS = [
  { id: 'script', label: '剧本', color: '#2563EB', bg: '#EFF4FF', bdr: '#BFCFFF' },
  { id: 'storyboard', label: '分镜', color: '#7C3AED', bg: '#F5F3FF', bdr: '#DDD6FE' },
  { id: 'image', label: '图像', color: '#0891B2', bg: '#ECFEFF', bdr: '#A5F3FC' },
  { id: 'dubbing', label: '配音', color: '#DC2626', bg: '#FEF2F2', bdr: '#FCA5A5' },
  { id: 'video', label: '视频', color: '#16A34A', bg: '#ECFDF5', bdr: '#BBF7D0' },
  { id: 'character', label: '角色', color: '#D97706', bg: '#FFFBEB', bdr: '#FDE68A' },
  { id: 'polish', label: '润色', color: '#DB2777', bg: '#FDF2F8', bdr: '#FBCFE8' },
];

const taskMap = Object.fromEntries(ALL_TASKS.map((t) => [t.id, t]));

const PROVIDER_META: Record<string, { label: string; color: string; bg: string }> = {
  mock: { label: '内置', color: '#5A6070', bg: '#EEF0F4' },
  deepseek: { label: 'DeepSeek', color: '#2563EB', bg: '#EFF4FF' },
  dashscope: { label: '通义千问', color: '#E69500', bg: '#FFF3D0' },
  zhipu: { label: '智谱 GLM', color: '#0891B2', bg: '#ECFEFF' },
  openai: { label: 'OpenAI', color: '#16A34A', bg: '#ECFDF5' },
  custom: { label: '自定义', color: '#7C3AED', bg: '#F5F3FF' },
};

type TabKey = 'models' | 'defaults';

const ApiConfig: React.FC = () => {
  const [settings, setSettings] = useState<AIModelSettings>(() => loadModelSettings());
  const [tab, setTab] = useState<TabKey>('models');
  const [filterTask, setFilterTask] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<AIModelConfig | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const update = (next: AIModelSettings) => {
    setSettings(next);
    saveModelSettings(next);
  };

  const toggleEnabled = (id: string) => {
    update({
      ...settings,
      models: settings.models.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)),
    });
  };

  const deleteModel = (id: string) => {
    if (id === 'mock-default') return;
    if (!window.confirm('确定删除该模型配置？')) return;
    const defaults = { ...settings.defaults };
    for (const key of Object.keys(defaults) as AIModelPurpose[]) {
      if (defaults[key] === id) delete defaults[key];
    }
    update({ ...settings, models: settings.models.filter((m) => m.id !== id), defaults });
  };

  const saveModel = (m: AIModelConfig) => {
    const exists = settings.models.some((x) => x.id === m.id);
    update({
      ...settings,
      models: exists ? settings.models.map((x) => (x.id === m.id ? m : x)) : [...settings.models, m],
    });
    setShowModal(false);
    setEditingModel(null);
  };

  const addPreset = (key: string) => {
    const preset = MODEL_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    const existing = settings.models.find((m) => m.id === `preset-${preset.key}`);
    if (existing) {
      setNotice(`「${preset.label}」已添加，直接填写 API Key 并测试连接即可`);
      return;
    }
    const model: AIModelConfig = {
      id: `preset-${preset.key}`,
      name: `${preset.label} ${preset.model}`,
      provider: preset.provider,
      baseUrl: preset.baseUrl,
      apiKey: '',
      model: preset.model,
      enabled: true,
      purposes: preset.purposes,
    };
    // 自动接管仍指向 mock 的用途默认模型，让新服务商立即生效
    const newDefaults = { ...settings.defaults };
    for (const p of preset.purposes) {
      if (!newDefaults[p] || newDefaults[p] === 'mock-default') newDefaults[p] = model.id;
    }
    update({ ...settings, models: [...settings.models, model], defaults: newDefaults });
    setNotice(`已添加「${preset.label}」，请填写 API Key 并测试连接`);
  };

  const handleTest = async (m: AIModelConfig) => {
    setTestingId(m.id);
    const r = await testModelConnection(m);
    setTestResults((prev) => ({
      ...prev,
      [m.id]: { ok: r.ok, message: r.ok ? `连接正常 · ${r.latencyMs}ms` : r.error || '连接失败' },
    }));
    setTestingId(null);
  };

  const filtered = filterTask ? settings.models.filter((m) => m.purposes.includes(filterTask as AIModelPurpose)) : settings.models;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', padding: '0 24px', flexShrink: 0 }}>
        {([['models', '模型配置'], ['defaults', '默认模型分配']] as [TabKey, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === id ? `2px solid ${C.amber}` : '2px solid transparent',
              color: tab === id ? C.text : C.textSub,
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: tab === id ? 500 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: C.bg }}>
        <div
          style={{
            background: C.amberBg,
            border: `1px solid ${C.amberBdr}`,
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: 11,
            color: '#7A5500',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>API Key 仅保存在本机浏览器中，不会上传到任何服务器。请勿在公共设备上使用。</span>
          {notice && (
            <button
              onClick={() => setNotice(null)}
              style={{ background: 'transparent', border: 'none', color: '#7A5500', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
            >
              {notice} ✕
            </button>
          )}
        </div>

        {tab === 'models' ? (
          <ModelsTab
            models={filtered}
            allModels={settings.models}
            filterTask={filterTask}
            setFilterTask={setFilterTask}
            onToggle={toggleEnabled}
            onDelete={deleteModel}
            onEdit={(m) => {
              setEditingModel(m);
              setShowModal(true);
            }}
            onAddCustom={() => {
              setEditingModel(null);
              setShowModal(true);
            }}
            onAddPreset={addPreset}
            onTest={handleTest}
            testingId={testingId}
            testResults={testResults}
          />
        ) : (
          <DefaultsTab settings={settings} onSetDefault={(purpose, modelId) => update({ ...settings, defaults: { ...settings.defaults, [purpose]: modelId } })} />
        )}
      </div>

      {showModal && (
        <ModelModal
          model={editingModel}
          onSave={saveModel}
          onClose={() => {
            setShowModal(false);
            setEditingModel(null);
          }}
        />
      )}
    </div>
  );
};

function ModelsTab(props: {
  models: AIModelConfig[];
  allModels: AIModelConfig[];
  filterTask: string | null;
  setFilterTask: (v: string | null) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (m: AIModelConfig) => void;
  onAddCustom: () => void;
  onAddPreset: (key: string) => void;
  onTest: (m: AIModelConfig) => void;
  testingId: string | null;
  testResults: Record<string, { ok: boolean; message: string }>;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 980 }}>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: C.textMute, marginBottom: 10 }}>快捷添加服务商（自动填充 Base URL 与模型名）</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MODEL_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => props.onAddPreset(p.key)}
              title={p.description}
              style={{
                padding: '6px 14px',
                background: C.amberBg,
                border: `1px solid ${C.amberBdr}`,
                borderRadius: 20,
                fontSize: 11,
                color: '#7A5500',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              + {p.label}
            </button>
          ))}
          <button
            onClick={props.onAddCustom}
            style={{
              padding: '6px 14px',
              background: C.purpleBg,
              border: `1px solid #DDD6FE`,
              borderRadius: 20,
              fontSize: 11,
              color: C.purple,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            + 自定义模型
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => props.setFilterTask(null)}
          style={{
            padding: '4px 10px',
            background: props.filterTask === null ? C.amber : C.white,
            border: `1px solid ${props.filterTask === null ? C.amber : C.border}`,
            borderRadius: 20,
            fontSize: 11,
            color: props.filterTask === null ? '#fff' : C.textSub,
            cursor: 'pointer',
            fontWeight: props.filterTask === null ? 500 : 400,
          }}
        >
          全部
        </button>
        {ALL_TASKS.map((t) => (
          <button
            key={t.id}
            onClick={() => props.setFilterTask(props.filterTask === t.id ? null : t.id)}
            style={{
              padding: '4px 10px',
              background: props.filterTask === t.id ? t.bg : C.white,
              border: `1px solid ${props.filterTask === t.id ? t.bdr : C.border}`,
              borderRadius: 20,
              fontSize: 11,
              color: props.filterTask === t.id ? t.color : C.textSub,
              cursor: 'pointer',
              fontWeight: props.filterTask === t.id ? 500 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {props.models.map((m) => (
          <ModelCard
            key={m.id}
            model={m}
            onToggle={() => props.onToggle(m.id)}
            onEdit={() => props.onEdit(m)}
            onDelete={() => props.onDelete(m.id)}
            onTest={() => props.onTest(m)}
            testing={props.testingId === m.id}
            testResult={props.testResults[m.id]}
          />
        ))}
        {props.models.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: C.textMute, fontSize: 12 }}>
            没有符合该用途的模型，点击上方按钮添加
          </div>
        )}
      </div>

      <div style={{ fontSize: 10, color: C.textMute }}>
        当前共 {props.allModels.length} 个模型 · 启用 {props.allModels.filter((m) => m.enabled).length} 个
      </div>
    </div>
  );
}

function ModelCard(props: {
  model: AIModelConfig;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  testing: boolean;
  testResult?: { ok: boolean; message: string };
}) {
  const m = props.model;
  const prov = PROVIDER_META[m.provider] || PROVIDER_META.custom;
  const isMock = m.provider === 'mock';
  const result = props.testResult;
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${m.enabled ? C.border : '#ECEEF2'}`,
        borderRadius: 6,
        padding: '12px 14px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        opacity: m.enabled ? 1 : 0.65,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 6,
          background: prov.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 9, color: prov.color, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em' }}>
          {prov.label.slice(0, 3)}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{m.name}</span>
          <span style={{ fontSize: 9, background: prov.bg, color: prov.color, padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap' }}>{prov.label}</span>
          {isMock && <span style={{ fontSize: 9, background: C.greenBg, color: C.green, border: `1px solid ${C.greenBdr}`, padding: '1px 5px', borderRadius: 3 }}>离线可用</span>}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {m.purposes.map((tid) => {
            const t = taskMap[tid];
            if (!t) return null;
            return (
              <span key={tid} style={{ fontSize: 9, background: t.bg, color: t.color, border: `1px solid ${t.bdr}`, padding: '2px 7px', borderRadius: 20, fontWeight: 500 }}>
                {t.label}
              </span>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {m.baseUrl || '（未配置 Base URL）'} · {m.model || '（未填模型名）'}
        </div>
        {result && (
          <div style={{ marginTop: 6, fontSize: 10, color: result.ok ? C.green : C.red, fontFamily: "'JetBrains Mono', monospace" }}>
            {result.ok ? '✓' : '✗'} {result.message}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {!isMock && (
            <button
              onClick={props.onTest}
              disabled={props.testing || !m.apiKey || !m.baseUrl}
              style={{
                padding: '3px 8px',
                background: props.testing ? C.tag : C.blueBg,
                border: `1px solid ${props.testing ? C.border : C.blueBdr}`,
                borderRadius: 3,
                color: props.testing ? C.textMute : C.blue,
                fontSize: 10,
                cursor: props.testing || !m.apiKey ? 'default' : 'pointer',
              }}
            >
              {props.testing ? '测试中…' : '测试连接'}
            </button>
          )}
          <button onClick={props.onEdit} style={{ padding: '3px 8px', background: C.tag, border: `1px solid ${C.border}`, borderRadius: 3, color: C.textSub, fontSize: 10, cursor: 'pointer' }}>
            编辑
          </button>
          {!isMock && (
            <button onClick={props.onDelete} style={{ padding: '3px 8px', background: C.redBg, border: '1px solid #FCA5A5', borderRadius: 3, color: C.red, fontSize: 10, cursor: 'pointer' }}>
              删除
            </button>
          )}
          <Toggle on={m.enabled} onClick={props.onToggle} />
        </div>
      </div>
    </div>
  );
}

function ModelModal(props: { model: AIModelConfig | null; onSave: (m: AIModelConfig) => void; onClose: () => void }) {
  const model = props.model;
  const isEdit = !!model;
  const [form, setForm] = useState({
    name: model?.name || '',
    provider: model?.provider || 'custom',
    baseUrl: model?.baseUrl || '',
    model: model?.model || '',
    apiKey: model?.apiKey || '',
    purposes: (model?.purposes || []) as AIModelPurpose[],
    temperature: model?.temperature != null ? String(model.temperature) : '0.7',
    maxTokens: model?.maxTokens != null ? String(model.maxTokens) : '2048',
    enabled: model?.enabled ?? true,
  });
  const [showKey, setShowKey] = useState(false);

  const toggleTask = (tid: AIModelPurpose) =>
    setForm((f) => ({ ...f, purposes: f.purposes.includes(tid) ? f.purposes.filter((t) => t !== tid) : [...f.purposes, tid] }));

  const handleSave = () => {
    if (!form.name.trim() || !form.model.trim()) return;
    props.onSave({
      id: model?.id || `custom-${Date.now().toString(36)}`,
      name: form.name.trim(),
      provider: form.provider || 'custom',
      baseUrl: form.baseUrl.trim(),
      apiKey: form.apiKey,
      model: form.model.trim(),
      enabled: form.enabled,
      purposes: form.purposes.length ? form.purposes : ['generic'],
      temperature: parseFloat(form.temperature) || 0.7,
      maxTokens: parseInt(form.maxTokens, 10) || 2048,
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    background: '#F5F6F8',
    border: '1px solid #E4E7EE',
    borderRadius: 5,
    fontSize: 12,
    color: '#1A1D24',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,12,18,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ width: 560, background: C.white, borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.16)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "'Outfit', sans-serif" }}>{isEdit ? '编辑模型' : '添加模型'}</span>
          <button onClick={props.onClose} style={{ background: 'none', border: 'none', color: C.textMute, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Field label="模型名称 *" required>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. DeepSeek Chat" style={inputStyle} />
            </Field>
            <Field label="供应商标识">
              <input value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} placeholder="e.g. deepseek / openai / custom" style={inputStyle} />
            </Field>
          </div>
          <Field label="API Base URL" style={{ marginBottom: 12 }}>
            <input value={form.baseUrl} onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))} placeholder="https://api.example.com/v1" style={inputStyle} />
            <div style={{ fontSize: 10, color: C.textMute, marginTop: 4 }}>
              请填写 OpenAI 兼容端点。DeepSeek 填 https://api.deepseek.com/v1，不要填 /anthropic 端点
            </div>
          </Field>
          <Field label="模型名（model）*" style={{ marginBottom: 12 }}>
            <input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="e.g. deepseek-chat" style={inputStyle} />
          </Field>
          <Field label="API Key（仅保存在本地）" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder={isEdit && model?.apiKey ? '已配置，输入可替换' : 'sk-...'}
                style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                style={{ padding: '5px 10px', background: C.tag, border: `1px solid ${C.border}`, borderRadius: 4, color: C.textSub, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
          </Field>
          <Field label="适用用途" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
              {ALL_TASKS.map((t) => {
                const on = form.purposes.includes(t.id as AIModelPurpose);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTask(t.id as AIModelPurpose)}
                    style={{
                      padding: '5px 12px',
                      background: on ? t.bg : C.bg,
                      border: `1.5px solid ${on ? t.bdr : C.border}`,
                      borderRadius: 20,
                      fontSize: 11,
                      color: on ? t.color : C.textSub,
                      cursor: 'pointer',
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
            <Field label="Temperature">
              <input type="number" step="0.1" min="0" max="2" value={form.temperature} onChange={(e) => setForm((f) => ({ ...f, temperature: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Max Tokens">
              <input type="number" min="1" value={form.maxTokens} onChange={(e) => setForm((f) => ({ ...f, maxTokens: e.target.value }))} style={inputStyle} />
            </Field>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Toggle on={form.enabled} onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))} />
            <span style={{ fontSize: 11, color: C.textSub }}>启用该模型</span>
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={props.onClose} style={{ padding: '7px 16px', background: C.tag, border: `1px solid ${C.border}`, borderRadius: 5, color: C.textSub, fontSize: 12, cursor: 'pointer' }}>取消</button>
          <button
            onClick={handleSave}
            style={{
              padding: '7px 20px',
              background: !form.name || !form.model ? C.tag : C.amber,
              border: 'none',
              borderRadius: 5,
              color: !form.name || !form.model ? C.textMute : '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {isEdit ? '保存修改' : '添加模型'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DefaultsTab(props: { settings: AIModelSettings; onSetDefault: (purpose: AIModelPurpose, modelId: string) => void }) {
  const purposes = Object.keys(PURPOSE_LABELS) as AIModelPurpose[];
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ fontSize: 11, color: C.textMute, marginBottom: 14 }}>
        每个用途选择默认使用的模型。未配置时自动选择「启用且支持该用途」的第一个模型。
      </div>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
        {purposes.map((purpose, i, arr) => {
          const candidates = props.settings.models.filter((m) => m.enabled && m.purposes.includes(purpose));
          const current = props.settings.defaults[purpose] ?? '';
          return (
            <div
              key={purpose}
              style={{
                padding: '11px 16px',
                borderBottom: i < arr.length - 1 ? `1px solid ${C.bg}` : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{PURPOSE_LABELS[purpose]}</div>
                <div style={{ fontSize: 10, color: C.textMute, marginTop: 2 }}>{candidates.length ? `${candidates.length} 个可用模型` : '暂无启用且支持该用途的模型'}</div>
              </div>
              <select
                value={current}
                onChange={(e) => props.onSetDefault(purpose, e.target.value)}
                style={{
                  padding: '6px 10px',
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 5,
                  fontSize: 11,
                  color: C.text,
                  outline: 'none',
                  minWidth: 200,
                  cursor: 'pointer',
                }}
              >
                <option value="">自动选择</option>
                {candidates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ width: 34, height: 19, borderRadius: 10, background: on ? C.amber : '#D0D5E0', position: 'relative', cursor: 'pointer', flexShrink: 0 }}
    >
      <div style={{ position: 'absolute', top: 2.5, left: on ? 16 : 2.5, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
    </div>
  );
}

function Field({ label, children, style, required }: { label: string; children: React.ReactNode; style?: React.CSSProperties; required?: boolean }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
      </div>
      {children}
    </div>
  );
}

export default ApiConfig;
