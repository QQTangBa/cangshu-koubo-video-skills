#!/bin/bash
# 新建一个 3:4 动效剪辑工程：复制模板，复用本机同版本 Remotion 依赖，没有就 npm install。
# 用法: bash new_project.sh <工程目录>
set -e
SK="$(cd "$(dirname "$0")/.." && pwd)"
DST="$1"; [ -z "$DST" ] && { echo "用法: new_project.sh <工程目录>"; exit 2; }
if [ -e "$DST/src/plan.json" ]; then echo "已有工程：$DST（会覆盖 plan.json、音效清单、场景登记表）。往已有工程同步模板用 sync_template.sh"; exit 1; fi
mkdir -p "$DST"
cp -R "$SK/assets/remotion-template/." "$DST/"
mkdir -p "$DST/public"; [ -e "$DST/public/words.json" ] || echo "[]" > "$DST/public/words.json"  # toon.tsx 编译时要读它；from_base.py 会覆盖成真的
if [ ! -e "$DST/node_modules" ]; then
  for c in ${KOUBO_REMOTION_CACHE:+"$KOUBO_REMOTION_CACHE"/*/node_modules}; do   # 可选：设 KOUBO_REMOTION_CACHE=<放过别的 Remotion 4.0.520 工程的目录> 复用依赖
    if [ -f "$c/remotion/package.json" ] && [ -d "$c/@remotion/cli" ] && grep -q '"version": "4.0.520"' "$c/remotion/package.json"; then
      ln -s "$c" "$DST/node_modules"; echo "复用依赖: $c"; break
    fi
  done
  [ -e "$DST/node_modules" ] || (cd "$DST" && npm install --no-audit --no-fund)
fi
echo "工程就绪: $DST"
