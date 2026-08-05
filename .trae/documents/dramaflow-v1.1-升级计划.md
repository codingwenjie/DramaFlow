# DramaFlow v1.1 升级计划

## 概述

DramaFlow 桌面端应用已完成 MVP 阶段，核心功能模块完整。当前版本已完成状态管理、数据层重构、AI 服务集成和 UI 完善，剩余 Electron 打包收尾和验证工作。

---

## 当前状态（2026-08-05）

### ✅ 已完成（20/23 子任务）

#### Task 1: 引入 Zustand 状态管理 ✅
- [x] 1.1 安装 `zustand` 依赖
- [x] 1.2 创建 `src/store/useAppStore.ts`
- [x] 1.3 创建 `src/store/useProjectStore.ts`
- [x] 1.4 重构 `App.tsx`，使用 Zustand store
- [x] 1.5 重构 `Sidebar`、`Topbar`、`TabNav` 从 store 读取数据

#### Task 2: 数据层重构 ✅
- [x] 2.1 扩展 `storage.ts`，新增 `saveModuleData/loadModuleData`
- [x] 2.2 项目隔离的数据存储空间（`dramaflow-module-{projectId}-{module}`）
- [x] 2.3 `ScriptEditor.tsx` 从存储加载/保存剧本
- [x] 2.4 `Storyboard.tsx` 从存储加载/保存镜头
- [x] 2.5 `CharacterManager.tsx` 从存储加载/保存角色
- [x] 2.6 `DubbingPanel.tsx` 从存储加载/保存配音
- [x] 2.7 `SynthesisPanel.tsx` 从存储加载/保存合成配置

#### Task 3: AI 服务集成 ✅
- [x] 3.1 创建 `src/services/ai.ts` 服务抽象层
- [x] 3.2 创建 `src/services/ai-mock.ts` mock 实现
- [x] 3.3 剧本创作接入 AI 生成/润色
- [x] 3.4 分镜生成接入 AI 生成
- [x] 3.5 角色管理接入 AI 人设建议
- [x] 3.6 场景配音接入 AI 生成
- [x] 3.7 请求重试、超时、错误处理机制

#### Task 4: UI 完善 ✅
- [x] 4.1 创建 `ErrorBoundary.tsx`
- [x] 4.2 创建 `LoadingSkeleton.tsx`
- [x] 4.3 所有工作流组件添加 loading 状态
- [x] 4.4 所有工作流组件添加空数据状态
- [x] 4.5 应用入口包裹错误边界

### ⏳ 待完成（3 个子任务）

#### Task 5: Electron 完整打包
- [x] 5.1 生成应用图标（`build/icon.jpg`）
- [x] 5.2 完善 `electron/main.ts`（菜单、文件关联）
- [x] 5.3 完善 `electron/preload.ts`（IPC 通信）
- [x] 5.4 完善 `package.json` electron-builder 配置
- [ ] 5.5 集成 `electron-updater` 自动更新框架
- [ ] 5.6 测试打包构建

#### Task 6: 验证与修复
- [ ] 6.1 运行 TypeScript 类型检查
- [ ] 6.2 逐项验证 checklist 所有项目
- [ ] 6.3 修复发现的任何问题

---

## 任务优先级

### 高优先级（必须完成）
1. **Task 5.5** — 集成 `electron-updater` 自动更新框架
   - 安装 `electron-updater` 依赖
   - 在 `electron/main.ts` 中配置自动更新逻辑
   - 配置更新服务器地址（可先用占位符）

2. **Task 6.1** — 运行 TypeScript 类型检查
   - 执行 `npx tsc --noEmit`
   - 修复所有类型错误

### 中优先级
3. **Task 6.2** — 逐项验证 checklist
   - 验证 38 项检查点全部通过
   - 特别是项目切换数据隔离（原第 61 项）

### 低优先级
4. **Task 5.6** — 测试打包构建
   - 执行 `npm run build:desktop`
   - 验证生成的安装包

---

## 时间预估

| 任务 | 描述 | 预估时间 |
|------|------|----------|
| 5.5 | electron-updater 集成 | 30 分钟 |
| 5.6 | 测试打包构建 | 15 分钟 |
| 6.1 | TypeScript 类型检查 | 10 分钟 |
| 6.2 | 逐项验证 checklist | 15 分钟 |
| 6.3 | 修复问题 | 20 分钟 |
| **合计** | | **~90 分钟** |

---

## 验证步骤

1. 启动开发服务器，验证所有页面正常渲染
2. 创建多个项目，验证项目间数据完全隔离
3. 切换项目后，验证各模块编辑状态正确保留
4. 关闭应用重新打开，验证所有数据恢复
5. 模拟 AI 请求，验证 loading 状态和错误处理
6. 运行 TypeScript 类型检查，零错误通过
7. 运行打包构建，生成可安装的应用包