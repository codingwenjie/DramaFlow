# 参与贡献

感谢你愿意参与 DramaFlow 的开发！无论是修 Bug、加功能、写文档还是提建议，都欢迎。

## 开发环境

```bash
cd dramaflow-app
npm install
npm run dev:web
```

浏览器访问 http://localhost:5173 即可开始开发。桌面端调试使用 `npm run dev`。

## 提交规范

- 分支命名：`feat/xxx`、`fix/xxx`、`docs/xxx`、`refactor/xxx`
- Commit message 使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：
  - `feat(script): 支持批量生成剧本`
  - `fix(storyboard): 修复镜头状态不同步`
  - `docs: 补充模型接入指南`

## 提交流程

1. Fork 本仓库并创建功能分支
2. 提交修改，保持每个 commit 小而聚焦
3. 提交前本地运行检查：`npm run typecheck && npm run build`
4. 发起 Pull Request，说明改动内容与验证方式，关联相关 Issue

## 代码规范

- 使用 TypeScript 严格模式，新增代码必须有完整类型
- 组件放在 `src/components`，公共类型放在 `src/data/types.ts`
- AI 能力统一通过 `src/services` 抽象层接入，**不要**在组件里直接发请求
- UI 颜色、圆角等沿用 `src/constants.ts` 中的设计变量，避免硬编码
- 涉及数据存储的改动需兼容现有 localStorage 数据（迁移阶段）

## 测试

- 数据层与 AI 服务层应补充单元测试
- 提交前确保本地检查通过，CI 全绿

## 有问题？

- 功能建议或 Bug 请提交 Issue，并选择对应模板
- 社区交流与安全反馈方式见 [SECURITY](SECURITY.md) 与 [行为准则](CODE_OF_CONDUCT.md)
