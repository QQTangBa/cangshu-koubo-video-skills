#!/usr/bin/env bash
# 成片总线限幅：人声和音效叠加偶尔会过冲，这里只压音频（视频流原样拷贝），峰值限制在约 -1.4dBFS（limit 0.85）。
# 第三个参数（可选）：渲染带来的声音延迟（秒），从声音开头扣掉（Remotion 把视频静音、声音另铺，导出后声音固定晚约 45ms，不扣口型就对不上）。
# 用法: master_audio.sh <渲染出来的.mp4> <成片.mp4> [声音延迟秒]
set -euo pipefail
IN="${1:?用法: master_audio.sh <in.mp4> <out.mp4> [声音延迟秒]}"; OUT="${2:?}"; LAG="${3:-0}"
ffmpeg -v error -y -i "$IN" -c:v copy -af "atrim=start=${LAG},asetpts=PTS-STARTPTS,alimiter=limit=0.85:attack=2:release=60:level=disabled" -c:a aac -b:a 256k "$OUT"
ffmpeg -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^ +(I|Peak):" | sed 's/^ */  /'
