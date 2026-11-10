#!/usr/bin/env python3
"""按真实画面校正剪点位置。剪辑表按"每段整数帧"累加出来的剪点，和实际拼出来的视频会差几帧（原片帧时间不完全均匀，拼接时偶尔多出一帧），
越往后差得越多。这里在每个记录的剪点前 2 帧到后 6 帧里，找最突出的"孤立一帧尖"（和上一帧差别大、前后两帧都小）当真剪点；找不到明显的跳（压停顿那种几乎同姿势的剪点），保持原位。
用法: python fix_edits.py <工程>   校正 <工程>/fast/cut_pieces.json（make_source.py 之后、render.py 之前跑；就地改，旧的存成 cut_pieces_校正前.json）
      python fix_edits.py <视频> <cut_pieces.json>   指定文件"""
import json, shutil, subprocess, sys
import numpy as np
from pathlib import Path
if len(sys.argv) == 2: vid, pf = str(Path(sys.argv[1]) / "fast" / "cut.mp4"), str(Path(sys.argv[1]) / "fast" / "cut_pieces.json")
else: vid, pf = sys.argv[1:3]
if Path(pf.replace(".json", "_校正前.json")).exists(): sys.exit(f"{pf} 已经校正过（有 _校正前.json）；重新 make_source.py 之后再跑")
P = json.load(open(pf)); shutil.copy(pf, pf.replace(".json", "_校正前.json"))
_e = next((d / "edl.json" for d in (Path(pf).parent, Path(pf).parent.parent) if (d / "edl.json").exists()), None)
INTRO = json.loads(_e.read_text()).get("intro", True) if _e else True
w, h = 180, 240
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", vid, "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
G = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
D = np.r_[0, np.abs(np.diff(G, axis=0)).mean((1, 2))]                    # D[k] = 第 k 帧和 k-1 帧的平均差
moved = []
for p in P[2:] if INTRO else P[1:]:                                       # 片头、响指那一刀不动（没有系列片头时只跳过开头）
    e = round(p["at"] * 30); lo, hi = max(2, e - 2), min(len(D) - 2, e + 6)
    # 剪点是"孤立的一帧尖"（前后两帧都小），手快速动是连着好几帧都大：按尖的突出程度挑
    peak = [D[k] - 0.5 * (D[k - 1] + D[k + 1]) for k in range(lo, hi + 1)]
    k = lo + int(np.argmax(peak)); ref = np.median(D[max(1, e - 15):min(len(D), e + 15)])
    if peak[k - lo] > 2.0 * ref and peak[k - lo] > 3.0 and k != e:
        moved.append((e, k)); p["at"] = round(k / 30, 4); p["at_校正"] = True
json.dump(P, open(pf, "w"), indent=1)
print(f"{len(P) - (2 if INTRO else 1)} 个剪点里校正了 {len(moved)} 个：", " ".join(f"{a}→{b}" for a, b in moved))
