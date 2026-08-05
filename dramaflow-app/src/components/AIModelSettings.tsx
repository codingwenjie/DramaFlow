import React, { useState, useMemo } from 'react';
import { C } from '../constants';
import { Button } from './common';
import {
  AIModelConfig,
  AIModelPurpose,
  AIModelSettings as AIModelSettingsType,
  loadModelSettings,
  saveModelSettings,
  createEmptyModel,
  PURPOSE_LABELS,
  PURPOSE_DESCRIPTIONS,
} from '../services';

const PROVIDER_LABELS: Record<AIModelConfig['provider'], string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  custom: '自定义 API',
  mock: '模拟 AI',
};

const ALL_PURPOSES: AIModelPurpose[] = [
  'script',
  'polish',
  'storyboard',
  'character',
  'suggestion',
  'image',
  'dubbing',
  'video',
  'generic',
];

const AIModelSettings: React.FC = () => {
  const [settings, setSettings] = useState<AIModelSettingsType>(() => loadModelSettings());
  const [selectedId, setSelectedId] = useState<string | null>(settings.models[0]?.id ?? null);
  const [saved, setSaved] = useState(false);

  const selectedModel = useMemo(
    () => settings.models.find((m) => m.id === selectedId) || null,
    [settings, selectedId]
  );

  const updateModel = (id: string, updates: Partial<AIModelConfig>) => {
    setSettings((prev) => ({
      ...prev,
      models: prev.models.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
    setSaved(false);
  };

  const updateDefaults = (purpose: AIModelPurpose, modelId: string) => {
    setSettings((prev) => ({
      ...prev,
      defaults: { ...prev.defaults, [purpose]: modelId },
    }));
    setSaved(false);
  };

  const togglePurpose = (id: string, purpose: AIModelPurpose, checked: boolean) => {
    const model = settings.models.find((m) => m.id === id);
    if (!model) return;
    const purposes = checked
      ? [...model.purposes, purpose]
      : model.purposes.filter((p) => p !== purpose);
    updateModel(id, { purposes });
  };

  const addModel = () => {
    const newModel = createEmptyModel(['generic']);
    setSettings((prev) => ({ ...prev, models: [...prev.models, newModel] }));
    setSelectedId(newModel.id);
    setSaved(false);
  };

  const removeModel = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      models: prev.models.filter((m) => m.id !== id),
      defaults: Object.fromEntries(
        Object.entries(prev.defaults).filter(([, v]) => v !== id)
      ) as AIModelSettingsType['defaults'],
    }));
    if (selectedId === id) setSelectedId(null);
    setSaved(false);
  };

  const handleSave = () => {
    saveModelSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getDefaultModelForPurpose = (purpose: AIModelPurpose): string => {
    return settings.defaults[purpose] || '';
  };

  const enabledModelsForPurpose = (purpose: AIModelPurpose) =>
    settings.models.filter((m) => m.enabled && m.purposes.includes(purpose));

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: C.bg,
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${C.border}`,
          background: C.card,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>AI 模型配置</div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>
            按专业用途配置不同模型，生成剧本、分镜、角色、配音、视频等可分别指定
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && (
            <span style={{ fontSize: 12, color: C.green }}>已保存</span>
          )}
          <Button variant="primary" onClick={handleSave}>
            保存配置
          </Button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: model list */}
        <div
          style={{
            width: 240,
            minWidth: 240,
            borderRight: `1px solid ${C.border}`,
            background: C.sidebar,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '12px 12px 8px',
              fontSize: 10,
              color: C.textMute,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            模型列表
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
            {settings.models.map((model) => (
              <div
                key={model.id}
                onClick={() => setSelectedId(model.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  marginBottom: 4,
                  background: selectedId === model.id ? C.active : 'transparent',
                  borderLeft: selectedId === model.id ? `2px solid ${C.amber}` : '2px solid transparent',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: selectedId === model.id ? C.amber : C.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: model.enabled ? C.green : C.textMute,
                    }}
                  />
                  {model.name || '未命名模型'}
                </div>
                <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                  {PROVIDER_LABELS[model.provider]} · {model.purposes.length} 个用途
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: 12, borderTop: `1px solid ${C.border}` }}>
            <Button variant="secondary" onClick={addModel} style={{ width: '100%' }}>
              + 添加模型
            </Button>
          </div>
        </div>

        {/* Middle: model editor */}
        <div
          style={{
            flex: 1,
            minWidth: 320,
            padding: 20,
            overflow: 'auto',
            borderRight: `1px solid ${C.border}`,
          }}
        >
          {selectedModel ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>模型信息</div>
                <button
                  onClick={() => removeModel(selectedModel.id)}
                  style={{
                    fontSize: 12,
                    color: '#E53935',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  删除模型
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: C.textSub }}>显示名称</label>
                <input
                  value={selectedModel.name}
                  onChange={(e) => updateModel(selectedModel.id, { name: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: C.textSub }}>Provider</label>
                <select
                  value={selectedModel.provider}
                  onChange={(e) =>
                    updateModel(selectedModel.id, { provider: e.target.value as AIModelConfig['provider'] })
                  }
                  style={inputStyle}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="custom">自定义 API</option>
                  <option value="mock">模拟 AI（离线）</option>
                </select>
              </div>

              {selectedModel.provider !== 'mock' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, color: C.textSub }}>Base URL</label>
                    <input
                      value={selectedModel.baseUrl}
                      onChange={(e) => updateModel(selectedModel.id, { baseUrl: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, color: C.textSub }}>API Key</label>
                    <input
                      type="password"
                      value={selectedModel.apiKey}
                      onChange={(e) => updateModel(selectedModel.id, { apiKey: e.target.value })}
                      placeholder="sk-..."
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, color: C.textSub }}>模型名称</label>
                    <input
                      value={selectedModel.model}
                      onChange={(e) => updateModel(selectedModel.id, { model: e.target.value })}
                      placeholder="gpt-4o"
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="enabled"
                  checked={selectedModel.enabled}
                  onChange={(e) => updateModel(selectedModel.id, { enabled: e.target.checked })}
                />
                <label htmlFor="enabled" style={{ fontSize: 13, color: C.text }}>
                  启用该模型
                </label>
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 8 }}>
                支持的用途
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ALL_PURPOSES.map((purpose) => (
                  <label
                    key={purpose}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 10,
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedModel.purposes.includes(purpose)}
                      onChange={(e) => togglePurpose(selectedModel.id, purpose, e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
                        {PURPOSE_LABELS[purpose]}
                      </div>
                      <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                        {PURPOSE_DESCRIPTIONS[purpose]}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: C.textMute, fontSize: 14 }}>请选择一个模型进行编辑，或添加新模型</div>
          )}
        </div>

        {/* Right: purpose defaults */}
        <div style={{ width: 300, minWidth: 300, padding: 20, background: C.sidebar, overflow: 'auto' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>
            默认模型分配
          </div>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 16 }}>
            每个专业用途可以选择默认使用哪个模型
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ALL_PURPOSES.map((purpose) => {
              const options = enabledModelsForPurpose(purpose);
              return (
                <div key={purpose}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 4 }}>
                    {PURPOSE_LABELS[purpose]}
                  </div>
                  <select
                    value={getDefaultModelForPurpose(purpose)}
                    onChange={(e) => updateDefaults(purpose, e.target.value)}
                    style={{ ...inputStyle, background: C.card }}
                    disabled={options.length === 0}
                  >
                    {options.length === 0 ? (
                      <option value="">无可用模型</option>
                    ) : (
                      options.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))
                    )}
                  </select>
                  <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                    {PURPOSE_DESCRIPTIONS[purpose]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  height: 34,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  padding: '0 10px',
  fontSize: 13,
  background: C.card,
  color: C.text,
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

export default AIModelSettings;
