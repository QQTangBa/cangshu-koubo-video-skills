#!/usr/bin/env python3
"""按真实画面校正剪点位置。剪点记录（cut_pieces.json 的 at）和实际拼出来的视频可能对不上：变速换算、拼接时多带帧，越往后差得越多
（2026-11-10 一条 4 分钟的片子到结尾差了 14 帧，旧版只在 -2…+6 帧里找，后半段 30 多刀的光流融合全做在了没剪的地方）。
做法：
  1. 画面匹配（主）：第 k 段的头一帧就是原片 src_from 那一帧。在记录位置前后 30 帧里找和它最像的一帧，再在 ±1 帧里按「孤立的一帧尖」微调。
     原片从 edl.json 的 source 读（工程目录或它的上一级），读不到就跳过这一步。
  2. 画面跳动（备）：没有原片、或匹配误差太大时，沿用上一刀的偏差，在附近找最突出的孤立一帧尖；找不到明显的跳就保持原位。
用法: python fix_edits.py <工程>   校正 <工程>/fast/cut_pieces.json（make_source.py 之后、render.py 之前跑；就地改，旧的存成 cut_pieces_校正前.json）
      python fix_edits.py <视频> <cut_pieces.json>   指定文件（动效管线的 from_base.py 这样调）"""
import json, shutil, subprocess, sys
import numpy as np
from pathlib import Path
if len(sys.argv) == 2: vid, pf = str(Path(sys.argv[1]) / "fast" / "cut.mp4"), str(Path(sys.argv[1]) / "fast" / "cut_pieces.json")
else: vid, pf = sys.argv[1:3]
if Path(pf.replace(".json", "_校正前.json")).exists(): sys.exit(f"{pf} 已经校正过（有 _校正前.json）；重新剪或重新 make_source.py 之后再跑")
P = json.load(open(pf)); shutil.copy(pf, pf.replace(".json", "_校正前.json"))
_e = next((d / "edl.json" for d in (Path(pf).parent, Path(pf).parent.parent) if (d / "edl.json").exists()), None)
EDL = json.loads(_e.read_text()) if _e else {}
INTRO = EDL.get("intro", True)
FPS, w, h = 30, 96, 72

def frames(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"fps={FPS},scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)

C = frames(vid)
D = np.r_[0, np.abs(np.diff(C, axis=0)).mean((1, 2))]                    # D[k] = 第 k 帧和 k-1 帧的平均差
spike = lambda k: D[k] - 0.5 * (D[k - 1] + D[k + 1]) if 1 <= k < len(D) - 1 else -1e9
src = Path(EDL.get("source", "")) if EDL.get("source") else None
S = frames(src) if src and src.exists() else None
if S is None: print("读不到原片（edl.json 的 source），只按画面跳动校正")

moved, by, off = [], {"匹配": 0, "跳动": 0}, 0
for p in P[2:] if INTRO else P[1:]:                                       # 片头、响指那一刀不动（没有系列片头时只跳过开头）
    e = round(p["at"] * FPS); k = None
    if S is not None and "src_from" in p:
        s0 = min(len(S) - 1, round(p["src_from"] * FPS)); ref = S[s0]
        lo, hi = max(1, e - 30), min(len(C) - 1, e + 31)
        errs = [float(np.abs(C[f] - ref).mean()) for f in range(lo, hi)]
        m = lo + int(np.argmin(errs))
        if min(errs) < 6.0:                                               # 同一帧重新编码后误差一般 <3；太大说明这刀前后画面被改过（片头防抖等），改用跳动
            best = max((m - 1, m, m + 1), key=spike)                     # 静止画面里相邻帧都像，用「这一帧突然变了」再定一次
            k = best if spike(best) > 1.5 * max(spike(m), 0.5) else m
            by["匹配"] += 1
    if k is None:                                                         # 备用：沿用上一刀的偏差，在附近找孤立的一帧尖
        c = e + off; lo, hi = max(2, c - 4), min(len(D) - 2, c + 8)
        cand = max(range(lo, hi + 1), key=spike); ref = np.median(D[max(1, e - 15):min(len(D), e + 15)])
        k = cand if spike(cand) > 2.0 * ref and spike(cand) > 3.0 else c
        by["跳动"] += 1
    off = k - e
    if k != e: moved.append((e, k)); p["at"] = round(k / FPS, 4); p["at_校正"] = True
json.dump(P, open(pf, "w"), indent=1)
n = len(P) - (2 if INTRO else 1)
print(f"{n} 个剪点里校正了 {len(moved)} 个（画面匹配 {by['匹配']}、画面跳动 {by['跳动']}），最大偏差 {max([abs(b - a) for a, b in moved] or [0])} 帧：", " ".join(f"{a}→{b}" for a, b in moved))
