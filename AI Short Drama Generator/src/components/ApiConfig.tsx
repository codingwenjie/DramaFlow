import { useState } from 'react'

const C = {
  bg:       '#F5F6F8',
  white:    '#FFFFFF',
  border:   '#E4E7EE',
  text:     '#1A1D24',
  textSub:  '#5A6070',
  textMute: '#9AA0B0',
  amber:    '#E69500',
  amberBg:  '#FFF3D0',
  amberBdr: '#F5C842',
  blue:     '#2563EB',
  blueBg:   '#EFF4FF',
  blueBdr:  '#BFCFFF',
  green:    '#16A34A',
  greenBg:  '#ECFDF5',
  greenBdr: '#BBF7D0',
  red:      '#DC2626',
  redBg:    '#FEF2F2',
  purple:   '#7C3AED',
  purpleBg: '#F5F3FF',
  tag:      '#EEF0F4',
}

// ─── Task tag definitions ───────────────────────────────────────────────────
export const ALL_TASKS = [
  { id: 'script',     label: '剧本',   color: '#2563EB', bg: '#EFF4FF', bdr: '#BFCFFF' },
  { id: 'storyboard', label: '分镜',   color: '#7C3AED', bg: '#F5F3FF', bdr: '#DDD6FE' },
  { id: 'image',      label: '图像',   color: '#0891B2', bg: '#ECFEFF', bdr: '#A5F3FC' },
  { id: 'dubbing',    label: '配音',   color: '#DC2626', bg: '#FEF2F2', bdr: '#FCA5A5' },
  { id: 'video',      label: '视频',   color: '#16A34A', bg: '#ECFDF5', bdr: '#BBF7D0' },
  { id: 'character',  label: '角色',   color: '#D97706', bg: '#FFFBEB', bdr: '#FDE68A' },
  { id: 'polish',     label: '润色',   color: '#DB2777', bg: '#FDF2F8', bdr: '#FBCFE8' },
]

const taskMap = Object.fromEntries(ALL_TASKS.map(t => [t.id, t]))

// ─── Model types ─────────────────────────────────────────────────────────────
interface Model {
  id: string
  provider: string
  name: string
  baseUrl: string
  apiKeyRef: string
  tasks: string[]
  enabled: boolean
  inPrice: number
  outPrice: number
  unit: string
  custom: boolean
}

const DEFAULT_MODELS: Model[] = [
  { id: 'gpt4o',      provider: 'OpenAI',      name: 'GPT-4o',             baseUrl: 'https://api.openai.com/v1',          apiKeyRef: 'openai',      tasks: ['script', 'polish'],            enabled: true,  inPrice: 5.0,   outPrice: 15.0, unit: '$/1M tokens', custom: false },
  { id: 'gpt4o-mini', provider: 'OpenAI',      name: 'GPT-4o mini',        baseUrl: 'https://api.openai.com/v1',          apiKeyRef: 'openai',      tasks: ['script'],                      enabled: false, inPrice: 0.15,  outPrice: 0.6,  unit: '$/1M tokens', custom: false },
  { id: 'claude3',    provider: 'Anthropic',   name: 'Claude 3.5 Sonnet',  baseUrl: 'https://api.anthropic.com',          apiKeyRef: 'anthropic',   tasks: ['storyboard', 'character'],     enabled: true,  inPrice: 3.0,   outPrice: 15.0, unit: '$/1M tokens', custom: false },
  { id: 'qwen',       provider: '阿里云',      name: 'Qwen-Max',           baseUrl: 'https://dashscope.aliyuncs.com/v1',  apiKeyRef: 'aliyun',      tasks: ['script'],                      enabled: true,  inPrice: 0.04,  outPrice: 0.12, unit: '¥/1K tokens', custom: false },
  { id: 'stable',     provider: 'Stability',   name: 'SDXL Turbo',         baseUrl: 'https://api.stability.ai/v1',        apiKeyRef: 'stability',   tasks: ['image'],                       enabled: false, inPrice: 0.002, outPrice: 0,    unit: '$/image',     custom: false },
  { id: 'flux',       provider: 'Black Forest', name: 'FLUX.1 Pro',         baseUrl: 'https://api.bfl.ml/v1',             apiKeyRef: 'bfl',         tasks: ['image', 'storyboard'],         enabled: false, inPrice: 0.055, outPrice: 0,    unit: '$/image',     custom: false },
  { id: 'elevenlabs', provider: 'ElevenLabs',  name: 'Multilingual v2',    baseUrl: 'https://api.elevenlabs.io/v1',       apiKeyRef: 'elevenlabs',  tasks: ['dubbing'],                     enabled: true,  inPrice: 0.3,   outPrice: 0,    unit: '$/1K chars',  custom: false },
  { id: 'runway',     provider: 'Runway',      name: 'Gen-3 Alpha',        baseUrl: 'https://api.runwayml.com/v1',        apiKeyRef: 'runway',      tasks: ['video'],                       enabled: false, inPrice: 0.05,  outPrice: 0,    unit: '$/second',    custom: false },
  { id: 'kling',      provider: '快手',        name: 'Kling AI 1.6',       baseUrl: 'https://api.kling.kuaishou.com/v1',  apiKeyRef: 'kling',       tasks: ['video'],                       enabled: false, inPrice: 0.14,  outPrice: 0,    unit: '¥/second',    custom: false },
]

