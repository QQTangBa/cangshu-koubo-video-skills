#!/usr/bin/env bash
# 把工程里改好的模板代码拷回 skill 模板（下次新建工程才会带上）。只拷你点名的文件，路径相对工程 src/。
# 拒绝拷回工程自己的东西：plan.json、sfx-palette.json、scenes/custom/index.ts。手写场景要当样例时可以点名拷回。
# 用法: sync_back.sh <工程目录> <相对 src 的文件>...   例：sync_back.sh <工程> components/overlays.tsx scenes/kit.tsx
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"
P="${1:?用法: sync_back.sh <工程目录> <文件>...}"; shift
[ $# -gt 0 ] || { echo "要点名拷回哪些文件（相对工程 src/）"; exit 2; }
for f in "$@"; do
  case "$f" in
    plan.json|sfx-palette.json|scenes/custom/index.ts) echo "跳过 $f：这是工程自己的文件，不拷回模板"; continue ;;
  esac
  [ -f "$P/src/$f" ] || { echo "工程里没有 src/$f"; exit 1; }
  mkdir -p "$(dirname "$SK/assets/remotion-template/src/$f")"
  cp "$P/src/$f" "$SK/assets/remotion-template/src/$f" && echo "已拷回 $f"
done
