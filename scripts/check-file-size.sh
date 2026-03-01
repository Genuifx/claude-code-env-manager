#!/bin/bash

echo "Checking for files larger than 500 lines..."

# 查找所有 TypeScript/JavaScript/Rust 文件，排除构建产物和依赖
large_files=$(find apps packages -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.rs" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/dist/*" \
  ! -path "*/target/*" \
  ! -path "*/.next/*" \
  ! -path "*/build/*" \
  -exec sh -c '
  lines=$(wc -l < "$1")
  if [ "$lines" -gt 500 ]; then
    echo "$1: $lines lines"
  fi
' sh {} \;)

if [ -n "$large_files" ]; then
  echo "❌ Files exceeding 500 lines (must be refactored or exempted):"
  echo "$large_files"
  echo ""
  echo "Please refactor these files or add exemption documentation."
  exit 1
else
  echo "✅ All files are under 500 lines"
fi
