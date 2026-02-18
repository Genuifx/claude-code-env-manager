#!/usr/bin/env bash
set -e

# Generate logo variants from logo.png using chafa
# This script is run during prebuild to generate logo-generated.ts

echo "🎨 Generating logo variants..."

# Check dependencies
if ! command -v sips &> /dev/null; then
  echo "❌ Error: sips not found (macOS only)"
  exit 1
fi

if ! command -v chafa &> /dev/null; then
  echo "❌ Error: chafa not found. Install with: brew install chafa"
  exit 1
fi

# Navigate to CLI directory
cd "$(dirname "$0")/.."

# Check if logo.png exists in project root
if [ ! -f "../../logo.png" ]; then
  echo "❌ Error: logo.png not found in project root"
  exit 1
fi

# Create temp directory
mkdir -p .tmp

# Step 1: Scale logo to different sizes using sips
echo "  📐 Scaling images..."
sips -z 64 64 ../../logo.png --out .tmp/logo-64.png > /dev/null 2>&1
sips -z 128 128 ../../logo.png --out .tmp/logo-128.png > /dev/null 2>&1
sips -z 192 192 ../../logo.png --out .tmp/logo-192.png > /dev/null 2>&1

# Step 2: Generate ANSI strings using chafa
echo "  🎨 Converting to ANSI..."

# 使用更大的尺寸生成,然后以 C 字母为中心截取

# MINIMAL (8 chars wide) - 生成 20 行,以中心截取 5 行
chafa --size=20x --format=symbols --symbols=block .tmp/logo-64.png > .tmp/logo-minimal-full.txt
tail -n +7 .tmp/logo-minimal-full.txt | head -n 5 > .tmp/logo-minimal.txt

# COMPACT (12 chars wide) - 生成 24 行,以中心截取 7 行
chafa --size=24x --format=symbols --symbols=block .tmp/logo-128.png > .tmp/logo-compact-full.txt
tail -n +8 .tmp/logo-compact-full.txt | head -n 7 > .tmp/logo-compact.txt

# FULL (19 chars wide) - 生成 30 行,以 C 字母为中心截取第 4-12 行 (9 行,减少底部 2 行)
chafa --size=30x --format=symbols --symbols=block .tmp/logo-192.png > .tmp/logo-full-full.txt
tail -n +4 .tmp/logo-full-full.txt | head -n 9 > .tmp/logo-full.txt

# Step 3: Convert ANSI to TypeScript
echo "  📝 Generating TypeScript..."
node scripts/convert-ansi-to-ts.js

# Step 4: Cleanup
echo "  🧹 Cleaning up..."
rm -rf .tmp

echo "✅ Logo variants generated successfully"
