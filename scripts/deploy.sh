#!/bin/bash
# 部署脚本：必须在项目根目录运行（wrangler 靠 cwd 发现 functions/）
set -e
cd "$(dirname "$0")/.."
echo "cwd=$(pwd)"
export PATH="/Users/evener920/.workbuddy/binaries/node/versions/22.22.2-6/bin:$PATH"
export CLOUDFLARE_ACCOUNT_ID="82129ffe005dfd5010505adf73de06cb"
npx wrangler pages deploy dist --project-name inboxcard --commit-dirty=true "$@"
