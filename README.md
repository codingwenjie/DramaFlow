# DramaFlow

AI 短剧生成提效工具，将剧本创作、角色管理、分镜生成、场景配音、视频合成全链路集成到一个桌面端应用中。

## 技术栈

- **前端**: React 19 + TypeScript
- **构建**: Vite + Tailwind CSS v4
- **桌面端**: Electron
- **状态管理**: Zustand
- **打包**: electron-builder

## 快速开始

```bash
cd dramaflow-app

# 安装依赖
npm install

# 启动开发模式
npm run dev

# 桌面端打包
npm run build:desktop
```

## 功能模块

- **项目总览** — 项目卡片、筛选、搜索、新建项目
- **剧本创作** — 三栏布局、幕次管理、AI 辅助写作
- **分镜生成** — 网格/列表视图、镜头状态、AI 生成分镜
- **角色管理** — 人物档案、声音设置、形象模型
- **场景配音** — 台词列表、情绪/语速/音量调节、AI 配音
- **视频合成** — 预览、片段管理、输出设置、后期处理

## 项目结构

```
dramaflow-app/
├── electron/          # Electron 主进程
│   ├── main.ts        # 主进程入口、菜单、自动更新
│   └── preload.ts     # 预加载脚本、IPC 通信
├── src/
│   ├── components/    # React 组件
│   ├── data/          # 类型定义、存储、示例数据
│   ├── services/      # AI 服务抽象层
│   └── store/         # Zustand 状态管理
├── package.json
└── vite.config.ts
```