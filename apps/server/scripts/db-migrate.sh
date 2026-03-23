#!/usr/bin/env bash
# 数据库初始化脚本 — 从 .dev.vars 读取配置并执行 Drizzle 迁移
# 用法：在 apps/server 目录下执行 bash scripts/db-migrate.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
DEV_VARS="$SERVER_DIR/.dev.vars"

# 检查 .dev.vars 是否存在
if [ ! -f "$DEV_VARS" ]; then
  echo "错误：未找到 $DEV_VARS"
  echo "请先复制 .dev.vars.example 并填入真实值："
  echo "  cp .dev.vars.example .dev.vars"
  exit 1
fi

# 读取 .dev.vars 中的环境变量
export $(grep -v '^#' "$DEV_VARS" | grep -v '^$' | xargs)

# 检查必要变量
if [ -z "$SUPABASE_DATABASE_URL" ]; then
  echo "错误：.dev.vars 中缺少 SUPABASE_DATABASE_URL"
  echo "请参考 .dev.vars.example 填写"
  exit 1
fi

echo "正在连接数据库并执行迁移..."
cd "$SERVER_DIR"
pnpm drizzle-kit migrate

echo "数据库初始化完成！"
