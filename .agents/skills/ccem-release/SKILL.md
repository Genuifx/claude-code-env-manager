---
name: ccem-release
description: Publish a new ccem release, commit generated release files, or trigger the ccem GitHub Actions release flow for CLI and Desktop.
---

# Ccem Release

先只看这几个文件，不要大范围读代码：

- `git status --short`
- `git tag -l 'v*' --sort=-version:refname | head -n 5`
- `apps/cli/package.json`
- `apps/desktop/package.json`
- `.github/workflows/release-cli.yml`
- `.github/workflows/release-desktop.yml`

规则：

- 有未提交的 release 文件就直接 review 后提交。
- 工作区干净且当前版本等于最新 tag 时，不要只触发 `workflow_dispatch`，那通常不是“新版本”。
- `ccem` 默认走新 tag 发布，因为 CLI 和 Desktop workflow 都支持 tag 触发。
- 如果 `main` 在最新 tag 之后还有新提交，且需要发下一版 beta，就补一个很小的 patch changeset，再跑 `pnpm version-packages`。

默认流程：

1. 确认或生成下一版号
2. 检查版本和 changelog diff
3. 提交 `chore: release vX.Y.Z`
4. `git tag vX.Y.Z`
5. `git push origin main`
6. `git push origin vX.Y.Z`

注意：

- `git push --follow-tags` 不会推 lightweight tag
- 最终要明确汇报版本号、commit、tag push 是否成功
