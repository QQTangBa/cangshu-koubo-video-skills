#!/bin/bash
# 半分辨率静帧，横拼成一张，写场景时逐个镜头落位、元素交接处自查用。
# 用法: bash stills.sh <工程> <名字> <秒> [<秒> ...]      （合成默认 Koubo34；COMP=Style-dark bash stills.sh ... 换合成）
# 每张先删旧图再渲：机器忙（后台在渲成片）时 remotion still 会超时，旧图不删就会拿上一次的图冒充新图。
set -e
cd "$1"; name=$2; shift 2; comp=${COMP:-Koubo34}; files=()
mkdir -p out/stills
for s in "$@"; do
  f=$(python3 -c "print(round($s*30))")
  rm -f "out/stills/t$s.png"
  npx remotion still src/index.ts "$comp" "out/stills/t$s.png" --frame="$f" --scale=0.5 --timeout=180000 --log=error >/dev/null 2>&1 || true
  [ -s "out/stills/t$s.png" ] || { echo "静帧 $s 渲染失败（机器太忙或场景报错）"; exit 1; }
  files+=(-i "out/stills/t$s.png")
done
n=$#
if [ "$n" -eq 1 ]; then ffmpeg -v error -y "${files[@]}" "out/stills/$name.jpg"; else ffmpeg -v error -y "${files[@]}" -filter_complex "hstack=$n,scale=iw*min(1\,2400/iw):-1" "out/stills/$name.jpg"; fi && echo "out/stills/$name.jpg"