const API_KEY_DEFS = [
  { id: 'openai',     label: 'OpenAI',      placeholder: 'sk-proj-…' },
  { id: 'anthropic',  label: 'Anthropic',   placeholder: 'sk-ant-…' },
  { id: 'aliyun',     label: '阿里云 DashScope', placeholder: 'sk-…' },
  { id: 'stability',  label: 'Stability AI', placeholder: 'sk-…' },
  { id: 'bfl',        label: 'Black Forest (FLUX)', placeholder: '…' },
  { id: 'elevenlabs', label: 'ElevenLabs',  placeholder: 'el_…' },
  { id: 'runway',     label: 'Runway',      placeholder: 'rw-…' },
  { id: 'kling',      label: '快手 Kling',  placeholder: 'kling-…' },
]

const PROVIDER_COLORS: Record<string, { color: string; bg: string }> = {
  'OpenAI':       { color: '#16A34A', bg: '#ECFDF5' },
  'Anthropic':    { color: '#7C3AED', bg: '#F5F3FF' },
  '阿里云':       { color: '#E69500', bg: '#FFF3D0' },
  'Stability':    { color: '#2563EB', bg: '#EFF4FF' },
  'Black Forest': { color: '#0891B2', bg: '#ECFEFF' },
  'ElevenLabs':   { color: '#DC2626', bg: '#FEF2F2' },
  'Runway':       { color: '#DB2777', bg: '#FDF2F8' },
  '快手':         { color: '#D97706', bg: '#FFFBEB' },
}

// ─── Daily usage data ────────────────────────────────────────────────────────
const DAILY = [
  { date: '7/23', script: 8200,  storyboard: 14200, dubbing: 3800, video: 0 },
  { date: '7/24', script: 12400, storyboard: 22000, dubbing: 5200, video: 0 },
  { date: '7/25', script: 6800,  storyboard: 18400, dubbing: 4100, video: 18000 },
  { date: '7/26', script: 9600,  storyboard: 16800, dubbing: 6800, video: 0 },
  { date: '7/27', script: 14200, storyboard: 24600, dubbing: 8200, video: 24000 },
  { date: '7/28', script: 4200,  storyboard: 8400,  dubbing: 2100, video: 0 },
  { date: '7/29', script: 7800,  storyboard: 12000, dubbing: 3600, video: 0 },
  { date: '7/30', script: 16800, storyboard: 28400, dubbing: 9200, video: 32000 },
  { date: '7/31', script: 11200, storyboard: 19600, dubbing: 5800, video: 18000 },
  { date: '8/1',  script: 9400,  storyboard: 21200, dubbing: 7400, video: 0 },
  { date: '8/2',  script: 13600, storyboard: 26000, dubbing: 8800, video: 24000 },
  { date: '8/3',  script: 8200,  storyboard: 14400, dubbing: 4200, video: 0 },
  { date: '8/4',  script: 10800, storyboard: 18800, dubbing: 6200, video: 18000 },
  { date: '8/5',  script: 14200, storyboard: 22400, dubbing: 7800, video: 0 },
]

