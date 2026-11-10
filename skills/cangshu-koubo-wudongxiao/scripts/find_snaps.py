#!/usr/bin/env python3
"""找响指：列出一段时间里的音频瞬态（从安静处突然变响），并给每个瞬态前后出一张逐帧拼图，用来挑转场帧。

用法: python3 find_snaps.py <视频> <输出目录> [--range 0 20] [--jump 10] [--min-db -35]
输出: 终端打印每个瞬态的时间、响度、比前 30ms 高多少 dB；<输出目录>/snap_<秒>.jpg：瞬态前 0.5 秒到后 0.3 秒，
     每帧一格（8 列，从左上往右下按帧顺序），第一格的时间印在文件名旁的打印里。
片头里有人声、环境声时，响指的跳变没那么大，--jump 可以降到 6 再看。
"""
import argparse, subprocess
from pathlib import Path
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("outdir")
ap.add_argument("--range", nargs=2, type=float, default=[0, 20])
ap.add_argument("--jump", type=float, default=10)
ap.add_argument("--min-db", type=float, default=-35)
a = ap.parse_args()
out = Path(a.outdir); out.mkdir(parents=True, exist_ok=True)
lo, hi = a.range
SR, HOP = 16000, 160
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-ss", str(lo), "-to", str(hi), "-i", a.video, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                                 capture_output=True, check=True).stdout, np.float32)
db = np.array([20 * np.log10(np.sqrt(np.mean(x[i:i + HOP] ** 2)) + 1e-9) for i in range(0, len(x) - HOP, HOP)])
fps = eval(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", a.video]).decode().strip())
hits, last = [], -1
for i in range(3, len(db)):
    j = db[i] - db[i - 3:i].max()
    if j > a.jump and db[i] > a.min_db and i - last > 20:
        hits.append((lo + i / 100, db[i], j)); last = i
for t, d, j in hits:
    s = max(0, round((t - 0.5) * fps) / fps)
    p = out / f"snap_{t:.2f}.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{s:.4f}", "-t", "0.8", "-i", a.video, "-vf", "scale=160:-1,tile=8x3", "-frames:v", "1", str(p)], check=True)
    print(f"{t:7.2f}s  {d:6.1f}dB  跳变 {j:4.1f}dB  → {p.name}（第一格 = {s:.3f}s，每格 1/{fps:g} 秒）")
if not hits: print("没找到瞬态，降低 --jump 或 --min-db 再试")
