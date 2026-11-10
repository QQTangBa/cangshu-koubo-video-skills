#!/usr/bin/env bash
# 把 skill 模板的源码同步进工程。不碰工程自己的东西：plan.json、sfx-palette.json（build_sfx.py 生成）、
# scenes/custom/index.ts（手写场景登记表）和工程里已有的手写场景文件；模板的样例场景只在工程里没有时才补进去。
# 例外：custom/ 下的工具文件 toon.tsx（动画片工具 + 主题 + 字墙）、lbkit.tsx（道具）、intro.tsx（系列片头，读 plan.meta.series）、
# qkid.tsx（可选的角色精灵图，toon 依赖它）、ep.tsx（产品界面式道具）、real.tsx（真图、AI 生成角标、段内多画布 Block）每次都覆盖——Film / Root 依赖它们的新接口。工程专用的道具另写文件，别改这些。
# 精灵图 public/ipq/ 只在工程里没有时补（工程自己放的角色图留着）。
# 用法: sync_template.sh <工程目录>
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"
P="${1:?用法: sync_template.sh <工程目录>}"
SRC="$SK/assets/remotion-template/src"
rsync -a --exclude plan.json --exclude sfx-palette.json --exclude 'scenes/custom/' "$SRC/" "$P/src/"
mkdir -p "$P/src/scenes/custom"
rsync -a "$SK/assets/remotion-template/remotion.config.ts" "$P/remotion.config.ts"  # 清晰度：PNG 逐帧
for f in types.ts toon.tsx lbkit.tsx intro.tsx qkid.tsx ep.tsx real.tsx; do rsync -a "$SRC/scenes/custom/$f" "$P/src/scenes/custom/$f"; done
rsync -a --ignore-existing --exclude types.ts --exclude toon.tsx --exclude lbkit.tsx --exclude intro.tsx --exclude qkid.tsx --exclude ep.tsx --exclude real.tsx "$SRC/scenes/custom/" "$P/src/scenes/custom/"
mkdir -p "$P/public/ipq"; rsync -a --ignore-existing "$SK/assets/remotion-template/public/ipq/" "$P/public/ipq/"
echo "已同步模板源码到 $P/src（plan.json、sfx-palette.json、手写场景登记表和已有场景未动）"
