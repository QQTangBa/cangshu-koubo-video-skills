#!/bin/bash
# 只改了声音（sfxVolume、某条 cue 的 vol、BGM 音量）时，不重渲画面：只渲整片音轨，合回已有画面，再跑限幅和质检。
# 用法: bash remix_audio.sh <工程> <已有版本，如 v1> <新版本，如 v2> [--py <装了 numpy/opencv 的 python>]
# 改了任何画面（场景、叠层、字幕、plan 里的画面字段）就不能用这个，要整片重渲。
set -e
P=$(cd "$1" && pwd); OLD=$2; NEW=$3; shift 3
SK="$(cd "$(dirname "$0")/.." && pwd)"
RAW_OLD=$(ls "$P/out/$OLD/"*"_${OLD}_raw.mp4" | head -1)
[ -f "$RAW_OLD" ] || { echo "找不到 $P/out/$OLD/*_${OLD}_raw.mp4"; exit 1; }
TITLE=$(basename "$RAW_OLD" "_${OLD}_raw.mp4")
mkdir -p "$P/out/$NEW"
cd "$P" && npx remotion render src/index.ts Koubo34 "out/$NEW/mix.wav" --codec=wav --timeout=180000 --log=error
ffmpeg -v error -y -i "$RAW_OLD" -i "out/$NEW/mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest "out/$NEW/${TITLE}_${NEW}_raw.mp4"
rm -f "out/$NEW/mix.wav"
python3 "$SK/scripts/render_final.py" "$P" --ver "$NEW" --title "$TITLE" --skip-render "$@"
