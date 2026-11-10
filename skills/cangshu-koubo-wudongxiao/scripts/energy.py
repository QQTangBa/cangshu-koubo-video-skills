#!/usr/bin/env python3
"""音量条：每 20ms 一行（或 --bar 一行一段），定精确剪点、消音起止用。字和字之间的低谷就是剪点。
用法: python energy.py <视频或音频> <起秒> <止秒> [--step 0.02] [--bar]
  默认逐行打印「时间 dB ####」；--bar 打成一行（█ >-24 ▆ >-30 ▃ >-36 ▁ >-44 · 更低），下面一行每 0.5 秒一个刻度。"""
import argparse, subprocess
import numpy as np

ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("start", type=float); ap.add_argument("end", type=float)
ap.add_argument("--step", type=float, default=0.02); ap.add_argument("--bar", action="store_true")
a = ap.parse_args(); SR = 16000
pcm = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a.start:.3f}", "-t", f"{a.end - a.start:.3f}", "-i", a.src,
                                    "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout, np.int16).astype(np.float32) / 32768
hop = int(SR * a.step)
db = [20 * np.log10(np.sqrt(np.mean(pcm[i * hop:(i + 1) * hop] ** 2)) + 1e-9) for i in range(len(pcm) // hop)]
if a.bar:
    sym = lambda v: "█" if v > -24 else "▆" if v > -30 else "▃" if v > -36 else "▁" if v > -44 else "·"
    print(f"{a.start:7.2f} |" + "".join(sym(v) for v in db) + "|")
    print("        " + "".join("|" if round((a.start + i * a.step) % 0.5, 3) < a.step / 2 else " " for i in range(len(db))))
else:
    for i, v in enumerate(db): print(f"{a.start + i * a.step:8.2f} {v:6.1f} {'#' * max(0, int((v + 50) / 2))}")