type TabKey = 'models' | 'tokens' | 'billing'

// ─── Empty model form ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  provider: '', name: '', baseUrl: '', apiKeyRef: 'custom',
  tasks: [] as string[], inPrice: '', outPrice: '', unit: '$/1M tokens',
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ApiConfig() {
  const [tab, setTab] = useState<TabKey>('models')
  const [models, setModels] = useState<Model[]>(DEFAULT_MODELS)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai:     'sk-proj-••••••••••••••••••••••••',
    anthropic:  'sk-ant-api03-••••••••••••••••••',
    aliyun:     '•••••••••••••••••••••••••••••••',
    elevenlabs: 'el_••••••••••••••••••••••••••••',
  })
  const [budget, setBudget] = useState('500')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', padding: '0 24px', flexShrink: 0 }}>
        {([['models', '模型配置'], ['tokens', 'Token 统计'], ['billing', '费用与预算']] as [TabKey, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: tab === id ? `2px solid ${C.amber}` : '2px solid transparent', color: tab === id ? C.text : C.textSub, fontSize: 12, cursor: 'pointer', fontWeight: tab === id ? 500 : 400 }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: C.bg }}>
        {tab === 'models'  && <ModelsTab models={models} setModels={setModels} apiKeys={apiKeys} setApiKeys={setApiKeys} />}
        {tab === 'tokens'  && <TokensTab />}
        {tab === 'billing' && <BillingTab budget={budget} setBudget={setBudget} />}
      </div>
    </div>
  )
}

