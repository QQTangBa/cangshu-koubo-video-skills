#!/bin/bash
# 人像抠图：macOS Vision 逐帧分割 → 带透明通道的 VP9 person.webm（不下载任何模型）。
# 用法: bash matte.sh <footage34.mp4> <输出 person.webm> [accurate|balanced|fast]
set -eo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
IN="$1"; OUT="$2"; Q="${3:-balanced}"
BIN="${TMPDIR:-/tmp}/koubo_person_matte"
[ -x "$BIN" ] && [ "$BIN" -nt "$DIR/person_matte.swift" ] || swiftc -O "$DIR/person_matte.swift" -o "$BIN" 2>/dev/null
IFS=x read W H < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$IN")
FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$IN")
"$BIN" "$IN" $((W/2)) $((H/2)) "$Q" | ffmpeg -v error -y -f rawvideo -pix_fmt gray -s $((W/2))x$((H/2)) -r "$FPS" -i - -i "$IN" \
  -filter_complex "[0]scale=${W}:${H}:flags=bicubic,boxblur=2:1,format=gray[m];[1:v][m]alphamerge,format=yuva420p" \
  -c:v libvpx-vp9 -b:v 0 -crf 18 -deadline realtime -cpu-used 8 -row-mt 1 -auto-alt-ref 0 -an "$OUT"
[ -s "$OUT" ] || { echo "抠像失败：没有生成 $OUT" >&2; exit 1; }
echo "抠像完成: $OUT"
