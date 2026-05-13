#!/usr/bin/env node
/**
 * CCEM 部署脚本
 *
 * 功能：
 * - 构建 CLI 和 Desktop 应用
 * - 创建 GitHub Release
 * - 本地构建测试
 *
 * 使用方式：
 * pnpm dlx tsx scripts/deploy/index.ts [options]
 *
 * 选项：
 * --cli          只构建 CLI
 * --desktop      只构建 Desktop
 * --all          构建两者 (默认)
 * --release      创建 GitHub Release
 * --dry-run      本地测试，不实际发布
 * --skip-build   跳过构建步骤
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir, platform } from "node:os";

// ========== 类型定义 ==========
interface DeployConfig {
  cli: boolean;
  desktop: boolean;
  release: boolean;
  dryRun: boolean;
  skipBuild: boolean;
}

interface PackageJson {
  name: string;
  version: string;
}

// ========== 工具函数 ==========
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command: string, options?: { cwd?: string; dryRun?: boolean }) {
  if (options?.dryRun) {
    log(`[DRY-RUN] ${command}`, "yellow");
    return "";
  }
  return execSync(command, {
    cwd: options?.cwd,
    stdio: "inherit",
    encoding: "utf-8",
  });
}

function execQuiet(command: string, options?: { cwd?: string }) {
  try {
    return execSync(command, {
      cwd: options?.cwd,
      stdio: "pipe",
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}

function readPackageJson(path: string): PackageJson {
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content);
}

function getGitInfo() {
  const branch = execQuiet("git rev-parse --abbrev-ref HEAD");
  const tag = execQuiet("git describe --tags --abbrev=0 2>/dev/null || echo ''");
  const commitHash = execQuiet("git rev-parse --short HEAD");
  const isClean = execQuiet("git status --porcelain") === "";
  const remoteUrl = execQuiet("git remote get-url origin");

  // 从 remote URL 提取 owner/repo
  let repo = "";
  const match = remoteUrl.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (match) {
    repo = match[1];
  }

  return { branch, tag, commitHash, isClean, repo };
}

// ========== 构建函数 ==========
function buildCore() {
  log("\n📦 构建 @ccem/core...", "cyan");
  exec("pnpm --filter @ccem/core build");
}

function buildCli(config: DeployConfig) {
  log("\n🔧 构建 CLI (@ccem/cli)...", "cyan");
  exec("pnpm --filter @ccem/cli build", { dryRun: config.dryRun });

  if (!config.dryRun) {
    log("✅ CLI 构建完成", "green");
  }
}

function buildDesktop(config: DeployConfig) {
  log("\n🖥️  构建 Desktop (Tauri)...", "cyan");

  if (config.dryRun) {
    log("[DRY-RUN] cd apps/desktop && pnpm tauri build", "yellow");
    return;
  }

  // 先构建前端
  exec("pnpm build", { cwd: "apps/desktop" });

  // 再构建 Tauri
  exec("pnpm tauri build", { cwd: "apps/desktop" });

  log("✅ Desktop 构建完成", "green");

  // 显示构建产物
  const bundlePath = "apps/desktop/src-tauri/target/release/bundle";
  if (existsSync(bundlePath)) {
    log(`📁 构建产物位于: ${resolve(bundlePath)}`, "blue");
  }
}

// ========== GitHub Release ==========
async function createGitHubRelease(version: string, config: DeployConfig) {
  const gitInfo = getGitInfo();

  if (!gitInfo.repo) {
    log("❌ 无法获取 Git 仓库信息", "red");
    return;
  }

  log(`\n🚀 创建 GitHub Release: ${version}`, "cyan");

  if (config.dryRun) {
    log("[DRY-RUN] gh release create", "yellow");
    log(`  Tag: v${version}`, "blue");
    log(`  Repo: ${gitInfo.repo}`, "blue");
    return;
  }

  // 检查 gh CLI 是否安装
  const ghVersion = execQuiet("gh --version");
  if (!ghVersion) {
    log("❌ 需要 GitHub CLI (gh)，请先安装: brew install gh", "red");
    return;
  }

  // 生成 Release Notes
  const previousTag = execQuiet("git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo ''");
  let releaseNotes = `## CCEM v${version}\n\n`;

  if (previousTag) {
    const changelog = execQuiet(`git log ${previousTag}..HEAD --oneline --no-merges`);
    if (changelog) {
      releaseNotes += `### 更新内容\n\n${changelog
        .split("\n")
        .map((line) => `- ${line}`)
        .join("\n")}\n`;
    }
  }

  releaseNotes += `\n### 安装方式\n\n`;
  releaseNotes += `- **CLI**: \`npm install -g ccem@${version}\`\n`;
  releaseNotes += `- **Desktop**: 下载下方对应的安装包\n`;

  // 收集构建产物
  const assets: string[] = [];

  if (config.desktop) {
    const bundlePath = "apps/desktop/src-tauri/target/release/bundle";
    const dmgPath = join(bundlePath, "dmg", "CCEM Desktop.app.dmg");
    const appPath = join(bundlePath, "macos", "CCEM Desktop.app");

    if (existsSync(dmgPath)) {
      assets.push(dmgPath);
    }
    if (existsSync(appPath)) {
      // 压缩 app 为 zip
      const zipPath = join(bundlePath, "macos", `CCEM-Desktop-${version}.zip`);
      exec(`ditto -c -k --sequesterRsrc --keepParent "${appPath}" "${zipPath}"`);
      assets.push(zipPath);
    }
  }

  // 创建 release
  const tagName = `v${version}`;
  const notesFile = "/tmp/ccem-release-notes.md";
  writeFileSync(notesFile, releaseNotes);

  let releaseCmd = `gh release create ${tagName} --repo ${gitInfo.repo} --title "v${version}" --notes-file ${notesFile}`;

  if (assets.length > 0) {
    releaseCmd += ` ${assets.join(" ")}`;
  }

  try {
    exec(releaseCmd);
    log(`✅ Release 创建成功: https://github.com/${gitInfo.repo}/releases/tag/${tagName}`, "green");
  } catch (error) {
    log(`❌ Release 创建失败`, "red");
    console.error(error);
  }
}

// ========== 主函数 ==========
async function main() {
  const args = process.argv.slice(2);

  const config: DeployConfig = {
    cli: args.includes("--cli") || args.includes("--all") || (!args.includes("--desktop") && !args.includes("--cli")),
    desktop: args.includes("--desktop") || args.includes("--all") || (!args.includes("--desktop") && !args.includes("--cli")),
    release: args.includes("--release"),
    dryRun: args.includes("--dry-run"),
    skipBuild: args.includes("--skip-build"),
  };

  // 打印配置
  log("\n╔══════════════════════════════════════╗", "bright");
  log("║       CCEM 部署脚本 v1.0             ║", "bright");
  log("╚══════════════════════════════════════╝", "bright");
  log(`\n📋 配置:`, "cyan");
  log(`   构建 CLI:     ${config.cli ? "✅" : "❌"}`);
  log(`   构建 Desktop: ${config.desktop ? "✅" : "❌"}`);
  log(`   GitHub Release: ${config.release ? "✅" : "❌"}`);
  log(`   Dry Run:      ${config.dryRun ? "✅" : "❌"}`);
  log(`   跳过构建:     ${config.skipBuild ? "✅" : "❌"}`);

  // 检查环境
  const gitInfo = getGitInfo();
  log(`\n📍 Git 信息:`, "cyan");
  log(`   分支: ${gitInfo.branch}`);
  log(`   提交: ${gitInfo.commitHash}`);
  log(`   仓库: ${gitInfo.repo || "未知"}`);
  log(`   工作区: ${gitInfo.isClean ? "干净 ✨" : "有未提交的更改 ⚠️"}`);

  if (!gitInfo.isClean && config.release && !config.dryRun) {
    log("\n⚠️  警告: 工作区有未提交的更改，建议先提交后再发布 Release", "yellow");
  }

  // 获取版本
  const rootPkg = readPackageJson("package.json");
  const version = rootPkg.version;
  log(`\n📌 版本: ${version}`, "bright");

  // 构建流程
  if (!config.skipBuild) {
    // Core 必须先构建
    buildCore();

    if (config.cli) {
      buildCli(config);
    }

    if (config.desktop) {
      buildDesktop(config);
    }
  } else {
    log("\n⏭️  跳过构建步骤", "yellow");
  }

  // 创建 Release
  if (config.release) {
    await createGitHubRelease(version, config);
  }

  // 完成
  log("\n╔══════════════════════════════════════╗", "green");
  log("║           🎉 部署完成！              ║", "green");
  log("╚══════════════════════════════════════╝", "green");

  if (!config.release && !config.dryRun) {
    log("\n💡 提示: 使用 --release 参数创建 GitHub Release", "blue");
    log("💡 提示: 使用 --dry-run 参数进行本地测试", "blue");
  }
}

main().catch((error) => {
  log("\n❌ 部署失败", "red");
  console.error(error);
  process.exit(1);
});