// ─── Models Tab ───────────────────────────────────────────────────────────────
function ModelsTab({ models, setModels, apiKeys, setApiKeys }: {
  models: Model[]
  setModels: (m: Model[]) => void
  apiKeys: Record<string, string>
  setApiKeys: (k: Record<string, string>) => void
}) {
  const [filterTask, setFilterTask] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [showKeyFor, setShowKeyFor] = useState<string | null>(null)

  const filtered = filterTask ? models.filter(m => m.tasks.includes(filterTask)) : models

  const toggleModel = (id: string) =>
    setModels(models.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m))

  const deleteModel = (id: string) =>
    setModels(models.filter(m => m.id !== id))

  const saveModel = (m: Model) => {
    if (models.find(x => x.id === m.id)) {
      setModels(models.map(x => x.id === m.id ? m : x))
    } else {
      setModels([...models, m])
    }
    setEditingModel(null)
    setShowAddModal(false)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 284px', gap: 24 }}>
      {/* Left: model list */}
      <div>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterTask(null)}
            style={{ padding: '4px 10px', background: filterTask === null ? C.amber : C.white, border: `1px solid ${filterTask === null ? C.amber : C.border}`, borderRadius: 20, fontSize: 11, color: filterTask === null ? '#fff' : C.textSub, cursor: 'pointer', fontWeight: filterTask === null ? 500 : 400, transition: 'all 0.15s' }}>
            全部
          </button>
          {ALL_TASKS.map(t => (
            <button key={t.id} onClick={() => setFilterTask(filterTask === t.id ? null : t.id)}
              style={{ padding: '4px 10px', background: filterTask === t.id ? t.bg : C.white, border: `1px solid ${filterTask === t.id ? t.bdr : C.border}`, borderRadius: 20, fontSize: 11, color: filterTask === t.id ? t.color : C.textSub, cursor: 'pointer', fontWeight: filterTask === t.id ? 500 : 400, transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => { setEditingModel(null); setShowAddModal(true) }}
            style={{ padding: '6px 14px', background: C.amber, border: 'none', borderRadius: 5, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            + 自定义模型
          </button>
        </div>

        {/* Model cards */}
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map(m => (
            <ModelCard
              key={m.id} model={m}
              onToggle={() => toggleModel(m.id)}
              onEdit={() => { setEditingModel(m); setShowAddModal(true) }}
              onDelete={() => deleteModel(m.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: C.textMute, fontSize: 12 }}>
              没有符合该标签的模型
            </div>
          )}
        </div>
      </div>

      {/* Right: API keys */}
      <div>
        <SectionTitle>API 密钥</SectionTitle>
        <div style={{ display: 'grid', gap: 8 }}>
          {API_KEY_DEFS.map(k => {
            const hasKey = !!apiKeys[k.id]
            return (
              <div key={k.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 5, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: C.textSub, fontWeight: 500 }}>{k.label}</span>
                  {hasKey
                    ? <span style={{ fontSize: 9, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBdr}`, padding: '1px 5px', borderRadius: 3 }}>已配置</span>
                    : <span style={{ fontSize: 9, color: C.textMute, background: C.tag, padding: '1px 5px', borderRadius: 3 }}>未配置</span>
                  }
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <input
                    type={showKeyFor === k.id ? 'text' : 'password'}
                    value={apiKeys[k.id] || ''}
                    onChange={e => setApiKeys({ ...apiKeys, [k.id]: e.target.value })}
                    placeholder={k.placeholder}
                    style={{ flex: 1, padding: '5px 8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 10, color: C.text, outline: 'none', fontFamily: "'JetBrains Mono', monospace", minWidth: 0 }}
                  />
                  <button onClick={() => setShowKeyFor(showKeyFor === k.id ? null : k.id)}
                    style={{ padding: '5px 7px', background: C.tag, border: `1px solid ${C.border}`, borderRadius: 4, color: C.textSub, fontSize: 10, cursor: 'pointer' }}>
                    {showKeyFor === k.id ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {/* Custom key row */}
        <div style={{ marginTop: 8, background: C.white, border: `1px solid ${C.border}`, borderRadius: 5, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: C.textSub, fontWeight: 500, marginBottom: 6 }}>自定义 Key（custom）</div>
          <input placeholder="用于自定义模型的 API Key"
            style={{ width: '100%', padding: '5px 8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 10, color: C.text, outline: 'none', fontFamily: "'JetBrains Mono', monospace", boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <ModelModal
          model={editingModel}
          onSave={saveModel}
          onClose={() => { setShowAddModal(false); setEditingModel(null) }}
        />
      )}
    </div>
  )
}

// ─── Model Card ───────────────────────────────────────────────────────────────
function ModelCard({ model, onToggle, onEdit, onDelete }: { model: Model; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const prov = PROVIDER_COLORS[model.provider] || { color: C.textSub, bg: C.tag }

  return (
    <div style={{ background: C.white, border: `1px solid ${model.enabled ? C.border : '#ECEEF2'}`, borderRadius: 6, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', opacity: model.enabled ? 1 : 0.65, transition: 'all 0.2s' }}>
      {/* Provider badge */}
      <div style={{ width: 34, height: 34, borderRadius: 6, background: prov.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: prov.color, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', textAlign: 'center', lineHeight: 1.2 }}>
          {model.provider.slice(0, 3)}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{model.name}</span>
          <span style={{ fontSize: 9, background: prov.bg, color: prov.color, padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap' }}>{model.provider}</span>
          {model.custom && <span style={{ fontSize: 9, background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBdr}`, padding: '1px 5px', borderRadius: 3 }}>自定义</span>}
        </div>

        {/* Task tags */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {model.tasks.map(tid => {
            const t = taskMap[tid]
            if (!t) return null
            return (
              <span key={tid} style={{ fontSize: 9, background: t.bg, color: t.color, border: `1px solid ${t.bdr}`, padding: '2px 7px', borderRadius: 20, fontWeight: 500 }}>
                {t.label}
              </span>
            )
          })}
        </div>

        {/* Base URL */}
        <div style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {model.baseUrl}
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: C.amber, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
            {model.inPrice > 0 && model.outPrice > 0
              ? `${model.inPrice} / ${model.outPrice}`
              : `${model.inPrice || model.outPrice || '—'}`}
          </div>
          <div style={{ fontSize: 9, color: C.textMute }}>{model.unit}</div>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <button onClick={onEdit}
            style={{ padding: '3px 8px', background: C.tag, border: `1px solid ${C.border}`, borderRadius: 3, color: C.textSub, fontSize: 10, cursor: 'pointer' }}>
            编辑
          </button>
          {model.custom && (
            <button onClick={onDelete}
              style={{ padding: '3px 8px', background: C.redBg, border: `1px solid #FCA5A5`, borderRadius: 3, color: C.red, fontSize: 10, cursor: 'pointer' }}>
              删除
            </button>
          )}
          <Toggle on={model.enabled} onClick={onToggle} />
        </div>
      </div>
    </div>
  )
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function ModelModal({ model, onSave, onClose }: { model: Model | null; onSave: (m: Model) => void; onClose: () => void }) {
  const isEdit = !!model
  const [form, setForm] = useState({
    provider:  model?.provider  || '',
    name:      model?.name      || '',
    baseUrl:   model?.baseUrl   || '',
    apiKeyRef: model?.apiKeyRef || 'custom',
    tasks:     model?.tasks     || [] as string[],
    inPrice:   model ? String(model.inPrice)  : '',
    outPrice:  model ? String(model.outPrice) : '',
    unit:      model?.unit      || '$/1M tokens',
  })

  const toggleTask = (tid: string) =>
    setForm(f => ({ ...f, tasks: f.tasks.includes(tid) ? f.tasks.filter(t => t !== tid) : [...f.tasks, tid] }))

  const handleSave = () => {
    if (!form.name.trim() || !form.provider.trim()) return
    const m: Model = {
      id:        model?.id || `custom-${Date.now()}`,
      provider:  form.provider,
      name:      form.name,
      baseUrl:   form.baseUrl,
      apiKeyRef: form.apiKeyRef,
      tasks:     form.tasks,
      enabled:   model?.enabled ?? true,
      inPrice:   parseFloat(form.inPrice) || 0,
      outPrice:  parseFloat(form.outPrice) || 0,
      unit:      form.unit,
      custom:    true,
    }
    onSave(m)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,12,18,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ width: 520, background: C.white, borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.16)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "'Outfit', sans-serif" }}>
            {isEdit ? '编辑模型' : '添加自定义模型'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMute, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Field label="模型名称 *" required>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. GPT-4o" style={inputStyle} />
            </Field>
            <Field label="供应商 *" required>
              <input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                placeholder="e.g. OpenAI" style={inputStyle} />
            </Field>
          </div>

          {/* Base URL */}
          <Field label="API Base URL" style={{ marginBottom: 12 }}>
            <input value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
              placeholder="https://api.example.com/v1" style={inputStyle} />
          </Field>

          {/* API Key Ref */}
          <Field label="使用哪个 API Key" style={{ marginBottom: 16 }}>
            <select value={form.apiKeyRef} onChange={e => setForm(f => ({ ...f, apiKeyRef: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}>
              {[...API_KEY_DEFS, { id: 'custom', label: '自定义 Key (custom)' }].map(k => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </select>
          </Field>

          {/* Task Tags */}
          <Field label="适用任务标签" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
              {ALL_TASKS.map(t => {
                const on = form.tasks.includes(t.id)
                return (
                  <button key={t.id} onClick={() => toggleTask(t.id)}
                    style={{ padding: '5px 12px', background: on ? t.bg : C.bg, border: `1.5px solid ${on ? t.bdr : C.border}`, borderRadius: 20, fontSize: 11, color: on ? t.color : C.textSub, cursor: 'pointer', fontWeight: on ? 600 : 400, transition: 'all 0.15s' }}>
                    {t.label}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Pricing */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 4 }}>
            <Field label="输入价格">
              <input type="number" value={form.inPrice} onChange={e => setForm(f => ({ ...f, inPrice: e.target.value }))}
                placeholder="0.00" style={inputStyle} />
            </Field>
            <Field label="输出价格">
              <input type="number" value={form.outPrice} onChange={e => setForm(f => ({ ...f, outPrice: e.target.value }))}
                placeholder="0.00" style={inputStyle} />
            </Field>
            <Field label="计费单位">
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {['$/1M tokens', '¥/1K tokens', '$/image', '$/second', '$/1K chars', '¥/second'].map(u => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}
            style={{ padding: '7px 16px', background: C.tag, border: `1px solid ${C.border}`, borderRadius: 5, color: C.textSub, fontSize: 12, cursor: 'pointer' }}>
            取消
          </button>
          <button onClick={handleSave}
            style={{ padding: '7px 20px', background: !form.name || !form.provider ? C.tag : C.amber, border: 'none', borderRadius: 5, color: !form.name || !form.provider ? C.textMute : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s' }}>
            {isEdit ? '保存修改' : '添加模型'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', background: '#F5F6F8', border: '1px solid #E4E7EE',
  borderRadius: 5, fontSize: 12, color: '#1A1D24', outline: 'none',
  fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
}

function Field({ label, children, style, required }: { label: string; children: React.ReactNode; style?: React.CSSProperties; required?: boolean }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 10, color: C.textMute, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}{required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
      </div>
      {children}
    </div>
  )
}

// ─── Tokens Tab ───────────────────────────────────────────────────────────────
function TokensTab() {
  const COLORS = { script: C.blue, storyboard: '#7C3AED', dubbing: C.red, video: C.green } as const
  const LABELS = { script: '剧本', storyboard: '分镜', dubbing: '配音', video: '视频' }
  const maxVal = Math.max(...DAILY.map(d => d.script + d.storyboard + d.dubbing + d.video))

  const totalByType = {
    script:     DAILY.reduce((s, d) => s + d.script, 0),
    storyboard: DAILY.reduce((s, d) => s + d.storyboard, 0),
    dubbing:    DAILY.reduce((s, d) => s + d.dubbing, 0),
    video:      DAILY.reduce((s, d) => s + d.video, 0),
  }
  const grand = Object.values(totalByType).reduce((s, v) => s + v, 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {(Object.entries(totalByType) as [keyof typeof totalByType, number][]).map(([type, val]) => (
          <div key={type} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: C.textSub }}>{LABELS[type]}</span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[type], marginTop: 2 }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmtK(val)}</div>
            <div style={{ fontSize: 9, color: C.textMute, marginTop: 2 }}>tokens · {Math.round(val / grand * 100)}%</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'Outfit', sans-serif" }}>14天用量趋势</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {(Object.entries(LABELS) as [string, string][]).map(([type, label]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 3, background: COLORS[type as keyof typeof COLORS], borderRadius: 2 }} />
                <span style={{ fontSize: 10, color: C.textSub }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 110 }}>
          {DAILY.map(d => {
            const total = d.script + d.storyboard + d.dubbing + d.video
            const h = (total / maxVal) * 100
            return (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: h, display: 'flex', flexDirection: 'column-reverse', borderRadius: '2px 2px 0 0', overflow: 'hidden' }}>
                  {(['script', 'storyboard', 'dubbing', 'video'] as const).map(type => {
                    const frac = total > 0 ? d[type] / total : 0
                    return frac > 0 ? <div key={type} style={{ width: '100%', height: `${frac * 100}%`, background: COLORS[type], minHeight: 2 }} /> : null
                  })}
                </div>
                <span style={{ fontSize: 8, color: C.textMute, fontFamily: "'JetBrains Mono', monospace" }}>{d.date}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 14, fontFamily: "'Outfit', sans-serif" }}>模型用量明细（本月）</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {['模型', '供应商', '输入', '输出', '调用次数', '费用'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0 0 8px', fontSize: 10, color: C.textMute, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'GPT-4o',            prov: 'OpenAI',     inTok: 68400,  outTok: 24200, calls: 142, cost: 1.30 },
              { name: 'Claude 3.5 Sonnet', prov: 'Anthropic',  inTok: 142800, outTok: 38600, calls: 287, cost: 1.01 },
              { name: 'Qwen-Max',          prov: '阿里云',     inTok: 312000, outTok: 98400, calls: 512, cost: 0.24 },
              { name: 'SDXL Turbo',        prov: 'Stability',  inTok: 0,      outTok: 0,    calls: 184, cost: 0.37 },
              { name: 'Multilingual v2',   prov: 'ElevenLabs', inTok: 0,      outTok: 0,    calls: 891, cost: 2.67 },
            ].map((r, i, arr) => (
              <tr key={r.name} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.bg}` : 'none' }}>
                <td style={{ padding: '8px 0', fontSize: 11, color: C.text, fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: '8px 0', fontSize: 10, color: C.textSub }}>{r.prov}</td>
                <td style={{ padding: '8px 0', fontSize: 11, color: C.textSub, fontFamily: "'JetBrains Mono', monospace" }}>{r.inTok > 0 ? fmtK(r.inTok) : '—'}</td>
                <td style={{ padding: '8px 0', fontSize: 11, color: C.textSub, fontFamily: "'JetBrains Mono', monospace" }}>{r.outTok > 0 ? fmtK(r.outTok) : '—'}</td>
                <td style={{ padding: '8px 0', fontSize: 11, color: C.textSub, fontFamily: "'JetBrains Mono', monospace" }}>{r.calls}</td>
                <td style={{ padding: '8px 0', fontSize: 12, color: C.amber, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>¥{r.cost.toFixed(2)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${C.border}` }}>
              <td colSpan={5} style={{ padding: '10px 0', fontSize: 11, color: C.textSub, fontWeight: 600 }}>合计</td>
              <td style={{ padding: '10px 0', fontSize: 14, color: C.amber, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>¥5.59</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────
function BillingTab({ budget, setBudget }: { budget: string; setBudget: (v: string) => void }) {
  const used = 5.59
  const limit = parseFloat(budget) || 500
  const pct = Math.min(100, (used / limit) * 100)

  const UNIT_COSTS = { script: 0.000488, storyboard: 0.000540, image: 0.002, dubbing: 0.003, video: 0.050 }
  const [scenes, setScenes]   = useState(24)
  const [shots, setShots]     = useState(6)
  const [lines, setLines]     = useState(40)
  const [videoDur, setVideoDur] = useState(18)

  const estimate =
    scenes * UNIT_COSTS.script +
    scenes * shots * (UNIT_COSTS.storyboard + UNIT_COSTS.image) +
    lines * UNIT_COSTS.dubbing +
    videoDur * 60 * UNIT_COSTS.video

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
      <div>
        <SectionTitle>本月费用总览</SectionTitle>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '18px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 700, color: C.text, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>¥{used.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: C.textMute, marginTop: 4 }}>截止今日 · 8月份</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: C.textSub, marginBottom: 4 }}>月度预算</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 13, color: C.textMute }}>¥</span>
                <input value={budget} onChange={e => setBudget(e.target.value)}
                  style={{ width: 72, padding: '5px 8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5, fontSize: 14, color: C.text, outline: 'none', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right', fontWeight: 700 }} />
              </div>
            </div>
          </div>
          <div style={{ height: 8, background: C.tag, borderRadius: 4, marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? C.red : C.amber, borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textMute }}>
            <span>已用 {pct.toFixed(1)}%</span>
            <span>剩余 ¥{(limit - used).toFixed(2)}</span>
          </div>
        </div>

        <SectionTitle>项目费用</SectionTitle>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
          {[
            { name: '都市迷情·第三季', cost: 2.14, tokens: 142800, pct: 38 },
            { name: '重生之巅峰时代',  cost: 1.42, tokens: 89200,  pct: 26 },
            { name: '霸总的秘密花园', cost: 1.79, tokens: 234600, pct: 32 },
            { name: '穿越之绝代风华', cost: 0.24, tokens: 12400,  pct: 4  },
          ].map((p, i, arr) => (
            <div key={p.name} style={{ padding: '11px 16px', borderBottom: i < arr.length - 1 ? `1px solid ${C.bg}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: C.text, fontWeight: 500, marginBottom: 5 }}>{p.name}</div>
                <div style={{ height: 3, background: C.tag, borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${p.pct}%`, background: C.amber, borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: C.amber, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>¥{p.cost.toFixed(2)}</div>
                <div style={{ fontSize: 9, color: C.textMute }}>{fmtK(p.tokens)} tokens</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: C.amberBg, border: `1px solid ${C.amberBdr}`, borderRadius: 6, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#7A5500', fontWeight: 500 }}>预算预警</div>
            <div style={{ fontSize: 10, color: '#9A7020', marginTop: 2 }}>超过预算 80% 时发送邮件通知</div>
          </div>
          <Toggle on={true} onClick={() => {}} />
        </div>
      </div>

      {/* Calculator */}
      <div>
        <SectionTitle>成本估算器</SectionTitle>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, color: C.textMute, marginBottom: 14 }}>拖动滑块预估项目生成成本</div>
          {[
            { label: '幕次数量',     value: scenes,   set: setScenes,   unit: '幕',  min: 1,  max: 60  },
            { label: '每幕平均镜头', value: shots,    set: setShots,    unit: '个',  min: 1,  max: 20  },
            { label: '总台词数量',   value: lines,    set: setLines,    unit: '条',  min: 10, max: 200 },
            { label: '成片总时长',   value: videoDur, set: setVideoDur, unit: '分钟', min: 1,  max: 60  },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: C.textSub }}>{item.label}</span>
                <span style={{ fontSize: 11, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{item.value} {item.unit}</span>
              </div>
              <input type="range" min={item.min} max={item.max} value={item.value}
                onChange={e => item.set(Number(e.target.value))}
                style={{ width: '100%', accentColor: C.amber }} />
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 6 }}>
            {[
              { label: '剧本 + 润色', cost: scenes * UNIT_COSTS.script },
              { label: '分镜描述',    cost: scenes * shots * UNIT_COSTS.storyboard },
              { label: '分镜图像',    cost: scenes * shots * UNIT_COSTS.image },
              { label: '角色配音',    cost: lines * UNIT_COSTS.dubbing },
              { label: '视频合成',    cost: videoDur * 60 * UNIT_COSTS.video },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: C.textSub }}>{r.label}</span>
                <span style={{ fontSize: 11, color: C.textSub, fontFamily: "'JetBrains Mono', monospace" }}>¥{r.cost.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>预估总费用</span>
              <span style={{ fontSize: 22, color: C.amber, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>¥{estimate.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────
function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ width: 34, height: 19, borderRadius: 10, background: on ? C.amber : '#D0D5E0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2.5, left: on ? 16 : 2.5, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#1A1D24', fontFamily: "'Outfit', sans-serif" }}>{children}</h3>
}

function fmtK(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`
  return String(n)
}
